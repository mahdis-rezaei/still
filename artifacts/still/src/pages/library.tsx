import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEntries,
  useUpdateEntry,
  getListEntriesQueryKey,
  type Entry,
} from "@workspace/api-client-react";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page";

const SOURCE_LABELS: Record<string, string> = {
  pasted_import: "imported",
  file_import: "imported",
  google_doc: "google doc",
  sample: "sample",
};

function firstLines(body: string, max = 2): string {
  return body
    .trim()
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, max)
    .join(" ");
}

export default function Library() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListEntries();
  const updateEntry = useUpdateEntry();

  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const all = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (favOnly && !e.favorite) return false;
      if (!q) return true;
      return (
        e.body.toLowerCase().includes(q) ||
        (e.entryDate ?? "").toLowerCase().includes(q) ||
        (e.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [all, query, favOnly]);

  const yearGroups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const year = e.entryDate?.slice(0, 4) || "Undated";
      const arr = map.get(year);
      if (arr) arr.push(e);
      else map.set(year, [e]);
    }
    // Years descending; "Undated" sinks to the bottom.
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "Undated") return 1;
      if (b[0] === "Undated") return -1;
      return a[0] < b[0] ? 1 : -1;
    });
  }, [filtered]);

  async function toggleFavorite(e: Entry) {
    await updateEntry.mutateAsync({
      id: e.id,
      data: { favorite: !e.favorite },
    });
    queryClient.invalidateQueries({ queryKey: getListEntriesQueryKey() });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <PageHeader
          title="Library"
          subtitle={
            all.length > 0
              ? `${all.length} ${all.length === 1 ? "page" : "pages"} kept`
              : "Every page you write or bring in lives here."
          }
          right={
            <Link
              href="/import"
              className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
            >
              Bring old journals →
            </Link>
          }
        />

        {isLoading ? (
          <p className="font-sans text-sm text-faint-ink">
            Opening your library…
          </p>
        ) : all.length === 0 ? (
          <div className="border border-border rounded-2xl bg-surface/60 p-10 text-center">
            <p className="font-body text-xl text-soft-ink mb-2">
              Your pages will live here.
            </p>
            <p className="font-body text-soft-ink mb-7">
              Write today or bring old journals into Yadegar.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/today"
                className="rounded-full bg-deep-brown text-background px-6 py-2.5 font-sans text-sm hover:bg-ink transition-colors"
              >
                Write today
              </Link>
              <Link
                href="/import"
                className="rounded-full border border-border bg-surface px-6 py-2.5 font-sans text-sm text-ink hover:border-accent-sepia transition-colors"
              >
                Bring old journals
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-8">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by word or date…"
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-ink font-sans placeholder:text-faint-ink focus:outline-none focus:border-accent-sepia transition-colors"
                data-testid="input-search"
              />
              <button
                onClick={() => setFavOnly((v) => !v)}
                className={
                  "rounded-lg border px-4 py-2.5 font-sans text-sm transition-colors " +
                  (favOnly
                    ? "border-accent-sepia text-ink bg-surface"
                    : "border-border text-soft-ink hover:text-ink")
                }
                data-testid="button-favonly"
              >
                ★ Favorites
              </button>
            </div>

            {filtered.length === 0 && (
              <p className="font-body text-soft-ink py-4">
                No pages match “{query.trim()}”.
              </p>
            )}

            {yearGroups.map(([year, items]) => (
              <section key={year} className="mb-10">
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink">
                    {year}
                  </h2>
                  <span className="flex-1 h-px bg-border/60" />
                </div>
                <div className="flex flex-col">
                  {items.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-start gap-3 py-4 border-b border-border/70 last:border-0"
                    >
                      <button
                        onClick={() => toggleFavorite(entry)}
                        className={
                          "mt-1 text-lg leading-none transition-colors " +
                          (entry.favorite
                            ? "text-accent-sepia"
                            : "text-faint-ink hover:text-soft-ink")
                        }
                        aria-label={
                          entry.favorite ? "Unfavorite" : "Favorite"
                        }
                        data-testid={`button-fav-${entry.id}`}
                      >
                        {entry.favorite ? "★" : "☆"}
                      </button>
                      <Link
                        href={`/library/${entry.id}`}
                        className="flex-1 min-w-0 text-left"
                        data-testid={`link-entry-${entry.id}`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-sans text-xs text-faint-ink tracking-wide">
                            {entry.entryDate ?? "Undated"}
                          </span>
                          {SOURCE_LABELS[entry.source] && (
                            <span className="font-sans text-[10px] uppercase tracking-wider text-faint-ink">
                              {SOURCE_LABELS[entry.source]}
                            </span>
                          )}
                        </div>
                        <p className="font-body text-base text-soft-ink leading-snug truncate group-hover:text-ink transition-colors mt-0.5">
                          {entry.title || firstLines(entry.body)}
                        </p>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
