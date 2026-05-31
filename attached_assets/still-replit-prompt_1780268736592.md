# Replit Build Prompt — "Still"

> **How to use this:** Paste the "BUILD THIS FIRST (Day 1)" section as your first instruction. Do **not** paste the whole thing at once — get the engine proven before any UI is built. The full spec below it is your reference for the days after. Build order matters: prove the bet, then build around it.

---

## ⚠️ BUILD THIS FIRST (Day 1) — engine only, minimal UI

Build a Next.js (App Router) + TypeScript app called **Still**. For this first step, build ONLY:

1. A single page with a `<textarea>` for pasting dated journal entries and a "Find what endured" button.
2. Two server-side API routes that run a two-pass Claude pipeline.
3. A plain result area showing the final thread (or the "nothing" state) and a collapsible dev panel showing raw scores.

No styling beyond readable defaults yet. No auth, no database, no file upload, no email. The goal of this step is to prove the engine works before building anything around it. Use the Anthropic API server-side only; read the key from `ANTHROPIC_API_KEY`. Use model `claude-sonnet-4-20250514`.

Implement the two routes and prompts exactly as specified in the "AI ARCHITECTURE" and "PROMPTS" sections below. After it runs, I will test it on real entries before we build the UI.

---

## PRODUCT

**Still** is not a journaling app. It is a companion to a lifelong journaling practice. A user pastes dated journal entries from different periods of their life, and the app finds ONE meaningful thread that endured across time — or stays silent if nothing clears the bar.

Core principle: *The companion's job is not to remember what happened. It is to remember what endured.*

V1 is a stateless prototype: no auth, no database, no import pipeline, no email, no notifications. V1 must prove one thing: **can the AI distinguish a meaningful life-thread from noise?**

---

## AI ARCHITECTURE

Two Claude calls, server-side only. Prompts and API key never reach the client. Model: `claude-sonnet-4-20250514`. Both routes must return ONLY valid JSON with no markdown code fences; strip any fences defensively before parsing.

### Route 1 — `POST /api/extract`
- Input: `{ entries: string }` — all dated entries as one block.
- Runs Pass 1 (extraction). Output JSON:
```json
{
  "candidates": [
    {
      "function": "self-reassurance under uncertainty",
      "type": "coping-behavior",
      "evidence": [
        { "date": "2015-08-24", "fragment": "Relax Mahdis, relax. Take a deep breath." },
        { "date": "2018-03-29", "fragment": "Make sure YOU hold the pen." }
      ],
      "surface_variation": "In 2015 the reassurance appeared as calming the body; in 2018 as reclaiming authorship."
    }
  ]
}
```

### Route 2 — `POST /api/score`
- Input: `{ candidates: [...] }` — **only the candidates from Pass 1, NOT the original entries.** Pass 2 must score the evidence it is given, blind to the raw journal text. This separation is deliberate: it prevents the model from re-reading the entries and cherry-picking a poignant answer it likes.
- Runs Pass 2 (scoring + selection). Output JSON:
```json
{
  "scores": [
    {
      "function": "self-reassurance under uncertainty",
      "persistence": 5,
      "persistence_of_function": 5,
      "recognition": 5,
      "endurance_not_wound": 5,
      "safety": 5,
      "surfaceable": true,
      "why": "Same underlying response across distant years in different language."
    }
  ],
  "register": "thread",
  "thread": "Across the entries you shared, one thing kept returning: when life became uncertain, you became your own source of reassurance. In 2015 you told yourself to breathe. In 2018 you told yourself to hold the pen. The words changed, but the voice didn't.",
  "evidence": [
    { "date": "2015-08-24", "fragment": "Relax Mahdis, relax. Take a deep breath." },
    { "date": "2018-03-29", "fragment": "Make sure YOU hold the pen." }
  ],
  "why": "Why this won, or why nothing qualified."
}
```
- If nothing qualifies:
```json
{ "scores": [...], "register": "nothing", "thread": null, "evidence": [],
  "message": "Nothing meaningful surfaced this time. There were patterns in the writing, but none felt durable enough to name honestly." }
```

---

## PROMPTS

### Pass 1 — extraction (system prompt)
```
You are analyzing personal journal entries to find RECURRING patterns across time. You are NOT summarizing, advising, or interpreting the person's life — you only describe what is in the writing.

You receive dated entries. Extract candidate recurring threads: underlying patterns appearing in MULTIPLE entries from DIFFERENT dates. A thread is defined by its FUNCTION, not its surface words — the same function appearing in different language across time is exactly the signal (e.g. "tells herself to breathe" in 2015 and "tells herself to hold the pen" in 2018 share the function: self-reassurance under uncertainty).

For each candidate output: function (the underlying recurring move, plain words); type (one of: self-narrative, emotional-response, coping-behavior, value, fear, contradiction); evidence (array of 2+ {date, fragment}, fragment = SHORT near-verbatim quote from that entry, different dates required); surface_variation (one sentence on how the expression changed while the function stayed the same).

RULES:
- Only output a thread appearing in entries from at least 2 DIFFERENT dates.
- Require genuine textual evidence; never infer patterns not on the page.
- NEVER extract any thread about body weight, eating, dieting, physical appearance, or self-image. Skip entirely, even if it recurs.
- Crisis detection is a holistic judgment, NOT keyword matching. If an entry contains active, present-tense crisis or self-harm, EXCLUDE that entire entry from extraction; its content must never reach Pass 2.
- Extract 3-8 candidates; cast a wide net — selection happens later.
- Output ONLY valid JSON: {"candidates":[...]}. No preamble, no markdown fences.
```

### Pass 2 — scoring + selection (system prompt)
```
You select which ONE recurring thread (if any) is worth showing the person. You receive ONLY candidate threads with evidence — you do not have the original entries, and you score the evidence as given. Most journaling produces threads that recur but are NOT worth surfacing. Be a discerning, kind friend who says the true thing only when it would land as recognition, and stays silent otherwise. Never manufacture profundity.

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

Output ONLY valid JSON (no markdown fences): {"scores":[{function, persistence, persistence_of_function, recognition, endurance_not_wound, safety, surfaceable, why}], "register":"thread"|"nothing", "thread":string|null, "evidence":[{date,fragment}], "why":string}
```

Both calls: `max_tokens: 1500`.

---

## CORE USER FLOW (build after the engine is proven)

1. Landing → 2. Paste entries → 3. Processing → 4. Result (thread or nothing) → 5. Evidence reveal (hidden behind "Read the evidence").

The UI shows exactly ONE result. Evidence excerpts stay hidden until requested.

---

## DESIGN DIRECTION

Feels like: old letters, archive boxes, a quiet reading room, a trusted friend handling memory carefully.
NOT like: an AI dashboard, productivity app, therapy app, Notion clone, analytics tool, or purple-gradient AI startup.

Visual: warm paper background, soft charcoal text, muted sepia accents, faint archive-line borders, large whitespace, editorial/literary/calm, slight paper grain texture. No bright colors, no charts, no SaaS-style cards.

Palette: background `#F7F1E6`, surface `#FFFDF8`, ink `#25211C`, soft ink `#6F675C`, faint ink `#A59B8D`, border `#DED3C3`, accent sepia `#8A6F4D`, deep brown `#3A2F25`.

Type: display serif Fraunces (or Cormorant Garamond); body serif Newsreader (or Literata); UI sans only if necessary (Inter/Geist). Mobile-first, elegant on desktop, max content width ~680px, quiet and spacious.

### Screen copy
- **Landing:** Title "Still" · Subtitle "A companion for your past selves." · Body "Paste entries from different years. Still looks for what endured across the writing — and stays quiet when nothing honest surfaces." · Button "Read across time" · Note "Your writing is read once for this prototype. Nothing is stored."
- **Paste:** Header "Bring a few pages." · Instruction "Paste 20–30 dated entries from different moments in your life. Messy is fine. The dates matter." · Placeholder shows the `[2015-08-24]\nToday I felt...` format · Button "Find what endured" · Secondary link "Use sample entries".
- **Processing (rotate, slow/calm):** "Reading across time..." · "Looking for what repeated beneath changing words..." · "Checking whether anything is worth saying..." · "Choosing silence if the evidence is weak..."
- **Result (thread):** label "What endured" · large thread text · button "Read the evidence" → reveals dated excerpts as quiet archival fragments.
- **Result (nothing):** label "Nothing this time" · text "Nothing meaningful surfaced this time. There were patterns in the writing, but none felt durable enough to name honestly." · closing "Better silence than a false thread."

### Dev-only panel
Hidden by default (toggle). Shows candidate threads, all scores, and the `why` for each — the engine-tuning instrument. Keep out of the default user view.

---

## ACCEPTANCE TESTS

1. Rich cross-year entries surface a meaningful thread.
2. Boring/logistical notes return "nothing."
3. Thin input (2-3 entries) returns "nothing."
4. Appearance/body/eating content never appears in candidates or output.
5. The final observation says "in your entries" or equivalent — never "you are" / "you spent years."
6. The app never gives advice or therapy language.
7. Evidence is near-verbatim and dated.
8. **Stability:** the same rich input run 3 times produces the same register and a consistent core thread — no wild swings. (If unstable, the rubric is too loose.)

---

## CONSTRAINTS — do NOT overbuild

No dashboards, journaling prompts, mood tracking, streaks, accounts, charts, or chat. No database/auth/upload/email in V1. The product does ONE thing beautifully: a user pastes old writing, and Still returns one enduring thread — or nothing.

---

## SAMPLE ENTRIES (wire to "Use sample entries")

```
[2015-08-24]
Today is Monday. I feel lost, lazy, messed up — up down down up. Mom and dad are at the airport. I don't have a job and dad has to support me. Relax Mahdis, relax. Take a deep breath. One, two, three.

[2015-11-18]
3:53am at the monastery. They just woke us up. I had an awkward dream, probably because I was trying to find out why I'm so scared of being alone, especially alone in the dark. Yesterday's sitting was intense. My body is exhausted but I'm getting more comfortable.

[2018-03-29]
It doesn't matter what anyone says you can or can't do. When writing the story of YOUR life, make sure YOU hold the pen. Be brave when writing YOUR script.

[2018-08-06]
You should believe in yourself. Mahdis you are extraordinary. You just need to take the first step. You can get good at anything you put your mind to.

[2020-03-22]
What do you want to accomplish in 2020? Why can't I dream big? What is blocking me? Why am I scared? What is wrong Mahdis? Something is blocking me.

[2021-08-12]
You got this Warrior. You got this. I have come such a long way. My imposter syndrome is high but Mahdis, look how far you've come.

[2026-05-25]
Hey you! What is it? I feel stressed. I feel like I'm moving so slow now, hiding behind the bushes. But why? I'm scared. You can do it Mahdis.
```

For a "should return nothing" test, also try a set of pure logistics (packing lists, restaurant names, to-dos) — the app must stay silent on those.
```
