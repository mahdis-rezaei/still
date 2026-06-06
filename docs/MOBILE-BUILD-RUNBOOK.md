# Yadegar — Mobile Build Runbook

*Companion to `docs/MOBILE-APP-PLAN.md`. This is the hands-on record of the
Capacitor foundation that's now in the codebase, plus the exact steps + credentials
to take it to TestFlight / Play and finish the native-only surfaces.*

> Everything here is **additive and Capacitor-guarded** — the live web app behaves
> exactly as before. All native code paths are gated by `isNativeApp()` and use
> dynamic imports, so the web bundle and behaviour are unchanged. Verified:
> `pnpm run typecheck` (whole workspace) and the production web build both pass.

---

## 1. What's implemented in this branch

### Web / shared client (`artifacts/still/`)
- **Capacitor wiring** — `capacitor.config.ts` (appId `com.yadegarjournal.app`,
  appName `Yadegar`, `webDir: dist/public`), Capacitor core + plugins as deps,
  and npm scripts (`build:mobile`, `cap:sync`, `cap:ios`, `cap:android`).
- **Native bootstrap** — `src/lib/native-init.ts`: on native it points the API
  client at the real origin (`setBaseUrl`), attaches the Bearer token
  (`setAuthTokenGetter`), sets the status bar, keyboard resize, deep-link +
  Android back-button handling, and hides the splash. No-op on web. Called from
  `src/main.tsx` before React mounts.
- **Native helpers** — `src/lib/native.ts` (`isNativeApp`, `apiBaseUrl`, secure
  token storage via `@capacitor/preferences`, haptics, prefs) and
  `src/lib/api-url.ts` (`apiUrl()` for raw `<img src>` that bypass the fetch client).
- **Token auth client** — `src/lib/native-auth.ts`: native login/register/logout
  that capture the session token and store it; `src/lib/auth.tsx` branches to it on
  native, keeping the cookie flow on web.
- **Bottom tab bar** — `src/components/mobile-tab-bar.tsx` (Today · Look back ·
  Explore · Settings), shown on small screens; safe-area aware. Wired in `App.tsx`.
- **Biometric app lock** — `src/components/lock-gate.tsx` + the toggle in
  `src/components/app-lock-setting.tsx` (Settings → Privacy, native only). Uses the
  optional `capacitor-native-biometric` plugin (see §3) via a guarded dynamic import
  so the build never hard-requires it.
- **Native camera** — `src/components/entry-images.tsx` gains a "📷 Take photo"
  button on native (reuses the existing downscale + upload pipeline); image `src`
  values are now base-URL-aware for native.
- **Push registration** — `src/lib/native-push.ts` (`registerForPush`): requests
  permission, registers with APNs/FCM, posts the token to `/api/devices`.
- **PWA** — `public/manifest.webmanifest`, `public/icon.svg` (app mark: a dog-eared
  page), `public/sw.js` (network-first navigations, cache-first assets, never
  caches `/api`), registered in `main.tsx` (web + production only). Native/PWA meta
  in `index.html` (theme-color, apple-mobile-web-app-*, `viewport-fit=cover`), plus
  `html.cap-native` safe-area top padding in `index.css`.

### Backend (`artifacts/api-server/`, `lib/db/`)
- **Bearer auth** — `lib/auth.ts` `requireAuth` now accepts
  `Authorization: Bearer <token>` (header wins) or the session cookie, via
  `sessionTokenFromRequest()`.
- **Native token issuance** — `routes/auth.ts`: when a request sends
  `X-Yadegar-Client: mobile`, login/register include the opaque session token in
  the JSON body (web responses unchanged — no header, no token). Logout accepts the
  Bearer token too.
- **Device tokens** — `lib/db/src/schema/device-tokens.ts` (new table) +
  `routes/devices.ts` (`POST /api/devices`, `DELETE /api/devices/:token`).
- **Push seam** — `lib/push.ts` `sendPushToUser()` — looks up a user's devices and
  no-ops unless APNs/FCM creds are set (so the email nudge path is untouched).

---

## 2. Finishing the native build (on a Mac)

> Requires macOS + Xcode (iOS) and/or Android Studio + JDK 17 (Android), and
> CocoaPods. These can't run in the CI/Linux container, so they're done locally.

```bash
# from artifacts/still/
pnpm install
pnpm run build:mobile          # builds dist/public with BASE_PATH=/ + prod API base
pnpm exec cap add ios          # generates the native iOS project (once)
pnpm exec cap add android      # generates the native Android project (once)
pnpm run cap:sync              # rebuilds web + copies into native projects
pnpm run cap:ios               # opens Xcode  → run on a simulator/device
pnpm run cap:android           # opens Android Studio → run
```

- Point the app at a different API while testing:
  `VITE_API_BASE_URL=https://staging.example.com pnpm run build:mobile`.
- App icons / splash: drop a 1024² master and run
  `pnpm dlx @capacitor/assets generate` to produce all PNG sizes (the `icon.svg`
  here is the source mark; stores need PNGs).

---

## 3. Native plugins / config to add on the Mac side

- **Biometric:** `pnpm add capacitor-native-biometric` (the lock-gate uses it via
  an optional import; without it the gate falls through rather than locking out).
- **iOS Info.plist usage strings** (required or App Review rejects):
  `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSFaceIDUsageDescription`.
- **Android:** camera/notifications permissions in `AndroidManifest.xml`;
  POST_NOTIFICATIONS runtime prompt (Android 13+) is handled by the push plugin.
- **Deep links / universal links:** host `apple-app-site-association` and
  `assetlinks.json` on yadegarjournal.com; configure Associated Domains (iOS) and
  intent filters (Android).

---

## 4. Credentials & accounts needed (human-only)

| Need | For |
|---|---|
| Apple Developer Program ($99/yr) | TestFlight, App Store, Sign in with Apple, APNs |
| Google Play Console ($25 once) | Play internal testing + release, FCM |
| APNs auth key (`.p8`) + Key ID + Team ID | iOS push (set `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`) |
| FCM service account JSON | Android push (set `FCM_SERVICE_ACCOUNT`) |
| Sign in with Apple key + Service ID | Apple OAuth (required since Google is offered) |
| RevenueCat account (recommended) | IAP across App Store + Play, reconciled with Stripe |

---

## 5. Remaining work (by phase)

**Native-only (need Xcode/Android Studio):**
- Home-screen / lock-screen **widgets** (today's prompt / "on this day").
- **Share extension** ("Share to Yadegar" → new page).
- Wire `sendPushToUser()` to real APNs/FCM senders and call it from the nudge cron
  (`routes/cron.ts`) alongside email, for push-opted-in users.

**Auth:**
- **Sign in with Apple** (server verification + native button) — required by Apple.
- **Native Google OAuth** — replace the current absolute-URL redirect with an
  in-app-browser + PKCE + deep-link token exchange (the web cookie flow strands
  native users on the website). Email/password native login works fully today.

**Monetization (ties to `docs/MONETIZATION-*`):**
- IAP via RevenueCat; honor web (Stripe) subscriptions on device; `plan` as one
  reconciled source of truth.

**Polish:**
- Editor keyboard/IME hardening in the webview (the top product risk — the composer
  is `contentEditable`/`execCommand`).
- Dark mode variant of the paper theme; iPad/tablet layouts.
- **Farsi + RTL** localization (`dir` is already `auto` in the manifest; the app
  needs an i18n pass).

---

## 6. Migrations & deploy notes

- The new `device_tokens` table needs a migration before `/api/devices` works:
  generate/apply with the repo's Drizzle workflow (`drizzle-kit`), then deploy.
- New frontend deps (`@capacitor/*`) require `pnpm install` on the next web deploy;
  the **web build is unchanged in behaviour** (plugins are lazy, native-guarded).
- The service worker is registered on web in production only. If you prefer to keep
  the live site SW-free for now, remove the registration block in `main.tsx` — the
  rest of the mobile foundation is independent of it.
- **Verify before any deploy:** `pnpm run typecheck` (root) and the web build.
