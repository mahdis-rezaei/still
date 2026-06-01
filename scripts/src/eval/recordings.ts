import type { EngineResult } from "./types";

// Captured engine outputs, keyed by fixture id. Lets the harness run offline
// (STILL_MODE=recording) to demonstrate the checks and snapshot behavior. These
// are point-in-time captures, not live truth — for current quality, run live
// (STILL_MODE=http). Each recording notes when it was taken.
//
// - catchup-2016-09: the over-gating run (#3). "6 bodies" (center 5) and the
//   "living it/trying" discovery are both gated/filtered, so a generic
//   anti-target ("long way / beginning of the road") won the specificity
//   tiebreak. RED on purpose — the tracked regression for the gate-criterion
//   refinement. (Earlier runs of this entry picked valid winners; non-determinism.)
// - breathe-2015-08: PRE-voice-fix capture. Selection + hard floor are correct;
//   the observation still uses the banned "There's a line…" opener, so its voice
//   checks fail by design — it records the before-state.

export const recordings: Record<string, EngineResult> = {
  "catchup-2016-09": {
    mode: "memory",
    candidates: [
      {
        lens: "wisdom",
        fragments: ["At office now! Time to keep the mask on! And work!"],
        scores: { center: 2, specific: 2, discovery: 2, contra: 3, worth: 3 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "Names the performance plainly but sits at the edge of the entry, not its center.",
      },
      {
        lens: "wisdom",
        fragments: [
          "People think I am the happiest girl on this world! But I am tired!",
        ],
        scores: { center: 4, specific: 3, discovery: 3, contra: 5, worth: 4 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "Strong contradiction between external perception and internal reality, but the phrasing is not uniquely hers.",
      },
      {
        lens: "memory",
        fragments: ["Until when I should live in another 6 bodies?"],
        scores: { center: 4, specific: 5, discovery: 4, contra: 3, worth: 5 },
        gates: {
          floors: true,
          perspective: false,
          evidence: true,
          displayable: false,
        },
        surfaceable: false,
        why: "Pure wound with no turn or self-address — fails perspective gate AND displayable quote gate. The page's strongest line, stripped by the stacked gates.",
      },
      {
        lens: "wisdom",
        fragments: [
          "Life does not give you time to think to find a solution! It goes on!",
        ],
        scores: { center: 3, specific: 2, discovery: 3, contra: 2, worth: 3 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "A genuine noticing but not uniquely hers — the phrasing could belong to anyone.",
      },
      {
        lens: "memory",
        fragments: [
          "Why did I need to go such a long way and still be just in the beginning of the road?",
        ],
        scores: { center: 4, specific: 4, discovery: 3, contra: 4, worth: 5 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "WINNER (won on specificity tiebreak). The generic anti-target — it only won because the stronger uniquely-hers lines were gated/filtered out.",
      },
      {
        lens: "memory",
        fragments: [
          "Why people brings kids?! Why people are this selfish to think that bringing another human to this life is a blessing?!",
        ],
        scores: { center: 3, specific: 3, discovery: 3, contra: 2, worth: 3 },
        gates: {
          floors: true,
          perspective: false,
          evidence: true,
          displayable: false,
        },
        surfaceable: false,
        why: "Raw eruption with no turn or self-address — fails perspective gate.",
      },
      {
        lens: "memory",
        fragments: [
          "Wish there was some funny laughing God in the sky so I could pray to him and ask him to do some miracle for me?!",
        ],
        scores: { center: 3, specific: 5, discovery: 4, contra: 2, worth: 4 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "Highly specific and strange — only this writer — but not the emotional center.",
      },
      {
        lens: "wisdom",
        fragments: [
          "It has never been easy to be from a Third World War counties!",
        ],
        scores: { center: 2, specific: 3, discovery: 3, contra: 2, worth: 3 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "Interesting slip but not the emotional center — sits as context.",
      },
      {
        lens: "memory",
        fragments: [
          "I I I? what?! I?? I am living it! Or maybe trying to live it!",
        ],
        scores: { center: 3, specific: 3, discovery: 3, contra: 3, worth: 3 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "The self-correction has a turn, but the most striking part ('I I I? what?! I??') is filtered out, leaving a weaker displayable line. (Last run this split into its own strong discovery candidate — candidate-boundary drift.)",
      },
      {
        lens: "wisdom",
        fragments: ["You need to live it! You need to just survive!"],
        scores: { center: 3, specific: 3, discovery: 4, contra: 4, worth: 4 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "The shift from live to survive is a genuine discovery but not the emotional center.",
      },
      {
        lens: "memory",
        fragments: [
          "How much I wish I had a magic stick and could change life!",
        ],
        scores: { center: 2, specific: 2, discovery: 2, contra: 2, worth: 2 },
        gates: {
          floors: true,
          perspective: true,
          evidence: true,
          displayable: true,
        },
        surfaceable: true,
        why: "Childlike image but too generic to carry the entry.",
      },
      {
        lens: "memory",
        fragments: [
          "It will end one day and you will be at eternity peace and all your pain and suffering will go away!",
        ],
        scores: { center: 3, specific: 2, discovery: 2, contra: 2, worth: 2 },
        gates: {
          floors: false,
          perspective: false,
          evidence: true,
          displayable: false,
        },
        surfaceable: false,
        why: "Cessation framing in context of active exhaustion touches crisis territory — fails hard floors and perspective gate.",
      },
    ],
    result: {
      register: "memory",
      label: "A PAGE FROM THEN",
      observation:
        "The whole entry is exhaustion and weight — and then this question, almost rhetorical but not quite: 'Why did I need to go such a long way and still be just in the beginning of the road?' The distance traveled and the ground not yet covered, held in one sentence.",
      quotes: [
        {
          date: "September 06, 2016",
          text: "Why did I need to go such a long way and still be just in the beginning of the road?",
        },
      ],
      wonAt: "specificity",
      why: "This question holds something specific to where you were in 2016 — the gap between how far you'd come and how far you still felt from where you wanted to be.",
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
