import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page";
import { DateMemoryCard } from "@/components/date-memory-card";
import { ThenAndNow } from "@/components/then-and-now";
import { useLookBack } from "@/lib/use-look-back";

// Look back — the memory home, tabbed so each AI lens is its own calm surface
// (voice first, depth underneath) rather than one long scroll. (Revisit a time
// and What keeps returning land as their own tabs in the next slices; What keeps
// returning will become the default greeting.)
const TABS = [
  { key: "distance", label: "How far you've come" },
  { key: "forgotten", label: "A page you'd forgotten" },
  { key: "year", label: "Your Year in Pages" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function LookBack() {
  const queryClient = useQueryClient();
  const { data } = useLookBack();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["look-back"] });
  const forgotten = data?.forgotten ?? [];
  const [tab, setTab] = useState<TabKey>("distance");
  const lastYear = new Date().getFullYear() - 1;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <PageHeader
          title="Look back"
          subtitle="Your past, read back to you a few pieces at a time — in your own words."
        />

        <div className="-mt-4 mb-6">
          <Link
            href="/returns"
            className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
          >
            Returns — pages brought back →
          </Link>
        </div>

        {/* Lens tabs */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border/40 pb-3 mb-8">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "font-sans text-sm transition-colors " +
                (tab === t.key ? "text-ink" : "text-soft-ink hover:text-ink")
              }
              data-testid={`lookback-tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "distance" && <ThenAndNow />}

        {tab === "forgotten" &&
          (forgotten.length > 0 ? (
            <DateMemoryCard
              heading="You haven't seen this in a while"
              memory={forgotten[0]}
              onChanged={refresh}
            />
          ) : (
            <p className="font-body text-soft-ink leading-relaxed">
              Nothing's slipped far enough out of view yet — as your pages gather
              years, forgotten ones will surface here.
            </p>
          ))}

        {tab === "year" && (
          <Link
            href={`/letters/${lastYear}`}
            className="block rounded-2xl border border-border bg-surface/60 px-6 py-5 hover:border-accent-sepia transition-colors"
            data-testid="card-year-in-pages"
          >
            <span className="font-sans text-xs tracking-wide uppercase text-faint-ink">
              Your Year in Pages
            </span>
            <p className="font-display text-2xl text-deep-brown mt-1">
              {lastYear} →
            </p>
            <p className="font-sans text-sm text-soft-ink mt-1">
              A year of your writing, gathered — ready to read, print, or keep as
              a book.
            </p>
          </Link>
        )}
      </main>
    </div>
  );
}
