import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStill } from "@/lib/store";
import { motion } from "framer-motion";

const REGISTER_LABELS: Record<string, string> = {
  thread: "WHAT KEPT RETURNING",
  memory: "A PAGE FROM THEN",
  distance: "LOOK HOW FAR",
  value_signal: "WHAT MATTERED THEN",
  becoming: "WHO YOU WERE BECOMING",
  survival: "WHAT SURVIVED",
  nothing: "NOTHING THIS TIME",
};

function quoteSectionLabel(register: string): string {
  if (register === "value_signal") return "IN THE WORDS YOU SAVED";
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

  const isNothing = scoreResult.register === "nothing";
  const label = REGISTER_LABELS[scoreResult.register] ?? scoreResult.register.toUpperCase();

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 max-w-[640px] mx-auto py-12 md:py-24">

      {isNothing ? (
        <div className="flex flex-col items-center text-center gap-8 py-12">
          <span className="text-xs font-sans tracking-widest uppercase text-faint-ink">
            {label}
          </span>
          <p className="font-body text-xl text-ink leading-relaxed max-w-lg">
            Nothing meaningful surfaced this time. There were patterns in the writing, but none felt durable enough to name honestly.
          </p>
          <p className="font-body text-base text-soft-ink italic">
            Better silence than a false thread.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* 1. Label */}
          <span className="text-xs font-sans tracking-widest uppercase text-faint-ink">
            {label}
          </span>

          {/* 2. Date anchor */}
          {scoreResult.date_anchor && (
            <p className="font-sans text-base text-soft-ink -mt-4">
              {scoreResult.date_anchor}
            </p>
          )}

          {/* 3. Observation — plain, brief, smaller than quotes */}
          {scoreResult.observation && (
            <p className="font-body text-lg text-ink leading-relaxed">
              {scoreResult.observation}
            </p>
          )}

          {/* 4 + 5. Quotes — the emotional centre */}
          {scoreResult.quotes && scoreResult.quotes.length > 0 && (
            <div className="flex flex-col gap-1 mt-4">
              <span className="text-[10px] font-sans tracking-widest uppercase text-faint-ink mb-6">
                {quoteSectionLabel(scoreResult.register)}
              </span>
              <div className="flex flex-col">
                {scoreResult.quotes.map((q, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12 + 0.1, duration: 0.55 }}
                    className="flex flex-col gap-2 py-6 border-b border-border first:pt-0"
                  >
                    <span className="text-[11px] font-sans text-faint-ink tracking-wide">
                      {q.date}
                    </span>
                    <p className="font-body text-2xl text-deep-brown leading-snug">
                      "{q.fragment}"
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Why this surfaced — small, restrained */}
          {scoreResult.why && (
            <div className="mt-2">
              {!showWhy ? (
                <button
                  onClick={() => setShowWhy(true)}
                  className="text-xs font-sans text-faint-ink hover:text-soft-ink transition-colors border-b border-faint-ink/30 pb-0.5 tracking-wide"
                >
                  Why this surfaced
                </button>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-body text-sm text-soft-ink leading-relaxed italic"
                >
                  {scoreResult.why}
                </motion.p>
              )}
            </div>
          )}

        </div>
      )}

      <div className={`mt-20 flex items-center gap-6 ${isNothing ? "justify-center" : "justify-start"}`}>
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
