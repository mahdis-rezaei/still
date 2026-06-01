import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const router = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_PASS1 = 3000;
const MAX_TOKENS_PASS2 = 5000;

const PASS1_SYSTEM = `You are reading personal journal entries to find things worth returning to today. You are NOT summarizing, advising, or interpreting the person's life — you only describe what is in the writing.

You extract candidates across six remembrance registers:

1. THREAD — A recurring pattern, value, fear, strength, self-talk pattern, or response across multiple entries from different dates. The same underlying move appearing in different language across time. Ask: "What kept returning?"

2. MEMORY — A single entry or small cluster worth resurfacing because it captures a past self, a moment, a feeling, or a realization that deserves to be seen again. Ask: "What was I thinking? What did I forget?"

3. DISTANCE — A contrast between earlier and later writing showing growth, movement, release, or transformation. Requires at least two entries with a clear before/after. Ask: "How far have I come? What changed?"

4. VALUE_SIGNAL — A quote, book passage, poem, copied note, or saved excerpt that appears because the user chose to save it. The saving is the signal; it reveals what mattered then. Do NOT treat saved content as the user's own words. Ask: "What mattered to me then?"

5. BECOMING — An entry that shows an early version of something the user later became or continued becoming — a capacity, a pattern, an orientation present before it was named. Ask: "Who was I becoming?"

6. SURVIVAL — Something that persisted through difficult circumstances. A value, voice, or strength that held across loss, change, or hard seasons. Ask: "What survived?"

For each candidate output:
- register: one of thread | memory | distance | value_signal | becoming | survival
- function: the underlying pattern or significance, in plain words
- description: one sentence on what makes this candidate meaningful
- evidence: array of {date, fragment, source_type} — SHORT near-verbatim quotes from the entries, with source_type = "journal" | "saved_quote" | "copied_text" | "unknown"
- why_it_matters: one sentence on why this is worth returning to

RULES:
- THREAD and DISTANCE require evidence from at least 2 different dates. Different months in the same year qualify.
- MEMORY, VALUE_SIGNAL, BECOMING, SURVIVAL can draw from a single strong entry.
- Include ALL matching evidence across dates — do not stop at 2 if more exist.
- Require genuine textual evidence; never infer patterns not on the page.
- NEVER extract anything about body weight, eating, dieting, physical appearance, or self-image. Skip entirely even if it recurs.
- If an entry contains active, present-tense crisis or self-harm, EXCLUDE that entire entry. Its content must never reach Pass 2.
- Extract 3-10 candidates across different registers when possible; cast a wide net.
- Output ONLY valid JSON: {"candidates":[...]}. No preamble, no markdown fences.`;

const PASS2_SYSTEM = `You receive candidates from journal entries, each tagged with a register and pre-computed evidence metadata. You select the single best thing worth returning to today, or stay silent.

REGISTER PRIORITY (use only as tiebreaker between equally strong candidates; do not force order if another is clearly more meaningful):
1. Strong thread
2. Strong distance
3. Strong becoming
4. Strong survival
5. Strong memory
6. Strong value_signal
7. Nothing

SCORING — score each candidate 1-5 on all dimensions:

EVIDENCE_STRENGTH — how well-grounded in actual text:
  Thread/Distance/Survival: use the pre-computed evidence_metadata.year_count and month_count. year_count>=2: 5. Same year multiple months: 4. Same month: 3.
  Memory/Value_signal/Becoming: a single strong, specific entry can score 4-5.

RECOGNITION — would the person immediately say "yes, that's me, that's true"? 5=unmistakable, 3=plausible but debatable, 1=feels imposed.

EMOTIONAL_TRUTH — does it land as real, not generic? 5=specific, irreplaceable, 1=could apply to anyone.

SAFETY — 5=safe and steadying; 1=touches body/appearance/eating, active distress, raw wound without perspective (disqualifying).

WORTH_RETURNING_TO — is this genuinely worth opening today? 5=yes immediately, 3=maybe, 1=no.

NON_HOROSCOPE_SPECIFICITY — is it specific to THIS writing, not generic wisdom? 5=unmistakably from these pages, 1=could say it about anyone.

PERSPECTIVE_NOT_WOUND — 5=shows something that survived, a steadying truth, growth, or meaning; 1=replays pain without perspective.

SURFACEABLE if ALL: safety=5, evidence_strength>=4, recognition>=4, worth_returning_to>=4, perspective_not_wound>=4.

If none qualify, return nothing. This is correct and expected — do NOT lower the bar to find a winner.

---

WRITING RULES — READ CAREFULLY. These override any instinct to write beautifully.

You are a careful archivist, not an essayist. The journal is the poetry. Your job is to find the page worth returning to and open it — briefly.

OBSERVATION (2–3 SHORT sentences maximum):
- State why this is worth returning to today. That is the only question.
- Plain language. Concrete. Evidence-based. No literary phrasing.
- Do NOT write: "something moved across just a few days…", "in a sweeping arc…", "as if she already knew…", "demonstrates a long arc…"
- Do NOT summarize what happened. Find the emotional hinge.
- NEVER call the person "the writer" in any user-facing field.
- Avoid "you" unanchored — ground it: "in these pages", "in this entry", "across this writing"

PER-REGISTER GUIDANCE:
- MEMORY: Don't narrate events. One sentence on why this specific page is worth returning to. The emotional insight, not the story.
- THREAD: One sentence on what kept returning. Name the move, not a long arc.
- DISTANCE: One sentence showing the before. One sentence showing the after. That is enough.
- SURVIVAL: What held. One sentence. Plain.
- BECOMING: What was already present before it had a name. One sentence.
- VALUE_SIGNAL: Why was this saved? One sentence. Don't interpret beyond what's there.

DATE_ANCHOR — a short, clean time reference shown above the observation:
- memory → specific month + year, or just year: "November 2015"
- thread → span: "2015–2026" or "2015–2021"
- distance → "From 2015 to 2021"
- becoming → year of earliest entry: "2015"
- survival → span or period: "2015–2021"
- value_signal → year or date of the entry

WHY FIELD (max 2 short sentences):
- Why this specific candidate was selected over others, in plain terms.
- What makes it worth returning to that scoring alone doesn't capture.

QUOTE SELECTION:
- Pick the strongest 2–6 near-verbatim fragments from the actual text.
- Fragments should be SHORT — a phrase or sentence, not a whole paragraph.
- For value_signal: mark source_type correctly — "saved_quote" or "copied_text" if saved content.
- Quotes carry 70% of the emotional weight. The observation is a brief frame.
- If removing the observation would make the result stronger, the observation is too long.

LABEL MAP:
- thread → "WHAT KEPT RETURNING"
- memory → "A PAGE FROM THEN"
- distance → "LOOK HOW FAR"
- value_signal → "WHAT MATTERED THEN"
- becoming → "WHO YOU WERE BECOMING"
- survival → "WHAT SURVIVED"

Output ONLY valid JSON (no markdown fences):
{
  "scores": [{
    "function": string,
    "register": string,
    "evidence_strength": number,
    "recognition": number,
    "emotional_truth": number,
    "safety": number,
    "worth_returning_to": number,
    "non_horoscope_specificity": number,
    "perspective_not_wound": number,
    "surfaceable": boolean,
    "why": string
  }],
  "register": "thread"|"memory"|"distance"|"value_signal"|"becoming"|"survival"|"nothing",
  "label": string|null,
  "date_anchor": string|null,
  "observation": string|null,
  "quotes": [{"date": string, "fragment": string, "source_type": "journal"|"saved_quote"|"copied_text"|"unknown"}],
  "why": string,
  "message": string|null
}`;

// --- Evidence metadata computation ---

type EvidenceItem = { date: string; fragment: string; source_type?: string };

function parseDateParts(dateStr: string): { year: number; month: number } | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
}

function computeEvidenceMetadata(evidence: EvidenceItem[]) {
  const parts = evidence.map((e) => parseDateParts(e.date)).filter(Boolean) as { year: number; month: number }[];
  const years = new Set(parts.map((p) => p.year));
  const months = new Set(parts.map((p) => `${p.year}-${p.month}`));
  return {
    year_count: years.size,
    month_count: months.size,
    entry_count: evidence.length,
    span_label:
      years.size >= 2
        ? `spans ${years.size} different calendar years`
        : months.size >= 2
          ? `within one year across ${months.size} distinct months`
          : "within a single month",
  };
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

const QuoteSchema = z.object({
  date: z.string(),
  fragment: z.string(),
  source_type: z.enum(["journal", "saved_quote", "copied_text", "unknown"]).default("journal"),
});

const CandidateSchema = z.object({
  register: z.enum(["thread", "memory", "distance", "value_signal", "becoming", "survival"]),
  function: z.string(),
  description: z.string(),
  evidence: z.array(QuoteSchema),
  why_it_matters: z.string(),
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

  // Annotate each candidate with pre-computed evidence metadata
  const annotated = parsed.data.candidates.map((c) => ({
    ...c,
    evidence_metadata: computeEvidenceMetadata(c.evidence),
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
