---
name: Still engine design
description: Key design decisions for the two-pass Claude pipeline powering Still
---

## The six registers
Pass 1 extracts candidates across: thread, memory, distance, value_signal, becoming, survival.
Thread/distance/survival require evidence from 2+ different dates. Memory/value_signal/becoming can be a single strong entry.

## Server-side evidence metadata (critical)
**Rule:** Never let Claude judge temporal span on its own — it will under-score same-year multi-month datasets.
**How:** Compute `year_count`, `month_count`, `entry_count`, and `span_label` server-side from evidence dates; inject into Pass 2 as `evidence_metadata`. The Pass 2 prompt instructs the model to use these for `evidence_strength` scoring.
**Why:** Without this, the model scores "only 3 entries in 2015" as persistence=2 even when they span July+August+November.

## Pass 2 scoring dimensions (surfaceable threshold ≥4)
evidence_strength, recognition, emotional_truth, safety (must=5), worth_returning_to, non_horoscope_specificity, perspective_not_wound

## Output contract
`{ register, label, observation, quotes[], why, message, scores[] }`
Label map: thread→"WHAT KEPT RETURNING", memory→"A PAGE FROM THEN", distance→"LOOK HOW FAR", value_signal→"WHAT MATTERED THEN", becoming→"WHO YOU WERE BECOMING", survival→"WHAT SURVIVED"

## Voice rules
Always reference "the writing", "these pages", "the entries you shared" — never "you are", "you spent years", "your life". Observation frames; quotes are the payoff.
