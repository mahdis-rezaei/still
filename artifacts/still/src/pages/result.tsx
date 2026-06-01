import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStill } from "@/lib/store";
import { motion } from "framer-motion";

const MODE_LABELS: Record<string, string> = {
  thread: "WHAT KEPT RETURNING",
  memory: "A PAGE FROM THEN",
  distance: "LOOK HOW FAR",
  value_signal: "WHAT MATTERED THEN",
  wisdom: "WHAT YOU KNEW",
  nothing: "NOTHING THIS TIME",
};

function quoteSectionLabel(mode: string): string {
  if (mode === "value_signal") return "IN THE WORDS YOU SAVED";
  return "IN YOUR OWN WORDS";
}

export default function Result() {
  const [, setLocation] = useLocation();
  const { scoreResult, reset } = useStill();
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    if (!scoreResult) {
      setLocation("/paste");
    }
  }, [scoreResult, setLocation]);

  if (!scoreResult) return null;

  const isNothing = scoreResult.mode === "nothing";
  const label = MODE_LABELS[scoreResult.mode] ?? scoreResult.mode.toUpperCase();

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 max-w-[680px] mx-auto py-12 md:py-24">

      {isNothing ? (
        <div className="flex flex-col items-center text-center gap-8 py-12">
          <span className="text-sm font-sans tracking-widest uppercase text-faint-ink">
            {label}
          </span>
          <p className="font-body text-2xl text-ink leading-relaxed max-w-lg">
            Nothing meaningful surfaced this time. There were patterns in the writing, but none felt durable enough to name honestly.
          </p>
          <p className="font-body text-lg text-soft-ink italic">
            Better silence than a false thread.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">

          {/* Label */}
          <span className="text-xs font-sans tracking-widest uppercase text-faint-ink">
            {label}
          </span>

          {/* Observation */}
          {scoreResult.observation && (
            <p className="font-display text-2xl md:text-3xl text-deep-brown leading-snug">
              {scoreResult.observation}
            </p>
          )}

          {/* Quotes */}
          {scoreResult.quotes && scoreResult.quotes.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-[10px] font-sans tracking-widest uppercase text-faint-ink mb-4">
                {quoteSectionLabel(scoreResult.mode)}
              </span>
              <div className="flex flex-col gap-8">
                {scoreResult.quotes.map((q, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 + 0.2, duration: 0.6 }}
                    className="flex flex-col gap-2"
                  >
                    <span className="text-[11px] font-sans text-faint-ink tracking-wide">
                      {q.date}
                    </span>
                    <p className="font-body text-xl text-ink leading-relaxed pb-6 border-b border-border">
                      "{q.fragment}"
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Why this surfaced */}
          {scoreResult.why && (
            <div className="mt-2">
              {!showWhy ? (
                <button
                  onClick={() => setShowWhy(true)}
                  className="text-sm font-sans text-faint-ink hover:text-soft-ink transition-colors border-b border-faint-ink/30 pb-0.5"
                >
                  Why this surfaced
                </button>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-body text-base text-soft-ink leading-relaxed italic"
                >
                  {scoreResult.why}
                </motion.p>
              )}
            </div>
          )}

        </div>
      )}

      <div className={`mt-24 flex items-center gap-6 ${isNothing ? "justify-center" : "justify-start"}`}>
        <button
          onClick={() => {
            reset();
            setLocation("/paste");
          }}
          className="text-soft-ink hover:text-ink font-sans text-sm transition-colors"
        >
          Begin again
        </button>
        <button
          onClick={() => setLocation("/history")}
          className="text-faint-ink hover:text-soft-ink font-sans text-sm transition-colors"
        >
          View history
        </button>
      </div>
    </div>
  );
}
