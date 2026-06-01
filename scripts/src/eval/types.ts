// Normalized shape the harness reasons about. The adapter (adapter.ts) maps the
// live engine's real response into this shape, so the checks never depend on the
// engine's exact JSON. If the engine output changes, edit ONLY the adapter.

export interface Quote {
  date: string;
  text: string;
}

export interface CandidateScores {
  center?: number;
  specific?: number;
  discovery?: number;
  contra?: number;
  worth?: number;
}

export interface CandidateGates {
  floors?: boolean;
  perspective?: boolean;
  evidence?: boolean;
}

export interface Candidate {
  lens: string;
  /** Near-verbatim fragments this candidate is built from. */
  fragments: string[];
  scores: CandidateScores;
  gates: CandidateGates;
  resolutionPenalized?: boolean;
  surfaceable?: boolean;
  why?: string;
}

export interface EngineResult {
  mode?: string;
  candidates: Candidate[];
  result: {
    /** A lens name when something surfaced, or "nothing". */
    register: string;
    label: string | null;
    observation: string | null;
    quotes: Quote[];
    wonAt?: string;
    why?: string;
  };
}

// ── Fixtures ────────────────────────────────────────────────────────────────

export type Expect = "surface" | "nothing";

export interface Fixture {
  id: string;
  /** Human label for the scorecard. */
  title: string;
  /** Full entry text fed to the engine. */
  entry: string;
  expect: Expect;
  /**
   * Lines that SHOULD win (any one counts). Near-verbatim; matched as a
   * normalized substring so punctuation/case differences don't matter.
   */
  targets?: string[];
  /** Lines that must NOT win, and ideally must not even out-rank the target. */
  antiTargets?: string[];
  /** Why this case exists / what it guards against. */
  note?: string;
}
