import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page";
import { DateMemoryCard } from "@/components/date-memory-card";
import { useLookBack, type DateMemory } from "@/lib/use-look-back";
import { onThisDayLabel, type OnThisDayMemory } from "@/lib/use-on-this-day";

function aroundLabel(m: DateMemory): string {
  const span = m.yearsAgo === 1 ? "a year ago" : `${m.yearsAgo} years ago`;
  return `Around this time, ${span}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-deep-brown mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function LookBack() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLookBack();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["look-back"] });

  const onThisDay = data?.onThisDay ?? [];
  const aroundThisTime = data?.aroundThisTime ?? [];
  const favorites = data?.favorites ?? [];
  const forgotten = data?.forgotten ?? [];
  const nothing =
    !isLoading &&
    onThisDay.length === 0 &&
    aroundThisTime.length === 0 &&
    favorites.length === 0 &&
    forgotten.length === 0;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <PageHeader
          title="Look back"
          subtitle="Your own pages, returning by the calendar and by the ones you treasured. Nothing is added — just brought back."
        />

        {isLoading ? (
          <p className="font-sans text-sm text-faint-ink">Gathering…</p>
        ) : nothing ? (
          <div className="border border-border rounded-2xl bg-surface/60 p-10 text-center">
            <p className="font-body text-xl text-soft-ink mb-2">
              Nothing to look back on yet.
            </p>
            <p className="font-body text-soft-ink mb-7">
              As your pages gather years, this is where the past comes back to
              meet you.
            </p>
            <Link
              href="/today"
              className="rounded-full bg-deep-brown text-background px-6 py-2.5 font-sans text-sm hover:bg-ink transition-colors"
            >
              Go to Today
            </Link>
          </div>
        ) : (
          <>
            {onThisDay.length > 0 && (
              <Section title="On this day">
                {onThisDay.map((m: OnThisDayMemory) => (
                  <DateMemoryCard
                    key={m.entryId}
                    heading={onThisDayLabel(m)}
                    memory={m}
                    onChanged={refresh}
                  />
                ))}
              </Section>
            )}

            {aroundThisTime.length > 0 && (
              <Section title="Around this time">
                {aroundThisTime.map((m) => (
                  <DateMemoryCard
                    key={m.entryId}
                    heading={aroundLabel(m)}
                    memory={m}
                    onChanged={refresh}
                  />
                ))}
              </Section>
            )}

            {favorites.length > 0 && (
              <Section title="Pages you treasured">
                {favorites.map((m) => (
                  <DateMemoryCard
                    key={m.entryId}
                    heading="You marked this as important"
                    memory={m}
                    onChanged={refresh}
                  />
                ))}
              </Section>
            )}

            {forgotten.length > 0 && (
              <Section title="A page you haven't seen in a while">
                {forgotten.map((m) => (
                  <DateMemoryCard
                    key={m.entryId}
                    heading="A page you haven't seen in a while"
                    memory={m}
                    onChanged={refresh}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
