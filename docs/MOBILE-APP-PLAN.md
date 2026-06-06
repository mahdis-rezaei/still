# Yadegar — iOS & Android App Plan

*Staff/VP-PM plan for taking Yadegar to native mobile. Grounded in the current
stack: React/Vite web client (`artifacts/still/`), Express API
(`artifacts/api-server/`), Postgres/Drizzle, Anthropic engine, cookie-session
auth, deployed via Replit at yadegarjournal.com.*

> Brand is **Yadegar** (user-facing); code is **still** (repo/routes/tables).

---

## 1. Executive summary & recommendation

**Mobile is not a "nice to have" for Yadegar — it's the natural home of the
habit.** Journaling happens in bed, on a commute, in a quiet moment — phone
moments. The two highest-leverage things mobile unlocks (push nudges and a
private, always-with-you writing surface) are exactly Yadegar's core loop.

**Recommendation: ship both stores via Capacitor (wrap the existing React app),
not a React Native rewrite — but invest in a specific set of *native* capabilities
so it's a real app, not a thin web wrapper.** This reuses ~100% of the polished,
already-responsive UI and the entire AI-engine integration, and gets us to
TestFlight in weeks instead of months. The native investments (biometric lock,
push, widgets, share sheet, IAP, Sign in with Apple) are what deliver user value
*and* clear Apple's "no thin wrappers" review bar.

**Headline timeline (small, Claude-assisted team):**
- TestFlight / Play internal MVP: **~4–5 weeks**
- Public launch on both stores: **~8–12 weeks** (incl. review cycles)
- Native differentiators (widgets, share ext, offline-first): rolling after launch

**The one strategic risk to watch:** the editor is `contentEditable`/`execCommand`
in a webview — fine for most, but mobile-keyboard UX is the make-or-break. We
harden it in Phase 1 and keep RN as the escape hatch if it can't be made smooth.

---

## 2. Why mobile (strategic rationale)

- **Habit formation lives on the phone.** Daily/near-daily journaling is a
  notification-and-proximity game. Email nudges (today's mechanism) convert far
  worse than push.
- **Intimacy & trust.** A private journal you can FaceID-lock and carry feels more
  yours than a browser tab. This deepens the moat (the encrypted archive).
- **Capture-in-the-moment.** Camera, voice, and a share sheet ("send this thought
  to Yadegar") capture entries that would otherwise be lost.
- **Distribution.** App Store / Play presence is a discovery and credibility
  channel a web app can't replicate — and the place users expect a journaling app
  to be.
- **Widgets & lock screen.** A daily prompt or "on this day" on the home screen is
  a calm, on-brand re-engagement surface (no feed, no streak-shaming).

---

## 3. Build-approach decision

| Option | Reuse | Native feel | Time to stores | Ongoing cost | Verdict |
|---|---|---|---|---|---|
| **PWA only** | 100% | Low | N/A (no stores) | Lowest | Stepping stone, not the destination — no store presence, weak iOS push history, no IAP |
| **Capacitor (wrap React)** ✅ | ~100% UI + logic | Good (native plugins) | **Fastest** | Low (one codebase) | **Recommended** |
| **Expo / React Native** | Logic only; UI rewrite | High | Slow (UI rewrite) | Medium (shared-ish) | Fallback / future if webview UX disappoints |
| **Native (Swift + Kotlin)** | ~0% | Highest | Slowest | Highest (2 codebases) | Overkill for a text-first app + small team |

**Why Capacitor:** the app is already responsive and the value is content + AI, not
graphics-heavy native interaction. Capacitor lets us reuse the entire UI and ship a
single codebase to both stores, adding native power via plugins exactly where it
matters. For a contemplative, text-first product with a small team, this is 90% of
the value at a fraction of the cost.

**Why not RN now:** a full UI rewrite of a *launched, polished* product to chase a
marginally more native feel is poor ROI today. Keep it as the documented migration
path if the editor or scroll/keyboard UX proves unacceptable in a webview.

**Free win:** add a **PWA manifest + service worker** along the way (the repo has
neither today) — gives an installable web app and offline shell for free, and is
reused by Capacitor.

---

## 4. Architecture & backend changes

The API and engine stay as-is; mobile is a new client. Required backend work:

1. **Token auth for native clients.** Auth is currently an httpOnly cookie
   (`SESSION_COOKIE = "still_session"`, `artifacts/api-server/src/lib/auth.ts`).
   Native apps should send `Authorization: Bearer <token>` instead of relying on
   cookies. Extend `requireAuth` to accept the session token from the header, and
   add a token issue/refresh path on login/OAuth. Store the token in the device
   **Keychain (iOS) / Keystore (Android)** — never in plain storage.
2. **Sign in with Apple.** Apple *requires* it whenever you offer third-party
   sign-in (we offer Google). Add an Apple OAuth path alongside the existing Google
   one in `routes/auth.ts`; link to the same user by verified email.
3. **Push notification infrastructure.** Today nudges are email-only (Resend, via
   `routes/cron.ts`). Add: a `device_tokens` table (userId, platform, token), a
   register/unregister endpoint, and APNs (iOS) + FCM (Android) sending. Route the
   existing nudge logic to also deliver push for users who opted in — reuse the
   same "only when there's something honest to send" discipline.
4. **IAP entitlement reconciliation.** Subscriptions can be bought on web (Stripe)
   *or* via Apple/Google IAP. The server needs **one source of truth for
   `users.plan`** that merges all three. Strongly recommend **RevenueCat** to
   abstract StoreKit/Play Billing and reconcile with Stripe; validate receipts +
   handle App Store Server Notifications / Google RTDN server-side. (Ties directly
   into `docs/MONETIZATION-BUILD-PLAN.md` — the billing webhook becomes
   multi-source.)
5. **Offline sync.** Single-user, append-mostly data → **last-write-wins** is
   sufficient. Queue writes locally and replay on reconnect; cache reads. Entries
   carry `updatedAt`; no complex CRDT needed.
6. **CORS / deep-link / universal-link** config and an `apple-app-site-association`
   + Android asset-links file served from the domain.

---

## 5. Mobile feature set

### Must-have for v1 (also what clears Apple Guideline 4.2 "minimum functionality")
- **Biometric / passcode app lock** (FaceID/TouchID/biometric) — table stakes for a
  private journal; a privacy headline, not a setting buried away.
- **Native camera & photo library** for page images (web upload already exists;
  native is smoother and enables in-the-moment capture).
- **Sign in with Apple** (required) + existing email/Google.
- **In-app subscription (IAP)** for membership, via RevenueCat (see §6).
- **In-app account deletion** (Apple Guideline 5.1.1(v) — already exists in the web
  app; surface it natively).
- **Offline writing** (compose + auto-save locally, sync on reconnect).
- **Secure token storage** (Keychain/Keystore).
- **Safe-area / notch / keyboard-aware** layout; basic haptics.

### Fast-follow (the differentiators that make it feel native)
- **Push nudges** — "a nudge to write" / "a page brought back," opt-in, on-brand
  (no streaks, no guilt).
- **Home-screen & lock-screen widgets** — today's prompt, "on this day," or the
  last returned page. Calm re-engagement with zero feed.
- **Share extension** — "Share to Yadegar" from any app (text or photo → a new
  page).
- **Native speech-to-text** — replaces Web Speech (which is hidden on Firefox and
  varies by browser); on-device, higher quality, works offline on iOS.
- **Deep links / universal links** — open a specific page/return from a push or the
  web.

### Later
- **iPad / tablet** two-column layouts; **Apple Watch** quick-capture (maybe).
- **Farsi localization + RTL** — see §9; a real, on-brand growth lever.

---

## 6. Monetization on mobile (ties to the membership plan)

This is where mobile materially intersects the pricing work in
`docs/MONETIZATION-STRATEGY.md` ($8/mo or $59/yr; free = 4 fresh returns/mo).

- **The platform tax is real.** Apple/Google take **30%**, dropping to **15%**
  under the Small Business Program (<$1M/yr) and for subscriptions after 12 months.
  $8/mo via IAP nets ~$6.80 at 15%. COGS ~$1/typical member → margins still
  healthy, but plan for the cut.
- **Web-first acquisition is the standard play.** Acquire and subscribe users on
  the **web** (no platform cut, via Stripe), and simply **honor that subscription
  when they sign in on mobile** (multiplatform/"reader" pattern). New mobile-native
  users get **IAP** for convenience.
- **Anti-steering is loosening.** Post-2025 (US Epic ruling) and under the EU DMA,
  apps can link out to external purchase in those regions. Use the external-link
  entitlement where allowed; keep IAP in-app where required.
- **Pricing parity, absorb the cut.** Recommend keeping the same price on mobile
  (trust > squeezing) and absorbing the platform fee — margins allow it — rather
  than the "+$1.99 on mobile" tactic, which erodes trust for a values-led product.
- **One entitlement source of truth.** RevenueCat reconciles Stripe + App Store +
  Play so `users.plan` is correct regardless of where the user paid. Don't
  hand-roll three receipt validators.

**Net:** mobile doesn't break the economics; it adds a 15% tax on mobile-sourced
subs, mitigated by web-first acquisition. The free-tier metering and per-return
cost bound from the monetization plan apply identically.

---

## 7. Privacy & security (a brand pillar — don't regress it)

- **At rest:** entries are already AES-256-GCM encrypted server-side; that holds.
- **On device:** session token in Keychain/Keystore; biometric lock gating app
  open; no plaintext journal cached insecurely (encrypt local offline cache).
- **Privacy nutrition labels / Data Safety form** must be accurate and match the
  privacy page's promises ("never shared, never sold, read only to choose a page").
- **No new data processors for content.** Consistent with the single-vendor
  (Anthropic) stance — don't add mobile analytics SDKs that exfiltrate journal text.
  Use privacy-respecting, content-blind analytics only.
- **Push payloads carry no journal content** — a nudge says "a page returned," the
  content loads in-app after unlock.

---

## 8. App Store review & compliance risks

| Risk | Mitigation |
|---|---|
| **4.2 minimum functionality** (rejects thin web wrappers) | The native feature set in §5 (biometrics, push, widgets, share ext, camera, offline) makes it a genuine app |
| **Sign in with Apple required** (we offer Google) | Add it in v1 |
| **5.1.1(v) account deletion required** | Already built; surface natively |
| **Subscriptions must use IAP** for in-app unlock | RevenueCat/StoreKit; honor web subs for existing members |
| **Mental-health / crisis sensitivity** | Position as journaling/wellness, **not medical**; no diagnostic claims; keep crisis copy pointing to real resources (988/findahelpline) exactly as the engine already does; set appropriate age rating |
| **Privacy labels accuracy** | Audit data flows; match the privacy policy |
| **Webview editor UX** (product, not policy) | Harden keyboard/IME in Phase 1; RN fallback documented |

---

## 9. Design / UX adaptations

- The web UI is responsive already; the native work is *feel*, not re-layout:
  - **Bottom tab bar** for the primary destinations (Today · Look back · Explore ·
    Settings) instead of the desktop top-bar + hamburger — the expected native
    pattern.
  - **Keyboard-aware editor**: input accessory bar for the formatting toolbar,
    proper scroll-into-view, IME/dictation handling. This is the top UX investment.
  - Safe areas, pull-to-refresh, haptics, system **dark mode** support (verify the
    sepia/paper theme has a dark variant; if not, design one).
  - Dynamic Type / large-text accessibility.
- **Farsi + RTL** is a strategic differentiator. Yadegar *means* a Persian
  keepsake; a first-class Farsi, right-to-left experience would resonate deeply
  with a natural early audience and is rare among journaling apps. Scope it as a
  fast-follow once the LTR app is stable (RTL touches layout, the editor, and
  copy).

---

## 10. Phased roadmap

**Phase 0 — Foundations (backend + scaffold)**
- Token auth in `requireAuth`; Sign in with Apple; device-token table + endpoints.
- Capacitor project around the existing build; PWA manifest + service worker.
- Secure storage, deep-link config, CI for app builds.

**Phase 1 — MVP to TestFlight / Play internal (~4–5 wks)**
- Wrap app; bottom tab bar; biometric lock; native camera; offline write+sync
  (basic); Sign in with Apple; IAP via RevenueCat; native account deletion;
  keyboard/editor hardening pass #1.

**Phase 2 — Public launch (~8–12 wks total)**
- Push nudges (APNs/FCM wired to the nudge cron); deep links; privacy labels /
  data-safety; store listings + ASO; editor hardening pass #2; beta feedback fixes.

**Phase 3 — Native differentiators**
- Home-screen / lock-screen widgets; share extension; native dictation; richer
  offline-first.

**Phase 4 — Reach**
- Farsi + RTL localization; iPad/tablet layouts; (optional) Apple Watch capture.

---

## 11. Effort, cost & team

- **Accounts/fees:** Apple Developer ($99/yr), Google Play ($25 once), RevenueCat
  (free tier covers early revenue), APNs/FCM (free).
- **Build:** Capacitor MVP is largely config + plugin wiring + the editor-UX work,
  well within a Claude-assisted solo/small-team cadence. Budget a native
  contractor for widgets/share-extension polish if speed matters.
- **Contrast:** an RN rewrite is ~3–6 months; native (Swift+Kotlin) ~6+ months and
  two codebases. Capacitor is the only option that fits the team and the timeline.

---

## 12. Success metrics

- **Activation:** install → first kept page (target the aha within session 1).
- **Retention:** D1 / D7 / D30; weekly writing frequency.
- **Engagement quality (on-brand):** % who use "Bring a page back"; push opt-in
  rate; nudge → return rate. (Explicitly **not** streaks.)
- **Monetization:** mobile free→member conversion; web-vs-IAP subscription mix
  (watch the platform-tax exposure).
- **Health:** crash-free sessions, editor-related support tickets, store rating.

---

## 13. Open decisions (product calls)

- **Stack:** Capacitor (recommended) vs Expo RN.
- **IAP plumbing:** RevenueCat (recommended) vs hand-rolled receipt validation.
- **Mobile pricing:** parity with web (recommended) vs mobile premium to offset the
  cut.
- **Farsi/RTL:** v1 scope vs fast-follow (recommended: fast-follow).
- **iPad/tablet:** priority vs later.
- **Editor:** commit to hardening the webview composer vs pre-emptively planning an
  RN editor.

---

## 14. Bottom line

Wrap the existing, already-responsive React app in **Capacitor**, add the **native
capabilities that matter** (biometric lock, push, camera, widgets, share sheet,
Sign in with Apple, IAP), and reconcile subscriptions across web + stores with
**RevenueCat**. It's the fastest credible path to both app stores, preserves the
privacy and calm-by-design brand, and extends — rather than forks — the codebase.
The single thing to validate early is the **webview editing experience**; everything
else is well-trodden. Mobile turns Yadegar from a site you visit into a companion
you carry.
