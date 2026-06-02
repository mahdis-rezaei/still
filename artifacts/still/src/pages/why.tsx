import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AmbientField, SiteNav } from "@/components/site-chrome";

// The maker's note — Mahdis's own words. Treated as content, set with care:
// flowing paragraphs, the short refrains grouped as quiet litanies, and the
// Sohrab Sepehri line as a pull-quote.

type Block =
  | { kind: "p"; text: string }
  | { kind: "lines"; items: string[] }
  | { kind: "quote"; text: string };

const NOTE: Block[] = [
  { kind: "p", text: "When I was a child, every year I got a new journal." },
  {
    kind: "p",
    text: "Some were simple notebooks. Some had little locks on them. I loved those ones. They made me feel like I had a tiny world that belonged only to me.",
  },
  { kind: "p", text: "I wrote about everything." },
  {
    kind: "lines",
    items: [
      "School.",
      "Things I was learning.",
      "People I loved.",
      "Questions I couldn't answer.",
      "Big dreams.",
      "Small heartbreaks.",
      "Things I was excited about.",
      "Things I was scared to say out loud.",
    ],
  },
  { kind: "p", text: "Over time, journaling became my companion." },
  {
    kind: "p",
    text: "It followed me through childhood, through adolescence, through first loves and first heartbreaks, through countries, languages, friendships, careers, and all the different versions of myself I became along the way.",
  },
  { kind: "p", text: "And there were many versions." },
  {
    kind: "lines",
    items: [
      "A ten-year-old with big dreams.",
      "A teenager trying to understand herself.",
      "A young woman leaving home.",
      "Someone learning to live in new places.",
      "Someone trying to build a life.",
      "Someone trying to find home.",
      "Someone learning, over and over again, how to begin again.",
    ],
  },
  { kind: "p", text: "Some of those journals are gone now." },
  {
    kind: "p",
    text: "My childhood notebooks were lost in moves. Some were thrown away by mistake. Later, when I moved again, other diaries disappeared too.",
  },
  {
    kind: "p",
    text: "Nobody meant harm. Life was moving. Boxes were being packed. There was not enough space for everything.",
  },
  {
    kind: "p",
    text: "But sometimes I think about those journals and feel a quiet ache.",
  },
  { kind: "p", text: "Not because they were perfectly written." },
  {
    kind: "p",
    text: "They were probably messy, dramatic, emotional, hopeful, confused, full of terrible handwriting and strong opinions.",
  },
  { kind: "p", text: "But they held people I can no longer fully reach." },
  {
    kind: "p",
    text: "A lot of my childhood has been forgotten simply because life kept moving forward.",
  },
  {
    kind: "p",
    text: "I have changed so much that sometimes it is hard to remember what those earlier versions of me were thinking, feeling, hoping for, or afraid of.",
  },
  { kind: "p", text: "And I wish I could visit them again." },
  {
    kind: "p",
    text: "I have lived in many places since then. Iran. New Delhi. Malaysia. Rome. London. New York. Los Angeles.",
  },
  { kind: "p", text: "Each place gave me a different version of myself." },
  { kind: "p", text: "Each place left something behind." },
  {
    kind: "p",
    text: "And after enough years, enough moves, enough becoming, you realize how easy it is to lose touch with your own story.",
  },
  { kind: "p", text: "So I kept writing." },
  {
    kind: "lines",
    items: [
      "In journals.",
      "In notebooks.",
      "In iPhone Notes.",
      "In Google Docs.",
      "In emails to myself.",
      "In the margins of books.",
    ],
  },
  {
    kind: "lines",
    items: [
      "Sometimes at a desk.",
      "Sometimes on a train.",
      "Sometimes at three in the morning when something inside me needed somewhere to go.",
    ],
  },
  { kind: "p", text: "Every Christmas, I still buy myself a new journal." },
  {
    kind: "p",
    text: "Over the years, I started buying them for my siblings and close friends too.",
  },
  {
    kind: "p",
    text: "A journal has always felt like one of the most loving gifts you can give someone.",
  },
  { kind: "p", text: "Not because it gives answers." },
  { kind: "p", text: "Because it gives a place for questions to live." },
  {
    kind: "p",
    text: "Years ago, I kept returning to a poem by Sohrab Sepehri.",
  },
  { kind: "p", text: "I copied parts of it into my journals again and again." },
  { kind: "p", text: "One line stayed with me:" },
  { kind: "quote", text: "We must wash our eyes and see differently." },
  { kind: "p", text: "At the time, I thought it was a poem about the world." },
  { kind: "p", text: "Now I wonder if it is also a poem about memory." },
  {
    kind: "p",
    text: "Because something strange happens when you return to an old journal.",
  },
  { kind: "p", text: "The page has not changed." },
  { kind: "p", text: "The words have not changed." },
  { kind: "p", text: "But you have." },
  {
    kind: "p",
    text: "You read a sentence you wrote ten years ago and notice something you couldn't see back then.",
  },
  {
    kind: "lines",
    items: [
      "A fear that no longer owns you.",
      "A dream that somehow survived.",
      "A younger version of yourself trying so hard to be brave.",
      "A page where you were lost, and still speaking to yourself with kindness.",
    ],
  },
  { kind: "p", text: "Sometimes rereading an old journal hurts." },
  { kind: "p", text: "Sometimes it steadies you." },
  { kind: "p", text: "Sometimes it reminds you how far you have come." },
  {
    kind: "p",
    text: "And sometimes it simply reminds you that you were there.",
  },
  {
    kind: "lines",
    items: [
      "That what you felt was real.",
      "That what you hoped for mattered.",
      "That the person who wrote those words still belongs to you.",
    ],
  },
  { kind: "p", text: "That feeling is what led me to build Still." },
  { kind: "p", text: "Most journaling tools remember what happened." },
  {
    kind: "p",
    text: "I wanted something that could help me remember what endured.",
  },
  { kind: "p", text: "Not by turning my life into lessons." },
  { kind: "p", text: "Not by summarizing who I am." },
  {
    kind: "p",
    text: "But by helping me reconnect with the pages I had already written.",
  },
  {
    kind: "lines",
    items: [
      "The questions.",
      "The memories.",
      "The dreams.",
      "The fears.",
      "The promises.",
      "The younger versions of myself still waiting inside those notebooks and notes.",
    ],
  },
  { kind: "p", text: "Still is a companion for lifelong journaling." },
  {
    kind: "p",
    text: "It looks across years of writing and gently brings something back.",
  },
  {
    kind: "lines",
    items: [
      "A line.",
      "A memory.",
      "A question.",
      "A feeling.",
      "A version of you.",
      "Something that may have been waiting quietly for years.",
    ],
  },
  { kind: "p", text: "Because some journals are lost forever." },
  { kind: "p", text: "Some versions of ourselves grow quiet." },
  { kind: "p", text: "But the pages we still have can continue speaking." },
  {
    kind: "p",
    text: "And sometimes all it takes is one old sentence to remember who you were, how you felt, and how far you have come.",
  },
];

export default function Why() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AmbientField />
      <SiteNav showWhy={false} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="font-sans text-xs uppercase tracking-[0.22em] text-faint-ink mb-5">
            A note from the maker
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-deep-brown leading-tight mb-14">
            why I built Still
          </h1>

          <article className="space-y-6">
            {NOTE.map((block, i) => (
              <NoteBlock key={i} block={block} first={i === 0} />
            ))}
          </article>

          <div className="h-px bg-border my-12" />

          <p className="font-body italic text-xl text-soft-ink mb-10">
            — Mahdis
          </p>

          <button
            onClick={() => setLocation("/login")}
            className="rounded-full bg-deep-brown text-background px-8 py-3 font-sans text-sm hover:bg-ink transition-colors"
            data-testid="button-begin"
          >
            Begin →
          </button>
        </motion.div>
      </main>
    </div>
  );
}

function NoteBlock({ block, first }: { block: Block; first: boolean }) {
  if (block.kind === "quote") {
    return (
      <blockquote className="my-10 text-center">
        <p className="font-display italic text-2xl md:text-3xl text-deep-brown leading-snug">
          “{block.text}”
        </p>
      </blockquote>
    );
  }

  if (block.kind === "lines") {
    return (
      <div className="border-l border-accent-sepia/30 pl-5 space-y-2 my-1">
        {block.items.map((line, i) => (
          <p
            key={i}
            className="font-body text-lg md:text-xl text-soft-ink leading-snug"
          >
            {line}
          </p>
        ))}
      </div>
    );
  }

  // Paragraph — the opening one sits a shade darker to draw the reader in.
  return (
    <p
      className={
        "font-body text-lg md:text-xl leading-relaxed " +
        (first ? "text-ink" : "text-soft-ink")
      }
    >
      {block.text}
    </p>
  );
}
