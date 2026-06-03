import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useOnThisDay, onThisDayLabel } from "@/lib/use-on-this-day";
import { usePreferences } from "@/lib/use-preferences";
import { DateMemoryCard } from "@/components/date-memory-card";

// The On This Day section on Today. Stays SILENT (renders nothing) when there's
// nothing from this day in years past — never an empty box, never a nudge to
// look. A quiet link leads to the fuller Look Back browse. In "protected"
// memory-sensitivity, it doesn't auto-surface at all (nothing returns unbidden).
export function OnThisDay() {
  const queryClient = useQueryClient();
  const { data: prefs } = usePreferences();
  const { data, isLoading } = useOnThisDay();
  if (prefs?.memorySensitivity === "protected") return null;
  if (isLoading || !data || data.length === 0) return null;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["on-this-day"] });

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl text-deep-brown">On this day</h2>
        <Link
          href="/look-back"
          className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
        >
          Look back →
        </Link>
      </div>
      <div className="space-y-4">
        {data.map((m) => (
          <DateMemoryCard
            key={m.entryId}
            heading={onThisDayLabel(m)}
            memory={m}
            onChanged={refresh}
          />
        ))}
      </div>
    </section>
  );
}
