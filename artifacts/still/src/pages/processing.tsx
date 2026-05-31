import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useStill } from "@/lib/store";
import { useExtractCandidates, useScoreCandidates } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = [
  "Reading across time...",
  "Looking for what repeated beneath changing words...",
  "Checking whether anything is worth saying...",
  "Choosing silence if the evidence is weak..."
];

export default function Processing() {
  const [, setLocation] = useLocation();
  const { entries, setScoreResult } = useStill();
  const [messageIndex, setMessageIndex] = useState(0);
  const started = useRef(false);

  const extractMutation = useExtractCandidates();
  const scoreMutation = useScoreCandidates();

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!entries) {
      setLocation("/paste");
      return;
    }

    if (started.current) return;
    started.current = true;

    async function process() {
      try {
        const extractResult = await extractMutation.mutateAsync({ data: { entries } });
        const scoreResult = await scoreMutation.mutateAsync({ data: { candidates: extractResult.candidates } });
        setScoreResult(scoreResult);
        setLocation("/result");
      } catch (error) {
        console.error("Processing failed:", error);
        // Fallback or error state? for now just go back.
        setLocation("/paste");
      }
    }

    process();
  }, [entries, extractMutation, scoreMutation, setLocation, setScoreResult]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center max-w-[680px] mx-auto">
      <div className="relative h-20 w-full flex items-center justify-center mb-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute text-xl text-soft-ink font-body"
          >
            {MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
      
      <div className="w-12 h-[1px] bg-accent-sepia/50 overflow-hidden relative">
        <motion.div 
          className="absolute top-0 left-0 h-full w-full bg-accent-sepia"
          animate={{
            x: ["-100%", "100%"]
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: "easeInOut"
          }}
        />
      </div>
    </div>
  );
}
