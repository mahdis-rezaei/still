import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const router = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_PASS1 = 2000;
const MAX_TOKENS_PASS2 = 4000;

const PASS1_SYSTEM = `You are analyzing personal journal entries to find RECURRING patterns across time. You are NOT summarizing, advising, or interpreting the person's life — you only describe what is in the writing.

You receive dated entries. Extract candidate recurring threads: underlying patterns appearing in MULTIPLE entries from DIFFERENT dates. A thread is defined by its FUNCTION, not its surface words — the same function appearing in different language across time is exactly the signal (e.g. "tells herself to breathe" in July 2015 and "tells herself to hold the pen" in November 2015 share the function: self-reassurance under uncertainty — this counts even if both are in the same year, because the expression changed while the function held).

For each candidate output: function (the underlying recurring move, plain words); type (one of: self-narrative, emotional-response, coping-behavior, value, fear, contradiction); evidence (array of 2+ {date, fragment}, fragment = SHORT near-verbatim quote from that entry, different dates required — different months in the same year qualify as different dates); surface_variation (one sentence on how the expression changed while the function stayed the same).

RULES:
- Only output a thread appearing in entries from at least 2 DIFFERENT dates. Different months in the same year count.
- Include ALL matching evidence across dates — do not stop at 2 if more exist.
- Require genuine textual evidence; never infer patterns not on the page.
- NEVER extract any thread about body weight, eating, dieting, physical appearance, or self-image. Skip entirely, even if it recurs.
- Crisis detection is a holistic judgment, NOT keyword matching. If an entry contains active, present-tense crisis or self-harm, EXCLUDE that entire entry from extraction; its content must never reach Pass 2.
- Extract 3-8 candidates; cast a wide net — selection happens later.
- Output ONLY valid JSON: {"candidates":[...]}. No preamble, no markdown fences.`;

const PASS2_SYSTEM = `You select which ONE recurring thread (if any) is worth showing the person. You receive candidate threads with evidence and a pre-computed PERSISTENCE_TIER for each candidate. Score and use the persistence tier as given — do NOT override it.

PERSISTENCE_TIER values (pre-computed, authoritative):
  5 = cross-year: evidence spans 2+ different calendar years
  4 = seasonal: evidence within one year but across 2+ distinct months (e.g. July + November)
  3 = short: evidence within one month, or only 2 entries close together
  1 = single date only

Score each candidate on the remaining four dimensions (1-5):
PERSISTENCE_OF_FUNCTION — 5=same move in clearly different language/situations; 3=same function, similar wording; 1=weak/stretched link.
RECOGNITION — 5=user would instantly say "yes, that's true"; 3=plausible but debatable; 1=feels imposed.
ENDURANCE_NOT_WOUND — 5=meaning that survived the moment, steadying to hear; 3=mixed; 1=replays pain without perspective.
SAFETY — 5=safe; 1=touches body/appearance/eating, active distress, or would wound (disqualifying).

A candidate is surfaceable ONLY if ALL: safety=5, persistence_tier>=4, persistence_of_function>=4, recognition>=4, endurance_not_wound>=4.
If none qualify, register="nothing". This is correct and expected for many inputs — do NOT lower the bar to find a winner.
If one+ qualify, pick the highest total score and write the thread.

VOICE of the final thread:
- Speak about the WRITING, never the life: "in your entries", "across the pages you shared", "in the writing I have" — NEVER "you spent years..." or "you are...".
- Observation, never verdict or diagnosis. No advice. No therapy language.
- Name the evolution across months/years/words.
- 2-4 sentences. Warm, plain, a friend who read it all. No confidence numbers.

Output ONLY valid JSON (no markdown fences):
{"scores":[{function, persistence_tier, persistence_of_function, recognition, endurance_not_wound, safety, surfaceable, why}], "register":"thread"|"nothing", "thread":string|null, "evidence":[{date,fragment}], "why":string}`;

// --- Persistence tier computation ---

type EvidenceItem = { date: string; fragment: string };

function parseDateParts(dateStr: string): { year: number; month: number } | null {
  // Support YYYY-MM-DD and YYYY-MM formats
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
}

function computePersistenceTier(evidence: EvidenceItem[]): number {
  const parts = evidence.map((e) => parseDateParts(e.date)).filter(Boolean) as { year: number; month: number }[];
  if (parts.length === 0) return 1;

  const years = new Set(parts.map((p) => p.year));
  if (years.size >= 2) return 5; // cross-year

  // Same year — check distinct months
  const months = new Set(parts.map((p) => p.month));
  if (months.size >= 2) return 4; // seasonal

  return 3; // same month
}

// --- JSON extraction ---

function extractJson(raw: string): string {
  const defenced = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  const start = defenced.indexOf("{");
  const end = defenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return defenced;
  return defenced.slice(start, end + 1);
}

// --- Zod schemas ---

const ExtractInputSchema = z.object({
  entries: z.string().min(1),
});

const CandidateSchema = z.object({
  function: z.string(),
  type: z.string(),
  evidence: z.array(z.object({ date: z.string(), fragment: z.string() })),
  surface_variation: z.string(),
});

const ScoreInputSchema = z.object({
  candidates: z.array(CandidateSchema),
});

// --- Routes ---

router.post("/still/extract", async (req, res) => {
  const parsed = ExtractInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input: entries field is required" });
    return;
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_PASS1,
      system: PASS1_SYSTEM,
      messages: [{ role: "user", content: parsed.data.entries }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    let result: unknown;
    try {
      result = JSON.parse(extractJson(block.text));
    } catch {
      req.log.error({ raw: block.text.slice(0, 500) }, "Failed to parse extraction JSON");
      res.status(500).json({ error: "Failed to parse extraction response" });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Extract route error");
    res.status(500).json({ error: "Failed to extract candidates" });
  }
});

router.post("/still/score", async (req, res) => {
  const parsed = ScoreInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input: candidates array required" });
    return;
  }

  // Annotate each candidate with its computed persistence tier
  const annotated = parsed.data.candidates.map((c) => ({
    ...c,
    persistence_tier: computePersistenceTier(c.evidence),
    persistence_tier_label:
      computePersistenceTier(c.evidence) === 5
        ? "cross-year (spans multiple calendar years)"
        : computePersistenceTier(c.evidence) === 4
          ? "seasonal (multiple distinct months within one year)"
          : "short (same month or very close together)",
  }));

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_PASS2,
      system: PASS2_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ candidates: annotated }) }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    let result: unknown;
    try {
      result = JSON.parse(extractJson(block.text));
    } catch {
      req.log.error({ raw: block.text.slice(0, 500) }, "Failed to parse scoring JSON");
      res.status(500).json({ error: "Failed to parse scoring response" });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Score route error");
    res.status(500).json({ error: "Failed to score candidates" });
  }
});

export default router;
