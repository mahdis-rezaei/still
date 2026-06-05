import { useEffect, useState } from "react";
import { type MemoryRunResult } from "@workspace/api-client-react";
import { runMemoryRequest } from "@/lib/run-job";
import { MemoryCard } from "@/components/memory-card";
import { DateMemoryCard } from "@/components/date-memory-card";
import { type DateMemory } from "@/lib/use-look-back";

// "A page you'd forgotten" — an old page that's slipped out of view, read back
// in Yadegar's voice (not just a raw excerpt, which is what made this tab feel
// dead and identical visit to visit). We scope the engine to the one forgotten
// entry (same trick as the voiced On-this-day), and "show another →" rotates
// through the rest. If the engine stays silent on a thin page, we fall back to
// the raw page so the tab is never blank.
export function AForgottenPage({
  forgotten,
  onChanged,
}: {
  forgotten: DateMemory[];
  onChanged: () => void;
}) {
  const [i, setI] = useState(0);
  const [pending, setPending] = useState(false);
  const [voice, setVoice] = useState<MemoryRunResult | null>(null);
  const current = forgotten[i];

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setVoice(null);
    setPending(true);
    runMemoryRequest("/api/memories/run", { entryIds: [current.entryId] })
      .then((v) => {
        if (!cancelled) setVoice(v);
      })
      .catch(() => {
        if (!cancelled) setVoice({ surfaced: false, reason: "error" });
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current?.entryId]);

  if (forgotten.length === 0) {
    return (
      <p className="font-body text-soft-ink leading-relaxed">
        Nothing's slipped far enough out of view yet — as your pages gather
        years, forgotten ones will surface here.
      </p>
    );
  }

  return (
    <div>
      {pending && (
        <div className="border border-border/70 rounded-2xl bg-surface/50 p-6">
          <p className="font-body text-soft-ink leading-relaxed">
            Reading a page you'd set down…
          </p>
        </div>
      )}

      {!pending && voice?.surfaced && voice.memory && (
        <MemoryCard memory={voice.memory} />
      )}

      {/* Engine stayed silent on a thin page — show the page itself, never blank. */}
      {!pending && voice && !voice.surfaced && current && (
        <DateMemoryCard
          heading="You haven't seen this in a while"
          memory={current}
          onChanged={onChanged}
        />
      )}

      {forgotten.length > 1 && (
        <button
          onClick={() => setI((n) => (n + 1) % forgotten.length)}
          disabled={pending}
          className="mt-3 font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors disabled:opacity-50"
          data-testid="forgotten-again"
        >
          show another →
        </button>
      )}
    </div>
  );
}
