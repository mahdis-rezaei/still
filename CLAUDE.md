# CLAUDE.md — orientation for Claude Code on the "Still" repo

**Read these first, in order:**
1. `docs/HANDOFF.md` — current state, what's next, and the critical workflow gotchas. **Start here.**
2. `docs/STILL-BUILD-AND-EVAL.md` — full account of the product, engine, guardrails, and eval harness.
3. The PRD — the spec and source of truth. Ask the user to upload/commit the latest `stillPRD.md` if it isn't in `docs/`.

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
- PRs → `main`, squash-merge. **After a squash merge, `git reset --hard origin/main` and force-push the branch** before the next PR (squash divergence — see HANDOFF).
