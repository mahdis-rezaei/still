import { useState } from "react";
import { Link } from "wouter";

// "Your Year in Pages" is the most shareable, high-emotion artifact — so we
// surface it like Spotify Wrapped: a gentle, dismissible banner around New Year
// (the natural "look at my year" moment). Late December features the year just
// lived; January features the year that just ended. Dismissed per-year so it
// never nags. (The journaling-anniversary trigger is a fast-follow — it needs the
// user's first-entry date.)
function newYearFeatureYear(now = new Date()): number | null {
  const m = now.getMonth(); // 0–11
  if (m === 11 && now.getDate() >= 20) return now.getFullYear();
  if (m === 0) return now.getFullYear() - 1;
  return null;
}

export function YearInPagesBanner() {
  const year = newYearFeatureYear();
  const key = year ? `still:yip-dismissed:${year}` : "";
  const [dismissed, setDismissed] = useState(
    () => !key || localStorage.getItem(key) === "1",
  );

  if (!year || dismissed) return null;

  return (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-accent-sepia/30 bg-[#F3EAD7]/50 px-5 py-3.5">
      <Link
        href={`/letters/${year}`}
        className="font-sans text-sm text-deep-brown hover:text-ink transition-colors"
        data-testid="banner-year-in-pages"
      >
        ✦ Your {year} in pages is ready —{" "}
        <span className="underline underline-offset-2">look back →</span>
      </Link>
      <button
        onClick={() => {
          if (key) localStorage.setItem(key, "1");
          setDismissed(true);
        }}
        className="shrink-0 font-sans text-xs text-soft-ink hover:text-ink transition-colors"
        data-testid="button-dismiss-yip"
      >
        dismiss
      </button>
    </div>
  );
}
