import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AmbientField, SiteNav } from "@/components/site-chrome";

// NOTE TO THE MAKER: this is a heartfelt first draft in Still's voice, grounded
// in the product's thesis. Make it yours — swap in your real memory of keeping
// a journal, the entry that stopped you, the year you reread. Specificity is
// what makes a note like this land; the bones are here.

const PARAGRAPHS: string[] = [
  "I have kept a journal for as long as I can remember. Not every day — but through every version of myself. The years I felt lost. The years I was sure. The pages where I was only trying to get through a Tuesday.",
  "For a long time I never went back to read them. They sat in notebooks and old files, a record of a life I had already lived once and didn't think to live again.",
  "Then one night I did go back. And the strange part wasn't remembering what happened — the moves, the heartbreaks, the jobs. It was noticing what kept returning. The same fear, worded a little differently each year. The same quiet way I would talk myself back onto my feet. A sentence I wrote at twenty that I could have written this morning.",
  "I wasn't reading events. I was reading a thread.",
  "That is the thing most journaling apps miss. They are built to capture what happened — to summarize, to count streaks, to hand back a tidy story. But a life isn't a summary. The part worth keeping is what endured underneath all of it.",
  "So I built Still to do one small thing, gently. You give it your years. It reads across them and surfaces one thing worth returning to today — a forgotten page, something that kept returning, how far you have actually come. Always in your own words. Never an interpretation of your life, and never advice.",
  "And when nothing honest surfaces, it stays quiet. That part matters to me most. Still would rather say nothing than say something untrue. It offers the meaning; it never pushes the moment.",
  "I made this for anyone who has written their way through their life, and wants — every now and then — to be met by the person they used to be.",
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
          <h1 className="font-display text-5xl md:text-6xl text-deep-brown leading-tight mb-12">
            Why Still
          </h1>

          <div className="space-y-7">
            {PARAGRAPHS.map((p, i) => (
              <p
                key={i}
                className={
                  "font-body text-lg md:text-xl leading-relaxed " +
                  // The single-line turn ("I was reading a thread.") sits a
                  // shade darker, like a held breath.
                  (p.length < 60 ? "text-ink" : "text-soft-ink")
                }
              >
                {p}
              </p>
            ))}
          </div>

          <div className="h-px bg-border my-12" />

          <p className="font-body italic text-soft-ink mb-10">— Mahdis</p>

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
