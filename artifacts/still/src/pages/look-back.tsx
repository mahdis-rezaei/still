import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page";
import { DateMemoryCard } from "@/components/date-memory-card";
import { ThisTimeOfYear } from "@/components/this-time-of-year";
import { ThenAndNow } from "@/components/then-and-now";
import { useLookBack } from "@/lib/use-look-back";

// Look back — the memory home. The past visits you a few voiced pieces at a time
// (never a feed): this time of year, how far you've come, a page you'd forgotten,
// and the Returns history. Each piece self-hides when it has nothing honest.
export default function LookBack() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLookBack();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["look-back"] });
  const forgotten = data?.forgotten ?? [];

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-12 md:py-16">
        <PageHeader
          title="Look back"
          subtitle="Your past, brought back a few pieces at a time — in your own words."
        />

        {/* Returns — the pages the engine has already brought back. */}
        <div className="-mt-4 mb-8">
          <Link
            href="/returns"
            className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
          >
            Returns — pages brought back →
          </Link>
        </div>

        {/* This time of year — voiced nostalgia (auto; self-hides when empty). */}
        <ThisTimeOfYear />

        {/* How far you've come — Then & now (self-hides with no past year). */}
        <ThenAndNow />

        {/* Your Year in Pages — a beautiful, shareable recap of a whole year. */}
        <section className="mb-10">
          <Link
            href={`/letters/${new Date().getFullYear() - 1}`}
            className="block rounded-2xl border border-border bg-surface/60 px-6 py-5 hover:border-accent-sepia transition-colors"
            data-testid="card-year-in-pages"
          >
            <span className="font-sans text-xs tracking-wide uppercase text-faint-ink">
              Your Year in Pages
            </span>
            <p className="font-display text-2xl text-deep-brown mt-1">
              {new Date().getFullYear() - 1} →
            </p>
            <p className="font-sans text-sm text-soft-ink mt-1">
              A year of your writing, gathered — ready to read, print, or keep as a
              book.
            </p>
          </Link>
        </section>

        {/* A page you'd forgotten — one old, unseen page. */}
        {forgotten.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl text-deep-brown mb-4">
              A page you'd forgotten
            </h2>
            <DateMemoryCard
              heading="You haven't seen this in a while"
              memory={forgotten[0]}
              onChanged={refresh}
            />
          </section>
        )}

        {isLoading && (
          <p className="font-sans text-sm text-faint-ink">Gathering…</p>
        )}
      </main>
    </div>
  );
}
