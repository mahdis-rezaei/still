import { useState } from "react";
import { type MemoryRunResult } from "@workspace/api-client-react";
import { runMemoryRequest } from "@/lib/run-job";
import { MemoryCard } from "@/components/memory-card";

// "What keeps returning" — the pattern lens: the engine roams your whole archive
// for a thread / line that keeps coming back across your years. Button-to-surface
// (so it never writes silently on every visit), then the voiced result. On a deep
// archive the engine leans toward a cross-time thread; on a thinner one it finds
// the line that keeps mattering.
export function WhatKeepsReturning() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<MemoryRunResult | null>(null);

  async function go() {
    setResult(null);
    setPending(true);
    try {
      setResult(await runMemoryRequest("/api/memories/run", {}));
    } catch {
      setResult({ surfaced: false, reason: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="font-sans text-sm text-faint-ink mb-4">
        The threads and lines that keep coming back across your years — let
        Yadegar find one.
      </p>

      {!pending && !result && (
        <button
          onClick={go}
          className="font-sans text-sm text-soft-ink hover:text-ink border border-border hover:border-accent-sepia rounded-full px-4 py-2 transition-colors"
          data-testid="wkr-go"
        >
          ✦ Show me what keeps returning
        </button>
      )}

      {pending && (
        <div className="border border-border/70 rounded-2xl bg-surface/50 p-6">
          <p className="font-body text-soft-ink leading-relaxed">
            Reading across your years…
          </p>
        </div>
      )}

      {!pending && result?.surfaced && result.memory && (
        <div>
          <MemoryCard memory={result.memory} />
          <button
            onClick={go}
            className="mt-3 font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors"
            data-testid="wkr-again"
          >
            show another →
          </button>
        </div>
      )}

      {!pending && result && !result.surfaced && (
        <p className="font-body text-soft-ink leading-relaxed">
          Nothing clear keeps returning just yet — as your pages gather years,
          the threads will show.
        </p>
      )}
    </div>
  );
}
