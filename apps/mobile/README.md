# Yadegar mobile (Expo / React Native)

Phase 0 of the native app. This folder holds our **app code** (auth, API layer,
theme, starter screens). Because Expo needs native tooling and a device/simulator,
**you bootstrap + run it on your machine** (Mac for iOS); it is intentionally *not*
wired into the repo's sandbox-tuned pnpm install.

See `docs/MOBILE-APP-PLAN.md` for the full plan.

---

## Bootstrap (one time, on your machine)

From the repo root:

```bash
# 1. Create the Expo app baseline IN PLACE (Expo Router + TS template).
npx create-expo-app@latest apps/mobile --template expo-template-blank-typescript
# (or the 'default' template, which includes expo-router)

cd apps/mobile

# 2. Install our runtime deps (expo install pins versions to your SDK):
npx expo install expo-router expo-secure-store expo-local-authentication \
  expo-auth-session expo-apple-authentication expo-font expo-constants \
  react-native-safe-area-context react-native-screens
npx expo install nativewind tailwindcss react-native-reanimated
npm i -D @tanstack/react-query
```

Then set up **NativeWind** (Tailwind for RN) per the current docs
(https://www.nativewind.dev/getting-started/expo-router) — it needs a
`babel.config.js` preset, a `metro.config.js` `withNativeWind`, and the
`global.css` import. Our `tailwind.config.js` + `global.css` below are ready to use.

## Run

```bash
# point the app at the backend
echo 'EXPO_PUBLIC_API_URL=https://yadegarjournal.com' > .env

npx expo start            # press i (iOS sim) / a (Android) / scan QR for device
```

For real device builds + store submission later: `eas build` / `eas submit`
(`npm i -g eas-cli && eas login`).

---

## What's here (drop these into the bootstrapped app)
- `lib/api.ts` — fetch wrapper: base URL, bearer token from SecureStore, the
  `X-Yadegar-Client: mobile` header the backend keys on.
- `lib/auth.tsx` — token auth context (sign in / up / out, `/auth/me` rehydrate).
- `lib/theme.ts` — brand color tokens (mirrors the web palette).
- `tailwind.config.js` + `global.css` — NativeWind with the brand tokens.
- `app/_layout.tsx` — providers (React Query + Auth) + auth redirect.
- `app/index.tsx` — routes to Today or Sign in based on auth.
- `app/(auth)/sign-in.tsx` — email/password (Google + Apple wired in Phase 0.x).
- `app/(app)/today.tsx` — first signed-in screen.

## Backend
The backend already accepts mobile auth: `requireAuth` reads
`Authorization: Bearer <token>`, and `/auth/login` + `/auth/register` return the
token in the body when the request sends `X-Yadegar-Client: mobile`. No backend
work needed to start.

## Phase 0.x (next)
- Wire **shared packages** (`@workspace/api-zod`, `@workspace/api-client-react`) via
  Metro `watchFolders` so we stop hand-typing request shapes.
- **Google** (`expo-auth-session`) + **Sign in with Apple** native flows.
- Biometric lock (`expo-local-authentication`) on app open.
