---
name: Still engine design
description: Key design decisions for the two-pass Claude pipeline powering Still
---

## The five modes
Pass 1 extracts candidates across: thread, memory, distance, value_signal, wisdom.
(Earlier `becoming` and `survival` were removed; `wisdom` added.)
Thread/distance require evidence from 2+ different dates. Memory/value_signal/wisdom can be a single strong entry.
No thread-first priority — Pass 2 chooses by actual quality. A vivid memory or single wisdom line can beat a clean thread.

## Server-side evidence metadata (critical)
**Rule:** Never let Claude judge temporal span on its own — it will under-score same-year multi-month datasets.
**How:** Compute `year_count`, `month_count`, `entry_count`, `span_label` server-side from evidence dates; inject into Pass 2.
**Why:** Without this, the model scores "only 3 entries in 2015" as low persistence even when they span July+Aug+Nov.

## Quote-safety filter (perspective-not-wound) — non-obvious lesson
**Rule:** Surfaced quote fragments must obey the SAME safety filter as the observation — never surface a raw cry of pain as a naked fragment. Prefer steadying/turning/self-addressing lines.
**Why:** The model conflates a rhetorical cry of distress ("why am I not happy?!", "I am very tired") with "aliveness/realness" and will surface it as evidence even when the headline observation is gentle — producing a gentle headline over a raw-wound fine print. Listing example fragments was not enough; you must explicitly name the failure ("a cry of pain is NOT a turning line") and ask the test question: does the line REACH for something, or only voice the hurt?
**How to apply:** In PASS2_SYSTEM QUOTE SELECTION. Also keep fragment count low (1–4, fewer is better, never pad to a count) — padding is what pulls in the raw context lines.

## Voice rules (refined over many rounds)
- React to ONE moment like a close friend; do NOT narrate the sequence ("first… then… then…").
- Notice, never interpret the interior: "you" only when tied to the text ("you wrote/asked/saved"), never "you learned/became/welcomed/understood".
- The quote carries the payoff (80/20); prose just walks to it and stops. End on the writer's voice.

## Output contract
`{ mode, label, observation, quotes[], why, message, scores[] }` — field is `mode` (not `register`).
Label map: thread→"WHAT KEPT RETURNING", memory→"A PAGE FROM THEN", distance→"LOOK HOW FAR", value_signal→"WHAT MATTERED THEN", wisdom→"WHAT YOU KNEW".

## "Show full entry" data flow
result.tsx resolves a quote's full original entry by date: prefers stored DB entry containing the fragment (useListEntries), falls back to client-side parsed paste (store.tsx parsedEntries), degrades gracefully (control hidden) when neither exists. Fragment highlight is whitespace/case-tolerant (regex with \s+).
