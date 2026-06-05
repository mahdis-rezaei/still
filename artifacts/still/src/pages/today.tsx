import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateEntry,
  useUpdateEntry,
  getListEntriesQueryKey,
  customFetch,
  type MemoryRunResult,
} from "@workspace/api-client-react";
import { AppNav } from "@/components/app-nav";
import { MemoryCard } from "@/components/memory-card";
import { OnThisDay } from "@/components/on-this-day";
import { YearInPagesBanner } from "@/components/year-in-pages-banner";
import { EntryImages } from "@/components/entry-images";

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

const RUN_JOB_KEY = "still:run-job";

// Poll an async memory job (ADR 0002) to completion, then resolve to the same
// shape a synchronous run returns. Bounded (~4 min) so it never spins forever.
async function pollRunJob(jobId: string): Promise<MemoryRunResult> {
  for (let i = 0; i < 80; i++) {
    const r = await customFetch<{ status: string; result?: MemoryRunResult }>(
      `/api/memories/jobs/${jobId}`,
      { responseType: "json" },
    );
    if (r.status === "done" && r.result) return r.result;
    if (r.status === "error") return { surfaced: false, reason: "error" };
    await new Promise((res) => setTimeout(res, 3000));
  }
  return { surfaced: false, reason: "error" };
}

export default function Today() {
  const queryClient = useQueryClient();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const [body, setBody] = useState("");
  // Mirror of entryIdRef for rendering (refs don't trigger re-renders). Lets the
  // image attacher know which page to attach to once the page is first saved.
  const [entryId, setEntryId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [prompt] = useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
  );

  const [run, setRun] = useState<MemoryRunResult | null>(null);
  const [pending, setPending] = useState(false);

  // Reading a large archive is a two-pass model read and can take a couple of
  // minutes. Without feedback that long wait reads as "broken," so we show calm,
  // time-aware reassurance while the run is pending (no raw stopwatch — that
  // makes the wait feel anxious).
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);

  // ADR 0002: the run may come back synchronously (a result) or as an async job
  // to poll. We persist the job id so leaving and returning resumes the read.
  async function bringPageBack() {
    setRun(null);
    setPending(true);
    try {
      const resp = await customFetch<MemoryRunResult & { jobId?: string }>(
        "/api/memories/run",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
          responseType: "json",
        },
      );
      if (resp && typeof resp.jobId === "string") {
        localStorage.setItem(RUN_JOB_KEY, resp.jobId);
        setRun(await pollRunJob(resp.jobId));
        localStorage.removeItem(RUN_JOB_KEY);
      } else {
        setRun(resp as MemoryRunResult);
      }
    } catch {
      setRun({ surfaced: false, reason: "error" });
    } finally {
      setPending(false);
    }
  }

  // Resume an in-flight run if the user navigated away and came back.
  useEffect(() => {
    const jobId = localStorage.getItem(RUN_JOB_KEY);
    if (!jobId) return;
    setPending(true);
    (async () => {
      try {
        const result = await pollRunJob(jobId);
        // Only surface a real page on resume; if the job is gone/silent/errored,
        // stay quiet rather than showing an error card the user didn't ask for.
        if (result.surfaced) setRun(result);
      } catch {
        // stale/expired job — clear silently.
      } finally {
        localStorage.removeItem(RUN_JOB_KEY);
        setPending(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setEntryId(row.id);
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

  // Attaching an image needs a saved page. If there's text but no entry yet,
  // create it now and return its id; if the page is still blank, there's nothing
  // to attach to.
  async function ensureEntry(): Promise<string | null> {
    if (entryIdRef.current) return entryIdRef.current;
    const text = latestRef.current;
    if (!text.trim()) return null;
    const row = await createEntry.mutateAsync({
      data: { body: text, entryDate: todayISO() },
    });
    entryIdRef.current = row.id;
    setEntryId(row.id);
    queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
    return row.id;
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
    setEntryId(null);
    setStatus("idle");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        {/* Seasonal "Your Year in Pages" — quiet around New Year, dismissible. */}
        <YearInPagesBanner />

        {/* Header: the day on the left, the (secondary) memory affordance right. */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display text-4xl text-deep-brown">Today</h1>
            <p className="font-sans text-sm text-faint-ink mt-1">
              {todayLong()}
            </p>
          </div>
          <button
            onClick={bringPageBack}
            disabled={pending}
            className="font-sans text-sm text-soft-ink hover:text-ink border border-border hover:border-accent-sepia rounded-full px-4 py-2 transition-colors disabled:opacity-50"
            data-testid="button-bring-page-back"
          >
            {pending ? "reading…" : "✦ Bring a page back"}
          </button>
        </div>

        {/* While reading, calm time-aware reassurance so the long two-pass read
            never reads as a failure. */}
        {pending && (
          <section className="mb-8">
            <div className="border border-border/70 rounded-2xl bg-surface/50 p-6">
              <p className="font-body text-soft-ink leading-relaxed">
                {elapsed < 10
                  ? "Reading through your pages…"
                  : elapsed < 35
                    ? "Still reading — looking across the years…"
                    : elapsed < 90
                      ? "Your archive is large, so this takes a moment. Hang tight — Yadegar is still reading."
                      : "Almost there — a long archive takes a little longer to read."}
              </p>
            </div>
          </section>
        )}

        {/* A returned page (or honest silence), shown only after asking. */}
        {run && (
          <section className="mb-8">
            {run.surfaced && run.memory ? (
              <div className="space-y-3">
                <MemoryCard memory={run.memory} />
                <button
                  onClick={() => setRun(null)}
                  className="font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors"
                >
                  close
                </button>
              </div>
            ) : (
              <div className="border border-border/70 rounded-2xl bg-surface/50 p-6">
                <p className="font-body text-soft-ink leading-relaxed">
                  {run.reason === "crisis"
                    ? run.supportMessage
                    : run.reason === "not_enough"
                      ? "Write or bring in a few pages first, and Yadegar will have something to return."
                      : run.reason === "error"
                        ? "Something interrupted the reading. Try again in a moment."
                        : "Nothing honest surfaced this time. That's okay — Yadegar is better quiet than false."}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Date-based returns from this day in years past — quiet when empty. */}
        <OnThisDay />

        {/* Today's page — a real writing surface, anchored like a sheet. */}
        <div className="rounded-2xl border border-border bg-surface/80 shadow-sm p-6 md:p-8 min-h-[56vh] flex flex-col">
          <textarea
            value={body}
            onChange={(e) => onChange(e.target.value)}
            placeholder={prompt}
            autoFocus
            className="flex-1 w-full bg-transparent text-xl md:text-2xl text-ink font-body leading-relaxed placeholder:text-faint-ink/80 focus:outline-none resize-none"
            data-testid="input-entry"
          />
          <EntryImages entryId={entryId} editable ensureEntry={ensureEntry} />
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
            <span
              className="font-sans text-xs text-faint-ink"
              data-testid="text-savestate"
            >
              {status === "saving"
                ? "saving…"
                : status === "kept"
                  ? "kept"
                  : ""}
            </span>
            {(body.trim() || entryIdRef.current) && (
              <button
                onClick={newPage}
                className="font-sans text-xs text-soft-ink hover:text-ink transition-colors"
                data-testid="button-newpage"
              >
                Begin a new page
              </button>
            )}
          </div>
        </div>

        <p className="text-center mt-6">
          <Link
            href="/library"
            className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
          >
            Your pages live in your Library →
          </Link>
        </p>
      </main>
    </div>
  );
}
