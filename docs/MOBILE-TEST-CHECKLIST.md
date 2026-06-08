# Mobile test checklist (morning pass)

Everything below was **built but not device-tested** (I can't run the app from my
environment). Pull `main`, reload Metro (`r`), and walk through these. Note
anything that's broken/ugly and I'll fix it.

```bash
cd ~/still && git pull
# Metro tab: press r   (or restart: EXPO_PUBLIC_API_URL=https://yadegarjournal.com npx expo start --dev-client -c)
```

> All of this is **JS-only** — no rebuild needed. It runs on the dev build already
> on your phone.

## Already verified earlier ✅
Auth (email/Google/Apple) · biometric lock · Today (write/autosave) · Library ·
entry detail · reflections · Bring a page back · On this day · Returns · Look back ·
tab bar · push delivery · Settings · Search.

## New in the parity batch — please test

### Library → browse row (Calendar · Collections · Shelf)
- [ ] **Calendar**: opens; ‹ › step months; shows that month's pages; tap a page opens it; empty months read "Nothing written this month."
- [ ] **Collections**: list loads; type a name + **Add** creates one; tap a collection opens its detail; empty state reads sensibly.
- [ ] **Collection detail**: shows the collection's pages; tap a page opens it; back button works.
- [ ] **Shelf**: loads your shelved pages (empty state if none); pull-to-refresh works.

### Look back → keepsakes row (Year in Pages · Capsules)
- [ ] **Year in Pages**: opens; ‹ › step years; shows page + reflection counts; favorites list; tap a favorite opens it.
- [ ] **Capsules**: compose a letter, pick a delivery preset (1/5/10 yrs), **Seal it** → it appears as "Sealed until <date>". (Opening only works once a capsule's date has passed + the cron delivers it.)

### Onboarding (needs a fresh account)
- [ ] Register a **new** account → see the welcome screen → **Begin** → lands on Today. (Existing accounts skip it.)

## Known limitations / not built (need a rebuild or backend work)
- **Add to Collection / Add to Shelf from a page** — the *browse* views are built; the
  "add this page" action on entry detail is a small follow-up.
- **Photos on entries** — needs `expo-image-picker` (rebuild).
- **Import (file / Google Doc)** — needs a document picker (rebuild).
- **Membership / IAP** — Phase 3 (RevenueCat, rebuild).
- **Tab icons, widgets, share-sheet** — Phase 4 (rebuild).

## How to report
For anything broken: a screenshot + the red text from the Metro tab is perfect.
I'll triage and fix each in the morning.
