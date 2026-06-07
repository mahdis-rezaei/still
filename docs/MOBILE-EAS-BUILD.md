# Yadegar mobile — EAS dev build & getting push to actually deliver

This is the runbook to take the push work we already shipped (the `device_tokens`
backend + `lib/push.ts` register/unregister on the client) and make a push
*actually arrive on a phone*. Push is a **native module**, so it does not work in
Expo Go — you need a **dev build** (a custom Expo client with the native push code
compiled in) and an **EAS project id**.

> TL;DR: `eas init` (writes the project id) → `eas build --profile development`
> → install on a real device → grant notifications → the app auto-registers the
> token → fire `/cron/run-nudges` (or the Expo push tool) → it arrives.

---

## 0. Why this is needed (what's already done vs. not)
- **Done (in the repo):** `expo-notifications` + `expo-device`, `lib/push.ts`
  (`registerForPush` / `unregisterForPush`), wired into the auth lifecycle; the
  `expo-notifications` plugin in `app.json`; and the whole backend (`device_tokens`,
  `POST`/`DELETE /notifications/devices`, the Expo Push send in the cron).
- **Not done (this doc):** an EAS **project id** (`registerForPush` passes it to
  `getExpoPushTokenAsync`; without it, no production token), a **dev build** (Expo
  Go can't get a push token on SDK 53+ and can't run native modules), and **push
  credentials** (APNs for iOS, FCM for Android).

## 1. Prerequisites
- An **Expo account** (free): https://expo.dev — this is what owns the project id
  and stores push credentials.
- **iOS:** a paid **Apple Developer account** ($99/yr). Push (APNs) is not available
  on a free Apple account. You also need a **physical iPhone** — the iOS Simulator
  cannot receive remote push.
- **Android:** a **Firebase project** for FCM (free). A physical device or an
  emulator *with Google Play services* can receive push.
- Tools: `npm i -g eas-cli` then `eas login`. (Node 18+; the repo already pins Expo
  SDK 52.)

## 2. Create the EAS project + write the project id (one time)
From `apps/mobile/`:

```bash
cd apps/mobile
eas init
```

`eas init` creates the project on expo.dev and writes the id into `app.json` under
`expo.extra.eas.projectId`. **That is exactly what our `lib/push.ts` reads**
(`Constants.expoConfig.extra.eas.projectId`), so once this lands, token
registration has the id it needs. Commit the `app.json` change.

> If you prefer to set it by hand, add:
> ```json
> "extra": { "eas": { "projectId": "<the-uuid-from-expo.dev>" } }
> ```
> under `expo` in `app.json`.

## 3. Add EAS Build config
```bash
eas build:configure
```

This writes `eas.json` with `development` / `preview` / `production` profiles.
Make sure the **development** profile builds a **dev client** (it does by default
on current eas-cli). It should look roughly like:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": { "distribution": "internal" },
    "production": {}
  }
}
```

`distribution: "internal"` = installable directly on registered devices without
going through the stores (what you want for testing push).

## 4. Push credentials
### iOS (APNs)
EAS manages this for you. On the first iOS build it will offer to **generate an
APNs key** — say yes; EAS stores it and reuses it. You also must **register your
test device**:

```bash
eas device:create
```

Follow the link/QR on the device to register its UDID, so the development build's
provisioning profile includes it.

### Android (FCM)
Expo push for Android rides **FCM**. Set it up once:
1. Create a Firebase project, add an **Android app** with package
   `com.yadegar.app` (matches `app.json`), download **`google-services.json`** and
   drop it in `apps/mobile/`, and reference it in `app.json`:
   ```json
   "android": {
     "package": "com.yadegar.app",
     "googleServicesFile": "./google-services.json"
   }
   ```
2. Give Expo the **FCM v1 service-account key** so the Expo Push service can send
   on your behalf: in the Firebase console → Project settings → Service accounts →
   *Generate new private key*, then upload that JSON via `eas credentials`
   (Android → *Push Notifications: Manage your FCM V1 service account key*) or the
   project's Credentials page on expo.dev.

> Note: Google has retired the legacy FCM server key — use the **FCM v1**
> service-account JSON above, not an old server key.

## 5. Build the dev client and install it
```bash
# iOS (physical device)
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

When the build finishes, EAS gives a QR/URL. Install the build on your device
(iOS: the install link; Android: the `.apk`/`.aab` link). This is your custom
"Yadegar (dev)" app — it has the native push code Expo Go lacks.

## 6. Run the JS against the dev build
```bash
cd apps/mobile
# point the app at the live backend (or your machine's IP for a local server)
EXPO_PUBLIC_API_URL=https://yadegarjournal.com npx expo start --dev-client
```

Open the dev build on the device and scan/connect. **Sign in.** On launch/sign-in,
`registerForPush()` runs:
1. it prompts for notification permission → **Allow**;
2. it fetches the Expo push token (using the project id from step 2);
3. it `POST`s the token to `/api/notifications/devices`.

Confirm the registration landed:
```sql
select user_id, platform, created_at from device_tokens;
```
You should see one row for your device.

## 7. Make a push actually arrive
Two ways:

**A. Quick smoke test (no cron, no engine)** — Expo's tool or curl, addressed to
the token you just registered:
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "content-type: application/json" \
  -d '{"to":"ExponentPushToken[xxxxxxxx]","title":"Yadegar","body":"a page worth returning to","sound":"default"}'
```
Or paste the token into https://expo.dev/notifications. If it arrives, the device +
credentials are correct.

**B. The real path (our cron)** — this proves the whole pipeline, including the
`pushSent` counter and the silence discipline:
1. In the app, set a nudge cadence (notification prefs) so the user is "due".
2. Fire the cron:
   ```bash
   curl -X POST https://yadegarjournal.com/api/cron/run-nudges \
     -H "x-cron-secret: $CRON_SECRET"
   ```
3. The JSON summary now includes `pushSent`; a memory push only fires if the engine
   actually surfaced a page (by design). Foregrounded, our
   `setNotificationHandler` shows it; backgrounded, the OS does.

## 8. Tap-to-route (optional polish, later)
Each push carries `data` (`{ type: "writing" | "on_this_day" | "memory", entryId }`).
A small `Notifications.addNotificationResponseReceivedListener` in the app can deep-
link a tap to `/today` or `/entry/[id]`. Not required for delivery — a follow-up.

## 9. Gotchas
- **Expo Go won't work** for push on SDK 53+ and can't run native modules — always
  test push on the **dev build**.
- **iOS Simulator never receives remote push** — use a real iPhone.
- **No project id → no token.** If `device_tokens` stays empty, check
  `app.json` has `expo.extra.eas.projectId` (step 2).
- **Android with no Google Play services** (some emulators) won't get an FCM token.
- A token that later returns `DeviceNotRegistered` is **auto-pruned** by
  `lib/push.ts` — that's expected on uninstall/permission-revoke.
- After changing native config (`app.json` plugins, `google-services.json`), you
  must **rebuild** the dev client — JS-only changes hot-reload, native changes don't.

## 10. Where this sits in the roadmap
This unblocks **push delivery** for Phase 2. Store submission (TestFlight / Play
internal testing via **EAS Submit**), app icons/splash, and privacy labels are
**Phase 4** — see `docs/MOBILE-APP-PLAN.md` §9–§10. RevenueCat IAP is **Phase 3**
and also needs a dev build, so doing this EAS setup now pays off there too.
