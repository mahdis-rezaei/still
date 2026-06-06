# Stripe setup — Yadegar membership (Phase 2)

How to wire payments for the membership built in Phase 2. The code is already in
the repo and **dormant by default**: with no Stripe env vars set, the billing
routes return 503 and `/settings/plan` shows a gentle "coming soon" — nothing
breaks. This doc takes you from nothing → verified in test mode → live.

> **Two things are independent.** *Setting up Stripe* (account + test verification)
> charges no one. *Going live* needs Stripe account activation **and** flipping the
> `STILL_QUOTA_ENFORCED=1` flag. You can do the first now and the second whenever
> (or never). Until both are done, the free tier is metered but unenforced and
> nobody is charged.

---

## What the code expects (4 env vars)

| Env var | What it is | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret API key | `sk_test_…` (test) / `sk_live_…` (live) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint | `whsec_…` |
| `STRIPE_PRICE_MONTHLY` | Price id for the $8/mo plan | `price_…` |
| `STRIPE_PRICE_ANNUAL` | Price id for the $59/yr plan | `price_…` |

These live in Replit secrets. `GET /api/billing/config` returns `{ enabled: true }`
only when the secret key **and** both price ids are present — that's what flips the
plan page from "coming soon" to the real purchase UI.

Pricing (from `docs/MONETIZATION-STRATEGY.md`): **$8 / month** or **$59 / year**
(≈ $4.92/mo). Free tier = 4 fresh AI returns / month (+3 onboarding bonus in the
first month); members are unlimited (fair use).

---

## Part 1 — Test mode (no business/bank details, no cost)

Do all of this with **Test mode ON** (toggle, top-right of the Stripe Dashboard).

1. **Create the account** at https://stripe.com — just an email/password. No
   activation needed for test mode.

2. **Product + two prices.** Products → **Add product** → name it "Yadegar
   Membership". Add **two recurring prices** to the same product:
   - **$8.00 USD**, recurring, **monthly** → copy the price id (`price_…`) → this is
     `STRIPE_PRICE_MONTHLY`.
   - **$59.00 USD**, recurring, **yearly** → price id → `STRIPE_PRICE_ANNUAL`.

3. **Secret key.** Developers → API keys → copy the **Secret key** (`sk_test_…`) →
   `STRIPE_SECRET_KEY`.

4. **Customer Portal.** Settings → Billing → **Customer portal** → activate it.
   Allow customers to **cancel** and **switch plans**. (Powers "Manage membership".)

5. **Webhook secret.** Either:
   - **Stripe CLI (easiest for dev):** `stripe login`, then
     `stripe listen --forward-to <engine-base>/api/billing/webhook`. It prints a
     `whsec_…` — use that as `STRIPE_WEBHOOK_SECRET` while testing.
   - **Dashboard endpoint:** Developers → Webhooks → Add endpoint → URL
     `https://yadegarjournal.com/api/billing/webhook`, select events
     `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted` → reveal the
     **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

6. **Put the 4 values into Replit secrets**, then restart api-server.

### Verify (test mode)
- `GET /api/billing/config` → `{ "enabled": true }`; `/settings/plan` shows the
  monthly/annual toggle + price + "Become a member".
- "Become a member" → Stripe Checkout → pay with test card
  **`4242 4242 4242 4242`**, any future expiry / any CVC / any ZIP.
- Webhook fires `checkout.session.completed` + `customer.subscription.created`; the
  user's `plan` flips to **member**, `planRenewsAt` set. `/auth/me` and
  `/settings/plan` show member + renewal date.
- "Manage membership" → Stripe portal → cancel → `customer.subscription.deleted` →
  `plan` flips back to **free**. **Pages are never touched** — a lapsed member keeps
  everything and just falls back under the quota.

---

## Part 2 — Going live (when you're ready to charge real money)

1. **Activate the account** — Stripe will ask for business details, a bank account
   (for payouts), and tax info. This is the only step that needs real-world info.
2. **Switch to live keys** — recreate the product/prices in **live** mode (or use
   the same ids if Stripe carried them over), grab `sk_live_…` and a **live**
   webhook signing secret for `https://yadegarjournal.com/api/billing/webhook`, and
   replace the four secrets in Replit with their live values.
3. **Flip enforcement** — set **`STILL_QUOTA_ENFORCED=1`** and restart. This turns
   the shadow gate into the real behavior: a free user past 4 returns/month gets a
   gentle 402 and the upgrade dialog; revisiting past returns stays free for
   everyone. (Re-rolls within ~10 min of a counted return are still allowed.)

Roll back at any time by unsetting `STILL_QUOTA_ENFORCED` — metering continues,
blocking stops. The journal is never gated, only the AI.

---

## How it works (for future maintainers)

- **`artifacts/api-server/src/routes/billing.ts`** — `POST /billing/checkout`
  (creates/reuses the Stripe customer + a subscription Checkout Session),
  `POST /billing/portal` (Billing Portal), `POST /billing/webhook`
  (signature-verified; **source of truth** for `users.plan` via
  `applySubscription`), `GET /billing/config` (public enabled probe).
- **`app.ts`** — a raw-body parser is registered for `/api/billing/webhook` *before*
  the global JSON parser, because Stripe signatures are computed over the exact raw
  bytes.
- **Plan fields** live on `users` (`plan`, `planRenewsAt`, `stripeCustomerId`,
  `stripeSubscriptionId`). The webhook writes them; nothing else does.
- **The quota gate** (`artifacts/api-server/src/lib/quota.ts`) reads `plan` +
  `usage.freshReturns` and is enforced only when `STILL_QUOTA_ENFORCED=1`.
- **Client** — `/settings/plan` (`pages/plan.tsx`) and the shared upgrade dialog
  (`components/quota-prompt-dialog.tsx`).
