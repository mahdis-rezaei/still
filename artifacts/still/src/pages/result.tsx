import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStill } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export default function Result() {
  const [, setLocation] = useLocation();
  const { scoreResult, reset } = useStill();
  const [showEvidence, setShowEvidence] = useState(false);

  if (!scoreResult) {
    setLocation("/paste");
    return null;
  }

  const isThread = scoreResult.register === "thread";

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 max-w-[680px] mx-auto py-12 md:py-24">
      {isThread ? (
        <div className="flex flex-col items-start gap-8">
          <span className="text-sm font-sans tracking-widest uppercase text-faint-ink">
            What endured
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-deep-brown leading-tight">
            {scoreResult.thread}
          </h2>
          
          <div className="mt-8">
            {!showEvidence ? (
              <button
                onClick={() => setShowEvidence(true)}
                className="text-accent-sepia hover:text-deep-brown font-body text-lg border-b border-accent-sepia/30 pb-0.5 transition-colors"
              >
                Read the evidence
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-12 mt-4"
              >
                {scoreResult.evidence.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-3">
                    <span className="text-xs font-sans text-faint-ink tracking-wide">
                      {item.date}
                    </span>
                    <p className="font-body text-xl text-ink leading-relaxed pb-6 border-b border-border">
                      "{item.fragment}"
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-8 py-12">
          <span className="text-sm font-sans tracking-widest uppercase text-faint-ink">
            Nothing this time
          </span>
          <p className="font-body text-2xl text-ink leading-relaxed max-w-lg">
            Nothing meaningful surfaced this time. There were patterns in the writing, but none felt durable enough to name honestly.
          </p>
          <p className="font-body text-lg text-soft-ink italic">
            Better silence than a false thread.
          </p>
        </div>
      )}

      <div className={`mt-24 ${isThread ? "text-left" : "text-center"}`}>
        <button
          onClick={() => {
            reset();
            setLocation("/paste");
          }}
          className="text-soft-ink hover:text-ink font-sans text-sm transition-colors"
        >
          Begin again
        </button>
      </div>
    </div>
  );
}
