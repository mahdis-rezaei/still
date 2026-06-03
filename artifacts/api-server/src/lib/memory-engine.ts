import { randomUUID } from "node:crypto";
import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import {
  db,
  journalEntriesTable,
  returnedMemoriesTable,
  type ReturnedMemory,
} from "@workspace/db";
import { notMutedSql } from "./resurface-mutes";
import { diversifiedPoolIds } from "./diversity";

const ENGINE_BASE = `http://127.0.0.1:${process.env.PORT}/api`;

export const CRISIS_FALLBACK =
  "It sounds like you're carrying something heavy right now. You don't have to hold it alone — if you're in danger or thinking about harming yourself, please reach out to someone you trust or a crisis line in your country. You matter.";

// Call the two-pass engine as an internal service (extract → score). Crisis is
// caught at extraction and never reaches scoring.
async function callEngine(
  entries: string,
  fresh: boolean,
): Promise<
  { crisis: { supportMessage?: string } } | { score: Record<string, unknown> }
> {
  const q = fresh ? "?fresh=1" : "";
  const exRes = await fetch(`${ENGINE_BASE}/still/extract${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ entries }),
  });
  if (!exRes.ok) throw new Error(`extract HTTP ${exRes.status}`);
  const extract = (await exRes.json()) as {
    candidates?: unknown[];
    crisis?: { supportMessage?: string } | null;
  };
  if (extract.crisis) return { crisis: extract.crisis };

  const scRes = await fetch(`${ENGINE_BASE}/still/score${q}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ candidates: extract.candidates ?? [] }),
  });
  if (!scRes.ok) throw new Error(`score HTTP ${scRes.status}`);
  return { score: (await scRes.json()) as Record<string, unknown> };
}

export interface MemoryRunOutcome {
  surfaced: boolean;
  reason?: "nothing" | "crisis" | "not_enough";
  supportMessage?: string;
  /** The persisted memory row (present only when surfaced). */
  memory?: ReturnedMemory;
}

// Gather a user's eligible entries, run the engine, and persist + return one
// memory — or report honest silence / crisis / not-enough. Shared by the
// on-demand /memories/run route and the cron-driven memory nudge.
export async function runMemoryForUser(
  userId: string,
  opts: { year?: number; month?: number; entryIds?: string[]; fresh?: boolean },
): Promise<MemoryRunOutcome> {
  const filters = [
    eq(journalEntriesTable.userId, userId),
    isNull(journalEntriesTable.deletedAt),
    ne(journalEntriesTable.resurfacingPreference, "never"),
    isNotNull(journalEntriesTable.entryDate),
    // Muted date ranges never resurface — by the engine or any date surfacer.
    notMutedSql(userId),
  ];
  if (opts.year) {
    filters.push(
      sql`extract(year from ${journalEntriesTable.entryDate}) = ${opts.year}`,
    );
  }
  if (opts.month) {
    filters.push(
      sql`extract(month from ${journalEntriesTable.entryDate}) = ${opts.month}`,
    );
  }
  if (opts.entryIds && opts.entryIds.length > 0) {
    filters.push(inArray(journalEntriesTable.id, opts.entryIds));
  }

  const eligible = await db
    .select()
    .from(journalEntriesTable)
    .where(and(...filters))
    .orderBy(journalEntriesTable.entryDate);

  if (eligible.length === 0) return { surfaced: false, reason: "not_enough" };

  // Diversity / rotation (Engine V2): unless the caller named specific entries,
  // narrow the pool to avoid re-surfacing the same page within 6 months or
  // repeating a theme shown in the last 90 days. Relaxes before ever emptying.
  let pool = eligible;
  if (!opts.entryIds || opts.entryIds.length === 0) {
    const recent = await db
      .select({
        journalEntryId: returnedMemoriesTable.journalEntryId,
        theme: returnedMemoriesTable.theme,
        createdAt: returnedMemoriesTable.createdAt,
      })
      .from(returnedMemoriesTable)
      .where(eq(returnedMemoriesTable.userId, userId));
    const keep = new Set(
      diversifiedPoolIds(
        eligible.map((e) => ({ id: e.id, theme: e.theme })),
        recent,
      ),
    );
    pool = eligible.filter((e) => keep.has(e.id));
  }

  const entriesStr = pool
    .map((e) => `[${e.entryDate}]\n${e.body}`)
    .join("\n\n");

  const out = await callEngine(entriesStr, opts.fresh === true);

  if ("crisis" in out) {
    return {
      surfaced: false,
      reason: "crisis",
      supportMessage: out.crisis.supportMessage ?? CRISIS_FALLBACK,
    };
  }

  const score = out.score;
  const mode = typeof score.mode === "string" ? score.mode : undefined;
  if (!mode || mode === "nothing") return { surfaced: false, reason: "nothing" };

  const quotes = Array.isArray(score.quotes)
    ? (score.quotes as { date?: string; fragment?: string }[])
    : [];
  const firstQuote = quotes[0] ?? null;
  const quote = firstQuote?.fragment ?? null;
  const quoteDate = firstQuote?.date ?? null;

  let journalEntryId: string | null = null;
  let theme: string | null = null;
  if (quoteDate) {
    const onDate = pool.filter((e) => e.entryDate === quoteDate);
    const match =
      onDate.find(
        (e) => quote && e.body.toLowerCase().includes(quote.toLowerCase()),
      ) ?? onDate[0];
    journalEntryId = match?.id ?? null;
    theme = match?.theme ?? null;
  }

  const [row] = await db
    .insert(returnedMemoriesTable)
    .values({
      userId,
      journalEntryId,
      engineRunId: randomUUID(),
      label: typeof score.label === "string" ? score.label : null,
      observation:
        typeof score.observation === "string" ? score.observation : null,
      quote,
      quoteDate,
      lens: mode as never,
      theme,
      fullEngineResponse: score,
    })
    .returning();

  return { surfaced: true, memory: row };
}
