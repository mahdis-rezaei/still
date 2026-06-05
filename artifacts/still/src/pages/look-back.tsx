import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { WhatKeepsReturning } from "@/components/what-keeps-returning";
import { RevisitATime } from "@/components/revisit-a-time";
import { ThenAndNow } from "@/components/then-and-now";
import { AForgottenPage } from "@/components/a-forgotten-page";
import { YearInPagesTab } from "@/components/year-in-pages-tab";
import { useLookBack } from "@/lib/use-look-back";

// Look back — the memory home, tabbed so each AI lens is its own calm surface.
// Each tab carries its OWN prominent title + lead (rendered here, uniformly), so
// switching tabs visibly swaps the page — earlier they all shared one header and
// felt identical. "Look back" itself is just a quiet eyebrow above the tabs now.
const TABS = [
  {
    key: "returning",
    label: "What keeps returning",
    title: "What keeps returning",
    lead: "The threads and lines that come back across your years — let Yadegar find one.",
  },
  {
    key: "revisit",
    label: "Revisit a time",
    title: "Revisit a time",
    lead: "Pick a month and year, and Yadegar reads it back to you — then lays out the pages.",
  },
  {
    key: "distance",
    label: "How far you've come",
    title: "How far you've come",
    lead: "Pick a year, and Yadegar holds it up against where you are now.",
  },
  {
    key: "forgotten",
    label: "A page you'd forgotten",
    title: "A page you'd forgotten",
    lead: "An old page that's slipped out of view, read back to you in Yadegar's voice.",
  },
  {
    key: "year",
    label: "Your Year in Pages",
    title: "Your Year in Pages",
    lead: "A whole year of your writing, gathered — to read, print, or keep as a book.",
  },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function LookBack() {
  const queryClient = useQueryClient();
  const { data } = useLookBack();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["look-back"] });
  const forgotten = data?.forgotten ?? [];
  const [tab, setTab] = useState<TabKey>("returning");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        {/* Quiet eyebrow + Returns link — the section frame, not the page title. */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink">
            Look back
          </span>
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
                (tab === t.key
                  ? "text-ink border-b-2 border-accent-sepia -mb-[15px] pb-3"
                  : "text-soft-ink hover:text-ink")
              }
              data-testid={`lookback-tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Per-tab title + lead — the big changing element, so each tab is clearly
            its own page. */}
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl text-deep-brown">
            {active.title}
          </h1>
          <p className="font-body text-soft-ink mt-2 leading-relaxed">
            {active.lead}
          </p>
        </div>

        {tab === "returning" && <WhatKeepsReturning />}

        {tab === "revisit" && <RevisitATime />}

        {tab === "distance" && <ThenAndNow />}

        {tab === "forgotten" && (
          <AForgottenPage forgotten={forgotten} onChanged={refresh} />
        )}

        {tab === "year" && <YearInPagesTab />}
      </main>
    </div>
  );
}
