import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  returnedMemoriesTable,
  type ReturnedMemory,
} from "@workspace/db";
import { UpdateMemoryBody, RunMemoryBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { rateLimit } from "../lib/rate-limit";
import { runMemoryForUser } from "../lib/memory-engine";
import {
  onThisDayForUser,
  aroundThisTimeForUser,
  favoritesForUser,
} from "../lib/on-this-day";

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

// Resolve the ?date=YYYY-MM-DD param (the reader's local day) to a UTC-midnight
// Date, or null when the param is present but malformed. Absent → server today.
function targetDate(
  req: { query: { date?: string } },
): Date | null {
  const dateParam = req.query.date;
  if (!dateParam) return new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return null;
  const d = new Date(dateParam + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /memories/on-this-day?date=YYYY-MM-DD — date-based resurfacing (see
// lib/on-this-day). Declared BEFORE /memories/:id so "on-this-day" is never read
// as a memory id. The date param is optional and defaults to the server's today;
// the client passes its local date so the window matches the reader's calendar.
router.get("/memories/on-this-day", async (req, res): Promise<void> => {
  const target = targetDate(req as { query: { date?: string } });
  if (!target) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  try {
    res.json(await onThisDayForUser(req.userId!, target));
  } catch (err) {
    req.log.error({ err }, "On this day error");
    res.status(500).json({ error: "Failed to load on-this-day memories" });
  }
});

// GET /memories/look-back?date=YYYY-MM-DD — the dedicated browse: all the
// date-based ways a page returns, gathered. Favorites already shown in the
// on-this-day / around-this-time buckets are dropped so nothing appears twice.
router.get("/memories/look-back", async (req, res): Promise<void> => {
  const target = targetDate(req as { query: { date?: string } });
  if (!target) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  try {
    const [onThisDay, aroundThisTime, favoritesRaw] = await Promise.all([
      onThisDayForUser(req.userId!, target),
      aroundThisTimeForUser(req.userId!, target),
      favoritesForUser(req.userId!),
    ]);
    const shown = new Set([
      ...onThisDay.map((m) => m.entryId),
      ...aroundThisTime.map((m) => m.entryId),
    ]);
    const favorites = favoritesRaw.filter((m) => !shown.has(m.entryId));
    res.json({ onThisDay, aroundThisTime, favorites });
  } catch (err) {
    req.log.error({ err }, "Look back error");
    res.status(500).json({ error: "Failed to load look-back memories" });
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
