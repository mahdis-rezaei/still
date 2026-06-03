import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateEntry } from "@workspace/api-client-react";
import { useOnThisDay, type OnThisDayMemory } from "@/lib/use-on-this-day";

function longDate(d: string): string {
  const parsed = new Date(d + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// "A year ago today" / "7 years ago, around this day" — honest about whether
// it's the exact day or merely near it.
function whenLabel(m: OnThisDayMemory): string {
  const span = m.yearsAgo === 1 ? "A year ago" : `${m.yearsAgo} years ago`;
  return m.onThisExactDay ? `${span} today` : `${span}, around this day`;
}

function Card({ memory }: { memory: OnThisDayMemory }) {
  const queryClient = useQueryClient();
  const updateEntry = useUpdateEntry();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["on-this-day"] });
  }

  function toggleFavorite() {
    updateEntry.mutate(
      { id: memory.entryId, data: { favorite: !memory.favorite } },
      { onSuccess: refresh },
    );
  }

  // "Not this one" = don't resurface this page again (the user controls what
  // returns). Sets the entry's resurfacing preference to never.
  function hide() {
    updateEntry.mutate(
      { id: memory.entryId, data: { resurfacingPreference: "never" } },
      { onSuccess: refresh },
    );
  }

  return (
    <div className="border border-border rounded-2xl bg-surface/70 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink">
          {whenLabel(memory)}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFavorite}
            disabled={updateEntry.isPending}
            className={
              "text-lg leading-none transition-colors " +
              (memory.favorite
                ? "text-accent-sepia"
                : "text-faint-ink hover:text-soft-ink")
            }
            aria-label={memory.favorite ? "Unfavorite" : "Favorite"}
          >
            {memory.favorite ? "★" : "☆"}
          </button>
          <button
            onClick={hide}
            disabled={updateEntry.isPending}
            className="font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors"
          >
            not this one
          </button>
        </div>
      </div>

      <p className="font-sans text-xs text-faint-ink mb-3">
        {longDate(memory.entryDate)}
      </p>

      <p className="font-body text-ink leading-relaxed whitespace-pre-wrap">
        {memory.excerpt}
      </p>

      <Link
        href={`/library/${memory.entryId}`}
        className="inline-block mt-5 font-sans text-sm text-accent-sepia hover:text-deep-brown border-b border-accent-sepia/40 pb-0.5 transition-colors"
      >
        Read the full page →
      </Link>
    </div>
  );
}

// The On This Day section. Stays SILENT (renders nothing) when there's nothing
// from this day in years past — never an empty box, never a nudge to look.
export function OnThisDay() {
  const { data, isLoading } = useOnThisDay();
  if (isLoading || !data || data.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-deep-brown mb-4">On this day</h2>
      <div className="space-y-4">
        {data.map((m) => (
          <Card key={m.entryId} memory={m} />
        ))}
      </div>
    </section>
  );
}
