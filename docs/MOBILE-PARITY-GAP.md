# Mobile ↔ Web parity gap

A living map of what the **web** app has vs. what's shipped on **mobile** (Expo),
and the recommended order to close the gap. Mobile already has the core loop + the
full engine; this tracks everything else.

> Routes audited from `artifacts/still/src/App.tsx` (web) and `apps/mobile/app/`
> (mobile). Backend endpoints noted where they already exist (so a mobile screen
> is just UI).

## ✅ On mobile already
- Auth: email/password · Google · Apple · biometric lock
- Today: write · autosave · offline draft
- Library · entry detail · reflections
- Engine: Bring a page back · On this day · Returns · Look back
- Push: device registration + delivery (cron sends to devices)
- Bottom tab navigation

## ❌ Not yet on mobile

### Account & Settings  *(mostly JS; partly launch-blocking)*
| Web route | Backend | Notes |
|---|---|---|
| `/settings` | — | hub for the below |
| `/settings/profile` | `PATCH /auth/me` | name / avatar |
| `/settings/notifications` | `GET`/`PATCH /notifications` | nudge cadence — makes push fire |
| `/settings/resurfacing` | `GET`/`PATCH /preferences` (+ `/resurface-mutes`) | memory sensitivity, muted pages |
| `/settings/privacy` | `GET /privacy/export*`, `DELETE /privacy/account` | ⚠️ **in-app account deletion is required by App Store review** |
| `/onboarding` | — | first-run |

### Browse & find  *(JS)*
Search (`/search`) · Calendar (`/calendar`) · Timeline (`/timeline`) ·
Shelf / themes (`/shelf`, `GET /shelf`) · Collections (`/collections`, `GET /collections`)

### Keepsake / depth  *(mostly JS)*
Capsules — sealed letters to your future self (`/capsules`, `/capsules` API) ·
Letters / "Year in Pages" (`/letters/:year`, `/letters`) · Book / print (`/book` — likely web-only) ·
Engine run History (`/history`)

### Bring-in & media  *(partly native)*
Import — paste / file / Google Doc (`/import`, `/imports` API; file picker = native) ·
**Photos on entries** (`/attachments` API; needs `expo-image-picker` → rebuild)

### Monetization & commerce
Membership / Plan (`/settings/plan`, Stripe `/billing`) → **mobile = Phase 3 RevenueCat IAP** ·
Shop (`/shop`, `/shop/:handle`) → could be an in-app web-view (physical goods are IAP-exempt)

### Marketing / legal  *(low in-app priority)*
Home · Why · Philosophy · Help · Terms · Privacy Policy — a couple belong as
links inside Settings; the rest stay web.

### Auth edges  *(low priority)*
Forgot/reset password, verify-email — mobile leans on the emailed links / web.

## Recommended order
1. **Settings cluster** — Profile · Notifications · Resurfacing · **Privacy (export + delete)** · Sign out.
   Mostly JS, unblocks the App Store account-deletion requirement, and surfaces the
   notification prefs that make push fire. *(In progress.)*
2. **Onboarding + Search + Calendar** — first-run + finding pages.
3. **Keepsake depth** — Capsules · Collections · Shelf · Year-in-Pages.
4. **Photos + Import** — fold the native bits (image/doc picker) into one rebuild.
5. **Phase 3 — Membership (RevenueCat IAP)**.
6. **Phase 4 — native delights + store** — "On this day" widget, share-sheet,
   TestFlight / App Store submission (also re-add tab icons via the same rebuild).
