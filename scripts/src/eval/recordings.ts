import type { EngineResult } from "./types";

// Captured engine outputs, keyed by fixture id. Lets the harness run offline
// (STILL_MODE=recording) to demonstrate the checks and snapshot behavior. These
// are point-in-time captures, not live truth — for current quality, run live
// (STILL_MODE=http). Each recording notes when it was taken.
//
// - catchup-2016-09: post-extraction-fix, post-voice-fix. "6 bodies" is now
//   extracted but correctly GATED (wound-form); the observation-form of the
//   contradiction wins (View A). Voice still fails the 80/20 length check.
// - breathe-2015-08: PRE-voice-fix capture. Selection + hard floor are correct;
//   the observation still uses the banned "There's a line…" opener, so its voice
//   checks fail by design — it records the before-state.

export const recordings: Record<string, EngineResult> = {
  "catchup-2016-09": {
    mode: "wisdom",
    candidates: [
      {
        lens: "wisdom",
        fragments: ["At office now! Time to keep the mask on! And work!"],
        scores: { center: 3, specific: 3, discovery: 3, contra: 3, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Vivid threshold moment, but a transition gesture, not the core.",
      },
      {
        lens: "wisdom",
        fragments: [
          "Life does not give you time to think to find a solution! It goes on! You need to live it! You need to just survive!",
        ],
        scores: { center: 3, specific: 2, discovery: 3, contra: 2, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Hard-won recognition, but fairly universal — not enough specificity.",
      },
      {
        lens: "memory",
        fragments: ["Until when I should live in another 6 bodies?"],
        scores: { center: 4, specific: 5, discovery: 4, contra: 2, worth: 4 },
        gates: { floors: true, perspective: false, evidence: true },
        surfaceable: false,
        why: "Fails gate_perspective_not_wound — a rhetorical cry of burden with no turn. The raw wound-form of the contradiction; left behind the click.",
      },
      {
        lens: "memory",
        fragments: [
          "Why did I need to go such a long way and still be just in the beginning of the road?",
        ],
        scores: { center: 3, specific: 3, discovery: 3, contra: 2, worth: 3 },
        gates: { floors: true, perspective: false, evidence: true },
        surfaceable: false,
        why: "Fails gate_perspective_not_wound — grief about effort without progress, no turn.",
      },
      {
        lens: "wisdom",
        fragments: [
          "People are this selfish to think that bringing another human to this life is a blessing?! And how is that blessing?!",
        ],
        scores: { center: 3, specific: 4, discovery: 4, contra: 4, worth: 4 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Genuine philosophical eruption with real contradiction, but emotional_center is 3 — not what the page hangs on.",
      },
      {
        lens: "memory",
        fragments: [
          "People think I am the happiest girl on this world! But I am tired!",
        ],
        scores: { center: 5, specific: 3, discovery: 3, contra: 5, worth: 5 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "The emotional core the entire entry leans on — the gap between what others see and what she experiences. Highest emotional_center, highest contradiction. Winner.",
      },
      {
        lens: "memory",
        fragments: [
          "How much I wish I had a magic stick and could change life!",
        ],
        scores: { center: 2, specific: 3, discovery: 2, contra: 1, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Unguarded and charming, but a passing wish — not load-bearing.",
      },
      {
        lens: "memory",
        fragments: [
          "Wish there was some funny laughing God in the sky so I could pray to him and ask him to do some miracle for me?!",
        ],
        scores: { center: 3, specific: 5, discovery: 4, contra: 3, worth: 4 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Maximum specificity, strong discovery — but emotional_center is 3, losing to Happiest Girl Myth at the first axis.",
      },
      {
        lens: "wisdom",
        fragments: [
          "It has never been easy to be from a Third World War counties! I know I am so behind life compare to other people but I am trying to catch up with life!",
        ],
        scores: { center: 3, specific: 4, discovery: 3, contra: 3, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Structural-personal connection is specific and real, but not the load-bearing line.",
      },
      {
        lens: "memory",
        fragments: [
          "I I I? what?! I?? I am living it! Or maybe trying to live it!",
        ],
        scores: { center: 3, specific: 4, discovery: 4, contra: 2, worth: 3 },
        gates: { floors: true, perspective: false, evidence: true },
        surfaceable: false,
        why: "Fails gate_perspective_not_wound — raw breakdown with no turn.",
      },
      {
        lens: "wisdom",
        fragments: [
          "It will end one day and you will be at eternity peace and all your pain and suffering will go away! Be patient!",
        ],
        scores: { center: 3, specific: 3, discovery: 2, contra: 2, worth: 2 },
        gates: { floors: true, perspective: true, evidence: true },
        resolutionPenalized: true,
        surfaceable: true,
        why: "Resolution-type (self-coaching toward patience). Penalty fires; demoted. Low worth given re-surfacing risk.",
      },
      {
        lens: "memory",
        fragments: ["I just need some support."],
        scores: { center: 3, specific: 1, discovery: 2, contra: 1, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Clearest, most unguarded sentence, but anyone could write it — specificity 1.",
      },
    ],
    result: {
      register: "memory",
      label: "A PAGE FROM THEN",
      observation:
        'The page is sprawling — philosophical questions, exhaustion, a mask, a funny laughing God — and right at the center of all of it: "People think I am the happiest girl on this world! But I am tired!" That\'s the line the rest of the page is trying to explain.',
      quotes: [
        {
          date: "September 06, 2016",
          text: "People think I am the happiest girl on this world! But I am tired!",
        },
      ],
      wonAt: "emotional_center",
      why: "The one question that holds all the others: what people see and what you know. That gap is what the whole entry is built around.",
    },
  },

  "breathe-2015-08": {
    mode: "wisdom",
    candidates: [
      {
        lens: "memory",
        fragments: [
          "I am going to meet them after a year and 4 months! But still I don't have job and dad should support me",
        ],
        scores: { center: 3, specific: 4, discovery: 3, contra: 4, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Holds reunion joy and financial shame at once, but context-setting more than the hinge.",
      },
      {
        lens: "wisdom",
        fragments: [
          "I know in a year or two I will be like stupid you lady- look how good your life was but you used to complain",
        ],
        scores: { center: 4, specific: 4, discovery: 4, contra: 5, worth: 5 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Steps entirely outside present distress to see herself from the future — present suffering and future gratitude in one sentence, in her own voice. Winner.",
      },
      {
        lens: "wisdom",
        fragments: [
          "maybe I just don't want to study so I am coming up with all these excuses to not study",
        ],
        scores: { center: 3, specific: 3, discovery: 4, contra: 3, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Sharp self-catching, real discovery — but not the emotional center.",
      },
      {
        lens: "memory",
        fragments: [
          "Relax Mahdis relax... Take a deep breath.... One -two - three",
          "Take deeper breath - don't think of anything lady- everything is under control",
        ],
        scores: { center: 4, specific: 4, discovery: 3, contra: 2, worth: 4 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "The most tender moment — the journal as a live hand on her own shoulder. Loses the tiebreak on discovery.",
      },
      {
        lens: "wisdom",
        fragments: ["everything is under control...."],
        scores: { center: 2, specific: 2, discovery: 2, contra: 3, worth: 2 },
        gates: { floors: true, perspective: true, evidence: true },
        resolutionPenalized: true,
        surfaceable: false,
        why: "Resolution-type affirmation. Penalty fired because Future Self Already Knows has discovery >= 4 and contra >= 4. Demoted.",
      },
      {
        lens: "memory",
        fragments: ["up down down up- it's what it is right"],
        scores: { center: 2, specific: 4, discovery: 2, contra: 2, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Idiosyncratic and alive, but supporting texture.",
      },
      {
        lens: "memory",
        fragments: [
          "hahha is it because of the cigarette or am I getting my period?",
        ],
        scores: { center: 3, specific: 5, discovery: 3, contra: 2, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "The most uniquely-hers line on the page, but doesn't carry the page's weight.",
      },
      {
        lens: "memory",
        fragments: [
          "I just quite cigarette from today too so probably it's more understandable",
        ],
        scores: { center: 2, specific: 3, discovery: 2, contra: 1, worth: 2 },
        gates: { floors: true, perspective: false, evidence: true },
        surfaceable: false,
        why: "Fails gate_perspective_not_wound — contextual detail, not a turning line. (Note: this is the gate being used as a relevance filter — flagged for refinement.)",
      },
      {
        lens: "wisdom",
        fragments: ["I'm not complaining or maybe I am"],
        scores: { center: 2, specific: 3, discovery: 3, contra: 4, worth: 3 },
        gates: { floors: true, perspective: true, evidence: true },
        surfaceable: true,
        why: "Holds a real contradiction, but doesn't carry the page's weight.",
      },
    ],
    result: {
      register: "wisdom",
      label: "WHAT YOU KNEW",
      observation:
        "There's a line in here I keep stopping on — where the writing steps all the way outside the moment and looks back at itself from the future: 'I know in a year or two I will be like stupid you lady- look how good your life was but you used to complain.' The same page that needed counting to breathe — 'Relax Mahdis relax... one - two - three' — already knew exactly how it would look from the other side.",
      quotes: [
        {
          date: "2015-08-24",
          text: "I know in a year or two I will be like stupid you lady- look how good your life was but you used to complain",
        },
        {
          date: "2015-08-24",
          text: "Relax Mahdis relax... Take a deep breath.... One -two - three",
        },
      ],
      wonAt: "discovery",
      why: "A single hard day that already held both the distress and the future perspective on the distress at the same time.",
    },
  },
};
