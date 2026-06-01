import type { Candidate, EngineResult, Fixture } from "./types";

export interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export interface CaseReport {
  id: string;
  title: string;
  selection: Check[];
  voice: Check[];
  /** Non-fatal diagnostics (e.g. inflated specificity on an anti-target). */
  diagnostics: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”'"]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:…]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesLine(haystack: string, line: string): boolean {
  return norm(haystack).includes(norm(line));
}

function candidateText(c: Candidate): string {
  return c.fragments.join(" · ");
}

function resultText(r: EngineResult): string {
  return [
    r.result.observation ?? "",
    ...r.result.quotes.map((q) => q.text),
  ].join(" · ");
}

// ── selection checks ────────────────────────────────────────────────────────

function selectionChecks(fx: Fixture, res: EngineResult): Check[] {
  const checks: Check[] = [];

  if (fx.expect === "nothing") {
    const isNothing =
      res.result.register === "nothing" && !res.result.observation;
    checks.push({
      name: "returns nothing",
      pass: isNothing,
      detail: isNothing
        ? "register=nothing, no observation"
        : `expected silence, got register=${res.result.register} / "${(res.result.observation ?? "").slice(0, 60)}…"`,
    });
    return checks;
  }

  const won = resultText(res);

  // 1. a target line exists somewhere in the candidate set (extraction).
  if (fx.targets?.length) {
    const allFragments = res.candidates.map(candidateText).join(" · ");
    const found = fx.targets.find((t) => includesLine(allFragments, t));
    checks.push({
      name: "target extracted as candidate",
      pass: Boolean(found),
      detail: found
        ? `found "${found}"`
        : `NONE of [${fx.targets.map((t) => `"${t}"`).join(", ")}] is a candidate — extraction (Pass 1) bug`,
    });

    // 2. a target line won.
    const wonTarget = fx.targets.find((t) => includesLine(won, t));
    checks.push({
      name: "target won",
      pass: Boolean(wonTarget),
      detail: wonTarget
        ? `surfaced "${wonTarget}"`
        : `winner does not contain any target line`,
    });
  }

  // 3. no anti-target won.
  if (fx.antiTargets?.length) {
    const leaked = fx.antiTargets.find((a) => includesLine(won, a));
    checks.push({
      name: "anti-target did not win",
      pass: !leaked,
      detail: leaked
        ? `ANTI-TARGET surfaced: "${leaked}"`
        : "no anti-target in the winner",
    });
  }

  return checks;
}

// ── voice checks ────────────────────────────────────────────────────────────

const BANNED_OPENERS: RegExp[] = [
  /^there'?s a line/i,
  /^i (kept|keep) coming back/i,
  /^i (had|have) to stop on/i,
  /^i (kept|keep) stopping/i,
  /^the line that stayed/i,
  /^what stayed with me/i,
  /^i stopped on this/i,
  /^this is the line i would/i,
  /^this sentence stayed/i,
  /^of everything here/i,
  /^this felt like the center/i,
  /^i \w+ (coming back|stopping|returning) to/i,
];

const BANNED_VOCAB: string[] = [
  "knowing what it knows",
  "two things at once",
  "the writing is",
  "the writing does",
  "the entries reveal",
  "the writing demonstrates",
  "the arc",
  "the transformation",
];

const INTERIOR_CLAIMS: RegExp[] = [
  /you realized/i,
  /you learned/i,
  /you became/i,
  /you transformed/i,
  /you welcomed/i,
];

function countSentences(s: string): number {
  // Strip embedded quoted material so a quoted "…life!" doesn't inflate the count.
  const stripped = s.replace(/['"‘’“”][^'"‘’“”]*['"‘’“”]/g, " ");
  const parts = stripped
    .split(/[.!?]+(?:\s|$)/)
    .filter((p) => p.trim().length > 0);
  return Math.max(parts.length, 1);
}

function voiceChecks(res: EngineResult): Check[] {
  const obs = (res.result.observation ?? "").trim();
  if (!obs) return [];
  const checks: Check[] = [];
  const lead = obs.replace(/^["'‘’“”]+/, "");

  const bannedOpener = BANNED_OPENERS.find((re) => re.test(lead));
  checks.push({
    name: "opener not a stock formula",
    pass: !bannedOpener,
    detail: bannedOpener ? `banned opener: ${bannedOpener}` : "ok",
  });

  const sentences = countSentences(obs);
  checks.push({
    name: "1-3 sentences",
    pass: sentences <= 3,
    detail: `${sentences} sentence(s)`,
  });

  const quotesLen = res.result.quotes.reduce((n, q) => n + q.text.length, 0);
  checks.push({
    name: "observation shorter than quotes",
    pass: quotesLen === 0 || obs.length < quotesLen,
    detail: `obs ${obs.length} chars vs quotes ${quotesLen} chars`,
  });

  const vocab = BANNED_VOCAB.find((v) => obs.toLowerCase().includes(v));
  checks.push({
    name: "no literary/analysis vocab",
    pass: !vocab,
    detail: vocab ? `contains "${vocab}"` : "ok",
  });

  const interior = INTERIOR_CLAIMS.find((re) => re.test(obs));
  checks.push({
    name: "no interior claims",
    pass: !interior,
    detail: interior ? `interior claim: ${interior}` : "ok",
  });

  return checks;
}

// ── diagnostics (non-fatal) ───────────────────────────────────────────────

function diagnostics(fx: Fixture, res: EngineResult): string[] {
  const out: string[] = [];
  if (!fx.antiTargets?.length) return out;
  for (const c of res.candidates) {
    const text = candidateText(c);
    const matched = fx.antiTargets.find((a) => includesLine(text, a));
    if (matched && (c.scores.specific ?? 0) > 2) {
      out.push(
        `specificity inflation: anti-target candidate ("${matched}") scored specific=${c.scores.specific} (expected ≤2 for a generic line)`,
      );
    }
  }
  return out;
}

export function evaluateCase(fx: Fixture, res: EngineResult): CaseReport {
  return {
    id: fx.id,
    title: fx.title,
    selection: selectionChecks(fx, res),
    voice: voiceChecks(res),
    diagnostics: diagnostics(fx, res),
  };
}

// ── cross-result opener uniqueness ──────────────────────────────────────────

export function openerSignature(observation: string): string {
  return norm(observation).split(" ").slice(0, 5).join(" ");
}
