import { and, desc, eq, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { db, journalEntriesTable } from "@workspace/db";

// Date-based resurfacing surfacers. Deterministic and model-free — the opposite
// of the engine: the user pulls these open; nothing is pushed. Every surfacer
// shares the same eligibility floor (safety pass cleared, not "never", dated,
// not deleted), so a page that shouldn't return never leaks through any of them.

// The base shape every date-based memory shares.
export interface DateMemory {
  entryId: string;
  title: string | null;
  excerpt: string;
  entryDate: string;
  favorite: boolean;
  yearsAgo: number;
}

// On This Day adds whether it's the exact calendar day vs. a nearby one.
export interface OnThisDayItem extends DateMemory {
  onThisExactDay: boolean;
}

// Common eligibility: belongs to the user, not deleted, has a date, not opted
// out, and the safety pass cleared it (NULL/unsafe excluded — fail-safe).
function eligible(userId: string): SQL[] {
  return [
    eq(journalEntriesTable.userId, userId),
    isNull(journalEntriesTable.deletedAt),
    isNotNull(journalEntriesTable.entryDate),
    ne(journalEntriesTable.resurfacingPreference, "never"),
    sql`(${journalEntriesTable.resurfaceSafety} ->> 'safe') = 'true'`,
  ];
}

const SELECT_COLS = {
  id: journalEntriesTable.id,
  title: journalEntriesTable.title,
  body: journalEntriesTable.body,
  entryDate: journalEntriesTable.entryDate,
  favorite: journalEntriesTable.favorite,
};

type Row = {
  id: string;
  title: string | null;
  body: string;
  entryDate: string | null;
  favorite: boolean;
};

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

// SQL list literal for a set of MM-DD strings.
function mmddList(set: string[]): SQL {
  return sql.join(
    set.map((d) => sql`${d}`),
    sql`, `,
  );
}

// A returned page is shown as an excerpt (the full page is one tap away). Keep
// enough for context — never a tiny snippet — but bound the payload.
function excerpt(body: string, maxWords = 300): string {
  const trimmed = body.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return words.slice(0, maxWords).join(" ") + "…";
}

function toBase(r: Row, refYear: number): DateMemory {
  const entryDate = r.entryDate as string;
  const year = Number(entryDate.slice(0, 4));
  return {
    entryId: r.id,
    title: r.title,
    excerpt: excerpt(r.body),
    entryDate,
    favorite: r.favorite,
    yearsAgo: refYear - year,
  };
}

// On this day: pages from the same calendar day (±3 days) in PRIOR years, most
// recent year first. `target` is the reader's local "today".
export async function onThisDayForUser(
  userId: string,
  target: Date,
): Promise<OnThisDayItem[]> {
  const targetYear = target.getUTCFullYear();
  const targetMmdd = `${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(
    target.getUTCDate(),
  ).padStart(2, "0")}`;

  const rows = await db
    .select(SELECT_COLS)
    .from(journalEntriesTable)
    .where(
      and(
        ...eligible(userId),
        sql`to_char(${journalEntriesTable.entryDate}, 'MM-DD') in (${mmddList(dayWindow(target))})`,
        sql`extract(year from ${journalEntriesTable.entryDate}) < ${targetYear}`,
      ),
    )
    .orderBy(desc(journalEntriesTable.entryDate));

  return rows.map((r) => ({
    ...toBase(r, targetYear),
    onThisExactDay: (r.entryDate as string).slice(5) === targetMmdd,
  }));
}

// Around this time: same MONTH in prior years, EXCLUDING the ±3-day window that
// On This Day already covers (so the two never overlap). Most recent first.
export async function aroundThisTimeForUser(
  userId: string,
  target: Date,
  limit = 8,
): Promise<DateMemory[]> {
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;

  const rows = await db
    .select(SELECT_COLS)
    .from(journalEntriesTable)
    .where(
      and(
        ...eligible(userId),
        sql`extract(month from ${journalEntriesTable.entryDate}) = ${targetMonth}`,
        sql`extract(year from ${journalEntriesTable.entryDate}) < ${targetYear}`,
        sql`to_char(${journalEntriesTable.entryDate}, 'MM-DD') not in (${mmddList(dayWindow(target))})`,
      ),
    )
    .orderBy(desc(journalEntriesTable.entryDate))
    .limit(limit);

  return rows.map((r) => toBase(r, targetYear));
}

// Pages the user treasured: favorited entries that clear the same floor. Most
// recent first. (Library's Favorites filter shows ALL favorites unfiltered; this
// is the resurfacing view, so it respects the safety floor like every surfacer.)
export async function favoritesForUser(
  userId: string,
  limit = 8,
): Promise<DateMemory[]> {
  const refYear = new Date().getUTCFullYear();
  const rows = await db
    .select(SELECT_COLS)
    .from(journalEntriesTable)
    .where(and(...eligible(userId), eq(journalEntriesTable.favorite, true)))
    .orderBy(desc(journalEntriesTable.entryDate))
    .limit(limit);

  return rows.map((r) => toBase(r, refYear));
}
