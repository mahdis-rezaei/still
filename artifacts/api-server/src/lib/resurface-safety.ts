import { and, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import {
  db,
  journalEntriesTable,
  type ResurfaceSafety,
} from "@workspace/db";

const ENGINE_BASE = `http://127.0.0.1:${process.env.PORT}/api`;

// Manual entries are written incrementally (the Today editor autosaves a single
// row many times). Wait until a manual entry has been still for this long before
// classifying, so we tag settled text, not mid-keystroke drafts. Imported /
// sample / otherwise non-manual entries are already complete → no wait.
const SETTLE_MS = 10 * 60 * 1000;

// How many entries one cron tick will classify. Bounds per-tick cost/latency;
// the backlog drains over successive ticks.
const DEFAULT_BATCH = 50;

interface ClassifyResponse {
  crisis?: boolean;
  hardFloor?: boolean;
  version?: string;
}

// Ask the engine for a single entry's safety verdict (POST /still/classify) and
// map it to the stored ResurfaceSafety shape. Throws on transport/HTTP failure
// so the caller leaves the row NULL (unclassified → not eligible) and a later
// tick retries — we never persist a guessed verdict.
export async function classifyEntrySafety(
  text: string,
): Promise<ResurfaceSafety> {
  const res = await fetch(`${ENGINE_BASE}/still/classify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`classify HTTP ${res.status}`);
  const data = (await res.json()) as ClassifyResponse;

  const crisis = data.crisis === true;
  const hardFloor = data.hardFloor === true;
  return {
    safe: !crisis && !hardFloor,
    reason: crisis ? "crisis" : hardFloor ? "hard_floor" : null,
    version: data.version ?? "unknown",
    classifiedAt: new Date().toISOString(),
  };
}

export interface TagSummary {
  considered: number;
  tagged: number;
  errors: number;
}

// Classify a batch of entries that still need a verdict (resurface_safety IS
// NULL), respecting the settle window for manual entries. Idempotent and safe to
// run on a schedule: each tick drains up to `limit` rows. Used by the
// /cron/tag-resurface-safety endpoint. Re-tagging after a PROMPT_VERSION bump is
// done by NULL-ing stale verdicts at deploy time (see the Replit sync doc), which
// makes those rows pending again here.
export async function tagPendingEntries(
  log: { error: (obj: unknown, msg: string) => void },
  limit = DEFAULT_BATCH,
): Promise<TagSummary> {
  const cutoff = new Date(Date.now() - SETTLE_MS);

  const pending = await db
    .select({
      id: journalEntriesTable.id,
      body: journalEntriesTable.body,
    })
    .from(journalEntriesTable)
    .where(
      and(
        isNull(journalEntriesTable.resurfaceSafety),
        isNull(journalEntriesTable.deletedAt),
        or(
          ne(journalEntriesTable.source, "manual"),
          lt(journalEntriesTable.updatedAt, cutoff),
        ),
      ),
    )
    .orderBy(journalEntriesTable.createdAt)
    .limit(limit);

  const summary: TagSummary = {
    considered: pending.length,
    tagged: 0,
    errors: 0,
  };

  for (const entry of pending) {
    try {
      const verdict = await classifyEntrySafety(entry.body);
      // Only write if still unclassified — a concurrent edit may have reset it,
      // or the row may have been re-tagged; never clobber a fresher state.
      await db
        .update(journalEntriesTable)
        .set({ resurfaceSafety: verdict })
        .where(
          and(
            eq(journalEntriesTable.id, entry.id),
            isNull(journalEntriesTable.resurfaceSafety),
          ),
        );
      summary.tagged++;
    } catch (err) {
      log.error({ err, entryId: entry.id }, "Resurface-safety tagging failed");
      summary.errors++;
    }
  }

  return summary;
}

// Best-effort guard used by the date-based surfacer when it must decide
// eligibility in code rather than SQL.
export function isResurfaceable(safety: ResurfaceSafety | null): boolean {
  return safety?.safe === true;
}

// SQL predicate for "this entry is eligible to be resurfaced by date": classified
// AND marked safe. NULL (unclassified) and unsafe rows are excluded. Callers add
// their own user/deleted/preference/date filters.
export const resurfaceableSql = sql`(${journalEntriesTable.resurfaceSafety} ->> 'safe') = 'true'`;
