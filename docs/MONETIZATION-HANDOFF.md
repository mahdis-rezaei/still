# Monetization — Handoff

*For the engineer/agent picking up Yadegar monetization. Read this first, then the
two companion docs for depth:*
- **`docs/MONETIZATION-STRATEGY.md`** — the *why/what* (model, economics, pricing).
- **`docs/MONETIZATION-BUILD-PLAN.md`** — the *how* (phased, file-level plan).

> Brand is **Yadegar** (user-facing); code is **still** (repo, routes, tables).
> Don't rename internals. Corrections from the engine review are marked **[review]**.

---

## 1. TL;DR

We're adding paid plans to a product that, until now, gives unlimited AI for free
with no metering. The strategy in one line: **gate the AI, never the journal.**
Writing/keeping/importing/browsing/exporting stay free forever; the paid unit is a
**"fresh AI return"** (a `/memories/run` that actually calls the model — a cache
miss). Cache hits and revisiting past returns are always free.

**Decisions (locked):**
- **Free:** unlimited journal + **4 fresh returns/month** ("about one a week") + a
  small onboarding bonus (~first 3).
- **Member:** **$8/mo or $59/yr** (annual-first ≈ $4.92/mo), unlimited within fair
  use. Member-only: nudge emails + a *designed* Year-in-Pages Book. **[review]**
  Basic print/PDF of your own year stays **free** (it's your data; Yadegar means
  *keepsake* — don't gate the keepsake-print).
- **Provider:** all journal content stays on **Anthropic** (single data processor
  = privacy). **Sonnet** for extract→score + crisis; **Haiku**
  (`claude-haiku-4-5-20251001`) for hard-floor + theme.
- **Per-return cost bounded** by capping what the model *reads* per entry — the
  precondition that makes flat pricing fair (with crisis exempted, §6).

---

## 2. Where the work lives (git state)

- **These three docs now live in `docs/` on `main`** (recreated with the review
  corrections folded in). The earlier `claude/yadegar-monetization` branch was
  **never pushed** and is superseded — work from `main`.
- The **FAQ PR #7 is already merged** into `main` (and the markdown stack
  lazy-loaded), so there's no longer any branch to keep these docs away from.
- **Code changes:** none yet — this is docs/design only. Phase 0 is the first code.
- **When you build:** branch off `main`, do Phase 0 as one PR, merge as a **merge
  commit, not squash** (repo convention). Replit deploys from the working branch,
  not `main`.

---

## 3. Cost model — the facts (verified against the engine)

**One expensive operation; everything else is ~$0.**

| Action | Model cost |
|---|---|
| Write/keep/edit, browse, On This Day, date-based Look Back, export | **$0** (SQL) |
| **A fresh AI return** (two-pass extract→score) | **~$0.08–0.15** |
| Re-opening a past return (result cache hit) | **~$0.002** |
| Import classification | **~$0.004–0.007 / entry** (one-time; ~$4–7 / 1,000) |

Per fresh return ≈ **17.4K input + 4K output** (Sonnet @ $3/$15 per M ≈ $0.11
cold). The **PASS-2 system prompt alone is ~8.3K tokens** and dominates. The DB
result cache (`still_results`, keyed on stage + `PROMPT_VERSION` + model + payload)
makes re-opens nearly free.

**[review]** Prompt caching's ~$0.085 is *at volume* — the cache TTL is ~5 min, so
at launch/low traffic the static prompt is often cold and savings are marginal.

**The leak to close first:** no usage metering today, only an in-memory **30/hour**
cap on `/memories/run` (verified). A determined free user ≈ **~$70/day**.

**The abuse vector:** entry *count* is capped (25) but entry *length* is not — a
30K-word entry is processed in full. Fix = cap what the model **reads** per entry.

---

## 4. Codebase map (the seams to touch)

| Concern | Location |
|---|---|
| User model | `lib/db/src/schema/users.ts` (no plan/quota fields today) |
| Schema registry / migrations | `lib/db/src/schema/index.ts`; Drizzle |
| Result cache table | `lib/db/src/schema/still-results.ts` |
| All LLM calls + prompts + `MODEL`/`PROMPT_VERSION` | `artifacts/api-server/src/routes/still.ts` |
| Engine orchestration + 25-entry pool assembly | `artifacts/api-server/src/lib/memory-engine.ts` |
| Billable path + existing rate limiter | `artifacts/api-server/src/routes/memories.ts` (`/memories/run`, `runLimiter`) |
| Auth + `GET /auth/me` | `artifacts/api-server/src/routes/auth.ts` |
| Background classify/nudge crons | `artifacts/api-server/src/routes/cron.ts` |
| **Generated API client** | `lib/api-client-react/`, `lib/api-zod/` — **[review] HAND-PATCH, do NOT regenerate** (see gotcha #7) |
| Frontend auth context | `artifacts/still/src/lib/auth.tsx` (`AuthUser`) |
| Settings hub + routing | `artifacts/still/src/pages/settings.tsx`, `App.tsx` |
| Return-trigger UIs (quota prompt fires) | `today.tsx`, `what-keeps-returning.tsx` (**sends `fresh:true`**), `then-and-now.tsx`, `revisit-a-time.tsx` |

---

## 5. The plan, phased (see BUILD-PLAN for file-level detail)

**Phase 0 — COGS cuts + metering (ship first, no user-facing change):**
1. **Prompt caching** (`cache_control`) on the static PASS-1/2 system prompts
   (volume-dependent — §3).
2. **Model tiering:** Haiku for hard-floor + theme; keep Sonnet for extract,
   score, **and crisis**.
3. **Per-entry read window** — sentence-sampled (not head-truncated), with a
   per-call input budget. **[review] Crisis exempt — give it a large read budget;
   truncating it risks a missed crisis (false negative).** Validate with the eval
   harness + a long-entry fixture.
4. **Lazy import classification.**
5. **Usage metering:** new `usage` table; thread `modelCalled`/usage up; increment
   **only on cache miss**. **[review] Decide re-roll accounting now:** "What keeps
   returning" / "look again" send `fresh:true` → each click is a real model call,
   so naive counting makes a free user's "show another" burn a return. Treat
   re-rolls of the *same surfacing* within a window as one billable return.

**Phase 1 — plans + free quota:** add `plan`/`stripe*` to `users`; a `quota.ts`
gate on `/memories/run` (free = 4/mo, member = fair-use); expose `plan`+`usage` on
`/auth/me` (**hand-patch the client — #7**); a gentle upgrade prompt on the
return-trigger UIs.

**Phase 2 — Stripe:** `billing.ts` (checkout, portal, **webhook = source of truth
for `plan`**); `/settings/plan` page + settings card; `STRIPE_*` env.

**Phase 3 — polish:** top-up credits, COGS dashboard, trials/annual incentive,
multi-instance counters, `PROMPT_VERSION`-bump cost awareness.

---

## 6. Critical gotchas

- **`PROMPT_VERSION` bumps invalidate the whole result cache** → a cold-return cost
  spike. Schedule/pre-warm; never bump casually.
- **Verify engine parity with the eval harness** after *any* prompt-caching,
  model-tiering, or read-window change: `pnpm --filter @workspace/scripts run eval`
  (or live `STILL_MODE=http STILL_API_URL=<engine base incl. /api>`). This harness
  is the calibration guard.
- **[review] Crisis check is a safety exception.** Don't let the per-entry read
  window aggressively truncate the most-recent entry for the crisis call — a
  missed crisis is the worst outcome. Read it nearly in full (it's cheap).
- **Entries are encrypted at rest** (AES-256-GCM) — the server can't text-search
  them; don't design usage features that assume readable bodies in SQL. (Metering
  counts model calls + token totals, not content — fine.)
- **Count quota on real spend only:** increment on `modelCalled === true` (cache
  miss). **[review] And exempt same-surfacing re-rolls** (`fresh:true` clicks) so
  the meter stays == COGS and on-brand.
- **Never lock a user's pages** on downgrade/cancel — flip `plan` → `free`, let the
  quota gate apply.
- **Single-vendor on purpose:** don't route journal text to a non-Anthropic LLM for
  token savings — it adds a data processor and breaks the privacy promise.
- **[review] #7 — Generated client: HAND-PATCH, do NOT run orval codegen.** Codegen
  is broken in this repo: a full `@workspace/api-spec run codegen` collides on
  duplicate exports for collections/capsules/shelf/look-back and breaks
  `tsc --build`. To add `plan`/`usage` to `/auth/me`, hand-edit the `AuthUser`
  interface in `lib/api-client-react/src/generated/api.schemas.ts` and the
  `AuthUser` schema in `lib/api-spec/openapi.yaml` — exactly as was done for
  `avatarColor` and `hasPassword`. (The original handoff said "regenerate orval" —
  that would break the build.)
- **Run `pnpm run typecheck` (root)** before pushing — it rebuilds libs first; the
  per-package `still` typecheck can false-error on stale lib `.d.ts`.

---

## 7. Suggested first PR

**Phase 0 only**, as one cohesive PR: prompt caching + model tiering +
sentence-sampled per-entry read window (crisis exempt) + lazy import + the `usage`
table and cache-miss counter (with same-surfacing re-roll accounting). Pure
savings + cost visibility, **zero user-facing change**, closes the spend leak.
Gate it behind the eval harness passing (incl. a long-entry fixture and a
crisis-in-a-long-entry fixture).

---

## 8. Still open (product calls, not blockers)

- Exact free onboarding-bonus size (proposed ~3).
- Member fair-use daily soft cap (proposed ~6–8 fresh returns/day).
- Re-roll window for "same surfacing" (proposed: same session / a few minutes).
- Whether to offer a time-boxed full-access trial; founding-member annual discount.
- Designed-Book scope (digital layout vs. print-on-demand physical).
