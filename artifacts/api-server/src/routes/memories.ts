import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  and,
  desc,
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
import { RunMemoryBody, UpdateMemoryBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const ENGINE_BASE = `http://127.0.0.1:${process.env.PORT}/api`;
const CRISIS_FALLBACK =
  "It sounds like you're carrying something heavy right now. You don't have to hold it alone — if you're in danger or thinking about harming yourself, please reach out to someone you trust or a crisis line in your country. You matter.";

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

// Call the two-pass engine as an internal service (extract → score). Crisis is
// caught at extraction and never reaches scoring.
async function callEngine(
  entries: string,
  fresh: boolean,
): Promise<
  | { crisis: { supportMessage?: string } }
  | { score: Record<string, unknown> }
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

// POST /memories/run — the heart of the product.
router.post("/memories/run", async (req, res): Promise<void> => {
  const parsed = RunMemoryBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid run input" });
    return;
  }
  const { year, month, entryIds, fresh } = parsed.data;

  try {
    // Eligible = the user's, not deleted, opted-in (not "never"), and dated
    // (the engine attributes by date).
    const filters = [
      eq(journalEntriesTable.userId, req.userId!),
      isNull(journalEntriesTable.deletedAt),
      ne(journalEntriesTable.resurfacingPreference, "never"),
      isNotNull(journalEntriesTable.entryDate),
    ];
    if (year) {
      filters.push(
        sql`extract(year from ${journalEntriesTable.entryDate}) = ${year}`,
      );
    }
    if (month) {
      filters.push(
        sql`extract(month from ${journalEntriesTable.entryDate}) = ${month}`,
      );
    }
    if (entryIds && entryIds.length > 0) {
      filters.push(inArray(journalEntriesTable.id, entryIds));
    }

    const eligible = await db
      .select()
      .from(journalEntriesTable)
      .where(and(...filters))
      .orderBy(journalEntriesTable.entryDate);

    if (eligible.length === 0) {
      res.json({ surfaced: false, reason: "not_enough" });
      return;
    }

    const entriesStr = eligible
      .map((e) => `[${e.entryDate}]\n${e.body}`)
      .join("\n\n");

    const out = await callEngine(entriesStr, fresh === true);

    // §3.1 crisis — never a memory; surface care instead.
    if ("crisis" in out) {
      res.json({
        surfaced: false,
        reason: "crisis",
        supportMessage: out.crisis.supportMessage ?? CRISIS_FALLBACK,
      });
      return;
    }

    const score = out.score;
    const mode = typeof score.mode === "string" ? score.mode : undefined;

    // Honest silence — nothing worth returning, never persisted.
    if (!mode || mode === "nothing") {
      res.json({ surfaced: false, reason: "nothing" });
      return;
    }

    const quotes = Array.isArray(score.quotes)
      ? (score.quotes as { date?: string; fragment?: string }[])
      : [];
    const firstQuote = quotes[0] ?? null;
    const quote = firstQuote?.fragment ?? null;
    const quoteDate = firstQuote?.date ?? null;

    // Link to the originating entry when we can match the quote's date/body.
    let journalEntryId: string | null = null;
    if (quoteDate) {
      const onDate = eligible.filter((e) => e.entryDate === quoteDate);
      const match =
        onDate.find(
          (e) =>
            quote && e.body.toLowerCase().includes(quote.toLowerCase()),
        ) ?? onDate[0];
      journalEntryId = match?.id ?? null;
    }

    const [row] = await db
      .insert(returnedMemoriesTable)
      .values({
        userId: req.userId!,
        journalEntryId,
        engineRunId: randomUUID(),
        label: typeof score.label === "string" ? score.label : null,
        observation:
          typeof score.observation === "string" ? score.observation : null,
        quote,
        quoteDate,
        lens: mode as never,
        fullEngineResponse: score,
      })
      .returning();

    res.json({ surfaced: true, memory: toMemory(row) });
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
