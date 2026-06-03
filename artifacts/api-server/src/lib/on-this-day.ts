import { and, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db, journalEntriesTable } from "@workspace/db";

// One date-based memory: a past page from the same calendar day in a prior year.
export interface OnThisDayItem {
  entryId: string;
  title: string | null;
  excerpt: string;
  entryDate: string;
  favorite: boolean;
  yearsAgo: number;
  onThisExactDay: boolean;
}

// Two-digit-padded MM-DD strings within ±windowDays of the target month/day.
// Built via real Date arithmetic so month/leap-year boundaries are handled.
function dayWindow(target: Date, windowDays = 3): string[] {
  const out = new Set<string>();
  for (let d = -windowDays; d <= windowDays; d++) {
    const x = new Date(
      Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth(),
        target.getUTCDate() + d,
      ),
    );
    const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(x.getUTCDate()).padStart(2, "0");
    out.add(`${mm}-${dd}`);
  }
  return [...out];
}

// A returned page is shown as an excerpt (the full page is one tap away). Keep
// enough for context — never a tiny snippet — but bound the payload.
function excerpt(body: string, maxWords = 300): string {
  const trimmed = body.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return words.slice(0, maxWords).join(" ") + "…";
}

// Date-based resurfacing: a user's pages from the same calendar day (±3 days) in
// PRIOR years, most recent year first. Deterministic and model-free. Eligible
// only when the safety pass cleared the page (resurface_safety.safe === true);
// NULL (unclassified) and unsafe pages, never-resurface pages, and deleted pages
// are excluded. `target` is the reference day (the reader's local "today").
export async function onThisDayForUser(
  userId: string,
  target: Date,
): Promise<OnThisDayItem[]> {
  const targetYear = target.getUTCFullYear();
  const targetMmdd = `${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(
    target.getUTCDate(),
  ).padStart(2, "0")}`;
  const windowMmdd = dayWindow(target);

  const rows = await db
    .select({
      id: journalEntriesTable.id,
      title: journalEntriesTable.title,
      body: journalEntriesTable.body,
      entryDate: journalEntriesTable.entryDate,
      favorite: journalEntriesTable.favorite,
    })
    .from(journalEntriesTable)
    .where(
      and(
        eq(journalEntriesTable.userId, userId),
        isNull(journalEntriesTable.deletedAt),
        isNotNull(journalEntriesTable.entryDate),
        ne(journalEntriesTable.resurfacingPreference, "never"),
        sql`(${journalEntriesTable.resurfaceSafety} ->> 'safe') = 'true'`,
        sql`to_char(${journalEntriesTable.entryDate}, 'MM-DD') in (${sql.join(
          windowMmdd.map((d) => sql`${d}`),
          sql`, `,
        )})`,
        sql`extract(year from ${journalEntriesTable.entryDate}) < ${targetYear}`,
      ),
    )
    .orderBy(desc(journalEntriesTable.entryDate));

  return rows.map((r) => {
    const entryDate = r.entryDate as string;
    const year = Number(entryDate.slice(0, 4));
    return {
      entryId: r.id,
      title: r.title,
      excerpt: excerpt(r.body),
      entryDate,
      favorite: r.favorite,
      yearsAgo: targetYear - year,
      onThisExactDay: entryDate.slice(5) === targetMmdd,
    };
  });
}
