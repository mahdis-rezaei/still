import { Link, useRoute } from "wouter";
import { AppNav } from "@/components/app-nav";
import { useYearLetter } from "@/lib/use-year-letter";

function longDate(d: string): string {
  const parsed = new Date(d + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export default function Letter() {
  const [, params] = useRoute("/letters/:year");
  const year = Number(params?.year);
  const valid = Number.isInteger(year);
  const { data, isLoading } = useYearLetter(valid ? year : 0);

  const hasPages = !!data && data.pageCount > 0;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Hidden when printing, so the PDF is just the letter. */}
      <div className="print:hidden">
        <AppNav />
      </div>

      <main className="flex-1 w-full max-w-[640px] mx-auto px-6 py-12 md:py-20">
        {/* Year navigation + print — hidden in the printed PDF. */}
        <div className="print:hidden flex items-center justify-between mb-12">
          <div className="flex gap-4">
            <Link
              href={`/letters/${year - 1}`}
              className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
            >
              ← {year - 1}
            </Link>
            <Link
              href={`/letters/${year + 1}`}
              className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
            >
              {year + 1} →
            </Link>
          </div>
          {hasPages && (
            <div className="flex items-center gap-4">
              <Link
                href={`/book?scope=year&year=${year}`}
                className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
              >
                Make a full book →
              </Link>
              <button
                onClick={() => window.print()}
                className="rounded-full border border-border hover:border-accent-sepia text-soft-ink hover:text-ink px-4 py-2 font-sans text-sm transition-colors"
              >
                Print / Save as PDF
              </button>
            </div>
          )}
        </div>

        {!valid ? (
          <p className="font-body text-soft-ink">That isn't a year.</p>
        ) : isLoading ? (
          <p className="font-sans text-sm text-faint-ink">Gathering your year…</p>
        ) : !hasPages ? (
          <div className="text-center py-10">
            <p className="font-display text-3xl text-deep-brown mb-3">
              {year}
            </p>
            <p className="font-body text-soft-ink">
              No pages from this year yet. When you write or import some, your year
              will gather here.
            </p>
          </div>
        ) : (
          <article>
            {/* Cover */}
            <header className="text-center mb-16">
              <p className="font-sans text-xs uppercase tracking-[0.3em] text-faint-ink mb-6">
                Yadegar
              </p>
              <h1 className="font-display text-3xl md:text-4xl text-deep-brown leading-tight">
                Your Year in Pages
              </h1>
              <p className="font-display text-7xl md:text-8xl text-accent-sepia mt-4">
                {year}
              </p>
            </header>

            {/* Opening */}
            <p className="font-body text-xl text-ink leading-relaxed text-center mb-16">
              This year you wrote {data!.pageCount}{" "}
              {data!.pageCount === 1 ? "page" : "pages"}.
              {data!.favorites.length > 0
                ? " These are a few that stayed."
                : " Every one of them is kept in your Library."}
            </p>

            {/* The pages that stayed */}
            {data!.favorites.length > 0 && (
              <div className="space-y-12">
                {data!.favorites.map((f) => (
                  <section key={f.entryId} className="break-inside-avoid">
                    <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-2">
                      {longDate(f.entryDate)}
                    </p>
                    {f.title && f.title.trim() && (
                      <p className="font-display text-xl text-deep-brown mb-2">
                        {f.title}
                      </p>
                    )}
                    <p className="font-body text-ink leading-relaxed whitespace-pre-wrap">
                      {f.excerpt}
                    </p>
                    <Link
                      href={`/library/${f.entryId}`}
                      className="print:hidden inline-block mt-3 font-sans text-sm text-accent-sepia hover:text-deep-brown transition-colors"
                    >
                      Read the full page →
                    </Link>
                  </section>
                ))}
              </div>
            )}

            {/* Closing */}
            {data!.reflectionCount > 0 && (
              <p className="font-body text-soft-ink leading-relaxed text-center mt-16 pt-10 border-t border-border/60">
                You also wrote {data!.reflectionCount}{" "}
                {data!.reflectionCount === 1 ? "reflection" : "reflections"} this
                year — letters to the person who wrote these pages.
              </p>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
