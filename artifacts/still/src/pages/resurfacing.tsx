import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page";
import {
  useResurfaceMutes,
  useAddResurfaceMute,
  useRemoveResurfaceMute,
} from "@/lib/use-resurface-mutes";

// "YYYY-MM" → first day of the month.
function monthToStart(m: string): string {
  return `${m}-01`;
}
// "YYYY-MM" → last day of the month.
function monthToEnd(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${m}-${String(lastDay).padStart(2, "0")}`;
}
function monthLabel(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function rangeLabel(startDate: string, endDate: string): string {
  const s = monthLabel(startDate);
  const e = monthLabel(endDate);
  return s === e ? s : `${s} – ${e}`;
}

export default function Resurfacing() {
  const { data: mutes, isLoading } = useResurfaceMutes();
  const add = useAddResurfaceMute();
  const remove = useRemoveResurfaceMute();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!from || !to) {
      setError("Choose a start and end month.");
      return;
    }
    if (from > to) {
      setError("The start month must be on or before the end month.");
      return;
    }
    try {
      await add.mutateAsync({
        startDate: monthToStart(from),
        endDate: monthToEnd(to),
      });
      setFrom("");
      setTo("");
    } catch {
      setError("Could not mute that period. Please try again.");
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <PageHeader
          title="What returns"
          subtitle="You decide what comes back. Mute a season you'd rather not meet again — the pages stay in your Library, they just won't resurface."
        />

        {/* Existing mutes */}
        <section className="mb-10">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
            Muted periods
          </p>
          {isLoading ? (
            <p className="font-sans text-sm text-faint-ink">Loading…</p>
          ) : !mutes || mutes.length === 0 ? (
            <p className="font-body text-soft-ink">
              Nothing is muted. Every eligible page can return.
            </p>
          ) : (
            <ul className="space-y-2">
              {mutes.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border border-border rounded-xl bg-surface/60 px-5 py-4"
                >
                  <span className="font-body text-ink">
                    {rangeLabel(m.startDate, m.endDate)}
                  </span>
                  <button
                    onClick={() => remove.mutate(m.id)}
                    disabled={remove.isPending}
                    className="font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add a mute */}
        <section>
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
            Mute a period
          </p>
          <div className="border border-border rounded-xl bg-surface/60 p-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <label className="flex-1 font-sans text-sm text-soft-ink">
                From
                <input
                  type="month"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 font-body text-ink focus:outline-none focus:border-accent-sepia"
                />
              </label>
              <label className="flex-1 font-sans text-sm text-soft-ink">
                To
                <input
                  type="month"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 font-body text-ink focus:outline-none focus:border-accent-sepia"
                />
              </label>
              <button
                onClick={submit}
                disabled={add.isPending}
                className="rounded-full bg-deep-brown text-background px-6 py-2.5 font-sans text-sm hover:bg-ink transition-colors disabled:opacity-50"
              >
                Mute this period
              </button>
            </div>
            {error && (
              <p className="font-sans text-sm text-red-700/80 mt-3">{error}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
