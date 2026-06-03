import { Router } from "express";
import { and, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import {
  db,
  journalEntriesTable,
  returnedMemoriesTable,
  type ReturnedMemory,
} from "@workspace/db";
import { UpdateMemoryBody, RunMemoryBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { rateLimit } from "../lib/rate-limit";
import { runMemoryForUser } from "../lib/memory-engine";

const router = Router();
// Scope auth to /memories only — a path-less use would 401 the internal,
// cookieless /still/* engine calls that run through this root-mounted router.
router.use("/memories", requireAuth);

// /memories/run is the costly path (two LLM calls). Cap per user to protect
// against runaway cost. requireAuth runs first, so req.userId is set.
const runLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyOf: (req) => req.userId ?? "anon",
  message: "You've brought back many pages just now — give it a little while.",
});

// The public shape — never leak userId, engineRunId, or the full engine trace.
function toMemory(row: ReturnedMemory) {
  return {
    id: row.id,
    label: row.label,
    observation: row.observation,
    quote: row.quote,
    quoteDate: row.quoteDate,
    lens: row.lens,
    journalEntryId: row.journalEntryId,
    dismissed: row.dismissed,
    favorite: row.favorite,
    createdAt: row.createdAt,
    openedAt: row.openedAt,
  };
}

// POST /memories/run — the heart of the product (delegates to the shared
// engine helper, also used by the cron-driven memory nudge).
router.post("/memories/run", runLimiter, async (req, res): Promise<void> => {
  const parsed = RunMemoryBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid run input" });
    return;
  }
  try {
    const result = await runMemoryForUser(req.userId!, parsed.data);
    if (!result.surfaced) {
      res.json({
        surfaced: false,
        reason: result.reason,
        supportMessage: result.supportMessage ?? null,
      });
      return;
    }
    res.json({ surfaced: true, memory: toMemory(result.memory!) });
  } catch (err) {
    req.log.error({ err }, "Memory run error");
    res.status(500).json({ error: "Failed to run the memory engine" });
  }
});

// GET /memories — the Returns archive.
router.get("/memories", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(returnedMemoriesTable)
      .where(eq(returnedMemoriesTable.userId, req.userId!))
      .orderBy(desc(returnedMemoriesTable.createdAt));
    res.json(rows.map(toMemory));
  } catch (err) {
    req.log.error({ err }, "List memories error");
    res.status(500).json({ error: "Failed to list memories" });
  }
});

// --- On This Day (date-based resurfacing) ---
// Deterministic, model-free: entries from the same calendar day (±3 days) in
// PRIOR years, eligible only when the safety pass cleared them. The opposite of
// the engine — the user pulls this open; nothing is pushed. Declared BEFORE
// /memories/:id so "on-this-day" is never read as a memory id.

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

// GET /memories/on-this-day?date=YYYY-MM-DD — the date param is optional and
// defaults to the server's today; the client passes its local date so the
// window matches the reader's calendar.
router.get("/memories/on-this-day", async (req, res): Promise<void> => {
  const dateParam = (req.query as { date?: string }).date;
  const target =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? new Date(dateParam + "T00:00:00Z")
      : new Date();
  if (Number.isNaN(target.getTime())) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  const targetYear = target.getUTCFullYear();
  const targetMmdd = `${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(
    target.getUTCDate(),
  ).padStart(2, "0")}`;
  const windowMmdd = dayWindow(target);

  try {
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
          eq(journalEntriesTable.userId, req.userId!),
          isNull(journalEntriesTable.deletedAt),
          isNotNull(journalEntriesTable.entryDate),
          ne(journalEntriesTable.resurfacingPreference, "never"),
          // Eligible only when the safety pass cleared the page. NULL
          // (unclassified) and unsafe pages are excluded (fail-safe).
          sql`(${journalEntriesTable.resurfaceSafety} ->> 'safe') = 'true'`,
          // Same calendar day (±3), in prior years only.
          sql`to_char(${journalEntriesTable.entryDate}, 'MM-DD') in (${sql.join(
            windowMmdd.map((d) => sql`${d}`),
            sql`, `,
          )})`,
          sql`extract(year from ${journalEntriesTable.entryDate}) < ${targetYear}`,
        ),
      )
      // Most recent year first.
      .orderBy(desc(journalEntriesTable.entryDate));

    const items = rows.map((r) => {
      const entryDate = r.entryDate as string;
      const year = Number(entryDate.slice(0, 4));
      return {
        entryId: r.id,
        title: r.title,
        excerpt: excerpt(r.body),
        entryDate,
        favorite: r.favorite,
        yearsAgo: targetYear - year,
        // True when it's the exact calendar day (vs. a nearby day in the window).
        onThisExactDay: entryDate.slice(5) === targetMmdd,
      };
    });

    res.json(items);
  } catch (err) {
    req.log.error({ err }, "On this day error");
    res.status(500).json({ error: "Failed to load on-this-day memories" });
  }
});

router.get("/memories/:id", async (req, res): Promise<void> => {
  try {
    const [row] = await db
      .select()
      .from(returnedMemoriesTable)
      .where(
        and(
          eq(returnedMemoriesTable.id, req.params.id),
          eq(returnedMemoriesTable.userId, req.userId!),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json(toMemory(row));
  } catch (err) {
    req.log.error({ err }, "Get memory error");
    res.status(500).json({ error: "Failed to fetch memory" });
  }
});

router.patch("/memories/:id", async (req, res): Promise<void> => {
  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.favorite !== undefined) updates.favorite = parsed.data.favorite;
  if (parsed.data.dismissed !== undefined)
    updates.dismissed = parsed.data.dismissed;
  if (parsed.data.opened === true) updates.openedAt = new Date();

  try {
    const [row] = await db
      .update(returnedMemoriesTable)
      .set(updates)
      .where(
        and(
          eq(returnedMemoriesTable.id, req.params.id),
          eq(returnedMemoriesTable.userId, req.userId!),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json(toMemory(row));
  } catch (err) {
    req.log.error({ err }, "Update memory error");
    res.status(500).json({ error: "Failed to update memory" });
  }
});

export default router;
