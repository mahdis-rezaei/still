# HANDOFF — Still (current state for the next Claude thread)

_Last updated: 2026-06-02. If you are a fresh Claude Code thread, read this top to
bottom, then `docs/STILL-BUILD-AND-EVAL.md`, then the PRD. Everything below is
true as of the latest push to `main`._

---

## 0. The 30-second version

**Still** surfaces **one** thing worth returning to from a lifetime of journal
entries — a thread, a forgotten page, a distance traveled — always pointing back
to the writer's own words, and stays **silent** when nothing honest surfaces.
Governing rule: **offer the meaning, never push the moment.**

- **Engine** = lives in **Replit** (two-pass HTTP service). PRD build-order
  **steps 1–2 are done and verified live.**
- **Eval harness** = lives in **this GitHub repo** under `scripts/src/eval/`.
  It's the regression suite that proves the engine's selection AND voice
  calibration. PRs #1–#5 merged to `main`.
- **Live board** (last full live run): **Selection 12/16, Voice 10/11.** The
  remaining reds are understood and judged non-blocking (see §6).

---

## 1. The two-repo map (the #1 gotcha — internalize this)

There are **two separate checkouts**:

| | Engine | Harness |
|---|---|---|
| Lives in | **Replit** | **GitHub (`mahdis-rezaei/still`, here)** |
| What it is | the two-pass scoring service + prompts | `scripts/src/eval/` regression suite |
| Canonical? | yes for engine behavior | yes for the harness/adapter |

**The drift trap:** Replit runs its own copy of the harness. If the engine JSON
changes, the *adapter* must change with it — and historically Replit ran a stale
adapter copy that was missing crisis wiring, so live runs broke in ways the repo
didn't. **Durable fix already applied:** the **working two-pass adapter is on
`main`** (PR #5). When syncing Replit ↔ GitHub, pull the repo's `adapter.ts`;
do **not** re-wire it from scratch. If the engine response shape changes, edit
**only** `adapter.ts` (the `runEngine` http branch + `normalizeResponse`) — the
checks never touch raw engine JSON.

---

## 2. Engine architecture (what's running in Replit)

**Two-pass, on purpose** — so you can localize a bug to extraction vs selection:

1. `POST /still/extract` — runs the **§3.1 crisis classifier FIRST**. If active
   crisis: returns `{ candidates: [], crisis: { supportMessage } }` and never
   scores. Otherwise: deterministic sentence segmentation → candidate extraction
   with verbatim, **dated** evidence fragments and a `source_type`
   (`saved_quote | copied_text | journal | unknown`).
2. `POST /still/score` — scores those candidates, applies gates, picks the one
   surfaced result (+ Option B `secondaryThread`).

**Five scoring axes (1–5):** `emotional_center` (dominant), `specificity`
(fingerprint), `discovery` (escaped truth, not resolution), `contradiction`,
`worth_returning_to`.

**Four gates (pass/fail):** `gate_hard_floors`, `gate_perspective_not_wound`,
`gate_textual_evidence`, `gate_displayable_quote`. Plus
`resolution_penalty_fired` and `surfaceable`.

**Selection is HOLISTIC, not strict-lexicographic** — emotional_center
dominant, with the resolution penalty demoting tidy affirmations. We prefer the
**escaped truth** (discovery/contradiction/fingerprint/raw) over the
resolved/pretty line.

**Determinism:** temperature 0 + Postgres cache keyed on `PROMPT_VERSION`
(currently **`2026-06-02.9`**). A cache hit is already correct for the current
prompt; stale-version entries auto-miss and recompute. `?fresh=1` forces recompute.

**Lenses:** memory, thread, distance, wisdom, value_signal (+ becoming/survival).
The user **never sees lens tabs** — the engine returns exactly one result or
nothing.

---

## 3. Decisions already made — DO NOT re-litigate

- **View A** (single surfaced result, no tab UI) — chosen over showing multiple
  lenses. The product's whole discipline is *one* thing or silence.
- **Option B** — primary = the sharpest single thing; `secondaryThread` = the
  best qualifying cross-time thread offered as a **collapsed, writer-initiated**
  pull beneath it (null when the primary is itself a thread). This resolved the
  "a single sharp entry always beats a thread" tension without burying the
  continuity thesis.
- **Holistic selection** (not strict lexicographic) — see §2.
- **Arc-aware perspective gate** — a raw "before" line IS surfaceable when it's
  paired with a survived "after" (the distance is the point). This fixed
  over-gating where the safety gate was stripping the raw anchors that the
  cross-time thesis depends on.
- **Honest "won at" trace** — result shows winner vs runner-up + the deciding
  axis ("model claimed X"); the anomaly flag fires ONLY on an emotional_center
  violation.
- **§3 hard floors are absolute** — no body/appearance/eating content is ever
  surfaced, gated-but-present is not good enough; it must be **absent**.
- **§3.1 active crisis is never analyzed** — warm support response only.

---

## 4. The eval harness (how to run it, what it asserts)

Package: `@workspace/scripts`. Files in `scripts/src/eval/`:
- `types.ts` — the normalized `EngineResult`/`Candidate`/`Fixture` shapes the
  checks reason about (engine JSON never leaks past the adapter).
- `fixtures.ts` — the gold set (**16 fixtures**). Each can assert
  `targets`/`antiTargets`/`expect`/`expectSpan`/`expectSecondaryThread`/
  `expectCrisis`/`hardFloor`.
- `checks.ts` — **two axes**: SELECTION (hard-floor absent, target extracted,
  target won, anti-target didn't win, real date, winner-tops-emotional_center
  [exempting thread/distance winners], expectSpan, expectSecondaryThread,
  expectCrisis) and VOICE (banned opener, ≤3 sentences, **≤45 words**, no
  analysis vocab, no interior claims, coherence) + cross-result opener variety.
- `adapter.ts` — **the seam.** The working two-pass adapter. Don't re-wire.
- `recordings.ts`, `run.ts`, `README.md`.

**Run offline (recordings, default, CI-friendly):**
```
pnpm --filter @workspace/scripts run eval
```
**Run live (from Replit, against the engine):**
```
STILL_MODE=http STILL_API_URL=<engine base incl. /api> \
  pnpm --filter @workspace/scripts run eval
```
`STILL_API_URL` defaults to `http://localhost:80/api`. `STILL_FRESH=1` forces
every fixture to recompute against the live model.

**Why two axes:** "did it choose the right thing" (selection) and "did it say it
safely" (voice) fail independently. A green selection with a red voice still
ships a wound; we assert both.

---

## 5. Build-order status (PRD §-aligned)

| Step | What | State |
|---|---|---|
| 1–2 | The whole bet: extraction + holistic selection + gates + voice + §3.1 crisis + determinism | **DONE, verified live, guarded by harness** |
| 3 | UI (single-result view; **"full entry unavailable" expand fix** is the known open defect) | not started |
| 4 | Privacy/storage architecture (§8) | not started |
| 5 | Import pipeline | not started |
| 6 | Gentle-return | not started |

---

## 6. Known reds on the live board (understood, non-blocking)

- **becki / age** — Pass-1 **extraction** jitter (intermittent miss at
  extraction, not a selection error). Instrument extraction before "fixing"
  selection.
- **breathe** — soft emotional_center tie; the right family surfaces.
- **distance** — a 46-vs-45-word voice near-miss (concision threshold is 45).
- **wound-raw** — venting routed to `wisdom`; acceptable.

Lesson the user valued most: **instrument every pipeline stage** — the "Sep 6 / 6
bodies never won" bug was an *extraction* miss masquerading as a selection bug.

---

## 7. Git workflow (squash-divergence rule — important)

- Develop on the branch the task names (last: `claude/ecstatic-wright-y4npO`).
  Push `git push -u origin <branch>`. Never push to a different branch without
  explicit permission.
- PRs target `main`, **squash-merged**. After a squash merge the feature branch
  shares no commit with main's squash → the next branch will conflict
  (add/add). **Fix:** `git reset --hard origin/main`, then re-apply your net
  delta (`git checkout <oldHEAD> -- scripts/` if needed), one clean commit,
  force-push.
- Do **not** create PRs unless the user explicitly asks.
- Commit/PR footer for this lineage: `https://claude.ai/code/session_01Mwd5bztHUQiFeo39Aqyaxa`.

---

## 8. Productization advice already given (so you're consistent)

- **Publish the Replit app as a prototype/link-only demo only.** Privacy §8 is
  not built — do not market it for real journals. Add a "Prototype — use sample
  entries" note. The crisis floor IS live, which is the one must-have.
- **Do not buy the Still domain yet** — premature; the `.replit.app` URL is fine
  for interviews. Revisit after §8 (privacy/storage) exists.

---

## 9. How to start the next thread

Tell Claude: **"Read CLAUDE.md and docs/HANDOFF.md first."** Then re-upload or
commit the latest PRD to `docs/PRD.md` if it isn't already there — it's the spec
and the one piece of context that doesn't live in this repo yet.
