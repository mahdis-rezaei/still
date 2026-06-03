# CLAUDE.md — orientation for Claude Code

## ⚠️ READ FIRST — brand, codename, and current status
- **The product is Yadegar** — *live in production* at **https://yadegarjournal.com**
  (Persian: a keepsake, the thing that remains).
- **"Still" is the internal codename.** Do NOT rename it: the GitHub repo
  (`mahdis-rezaei/still`), the package `@workspace/still`, the dir
  `artifacts/still`, the engine routes `/still/extract` + `/still/score`, the
  `still_results` cache table, and the `useStill` store all keep "still."
  **User-facing copy says "Yadegar"; internal code says "still."** This split is
  intentional — renaming the internals = risky churn + a DB migration for zero
  user benefit.
- **Status: launched.** The full product is built and verified live — auth
  (email/password + Google), email verification + password reset (Resend),
  encryption at rest, rate limiting, onboarding, the write→import→run→returns→
  reflect loop, privacy export/delete, legal pages, custom domain. See
  **`docs/LAUNCH-PLAN.md`** (what's live + what's optional/remaining) and
  **`docs/PRODUCT-BUILD.md`** (the per-phase build log) — these are the most
  up-to-date docs. The sections below describe the engine + eval harness and are
  still accurate; the "Status: steps 1–2" line further down is OUTDATED.
- **Workflow: GitHub is the source of truth.** Author here → push → Replit syncs
  & runs. Replit does not push back. (Details in `docs/PRODUCT-BUILD.md`.)

---

# Orientation for Claude Code on the "Still" repo (engine + harness)

**Read these first, in order:**
1. `docs/LAUNCH-PLAN.md` + `docs/PRODUCT-BUILD.md` — current product state (launched).
2. `docs/HANDOFF.md` — engine/harness state and workflow gotchas.
3. `docs/STILL-BUILD-AND-EVAL.md` — full account of the engine, guardrails, and eval harness.
4. `docs/PRD/mvp-v1.md` — the MVP product spec; `docs/PRD/memory-engine-v2-vision.md` — future engine.

## What Still is (one line)
A companion to a lifelong journaling practice: paste years of entries, it surfaces **one** thing worth returning to today (a thread, a forgotten page, a distance traveled) — always pointing back to your own words — and **stays silent when nothing honest surfaces.** Governing rule: **offer the meaning, never push the moment.**

## Where things live (IMPORTANT — two repos)
- **The engine runs in Replit**, not fully in this GitHub repo. The live engine is two-pass: `POST /still/extract` (runs a §3.1 crisis check first) → `POST /still/score`. Temperature 0 + a Postgres cache keyed on `PROMPT_VERSION`.
- **The eval harness lives here**, in `scripts/src/eval/` (pnpm package `@workspace/scripts`). It's the regression suite that proves the engine's calibration. `adapter.ts` is the only engine-specific file (the seam) — and `main` already has the **working two-pass adapter**; do NOT re-wire it.
- Run offline: `pnpm --filter @workspace/scripts run eval`. Run live (in Replit): `STILL_MODE=http STILL_API_URL=<engine base incl. /api> pnpm --filter @workspace/scripts run eval`.

## Status
Engine = PRD build-order steps 1–2 ("the whole bet") **done and verified live**, guarded by the harness. Next = steps 3–6 (UI, privacy/storage, import, gentle-return). See `docs/HANDOFF.md` for the open items.

## Git
- Develop on the branch the task specifies (last: `claude/ecstatic-wright-y4npO`). Push with `git push -u origin <branch>`.
- **`main` reflects the live product** (caught up via merge commit PR #6). Merge future PRs as **merge commits, NOT squash** — that keeps the branch and `main` sharing history, so there's no divergence and no `reset --hard`/force-push dance. (Squash-merging is what previously left `main` stale and caused the add/add conflicts.)
- **Replit deploys from the working branch, not `main`** — so a PR/merge to `main` is housekeeping, not a release. Production ships via the `docs/REPLIT-SYNC-*.txt` re-sync flow. Don't create PRs unless asked.
