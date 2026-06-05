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
import { enqueueMemoryJob, getMemoryJob } from "../lib/memory-jobs";

// ADR 0002: when on, long reads run as background jobs (enqueue + poll) instead
// of blocking the request. Off → the synchronous path below, byte-identical to
// before, so this is a clean dark-ship + instant rollback.
function asyncMemoryEnabled(): boolean {
  return process.env.ASYNC_MEMORY === "on";
}
import {
  onThisDayForUser,
  aroundThisTimeForUser,
  onThisDayFramedSet,
  favoritesForUser,
  forgottenForUser,
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

  // Async (ADR 0002): enqueue and return a job to poll, so the request never
  // hangs for minutes and the user can leave and come back.
  if (asyncMemoryEnabled()) {
    try {
      const jobId = await enqueueMemoryJob(
        req.userId!,
        "run",
        {},
        `run:${req.userId}`,
      );
      res.status(202).json({ jobId, status: "queued" });
    } catch (err) {
      req.log.error({ err }, "Enqueue memory run failed");
      res.status(500).json({ error: "Failed to start the memory engine" });
    }
    return;
  }

  // Synchronous fallback (default): unchanged behavior.
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

// GET /memories/jobs/:id — poll an async run. Declared BEFORE /memories/:id so
// "jobs" is never read as a memory id. Returns { status } while pending, and on
// done resolves to the SAME shape the synchronous run returned ({ surfaced,
// memory } | { surfaced:false, reason }) by dereferencing the stored pointer.
router.get("/memories/jobs/:id", async (req, res): Promise<void> => {
  try {
    const job = await getMemoryJob(req.userId!, req.params.id);
    if (!job) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (job.status === "error") {
      res.json({ status: "error", result: { surfaced: false, reason: "error" } });
      return;
    }
    if (job.status !== "done") {
      res.json({ status: job.status });
      return;
    }
    const r = (job.result ?? {}) as {
      surfaced?: boolean;
      memoryId?: string;
      reason?: string;
      supportMessage?: string | null;
    };
    if (r.surfaced && r.memoryId) {
      const [row] = await db
        .select()
        .from(returnedMemoriesTable)
        .where(
          and(
            eq(returnedMemoriesTable.id, r.memoryId),
            eq(returnedMemoriesTable.userId, req.userId!),
          ),
        )
        .limit(1);
      res.json({
        status: "done",
        result: row
          ? { surfaced: true, memory: toMemory(row) }
          : { surfaced: false, reason: "nothing" },
      });
      return;
    }
    res.json({
      status: "done",
      result: {
        surfaced: false,
        reason: r.reason ?? "nothing",
        supportMessage: r.supportMessage ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Memory job poll error");
    res.status(500).json({ error: "Failed to read the job" });
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

// GET /memories/on-this-day/framed?date=YYYY-MM-DD — the date-anchored surface,
// VOICED. Returns the raw per-year list (`years`, instant) AND a `framed` pick:
// the engine scoped to just this date's entries, so the "On this day" memory
// reads in Yadegar's voice (a chosen line + an observation) instead of a raw
// excerpt — Facebook-Memories, but warm. Falls back to the same MONTH in prior
// years when nothing is on the exact day, so it's never a dead end. The framing
// is a bonus: if the engine stays silent (thin entry), `framed` is null and the
// client still shows the raw year(s). Preview mode → no Returns row is written.
router.get("/memories/on-this-day/framed", async (req, res): Promise<void> => {
  const target = targetDate(req as { query: { date?: string } });
  if (!target) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  try {
    const { exact, years } = await onThisDayFramedSet(req.userId!, target);

    if (years.length === 0) {
      res.json({ exact: false, years: [], framed: null });
      return;
    }

    let framed: ReturnType<typeof toMemory> | null = null;
    try {
      const out = await runMemoryForUser(req.userId!, {
        entryIds: years.map((y) => y.entryId),
        preview: true,
      });
      if (out.surfaced && out.memory) framed = toMemory(out.memory);
    } catch (err) {
      // Framing is a bonus — never fail the whole surface because the voice pass
      // errored. The client falls back to the raw year(s).
      req.log.warn({ err }, "On-this-day framing failed; serving raw years");
    }

    res.json({ exact, years, framed });
  } catch (err) {
    req.log.error({ err }, "On this day (framed) error");
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
    const [onThisDay, aroundThisTime, favoritesRaw, forgottenRaw] =
      await Promise.all([
        onThisDayForUser(req.userId!, target),
        aroundThisTimeForUser(req.userId!, target),
        favoritesForUser(req.userId!),
        forgottenForUser(req.userId!),
      ]);
    // De-dupe across buckets so a page never appears twice.
    const shown = new Set([
      ...onThisDay.map((m) => m.entryId),
      ...aroundThisTime.map((m) => m.entryId),
    ]);
    const favorites = favoritesRaw.filter((m) => !shown.has(m.entryId));
    favorites.forEach((m) => shown.add(m.entryId));
    const forgotten = forgottenRaw.filter((m) => !shown.has(m.entryId));
    res.json({ onThisDay, aroundThisTime, favorites, forgotten });
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
