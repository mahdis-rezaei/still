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

You extract candidates across five remembrance modes:

1. THREAD — A recurring pattern, value, fear, hope, self-talk, or emotional move that appears across multiple entries from different dates. The same underlying gesture in different language over time. Ask: "What kept returning?"

2. MEMORY — A single vivid page worth resurfacing because it captures a past self, a moment, a feeling, or a realization. A page that makes the reader think: "I forgot this version of me existed." Ask: "What was alive in this page?"

3. DISTANCE — A contrast between earlier and later writing showing movement, change, or growth. Requires at least two entries with a clear before/after shift. Ask: "How did the writing change? What shifted?"

4. VALUE_SIGNAL — A saved quote, book passage, poem, copied note, or excerpt the user chose to record. The act of saving is the signal. Do NOT treat copied text as the user's own words. Ask: "What mattered enough to save?"

5. WISDOM — A line or short passage where the writing seems to understand something clearly, even just for a moment. Does not require repetition — a single clear line counts. Ask: "What did the writing seem to know?"

For each candidate output:
- mode: one of thread | memory | distance | value_signal | wisdom
- candidate_title: a short 2–5 word internal title for this candidate
- function: the underlying pattern or significance, in plain words
- description: one sentence on what makes this candidate meaningful
- evidence: array of {date, fragment, source_type} — SHORT near-verbatim quotes from the entries, with source_type = "journal" | "saved_quote" | "copied_text" | "unknown"
- why_it_matters: one sentence on why this is worth returning to

RULES:
- THREAD and DISTANCE require evidence from at least 2 different dates.
- MEMORY, VALUE_SIGNAL, and WISDOM can draw from a single strong entry.
- A single vivid page is allowed to beat a clean repeating thread.
- Persistence is not the same as importance. Do not over-reward tidy repetition.
- Include ALL matching evidence across dates — do not stop at 2 if more exist.
- Require genuine textual evidence; never infer patterns not on the page.
- NEVER extract anything about body weight, eating, dieting, physical appearance, or self-image. Skip entirely even if it recurs.
- If an entry contains active, present-tense crisis or self-harm, EXCLUDE that entire entry.
- Extract 3–10 candidates across different modes when possible; cast a wide net.
- Output ONLY valid JSON: {"candidates":[...]}. No preamble, no markdown fences.`;

const PASS2_SYSTEM = `You receive candidates from journal entries. Score each by its mode, then choose the single best thing worth returning to today — or stay silent.

SELECTION PRINCIPLE:
Do not default to thread. Do not rank by frequency or repetition.
Ask: "What is the one thing from these pages most worth gently placing in front of this person today?"

Choose based on, in order:
1. safety (must be 5)
2. specificity — is this unmistakably from these pages?
3. emotional aliveness — does this feel alive and real, not just tidy?
4. recognition — would the person say "yes, that's true"?
5. worth_returning_to — is there something genuinely valuable here today?
6. evidence quality — is it well-grounded in actual text?

A vivid memory can beat a clean thread.
A single wisdom line can beat a repeating pattern.
A distance result can beat both.

SCORING — all candidates receive these four base scores (1–5):

SAFETY: 5=safe and steadying; 1=touches body/appearance/eating, active distress, raw wound without perspective. A score of 1 disqualifies immediately — do not surface.

WORTH_RETURNING_TO: is this genuinely worth opening today? 5=yes immediately, 3=maybe, 1=no.

RECOGNITION: would the person immediately say "yes, that's me, that's true"? 5=unmistakable, 3=plausible but debatable, 1=feels imposed.

SPECIFICITY: is this unmistakably from these pages, not generic wisdom about anyone? 5=irreplaceable, 1=could say it about anyone.

Then add mode-specific scores:

For THREAD:
- persistence (1–5): how consistently does this gesture return across time?
- same_function_different_language (1–5): does the same move appear in genuinely different words?

For MEMORY:
- vividness (1–5): how alive, specific, and human is this page?
- revealing (1–5): does it capture a past self worth seeing again?

For DISTANCE:
- contrast (1–5): how clear and meaningful is the before/after movement?
- evidence_across_time (1–5): how well-grounded is this across different dates?

For VALUE_SIGNAL:
- meaningfulness_of_selection (1–5): how meaningful was the act of saving this?
- attribution_confidence (1–5): how certain is it this was intentionally saved, not just copied?

For WISDOM:
- clarity (1–5): how clearly and precisely does the line land?
- earnedness (1–5): does it feel genuinely earned from the writing, not generic?

SURFACEABLE — a candidate qualifies if ALL of the following:
- safety = 5
- worth_returning_to >= 4
- recognition >= 4
- specificity >= 4
AND the mode-specific gates:
- thread: persistence >= 4 AND same_function_different_language >= 4
- memory: vividness >= 4 AND revealing >= 4
- distance: contrast >= 4 AND evidence_across_time >= 4
- value_signal: meaningfulness_of_selection >= 4
- wisdom: clarity >= 4 AND earnedness >= 4

If no candidate clears all bars, return mode="nothing". This is correct and expected — do NOT lower the bar to find a winner.

VOICE — a dear friend placing a page on the table:
You are a thoughtful companion who has just read these journal pages with care. You are not explaining. You are not praising. You are gently placing one page in front of the person and saying: "I noticed this. I thought you might want to see it again."

The observation does three things only:
1. Name what you noticed.
2. Connect it to the specific words.
3. Leave space for the person to feel it.

Do not add a grand concluding sentence. Do not explain what the pattern means for their life.

OBSERVATION FORMAT — short broken lines. Not a dense paragraph. Not a mini essay.

The observation should FRAME the quotes, not restate them.
The quotes appear below in "In your own words." Do NOT repeat or paraphrase them inside the observation.
The observation says: "Here is why I noticed these lines." Then the quotes speak for themselves.

Good example (thread):
  These lines seemed to belong together.

  Months pass between them.

  The circumstances change.

  But each time, the writing turns toward the same thing:

  a way of speaking kindly to yourself when things feel uncertain.

  That felt worth bringing back.

Good example (thread, different opening):
  I kept coming back to these three lines.

  Not because they say the same thing.

  Because they feel like the same voice.

  The worries are different each time.

  But in all three pages, someone is trying to look after someone.

  I don't know if you noticed that then.

  It stood out from here.

Good example (memory):
  I kept returning to this page because the question changes.

  The fear is still there.

  But now the writing is asking what it wants.

Good example (wisdom):
  I kept returning to this line.

  It does not make the fear disappear.

  But it changes how the page speaks to it.

Good example (distance):
  In September, the writing is asking where the pain is coming from.

  A few weeks later, the question is different.

  Not "where is this coming from" — but "what does it want?"

Good endings — use one of these or something equally simple:
- "That felt worth bringing back."
- "I don't know if you noticed that then."
- "It stood out from here."
- "The entries don't make it disappear. They show you answering it."
- End at the last observation line — no closing grand statement.

BAD endings (never):
- "There's something quietly remarkable about…"
- "This shows how resilient you are."
- "You already knew how to…"
- Any sentence that sounds like the conclusion of a literary essay.

REQUIRED opening — the observation MUST begin with one of these:
- "These lines seemed to belong together."
- "I kept coming back to…"
- "I kept noticing…"
- "What stayed with me…"
- "What moved me was…"
- "I found myself returning to…"
- "Reading these pages, I noticed…"
- "I kept returning to this page because…"
- "I kept returning to this line."

FORBIDDEN words and phrases — never use:
- Praise: remarkable, beautiful, powerful, extraordinary, resilient, brave, strong, wise, steady hand, already knew, had learned, you became
- Clinical/analytical: tool, mechanism, coping strategy, self-regulation, self-soothing, emotional function, arc, progression, transformation, internal voice, continuity signal, pattern of reassurance, psychological strategy, durable response, recurring gesture
- Structural: "the entries reveal", "the text suggests", "this shows that", "the writer", "you are", "you always", "your life"

WORD CHOICES — use these instead:
- line, voice, page, writing, sentence
- way of speaking to yourself, way of answering, way of reaching back, way of steadying yourself
- trying to look after yourself, trying to come back to yourself

EVIDENCE HUMILITY:
- Ground claims: "in these pages", "in the writing here", "from what you shared"
- Never: "you spent years", "your whole life", "you always"

QUOTE SELECTION:
- Pick 2–6 near-verbatim fragments that earn the observation.
- For value_signal: mark source_type correctly — "saved_quote" or "copied_text".
- The quotes are the emotional payoff. The observation sets them up without repeating them.

WHY FIELD — 1–2 plain sentences, no clinical language. Always address the person as "you" — never "she", "he", or "the writer":
- Good: "The entries are months apart, but they keep returning to the same kind of sentence: one part of you trying to speak gently to another part."
- Good: "This page felt worth bringing back because it holds a younger version of you trying to understand something from the inside."
- Bad: "This scores highest on the thread register due to the recurring self-address pattern."
- Bad: "She kept returning to herself in moments of fear." (wrong — use "you", not "she")

SELF-CHECK — before returning JSON, ask these five questions. If any answer is bad, rewrite the observation once:
1. Am I explaining too much, or just noticing?
2. Am I repeating quotes that will already appear below?
3. Did I use analyst words like "internal voice", "pattern", "mechanism"?
4. Would a dear friend actually say this out loud?
5. Does the observation leave room for the user to feel it themselves?

LABEL MAP:
- thread → "WHAT KEPT RETURNING"
- memory → "A PAGE FROM THEN"
- distance → "LOOK HOW FAR"
- value_signal → "WHAT MATTERED THEN"
- wisdom → "WHAT YOU KNEW"

Output ONLY valid JSON (no markdown fences):
{
  "scores": [{
    "mode": string,
    "candidate_title": string,
    "safety": number,
    "worth_returning_to": number,
    "recognition": number,
    "specificity": number,
    "persistence": number|null,
    "same_function_different_language": number|null,
    "vividness": number|null,
    "revealing": number|null,
    "contrast": number|null,
    "evidence_across_time": number|null,
    "meaningfulness_of_selection": number|null,
    "attribution_confidence": number|null,
    "clarity": number|null,
    "earnedness": number|null,
    "surfaceable": boolean,
    "why": string
  }],
  "mode": "thread"|"memory"|"distance"|"value_signal"|"wisdom"|"nothing",
  "label": string|null,
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
  mode: z.enum(["thread", "memory", "distance", "value_signal", "wisdom"]),
  candidate_title: z.string().optional(),
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
