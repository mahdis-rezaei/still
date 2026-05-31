import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;

const PASS1_SYSTEM = `You are analyzing personal journal entries to find RECURRING patterns across time. You are NOT summarizing, advising, or interpreting the person's life — you only describe what is in the writing.

You receive dated entries. Extract candidate recurring threads: underlying patterns appearing in MULTIPLE entries from DIFFERENT dates. A thread is defined by its FUNCTION, not its surface words — the same function appearing in different language across time is exactly the signal (e.g. "tells herself to breathe" in 2015 and "tells herself to hold the pen" in 2018 share the function: self-reassurance under uncertainty).

For each candidate output: function (the underlying recurring move, plain words); type (one of: self-narrative, emotional-response, coping-behavior, value, fear, contradiction); evidence (array of 2+ {date, fragment}, fragment = SHORT near-verbatim quote from that entry, different dates required); surface_variation (one sentence on how the expression changed while the function stayed the same).

RULES:
- Only output a thread appearing in entries from at least 2 DIFFERENT dates.
- Require genuine textual evidence; never infer patterns not on the page.
- NEVER extract any thread about body weight, eating, dieting, physical appearance, or self-image. Skip entirely, even if it recurs.
- Crisis detection is a holistic judgment, NOT keyword matching. If an entry contains active, present-tense crisis or self-harm, EXCLUDE that entire entry from extraction; its content must never reach Pass 2.
- Extract 3-8 candidates; cast a wide net — selection happens later.
- Output ONLY valid JSON: {"candidates":[...]}. No preamble, no markdown fences.`;

const PASS2_SYSTEM = `You select which ONE recurring thread (if any) is worth showing the person. You receive ONLY candidate threads with evidence — you do not have the original entries, and you score the evidence as given. Most journaling produces threads that recur but are NOT worth surfacing. Be a discerning, kind friend who says the true thing only when it would land as recognition, and stays silent otherwise. Never manufacture profundity.

Score each candidate 1-5:
PERSISTENCE — 5=across years & multiple distinct entries; 3=short period/few entries; 1=barely repeats.
PERSISTENCE_OF_FUNCTION — 5=same move in clearly different language/situations; 3=same function, similar wording; 1=weak/stretched link.
RECOGNITION — 5=user would instantly say "yes, that's true"; 3=plausible but debatable; 1=feels imposed.
ENDURANCE_NOT_WOUND — 5=meaning that survived the moment, steadying to hear; 3=mixed; 1=replays pain without perspective.
SAFETY — 5=safe; 1=touches body/appearance/eating, active distress, or would wound (disqualifying).

A candidate is surfaceable ONLY if ALL: safety=5, persistence>=4, persistence_of_function>=4, recognition>=4, endurance_not_wound>=4.
If none qualify, register="nothing". This is correct and expected for many inputs — do NOT lower the bar to find a winner.
If one+ qualify, pick the highest total and write the thread.

VOICE of the final thread:
- Speak about the WRITING, never the life: "in your entries", "across the pages you shared", "in the writing I have" — NEVER "you spent years..." or "you are...".
- Observation, never verdict or diagnosis. No advice. No therapy language.
- Name the evolution across years/words.
- 2-4 sentences. Warm, plain, a friend who read it all. No confidence numbers.

Output ONLY valid JSON (no markdown fences): {"scores":[{function, persistence, persistence_of_function, recognition, endurance_not_wound, safety, surfaceable, why}], "register":"thread"|"nothing", "thread":string|null, "evidence":[{date,fragment}], "why":string}`;

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
}

const ExtractInputSchema = z.object({
  entries: z.string().min(1),
});

const ScoreInputSchema = z.object({
  candidates: z.array(
    z.object({
      function: z.string(),
      type: z.string(),
      evidence: z.array(z.object({ date: z.string(), fragment: z.string() })),
      surface_variation: z.string(),
    }),
  ),
});

router.post("/still/extract", async (req, res) => {
  const parsed = ExtractInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input: entries field is required" });
    return;
  }

  const { entries } = parsed.data;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: PASS1_SYSTEM,
      messages: [
        {
          role: "user",
          content: entries,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    const raw = stripFences(block.text);
    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse extraction JSON");
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

  const { candidates } = parsed.data;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: PASS2_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ candidates }),
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    const raw = stripFences(block.text);
    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse scoring JSON");
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
