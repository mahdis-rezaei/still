# Yadegar — Mobile Post-Launch Roadmap

> Working doc for continuing the mobile app after the **1.0 App Store submission**.
> Read `CLAUDE.md` first (brand/codename split: user-facing = "Yadegar", internal
> code = "still" — do NOT rename internals).

---

## Current state (as of 1.0 submission)

- **iOS 1.0 is SUBMITTED to the App Store** — build 7, manual release, awaiting
  Apple review. The full app works.
- Just completed a major upgrade: **Expo SDK 52 → 54, React Native 0.76 → 0.81,
  React 18 → 19** (forced by Apple's iOS 26 SDK / Xcode 26 requirement).
- The app is fully functional; the **one known visual issue is fonts** (renders in
  the iOS system font instead of the brand fonts — see Task 1).

### Key facts / IDs
- App Store Connect App ID (ASC App ID): **6778475173**
- App Store URL (once live): `https://apps.apple.com/app/id6778475173`
- Bundle ID: `com.yadegar.app` · Android package: `com.yadegar.app`
- EAS projectId: `713e75e4-8c5c-46cf-9b40-de16938bea8a`
- Apple Team: `9N5834LYYL` (Mahdis Rezaei, Individual)
- Demo review account: `review@yadegarjournal.com` / `Demo123!` (loaded with sample entries)

### Workflow gotchas (READ BEFORE WORKING)
- **`apps/mobile` is a standalone npm project** (own `package-lock.json`), NOT in the
  pnpm workspace. Use **npm** there. It has `.npmrc` with `legacy-peer-deps=true`
  (required for React 19 peer ranges).
- **Develop on the branch the task specifies.** Recent mobile work is on
  `mobile-rich-text`; the task default is `claude/ecstatic-wright-y4npO`. Confirm
  before pushing.
- **The git push proxy is flaky (intermittent 503s).** When `git push` fails, push
  via the GitHub MCP `create_or_update_file` tool (repo `mahdis-rezaei/still`), then
  `git reset --hard origin/<branch>` to resync local.
- **iOS builds must be done in the cloud via EAS** —
  `npx eas-cli@latest build --platform ios --profile production`. Local Xcode builds
  fail (Xcode 26 can't compile RN's `fmt` library). There is also a `simulator` EAS
  profile for screenshots. The user runs all eas/git commands on their Mac; Claude
  makes code changes + pushes.
- `app.json` has `newArchEnabled: true` (New Architecture / Fabric).

---

## TASK 1 — Fix the brand fonts (TOP PRIORITY)

**Symptom:** the app renders in the iOS system font (San Francisco) instead of the
brand fonts. Web uses **Fraunces** (display/headings), **Newsreader** (body/quotes),
**Inter** (UI labels). This broke during the SDK 54 upgrade.

**What we know (important — saves repeating failed attempts):**
- `lib/app-fonts.ts` loads fonts via `expo-font` `loadAsync` + `@expo-google-fonts/*`
  packages, and monkey-patches RN's `Text.render` to apply a font family by role
  (size/weight/style) — see `pickFamily()`.
- On **RN 0.81 + New Architecture + React 19 this is fully broken.** We added an
  explicit hard-coded `style={{ fontFamily: "Fraunces_600SemiBold" }}` probe on the
  welcome wordmark (`app/(auth)/welcome.tsx`) and **even that renders as system font**
  → fonts are NOT loading/registering at all. So it's not only the `Text.render`
  patch — `loadAsync` itself isn't taking in the production build.
- Already done: `@expo-google-fonts/{fraunces,newsreader,inter}` updated to latest;
  `expo-font` is now a **config plugin** in `app.json` `plugins`.

**Agreed plan:**
1. **Embed the TTF files at build time via the `expo-font` config plugin**
   (`["expo-font", { "fonts": [ ...ttf paths... ] }]`). This is the bulletproof,
   no-runtime-`loadAsync` method and removes all dynamic-import / asset-bundling
   failure modes. Copy the needed TTFs into `apps/mobile/assets/fonts/` and reference
   them (don't rely on `node_modules` paths).
2. **Determine the exact iOS font family name** each embedded TTF registers under
   (PostScript / full name — may differ from `Fraunces_600SemiBold`). Use those names
   in styles.
3. **Apply the fonts** — the global `Text.render` patch is dead on the New Arch, so
   either (a) a robust app-wide mechanism that works on Fabric, or (b) explicit font
   families on components. Keep the role mapping intent from `pickFamily()`.
4. Rebuild via EAS, **verify on TestFlight** before shipping as 1.0.1.

**Files:** `lib/app-fonts.ts`, `app.json` (plugins), `tailwind.config.js` (has the
`display`/`body`/`sans` font tokens), `app/(auth)/welcome.tsx` (has the probe).

---

## TASK 2 — Web: logo mark, favicon, and App Store download path

> The **web frontend is a SEPARATE part of the codebase** from `apps/mobile` — locate
> it first (deployed to yadegarjournal.com).

1. **Favicon** = the app mark (source art: `apps/mobile/assets/icon-source.png` — the
   open-book "Y" on cream).
2. **Small logo mark in the site header**, next to/above the "Yadegar" wordmark — for
   brand cohesion across web ↔ app ↔ App Store.
3. **App Store download path** (gate behind "app is live" — see timing below):
   - **Apple Smart App Banner** — add to web `<head>`:
     `<meta name="apple-itunes-app" content="app-id=6778475173">`
   - **Official "Download on the App Store" badge** in the hero + footer, linking to
     `https://apps.apple.com/app/id6778475173` (use Apple's official badge artwork).
   - **Platform-aware CTA:** lead with the app on iPhone; show a **QR code** on desktop.
   - Keep web sign-in available — invite, don't force (no full-screen interstitial).
   - **Timing:** only enable once the app is Approved AND released. Manual release means
     flip the web CTAs live + press "Release" in App Store Connect at the same moment.

---

## TASK 3 — FAQ anchor links (deferred)

`components/markdown.tsx` currently renders in-page `#anchors` as **plain text**
(RN has no DOM anchors). Make the Contents items (in `lib/faq.ts`) tappable and
**scroll the ScrollView to the target section** — measure each `##` heading's
y-offset (onLayout) and drive the parent ScrollView. (Numbering alignment is already
fixed: the list number column was widened to `width: 26`.)

---

## TASK 4 — Membership in-app purchase (deferred)

Currently `app/(app)/membership.tsx` is intentionally **price-free with no checkout**
(App Store rules: digital subscriptions must use IAP). To make it real:
- Integrate **RevenueCat** + create the subscription product(s) in App Store Connect
  (and Google Play for Android).
- Wire the quota gate (currently shadow until `STILL_QUOTA_ENFORCED=1`).
- See `docs/MONETIZATION-*.md` and `docs/STRIPE-SETUP.md` for the existing strategy.

---

## TASK 5 — Android app (new — see assessment below)

The app is already Expo/React Native, so most code is cross-platform. `app.json`
already has Android config (`package`, `adaptiveIcon` via `assets/adaptive-icon.png`,
permissions). Remaining work is testing/polish + Play Store setup.

Key Android-specific items:
- **Sign in with Apple** is iOS-only — conditionally hide it on Android (keep Google +
  email/password). Apple requires SiwA on iOS when offering Google; Android doesn't.
- **Push notifications** need **FCM (Firebase)** setup for Android (iOS uses APNs,
  already working).
- Verify each native module on Android: `expo-local-authentication` (biometric),
  `expo-speech-recognition`, `expo-image-picker`, `expo-secure-store`, `expo-notifications`.
- Android adaptive icon + splash polish; test layouts on Android.
- **Google Play Console** ($25 one-time): store listing, Android screenshots, Data
  Safety form (≈ App Privacy), content rating.
- Build/submit via EAS: `eas build --platform android` → `eas submit -p android`.

---

## Suggested order
1. **Fonts (1.0.1)** — top priority, the one visible flaw.
2. **Web logo/favicon + App Store download CTAs** — pairs well, gate on "live".
3. **Android app** — biggest scope; do once iOS 1.0 is stable.
4. FAQ anchors + Membership IAP — opportunistic.
