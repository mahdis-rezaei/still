import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateEntry,
  useUpdateEntry,
  useRunMemory,
  getListEntriesQueryKey,
  type MemoryRunResult,
} from "@workspace/api-client-react";
import { AppNav } from "@/components/app-nav";
import { MemoryCard } from "@/components/memory-card";

const PROMPTS = [
  "What wants to be written today?",
  "What are you carrying?",
  "Write one honest sentence.",
  "What keeps returning?",
];

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function todayLong(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type Status = "idle" | "saving" | "kept";

export default function Today() {
  const queryClient = useQueryClient();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [prompt] = useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
  );

  const runMemory = useRunMemory();
  const [run, setRun] = useState<MemoryRunResult | null>(null);

  async function bringPageBack() {
    setRun(null);
    try {
      const result = await runMemory.mutateAsync({ data: {} });
      setRun(result);
    } catch {
      setRun({ surfaced: false, reason: "error" });
    }
  }

  // Refs so the debounced saver never reads stale state.
  const entryIdRef = useRef<string | null>(null);
  const latestRef = useRef("");
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    const text = latestRef.current;
    if (!text.trim() || savingRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    try {
      if (!entryIdRef.current) {
        const row = await createEntry.mutateAsync({
          data: { body: text, entryDate: todayISO() },
        });
        entryIdRef.current = row.id;
      } else {
        await updateEntry.mutateAsync({
          id: entryIdRef.current,
          data: { body: text },
        });
      }
      setStatus("kept");
      queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
    } catch {
      setStatus("idle");
    } finally {
      savingRef.current = false;
      // If more was typed while saving, save again.
      if (latestRef.current.trim() && latestRef.current !== text) {
        scheduleSave();
      }
    }
  }

  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 900);
  }

  function onChange(value: string) {
    setBody(value);
    latestRef.current = value;
    scheduleSave();
  }

  // Flush on unmount so nothing in flight is lost.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function newPage() {
    if (timerRef.current) clearTimeout(timerRef.current);
    entryIdRef.current = null;
    latestRef.current = "";
    setBody("");
    setStatus("idle");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16 flex flex-col">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-deep-brown">Today</h1>
            <p className="font-sans text-sm text-faint-ink mt-1">
              {todayLong()}
            </p>
          </div>
          <span
            className="font-sans text-xs text-faint-ink transition-opacity"
            data-testid="text-savestate"
          >
            {status === "saving" ? "saving…" : status === "kept" ? "kept" : ""}
          </span>
        </div>

        {/* Bring a page back — the engine, surfaced gently and on request. */}
        <section className="mb-10">
          {runMemory.isPending ? (
            <p className="font-body text-soft-ink animate-pulse">
              Still is reading across your pages…
            </p>
          ) : run && run.surfaced && run.memory ? (
            <div className="space-y-3">
              <MemoryCard memory={run.memory} />
              <button
                onClick={() => setRun(null)}
                className="font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors"
              >
                close
              </button>
            </div>
          ) : run && !run.surfaced ? (
            <div className="border border-border/70 rounded-2xl bg-surface/40 p-6">
              <p className="font-body text-soft-ink leading-relaxed">
                {run.reason === "crisis"
                  ? run.supportMessage
                  : run.reason === "not_enough"
                    ? "Write or bring in a few pages first, and Still will have something to return."
                    : run.reason === "error"
                      ? "Something interrupted the reading. Try again in a moment."
                      : "Nothing honest surfaced this time. That is okay — Still is better quiet than false."}
              </p>
              <button
                onClick={bringPageBack}
                className="mt-4 font-sans text-sm text-accent-sepia hover:text-deep-brown transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              onClick={bringPageBack}
              className="font-sans text-sm text-soft-ink hover:text-ink border border-border hover:border-accent-sepia rounded-full px-5 py-2.5 transition-colors"
              data-testid="button-bring-page-back"
            >
              Bring a page back
            </button>
          )}
        </section>

        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          placeholder={prompt}
          autoFocus
          className="flex-1 min-h-[55vh] w-full bg-transparent text-xl md:text-2xl text-ink font-body leading-relaxed placeholder:text-faint-ink focus:outline-none resize-none"
          data-testid="input-entry"
        />

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/60">
          <Link
            href="/library"
            className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
          >
            Your pages live in your Library →
          </Link>
          {(body.trim() || entryIdRef.current) && (
            <button
              onClick={newPage}
              className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
              data-testid="button-newpage"
            >
              Begin a new page
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
