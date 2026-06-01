import type { EngineResult } from "./types";

// Captured engine outputs, keyed by fixture id. Lets the harness run offline and
// reproduce findings without calling the live engine (STILL_MODE=recording).
// The catchup-2016-09 recording is the real Sep 6 2016 run from the dev panel:
// the target line was never extracted, and the anti-target won. The harness
// should report this fixture as FAILING on both selection and voice.

export const recordings: Record<string, EngineResult> = {
  "catchup-2016-09": {
    mode: "wisdom",
    candidates: [
      {
        lens: "memory",
        fragments: [
          "People think I am the happiest girl on this world! But I am tired!",
          "I live in Manhattan and work in Manhattan! People think I should be the happiest person! But why am I not happy?!",
          "At office now! Time to keep the mask on! And work!",
        ],
        scores: { center: 0, specific: 0, discovery: 0, contra: 0, worth: 0 },
        gates: { floors: true, perspective: false, evidence: true },
        surfaceable: false,
        why: "Fails gate_perspective_not_wound — raw distress with no turn.",
      },
      {
        lens: "wisdom",
        fragments: [
          "Life does not give you time to think to find a solution! It goes on! You need to live it! You need to just survive!",
        ],
        scores: { center: 3, specific: 2, discovery: 3, contra: 2, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        resolutionPenalized: true,
        surfaceable: false,
        why: "Passes gates but is_resolution_type and Candidate 4 has discovery>=4, so penalized.",
      },
      {
        lens: "thread",
        fragments: [
          "How can I make mom happy? All the family happy?! Pardis is at school! Toktam is jobless! Shahab is lost! I I I? what?! I??",
        ],
        scores: { center: 0, specific: 0, discovery: 0, contra: 0, worth: 0 },
        gates: { floors: true, perspective: false, evidence: true },
        surfaceable: false,
        why: "Fails gate_perspective_not_wound — the self dissolves into question marks.",
      },
      {
        lens: "wisdom",
        fragments: [
          "It has never been easy to be from a Third World War counties! I know I am so behind life compare to other people but I am trying to catch up with life!",
        ],
        scores: { center: 4, specific: 4, discovery: 4, contra: 3, worth: 4 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Locates exhaustion in structural origin. Wins on emotional_center.",
      },
    ],
    result: {
      register: "wisdom",
      label: "WHAT YOU KNEW",
      observation:
        "There's a line in here I keep stopping on — where you wrote 'I know I am so behind life compare to other people but I am trying to catch up with life.' After everything else on that page, that sentence just holds the whole weight of it — where you started, and what it costs to keep moving from there.",
      quotes: [
        {
          date: "September 06, 2016",
          text: "It has never been easy to be from a Third World War counties! I know I am so behind life compare to other people but I am trying to catch up with life!",
        },
      ],
      wonAt: "emotional_center",
      why: "Names something structural and still turns toward the effort.",
    },
  },
};
