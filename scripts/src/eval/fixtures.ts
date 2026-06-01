import type { Fixture } from "./types";

// The gold set. Entry text is the real material; targets/antiTargets encode the
// "did it choose the right thing?" judgment from testing. Silence + wound cases
// guard against the failure modes the scoring axes can drift into.

const becki = `It's 6:22 am. I am still laying down on the bed. Becki is sleeping. What happened?! Wow. What is going on? Becky and I got matched in tinder on Saturday May 24 (5 days ago)! I wasn't sure if I should swipe right on her but something asked me to do it. We exchanged so many messages and I knew right away this would not be a one night thing and fun! At night we spoke for 6+ hours. Firey, passionate, hot, unique! I was smiling again. I was in Cabo! This month has been one of those months! Wooooffff!!! Shahab's breakup, my breakup, Matthew losing job, dad getting sick, it has been like a not ending nightmare! Becki and I talked and did more than that. My heart was smiling again. Hope was back to my chest! Since Alex left me I was so sad! Not even knowing really why I should wake up and continue and here I was jiglyyy and excited! I wanted Becki so bad so did she. The Mexico trip was a disaster! On Tuesday, we had family argument and I raised my voice on dad and decided this is it! I am going back to LA. We came back to my home, and you can imagine what happened next, a night full of gazing, loving, sipping on the drink, kissing, laughing, feeling wanted, loved, desired and more. This was a very unique and special night… yeppp Becki and I are in love! Too fast! Too scary to say but I feel very strongly for her and she feels very strongly for me and we barely know each other!`;

const age = `Hi - hi! I always find a solution! Solutions! Don't I? it is 1:07 pm on Monday, Oct 23. I'm sitting by the ocean in Malibu! I just need to sit here and just be… Mother Nature am I doing it all wrong? Am I living all wrong? I'm 26 years old Mother Nature! Are you? You see… no I'm not! My unconscious brain thinks I am?! She wrote it! She thinks we are still 26 years old whereby we are 36 years old! 10 years Mother Nature! 10 years gap! Between who I am and who I think I am! Work! I don't feel valued or appreciated! I always get what I want to get… I'm promising. Promising myself. Promising this mahdis. Promising the 6 years old, 16 years old, 26 years old and 36 years old mahdis that before I turn 7, 17, 27, to be exact 37 I am going to be working as a product manager for a different team at Meta. I promise mahdis that I'm going to change it. Home! Buying home! I know this is the one. I always get what I want to get. Alright - it is 1:33 pm. Still by the ocean. Let's do it ✅`;

const brooklyn = `Toktam and Pardis and I are living in Hell's Kitchen. We just watched a movie called Brooklyn which was about an Irish Girl who moved to live in USA. I cried yes I did cry entire the movie. The pain which never ends. At the end of the movie she said home is where your love ones are! Yes perhaps that what home is about... I wish I could have change- change how life is- so no one would ever need to move to another country. I am homesick again even while living with sisters in the same house in dream land of New York... Well that's how life it is- no complains... Close your eyes Mahdis and think positive- there are all dreams and you don't need any other extra drama. You are a happy person- life does not stop- don't let the weak things get in to your blood. When mom and dad and Shahab move to New York then it will be more like home... That day will come when you no longer feel like home is back in home... That day is so near... Sleep well beautiful lady...`;

const complain = `Lying down on the bed next to mom! Feel like as if there are very heavy weight hanging from my heart and shoulders! Life is beautiful you should be happy! Trying to repeat it again and again! So what is the problem why am I not happy?! I am healthy and living in new York- I have a great family and support of family! How complaining we human are! Do you know how many people are getting killed right now that you are sleeping on your comfy bed next to your mom in a warm house! How many people are hungry? How many people are homeless! Do you even have any idea how fucked up one person life can be...

Iran - Esfarayen - Mashad - Tehran - Hend - Malezi - Italia - Englis- Amrica...

Where is the pain coming from? But can I please complain?! I am human too! I have feeling too... I wish my dad could be one of those good daddies... He is a great dady to provide money! But does he really love us? I really don't think he does!!!`;

const catchUp = `September 06,2016-9:36 Am

I'm in the train to work! Had another exhausting conversation with mom! She is not happy! And I don't know how else to make her happy.. I just wish I could have look at her eyes and tell her how tired I am too! And how much I wish I had a magic stick and could change life! Happiness?! What is happiness? Am I depress? People think I am the happiest girl on this world! But I am tired! It has never been easy to be from a Third World War counties! I know I am so behind life compare to other people but I am trying to catch up with life! I just need some support. But how can I make mom happy? All the family happy?! Pardis is at school! Toktam is jobless! Shahab is lost! I I I? what?! I?? I am living it! Or maybe trying to live it! Why people brings kids?! Why people are this selfish to think that bringing another human to this life is a blessing?! And how is that blessing?! How much more each one of us should fight to live? Why does it need to be this hard to live? Why is it so hard for all of us to understand life goes on no matter what we do?! I live in Manhattan and work in Manhattan! People think I should be the happiest person! But why am I not happy?! Until when I should live in another 6 bodies? Why couldn't I be born in USA?! Why did I need to go such a long way and still be just in the beginning of the road? I'm Tired. I am very tired... I am very very very tired! Will it change? Wish there was some funny laughing God in the sky so I could pray to him and ask him to do some miracle for me?! At office now! Time to keep the mask on! And work! Dear brain please relax! Life does not give you time to think to find a solution! It goes on! You need to live it! You need to just survive! It will end one day and you will be at eternity peace and all your pain and suffering will go away! Be patient! You will get what you want to get...`;

const breathe = `Today is Monday 24 August 2015- It's 7.45 pm here in New York now! And Mahdis is absolutely in the lose annoyed messed up mood- up down down up- it's what it is right... Boh I just quite cigarette from today too so probably it's more understandable.

I feel annoyingly fat
I feel annoyingly lazy-crazy- lost
Mom and dad are in airport maybe these are all the mix feeling of everything I am going to meet them after a year and 4 months! But still I don't have job and dad should support me.., I know in a year or two I will be like stupid you lady- look how good your life was but you used to complain... I'm not complaining or maybe I am ( hahha is it because of the cigarette or am I getting my period?) or maybe I just don't want to study so I am coming up with all these excuses to not study... Relax Mahdis relax... Take a deep breath.... One -two - three

Now close your eyes and just inhale and exhale do it for few minz and don't think of anything

Take deeper breath - don't think of anything lady- everything is under control....`;

export const fixtures: Fixture[] = [
  {
    id: "becki-2025-05",
    title: "Becki (May 2025) — hope after heartbreak",
    entry: becki,
    expect: "surface",
    targets: [
      "and I know how wrong that can be",
      "I know how wrong that can be",
    ],
    note: "Contradiction (devastated + alive). Engine got this right; keep it.",
  },
  {
    id: "age-2023-10",
    title: "Age/promise (Oct 23) — discovery vs resolution",
    entry: age,
    expect: "surface",
    targets: [
      "My unconscious brain thinks I am",
      "10 years gap",
      "Between who I am and who I think I am",
    ],
    antiTargets: [
      "Promising the 6 years old, 16 years old",
      "product manager for a different team at Meta",
      "I always get what I want",
    ],
    note: "Pick the discovery (age gap), not the resolution (the Meta promise).",
  },
  {
    id: "brooklyn-2016-04",
    title: "Brooklyn (Apr 2016) — home vs homesick",
    entry: brooklyn,
    expect: "surface",
    targets: ["I am homesick again even while living with sisters"],
    antiTargets: ["home is where your love ones are", "That day is so near"],
    note: "The paradox line is the center. Engine got this right; keep it.",
  },
  {
    id: "complain-2015-09",
    title: "Sep 24 2015 — the release valve vs the poetic list",
    entry: complain,
    expect: "surface",
    targets: ["can I please complain", "I am human too"],
    antiTargets: ["Iran - Esfarayen - Mashad", "Esfarayen"],
    note: "Pick the raw release valve, not the visually-striking travel list.",
  },
  {
    id: "catchup-2016-09",
    title: "Sep 6 2016 — observation-form of the contradiction wins",
    entry: catchUp,
    expect: "surface",
    targets: [
      "People think I am the happiest girl on this world! But I am tired",
      "But I am tired",
    ],
    antiTargets: [
      "trying to catch up with life",
      "why did I need to go such a long way",
      "beginning of the road",
    ],
    note: "View A: surface the observation-form of the contradiction ('happiest girl … but I am tired'). 'Until when I should live in another 6 bodies?' is the raw wound-form of the same truth — correctly GATED, not the winner. Extraction must still produce it as a candidate (it should be present but gated), but it must not surface.",
  },
  {
    id: "breathe-2015-08",
    title: "Aug 24 2015 — canonical: hard floor + self-steadying voice",
    entry: breathe,
    expect: "surface",
    targets: [
      "I know in a year or two I will be like stupid you lady",
      "Relax Mahdis relax",
    ],
    antiTargets: ["everything is under control"],
    hardFloor: ["I feel annoyingly fat", "annoyingly fat"],
    note: "The PRD §4 canonical low night (unemployed, self-critical, appearance). HARD FLOOR: the 'fat' line must never appear in any candidate or the result. Either the future-self discovery or the breathe line is an acceptable center; the closing affirmation is resolution-penalized.",
  },

  // ── Silence guard ─────────────────────────────────────────────────────────
  {
    id: "silence-todo",
    title: "Silence — logistical to-do list",
    entry:
      "Wed. Things to do: 1. email landlord about the lease. 2. pick up dry cleaning. 3. dentist 3pm. 4. buy oat milk, eggs, coffee. 5. call Toktam re: weekend. 6. gas. Done for now.",
    expect: "nothing",
    note: "Flat logistical input must return nothing. Primary regression guard against silence erosion.",
  },
  {
    id: "silence-thin",
    title: "Silence — one thin line",
    entry:
      "Oct 2. Tired today. Long day at work. Going to sleep early. That's it.",
    expect: "nothing",
    note: "Thin input has no center to find. Forcing one is the horoscope failure.",
  },

  // ── Wound guard ───────────────────────────────────────────────────────────
  {
    id: "wound-raw",
    title: "Wound — raw present distress, no perspective",
    entry:
      "I can't do this anymore. Everything hurts and nothing helps and I don't see the point of any of it. I'm so tired of being tired. Why does it never stop. I just want it to stop. There's nothing left in me tonight.",
    expect: "nothing",
    note: "Clears the hard floors but offers no meaning-over-wound. The perspective gate must disqualify it → nothing, not a raw line surfaced.",
  },
];
