import { useLocation } from "wouter";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import { AmbientField, SiteNav } from "@/components/site-chrome";

// The maker's note — Mahdis's own words, in her own line-by-line cadence.
// Set as a prose-poem: each line its own quiet beat. Two moments are given
// special tenderness — the Sohrab Sepehri line (a pull-quote) and the
// whispered inner voices (set apart, italic).

type Block =
  | { kind: "line"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "whisper"; lines: string[] }
  | { kind: "still" }; // "And perhaps that is why I called it Still."

const NOTE: Block[] = [
  { kind: "line", text: "When I was a child, every year I got a new journal." },
  { kind: "line", text: "Some were simple notebooks." },
  { kind: "line", text: "Some had little locks on them." },
  { kind: "line", text: "I loved those ones." },
  {
    kind: "line",
    text: "I remember holding the tiny key in my hand and feeling like I had a secret world that belonged only to me.",
  },
  { kind: "line", text: "Inside those pages lived everything." },
  { kind: "line", text: "School." },
  { kind: "line", text: "Friends." },
  { kind: "line", text: "Crushes." },
  { kind: "line", text: "Big dreams." },
  { kind: "line", text: "Very dramatic heartbreaks." },
  {
    kind: "line",
    text: "Questions about life that I was certain nobody else had ever asked before.",
  },
  { kind: "line", text: "I wrote when I was excited." },
  { kind: "line", text: "I wrote when I was confused." },
  { kind: "line", text: "I wrote when I was lonely." },
  {
    kind: "line",
    text: "I wrote when I had nowhere else to put what I was feeling.",
  },
  {
    kind: "line",
    text: "I didn't know it then, but I was building a conversation with myself.",
  },
  { kind: "line", text: "One that would last decades." },
  {
    kind: "line",
    text: "Over the years, the journals followed me everywhere.",
  },
  { kind: "line", text: "Across countries." },
  { kind: "line", text: "Across languages." },
  { kind: "line", text: "Across versions of myself." },
  { kind: "line", text: "A little girl in Iran." },
  { kind: "line", text: "A teenager trying to understand the world." },
  { kind: "line", text: "A young woman leaving home." },
  { kind: "line", text: "An immigrant trying to build a life." },
  { kind: "line", text: "Someone falling in love." },
  { kind: "line", text: "Someone getting her heart broken." },
  {
    kind: "line",
    text: "Someone sitting on a train, writing because there was too much happening inside her chest.",
  },
  {
    kind: "line",
    text: "Someone awake at three in the morning asking questions she couldn't answer.",
  },
  { kind: "line", text: "And through all of it, I kept writing." },
  { kind: "line", text: "Some of those journals are gone now." },
  { kind: "line", text: "Lost during moves." },
  { kind: "line", text: "Thrown away by mistake." },
  {
    kind: "line",
    text: "Left behind somewhere between one version of my life and the next.",
  },
  { kind: "line", text: "Nobody meant harm." },
  { kind: "line", text: "Life was happening." },
  { kind: "line", text: "Boxes were being packed." },
  { kind: "line", text: "There was never enough room for everything." },
  {
    kind: "line",
    text: "But sometimes I think about those notebooks and feel a quiet ache.",
  },
  { kind: "line", text: "Not because I think they were brilliant." },
  {
    kind: "line",
    text: "Most of them were probably messy and dramatic and full of terrible handwriting.",
  },
  { kind: "line", text: "But they held people I can no longer fully reach." },
  { kind: "line", text: "A twelve-year-old me." },
  { kind: "line", text: "A seventeen-year-old me." },
  { kind: "line", text: "A twenty-one-year-old me." },
  {
    kind: "line",
    text: "Entire worlds that existed for a little while and then disappeared into time.",
  },
  { kind: "line", text: "I wish I could sit beside them sometimes." },
  { kind: "line", text: "Just for an afternoon." },
  { kind: "line", text: "Not to change anything." },
  { kind: "line", text: "Just to listen." },
  { kind: "line", text: "I have lived in many places since then." },
  { kind: "line", text: "Iran." },
  { kind: "line", text: "New Delhi." },
  { kind: "line", text: "Malaysia." },
  { kind: "line", text: "Rome." },
  { kind: "line", text: "London." },
  { kind: "line", text: "New York." },
  { kind: "line", text: "Los Angeles." },
  { kind: "line", text: "Each place changed me." },
  { kind: "line", text: "Each place left something behind." },
  {
    kind: "line",
    text: "And after enough years, enough moves, enough becoming, I started noticing something.",
  },
  {
    kind: "line",
    text: "It is surprisingly easy to lose touch with your own story.",
  },
  { kind: "line", text: "So I kept writing." },
  { kind: "line", text: "In journals." },
  { kind: "line", text: "In notebooks." },
  { kind: "line", text: "In iPhone Notes." },
  { kind: "line", text: "In Google Docs." },
  { kind: "line", text: "In emails to myself." },
  { kind: "line", text: "In the margins of books." },
  { kind: "line", text: "Sometimes at a desk." },
  { kind: "line", text: "Sometimes on a plane." },
  {
    kind: "line",
    text: "Sometimes in a bathtub before sunrise, holding a cup of coffee and trying to understand why my heart felt heavy.",
  },
  {
    kind: "line",
    text: "Every Christmas, I still buy myself a new journal.",
  },
  {
    kind: "line",
    text: "Over the years I started buying them for my siblings and close friends too.",
  },
  {
    kind: "line",
    text: "A journal has always felt like one of the most loving gifts you can give someone.",
  },
  { kind: "line", text: "Not because it gives answers." },
  { kind: "line", text: "Because it says:" },
  {
    kind: "whisper",
    lines: ["Here.", "This is a place where all of you gets to exist."],
  },
  {
    kind: "line",
    text: "Years ago, I kept returning to a poem by Sohrab Sepehri.",
  },
  {
    kind: "line",
    text: "I copied parts of it into my journals again and again.",
  },
  { kind: "line", text: "One line stayed with me:" },
  { kind: "quote", text: "We must wash our eyes and see differently." },
  {
    kind: "line",
    text: "At the time, I thought it was a poem about the world.",
  },
  { kind: "line", text: "Now I wonder if it is also a poem about memory." },
  {
    kind: "line",
    text: "Because something strange happens when you return to an old journal.",
  },
  { kind: "line", text: "The page has not changed." },
  { kind: "line", text: "The words have not changed." },
  { kind: "line", text: "But you have." },
  { kind: "line", text: "You find a sentence you forgot you wrote." },
  { kind: "line", text: "You meet a younger version of yourself." },
  { kind: "line", text: "You notice a fear that no longer owns you." },
  { kind: "line", text: "A dream that somehow survived." },
  { kind: "line", text: "A question that followed you across years." },
  { kind: "line", text: "Sometimes your heart breaks a little." },
  { kind: "line", text: "Sometimes you laugh." },
  {
    kind: "line",
    text: "Sometimes you want to reach through time and hug the person who wrote those words.",
  },
  {
    kind: "line",
    text: "And sometimes you realize she was doing much better than she thought.",
  },
  {
    kind: "line",
    text: "I think that feeling is what led me to build Still.",
  },
  { kind: "line", text: "Not a tool that tells you what your life means." },
  { kind: "line", text: "Not a tool that turns your memories into lessons." },
  { kind: "line", text: "Just a companion." },
  {
    kind: "line",
    text: "Something that can sit beside years of journals and gently place a page back in front of you.",
  },
  { kind: "line", text: "A line." },
  { kind: "line", text: "A memory." },
  { kind: "line", text: "A question." },
  { kind: "line", text: "A version of yourself." },
  {
    kind: "line",
    text: "Something waiting quietly for years to be seen again.",
  },
  { kind: "still" },
  { kind: "line", text: "Because so much changes." },
  { kind: "line", text: "Countries change." },
  { kind: "line", text: "Jobs change." },
  { kind: "line", text: "Relationships change." },
  { kind: "line", text: "Dreams change." },
  { kind: "line", text: "We change." },
  {
    kind: "line",
    text: "And yet, when I return to my journals, I almost always find something that is still there.",
  },
  { kind: "line", text: "A hope." },
  { kind: "line", text: "A fear." },
  { kind: "line", text: "A question." },
  { kind: "line", text: "A way of speaking to myself." },
  { kind: "line", text: "A voice saying:" },
  {
    kind: "whisper",
    lines: ["Hi my dear one.", "Come sit next to me.", "I'm here."],
  },
  {
    kind: "line",
    text: "And sometimes all it takes is one old sentence to remember who you were, how you felt, and how far you have come.",
  },
];

export default function Why() {
  const [, setLocation] = useLocation();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AmbientField />

      {/* A quiet reading-progress thread along the very top. */}
      {!reduce && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-0.5 bg-accent-sepia/60 origin-left z-50"
          style={{ scaleX: scrollYProgress }}
          aria-hidden="true"
        />
      )}

      <SiteNav showWhy={false} />

      <main className="flex-1 w-full max-w-[620px] mx-auto px-6 py-16 md:py-24">
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

          <article className="space-y-5">
            {NOTE.map((block, i) => (
              <NoteBlock
                key={i}
                block={block}
                first={i === 0}
                reduce={!!reduce}
              />
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

// Each line gently surfaces — a soft fade and rise — as it scrolls into view,
// echoing "wash our eyes and see differently." Static under reduced-motion.
function Reveal({
  reduce,
  children,
}: {
  reduce: boolean;
  children: React.ReactNode;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function NoteBlock({
  block,
  first,
  reduce,
}: {
  block: Block;
  first: boolean;
  reduce: boolean;
}) {
  if (block.kind === "quote") {
    return (
      <Reveal reduce={reduce}>
        <blockquote className="my-10 text-center">
          <p className="font-display italic text-2xl md:text-3xl text-deep-brown leading-snug">
            “{block.text}”
          </p>
        </blockquote>
      </Reveal>
    );
  }

  if (block.kind === "whisper") {
    return (
      <Reveal reduce={reduce}>
        <div className="my-10 text-center space-y-1.5">
          {block.lines.map((line, i) => (
            <p
              key={i}
              className="font-body italic text-xl md:text-2xl text-deep-brown leading-snug"
            >
              {line}
            </p>
          ))}
        </div>
      </Reveal>
    );
  }

  if (block.kind === "still") {
    return (
      <Reveal reduce={reduce}>
        <p className="font-body text-lg md:text-xl text-soft-ink leading-relaxed">
          And perhaps that is why I called it{" "}
          <em className="italic text-deep-brown">Still</em>.
        </p>
      </Reveal>
    );
  }

  // A line — the opening one sits a shade darker to draw the reader in.
  return (
    <Reveal reduce={reduce}>
      <p
        className={
          "font-body text-lg md:text-xl leading-relaxed " +
          (first ? "text-ink" : "text-soft-ink")
        }
      >
        {block.text}
      </p>
    </Reveal>
  );
}
