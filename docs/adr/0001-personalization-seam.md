# ADR 0001 — Personalization is a post-score code seam; the scorer stays context-blind

Status: **accepted** (2026-06-03) · Supersedes the prompt-clause approach to why-today.

## Context

Engine V2 wants to make the surfaced return *today-aware*: among candidates of
comparable strength, gently prefer the one that resonates with today (same
season, an anniversary, a recent theme). The product's one-liner literally
promises "one thing worth returning to **today**." Soft affinity (#34, "lean
toward what this writer tends to keep/favorite") is the same shape of feature.

We first tried this as a **prompt clause**: a third soft tiebreak appended to the
PASS2 scoring prompt, fed `today` + `recentThemes`, told in strong terms to act
ONLY as a last-resort tiebreak and to NEVER change an axis score.

A DEV-engine **fixed-candidate-set control** (extract once; score the SAME set 4×
with no context and 4× with resonant context) falsified that approach:

- Resonant candidate `emotional_center`: `4,4,4,4` → `5,5,5,5` (zero overlap, +1.0)
- Theme-match candidate: `3,3,3,3` → `4,4,4,4`
- With context the resonant candidate won on `emotional_center` (the MASTER axis),
  not as a tiebreak.

Tightening the clause to forbid axis movement (commit 4cef294) did **not** close
the leak — the same +1.0 inflation persisted. Conclusion: **any personalization
context placed in the scoring prompt corrupts the calibrated axis scores.** This
is not a why-today bug; it is a property of mixing "what matters in general"
(scoring) with "what matters to this person today" (personalization) in one model
call.

## Decision

1. **The scorer is context-blind, permanently.** `POST /still/score` sends the
   model only the candidates. Axis scores are a pure function of the candidates —
   the exact calibration the eval harness protects. No `today`, themes, affinity,
   or any per-user signal ever enters the scoring prompt or its cache key.

2. **Personalization is a deterministic CODE seam applied AFTER scoring**, over
   the model's pure scores. It can re-rank only **among near-ties** (candidates
   the model itself scored as comparable to the winner) and never alters a score.
   Why-today is the seam's **first signal**; soft affinity (#34) will be the
   second — same seam, not a second architecture.

3. **A surfaced result is only ever changed by a VOICE-only second pass** that
   writes the new winner's observation/quotes, and only when an override actually
   fires. When no override fires (the common case), output is **byte-identical to
   flag-off**.

## Why this is the durable choice

- **Correct by construction.** The scorer cannot inflate an axis for "today"
  because it never sees today. The invariant is structural, not a request to the
  model we then have to police.
- **Invisible until it has something to say.** No near-tie + resonance → no
  change, no extra cost. The hot path is untouched.
- **Finally testable offline.** Comparability and resonance are pure functions
  the harness asserts deterministically — the prompt approach was untestable
  offline and therefore undurable.
- **One seam, reused.** #34 plugs in as another signal feeding the same re-rank.

## Rejected alternatives

- **Prompt clause** (any wording): empirically inflates axis scores. Dead.
- **Single-pass, model emits observations for top-N candidates**: taxes every
  scoring call with extra tokens + a harder task (writing voice for losers) to
  avoid a rare second call. Wrong trade; risks voice quality on the hot path.
- **Shelve why-today**: the *seam* is needed for #34 regardless, and "return to
  today" is core to the pitch — worth building once, correctly.

## Contract / invariants (what the harness and Replit verify)

- Today/affinity/etc. NEVER change any axis score. (Verified: blind scoring →
  off≡on byte-identical with no context, already confirmed on DEV.)
- The seam re-ranks ONLY among candidates the model scored as comparable to its
  winner; it NEVER overrides a candidate that is clearly stronger.
- It NEVER lowers the silence bar: if the model returned `mode="nothing"`, the
  seam stays silent.
- Flag-off, and flag-on-with-no-override, are byte-identical to today.

## Implementation plan (staged, dark-shipped)

- **S2a — DONE (this commit):** scoring made context-blind; leaky prompt clause
  removed; scoring cache key reverted to pure candidates (shared with flag-off).
  Flag + context input retained for the seam to consume. Offline board unchanged.
- **S2b — DONE:** `artifacts/api-server/src/lib/why-today.ts` — pure functions
  `parseDateParts` / `seasonOf` / `resonance` (anniversary > season, + theme
  overlap), `comparableSet` (near-tie at/below winner ec, surfaceable,
  non-penalized), `identifyWinner` (match surfaced quotes → displayable
  fragments), and `chooseWhyTodayOverride`. Unit-tested (15 cases) in
  `why-today.test.ts`, run via `pnpm --filter @workspace/scripts run test:engine`
  (uses the scripts package's existing tsx — no new dep, no lockfile change).
  Wired in `/still/score` in LOG-ONLY mode behind the flag: when on + context, it
  logs the would-be override; the surfaced `result` is unchanged, so enabling the
  flag is still behaviorally inert. Offline board unchanged (Selection 3/3).
- **S2c — then:** voice-only pass that writes the override winner's
  observation/quotes/label (reusing the PASS2 VOICE rules); apply the override;
  cache the override result keyed on `(winner candidate id + context)` so daily
  re-runs are stable. Replit live-verifies (axis stability + behavior A/B), then
  the flag is enabled in production.

## Rollback

The flag (`WHY_TODAY_TIEBREAK`) gates the entire seam. Off → pure engine, exactly
as today. Unsetting it is a complete, instant rollback at every stage.
