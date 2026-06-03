import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useImportPaste,
  useImportFile,
  useUpdateParsedEntry,
  useConfirmImport,
  getListEntriesQueryKey,
  type ImportReview,
  type ParsedEntry,
} from "@workspace/api-client-react";
import { AppNav } from "@/components/app-nav";

const CONFIDENCE_HINT: Record<string, string> = {
  unknown: "no date found — add one",
  low: "unsure of this date",
};

function excerpt(body: string, max = 220): string {
  const t = body.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export default function Import() {
  const queryClient = useQueryClient();
  const importPaste = useImportPaste();
  const importFile = useImportFile();
  const updateParsed = useUpdateParsedEntry();
  const confirmImport = useConfirmImport();

  const [raw, setRaw] = useState("");
  const [review, setReview] = useState<ImportReview | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function doPaste() {
    if (!raw.trim()) return;
    setBusy(true);
    try {
      setReview(await importPaste.mutateAsync({ data: { rawText: raw } }));
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(true);
      try {
        setReview(
          await importFile.mutateAsync({
            data: { filename: file.name, rawText: String(reader.result ?? "") },
          }),
        );
      } finally {
        setBusy(false);
      }
    };
    reader.readAsText(file);
  }

  function patchLocal(updated: ParsedEntry) {
    setReview((r) =>
      r
        ? { ...r, entries: r.entries.map((e) => (e.id === updated.id ? updated : e)) }
        : r,
    );
  }

  async function patch(entry: ParsedEntry, data: Record<string, unknown>) {
    if (!review) return;
    const updated = await updateParsed.mutateAsync({
      id: review.id,
      parsedEntryId: entry.id,
      data,
    });
    patchLocal(updated);
  }

  async function confirm() {
    if (!review) return;
    setBusy(true);
    try {
      const result = await confirmImport.mutateAsync({ id: review.id });
      queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
      setDone(result.importedCount);
    } finally {
      setBusy(false);
    }
  }

  const includedCount = review?.entries.filter((e) => e.include).length ?? 0;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        {done !== null ? (
          <div className="text-center py-10">
            <h1 className="font-display text-4xl text-deep-brown mb-3">
              Kept {done} {done === 1 ? "page" : "pages"}.
            </h1>
            <p className="font-body text-soft-ink mb-8">
              They're in your Library now, private and yours.
            </p>
            <Link
              href="/library"
              className="rounded-full bg-deep-brown text-background px-6 py-2.5 font-sans text-sm hover:bg-ink transition-colors"
            >
              Open your Library
            </Link>
          </div>
        ) : review ? (
          <>
            <h1 className="font-display text-4xl text-deep-brown mb-2">
              {review.parsedCount === 0
                ? "We couldn't find clear pages yet"
                : `We found ${review.parsedCount} ${review.parsedCount === 1 ? "page" : "pages"}`}
            </h1>
            <p className="font-body text-soft-ink mb-8">
              {review.parsedCount === 0
                ? "Try pasting again, or add a date line like [2018-03-29] before each entry."
                : "Review them below. Fix any dates, uncheck anything you'd rather not keep, then save."}
            </p>

            <div className="space-y-4">
              {review.entries.map((entry) => {
                const hint = CONFIDENCE_HINT[entry.dateConfidence];
                return (
                  <div
                    key={entry.id}
                    className={
                      "border rounded-xl p-5 transition-opacity " +
                      (entry.include
                        ? "border-border bg-surface/60"
                        : "border-border/60 bg-transparent opacity-50")
                    }
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={entry.include}
                        onChange={(e) =>
                          patch(entry, { include: e.target.checked })
                        }
                        className="accent-[var(--color-accent-sepia)]"
                        aria-label="Include this page"
                      />
                      <input
                        type="date"
                        value={entry.detectedDate ?? ""}
                        onChange={(e) =>
                          patch(entry, { detectedDate: e.target.value || null })
                        }
                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-soft-ink font-sans focus:outline-none focus:border-accent-sepia"
                      />
                      {hint && (
                        <span className="font-sans text-xs text-accent-sepia">
                          {hint}
                        </span>
                      )}
                    </div>
                    <p className="font-body text-soft-ink leading-relaxed">
                      {excerpt(entry.body)}
                    </p>
                  </div>
                );
              })}
            </div>

            {review.parsedCount > 0 && (
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border/60">
                <button
                  onClick={confirm}
                  disabled={busy || includedCount === 0}
                  className="rounded-full bg-deep-brown text-background px-7 py-2.5 font-sans text-sm hover:bg-ink disabled:opacity-50 transition-colors"
                >
                  {busy
                    ? "Keeping…"
                    : `Keep ${includedCount} ${includedCount === 1 ? "page" : "pages"}`}
                </button>
                <button
                  onClick={() => {
                    setReview(null);
                    setRaw("");
                  }}
                  className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
                >
                  Start over
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl text-deep-brown mb-2">
              Bring old pages into Yadegar
            </h1>
            <p className="font-body text-soft-ink mb-8">
              Paste a journal archive or upload a .txt or .md file. You can review
              everything before saving.
            </p>

            <div className="rounded-2xl border border-border bg-surface/80 shadow-sm p-6 md:p-7">
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={
                  "Paste your journal here. Dates like [2018-03-29], 2018-03-29, or March 29, 2018 help Yadegar split the pages."
                }
                className="w-full min-h-[320px] bg-transparent text-base text-ink font-body leading-relaxed placeholder:text-faint-ink/80 focus:outline-none resize-none"
                data-testid="input-import-text"
              />
            </div>

            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={doPaste}
                disabled={busy || !raw.trim()}
                className="rounded-full bg-deep-brown text-background px-7 py-2.5 font-sans text-sm hover:bg-ink disabled:opacity-50 transition-colors"
                data-testid="button-find-pages"
              >
                {busy ? "Reading…" : "Find pages"}
              </button>
              <label className="font-sans text-sm text-soft-ink hover:text-ink cursor-pointer transition-colors">
                or upload a file
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={onFile}
                  className="hidden"
                />
              </label>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
