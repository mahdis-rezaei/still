import { Link, useLocation } from "wouter";
import { useStill } from "@/lib/store";
import { motion } from "framer-motion";

function formatSavedDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "earlier today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { scoreResult, savedAt, reset } = useStill();

  const hasSaved = Boolean(scoreResult && savedAt);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center max-w-[680px] mx-auto">
      <h1 className="font-display text-5xl md:text-7xl text-deep-brown mb-6">
        Still
      </h1>
      <p className="text-xl md:text-2xl text-ink mb-6">
        A companion for your past selves.
      </p>
      <p className="text-lg text-soft-ink leading-relaxed mb-12 max-w-md mx-auto">
        Paste entries from different years. Still looks for what endured across the writing — and stays quiet when nothing honest surfaces.
      </p>

      {hasSaved ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 w-full max-w-sm"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 border border-border rounded-sm bg-surface/60 w-full">
            <p className="text-sm font-sans text-soft-ink">
              You have a thread from {formatSavedDate(savedAt!)}.
            </p>
            <button
              onClick={() => setLocation("/result")}
              className="text-accent-sepia hover:text-deep-brown font-body text-base border-b border-accent-sepia/40 pb-0.5 transition-colors"
            >
              Read it again
            </button>
          </div>

          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-sans text-faint-ink">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => {
                reset();
                setLocation("/paste");
              }}
              className="bg-ink hover:bg-deep-brown text-surface px-8 py-3 rounded-sm font-body text-lg transition-colors"
            >
              Read across time
            </button>
            <span className="text-xs font-sans text-faint-ink">
              This will clear your saved thread
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/paste"
            className="bg-ink hover:bg-deep-brown text-surface px-8 py-3 rounded-sm font-body text-lg transition-colors"
          >
            Read across time
          </Link>
          <span className="text-sm font-sans text-faint-ink">
            Your writing is read once for this prototype. Nothing is stored.
          </span>
        </div>
      )}
    </div>
  );
}
