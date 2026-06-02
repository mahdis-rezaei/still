import { Link } from "wouter";
import { motion } from "framer-motion";
import { AmbientField } from "@/components/site-chrome";

// The public landing — an editorial scroll that lets someone *feel* Yadegar
// before they understand it. Type-led, warm paper, restrained color (soft
// tinted lens chips), the Persian word as a hero element. No stock photography.

type Tone = "sepia" | "sage" | "blush";

const TONES: Record<Tone, { backgroundColor: string; color: string }> = {
  sepia: { backgroundColor: "rgba(138,111,77,0.13)", color: "#8A6F4D" },
  sage: { backgroundColor: "rgba(120,134,102,0.16)", color: "#5e6a4d" },
  blush: { backgroundColor: "rgba(185,138,120,0.16)", color: "#9c6a58" },
};

// Example "returns" — drawn from the kind of pages Yadegar surfaces. The words
// are illustrative of the real product's voice (one quiet line, in your own words).
const RETURNS: {
  tag: string;
  tone: Tone;
  date: string;
  quote: string;
  note: string;
}[] = [
  {
    tag: "a forgotten page",
    tone: "sepia",
    date: "September 2015",
    quote:
      "3:53am at the monastery. My body is exhausted — but I'm getting more comfortable being alone in the dark.",
    note: "A page you'd forgotten you wrote.",
  },
  {
    tag: "what kept returning",
    tone: "sage",
    date: "2015 — 2026",
    quote: "Take a deep breath, Mahdis. You can do it.",
    note: "The same quiet way you've always talked yourself back onto your feet.",
  },
  {
    tag: "how far you've come",
    tone: "blush",
    date: "2020 — today",
    quote: "Why can't I dream big? What is blocking me?",
    note: "A fear that, somewhere along the way, quietly let go.",
  },
  {
    tag: "something you knew",
    tone: "sepia",
    date: "March 2018",
    quote:
      "When writing the story of your life, make sure you hold the pen.",
    note: "A line you wrote years ago that still feels true.",
  },
];

const STEPS: { n: string; t: string; d: string }[] = [
  {
    n: "01",
    t: "Write",
    d: "Write today's page, or bring in years of old ones. It doesn't need to be wise — only honest.",
  },
  {
    n: "02",
    t: "Keep",
    d: "Your pages are kept private and encrypted, sorted by date and by year. Yours alone.",
  },
  {
    n: "03",
    t: "Return",
    d: "When you ask, Yadegar reads across your years and places one page back in front of you — or stays quiet when nothing honest surfaces.",
  },
  {
    n: "04",
    t: "Reflect",
    d: "Write back to the person who wrote it. Letters across time, kept side by side.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-xs uppercase tracking-[0.22em] text-faint-ink text-center mb-6">
      {children}
    </p>
  );
}

function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Landing({
  onCreate,
  onSignIn,
}: {
  onCreate: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background overflow-x-hidden">
      <AmbientField />

      {/* Nav */}
      <nav className="w-full flex items-center justify-between px-6 md:px-10 py-5">
        <span className="font-display text-xl text-deep-brown tracking-tight">
          Yadegar
        </span>
        <div className="flex items-center gap-5">
          <Link
            href="/why"
            className="hidden sm:inline font-sans text-xs uppercase tracking-[0.18em] text-soft-ink hover:text-ink transition-colors"
          >
            Why Yadegar
          </Link>
          <button
            onClick={onSignIn}
            className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
            data-testid="button-hero-signin"
          >
            Sign in
          </button>
          <button
            onClick={onCreate}
            className="rounded-full bg-deep-brown text-background px-4 py-1.5 font-sans text-sm hover:bg-ink transition-colors"
          >
            Create account
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-6 pt-16 pb-24 md:pt-24 md:pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-[640px] mx-auto"
        >
          <p
            className="font-display text-3xl text-accent-sepia/70 mb-2"
            dir="rtl"
            lang="fa"
          >
            یادگار
          </p>
          <h1 className="font-display text-7xl md:text-8xl text-deep-brown leading-none mb-6">
            Yadegar
          </h1>
          <p className="font-body italic text-lg md:text-xl text-accent-sepia mb-7">
            Persian: a keepsake — the thing that remains
          </p>
          <p className="font-body text-lg md:text-xl text-soft-ink leading-relaxed mb-10 max-w-[34rem] mx-auto">
            A companion to a lifelong journaling practice. It reads across your
            years and brings back one page worth returning to — gently, and
            always in your own words.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onCreate}
              className="rounded-full bg-deep-brown text-background px-8 py-3 font-sans text-sm hover:bg-ink transition-colors"
              data-testid="button-hero-register"
            >
              Create account
            </button>
            <Link
              href="/why"
              className="rounded-full border border-border bg-surface/70 text-ink px-8 py-3 font-sans text-sm hover:border-accent-sepia transition-colors"
            >
              Why I built this
            </Link>
          </div>
        </motion.div>
      </header>

      {/* What comes back — example returns */}
      <section className="px-6 py-20 md:py-24 bg-[#F1EADD]">
        <div className="max-w-[720px] mx-auto">
          <Reveal>
            <Eyebrow>What comes back</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-deep-brown text-center leading-tight mb-12 max-w-[34rem] mx-auto">
              Not a summary of your life. One page, returned at the moment it's
              true again.
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {RETURNS.map((r) => (
              <Reveal key={r.tag}>
                <div className="h-full border border-border rounded-2xl bg-surface/80 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="font-sans text-xs px-2.5 py-1 rounded-full"
                      style={TONES[r.tone]}
                    >
                      {r.tag}
                    </span>
                    <span className="font-sans text-xs text-faint-ink">
                      {r.date}
                    </span>
                  </div>
                  <p className="font-display italic text-xl text-deep-brown leading-snug mb-3">
                    “{r.quote}”
                  </p>
                  <p className="font-body text-sm text-soft-ink mt-auto">
                    {r.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-[640px] mx-auto">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
          </Reveal>
          <div className="flex flex-col">
            {STEPS.map((s) => (
              <Reveal key={s.n}>
                <div className="flex gap-6 py-6 border-t border-border/70 first:border-0">
                  <span className="font-display text-2xl text-faint-ink shrink-0 w-10">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl text-deep-brown mb-1.5">
                      {s.t}
                    </h3>
                    <p className="font-body text-soft-ink leading-relaxed">
                      {s.d}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The word */}
      <section className="px-6 py-20 md:py-28 bg-[#F1EADD] text-center">
        <div className="max-w-[600px] mx-auto">
          <Reveal>
            <Eyebrow>The word</Eyebrow>
            <p
              className="font-display text-6xl md:text-7xl text-deep-brown mb-4"
              dir="rtl"
              lang="fa"
            >
              یادگار
            </p>
            <p className="font-body italic text-soft-ink mb-6">
              yadegar · Persian, noun
            </p>
            <p className="font-body text-lg md:text-xl text-soft-ink leading-relaxed mb-5">
              A keepsake. A memento. The trace a person — or a time — leaves
              behind. The thing that remains.
            </p>
            <p className="font-body text-soft-ink leading-relaxed">
              Some journals are lost in moves. Some are thrown away by mistake.
              But the pages that remain can still speak.
            </p>
          </Reveal>
        </div>
      </section>

      {/* A note from the maker */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-[600px] mx-auto">
          <Reveal>
            <Eyebrow>A note from the maker</Eyebrow>
            <p className="font-display italic text-2xl md:text-3xl text-deep-brown leading-snug text-center mb-6">
              “I didn't know it then, but I was building a conversation with
              myself. One that would last decades.”
            </p>
            <p className="font-body text-soft-ink leading-relaxed text-center mb-7">
              I've kept a journal through every version of myself — and lost some
              of them along the way. Yadegar is for the pages that remain.
            </p>
            <p className="text-center">
              <Link
                href="/why"
                className="font-sans text-sm text-accent-sepia hover:text-deep-brown border-b border-accent-sepia/40 pb-0.5 transition-colors"
              >
                Read the full story →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pt-20 pb-24 md:pt-24 md:pb-28 bg-[#F1EADD] text-center">
        <Reveal>
          <h2 className="font-display text-4xl md:text-5xl text-deep-brown mb-4">
            Meet the person you used to be.
          </h2>
          <p className="font-body text-soft-ink mb-9 max-w-[30rem] mx-auto">
            Free while in early access. Private by default, encrypted, and always
            in your own words.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onCreate}
              className="rounded-full bg-deep-brown text-background px-8 py-3 font-sans text-sm hover:bg-ink transition-colors"
            >
              Create account
            </button>
            <button
              onClick={onSignIn}
              className="rounded-full border border-border bg-surface/70 text-ink px-8 py-3 font-sans text-sm hover:border-accent-sepia transition-colors"
            >
              Sign in
            </button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center font-sans text-xs text-faint-ink space-y-2">
        <p className="italic font-body text-sm">
          Offer the meaning, never push the moment.
        </p>
        <p className="space-x-3">
          <Link
            href="/why"
            className="hover:text-soft-ink transition-colors"
          >
            Why Yadegar
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/privacy-policy"
            className="hover:text-soft-ink transition-colors"
          >
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-soft-ink transition-colors">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
