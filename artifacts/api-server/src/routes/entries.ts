import { Router } from "express";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { db, journalEntriesTable } from "@workspace/db";
import { CreateEntryBody, UpdateEntryBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

// Scope auth to this router's own paths (NOT path-less) — a path-less
// router.use would run for every request reaching this root-mounted router,
// including the internal, cookieless /still/* engine calls.
router.use("/entries", requireAuth);

// GET /entries — the Library. Filters: year, month, favorite, source, search.
router.get("/entries", async (req, res): Promise<void> => {
  try {
    const { year, month, favorite, source, search } = req.query as Record<
      string,
      string | undefined
    >;

    const filters = [
      eq(journalEntriesTable.userId, req.userId!),
      isNull(journalEntriesTable.deletedAt),
    ];

    if (year && /^\d{4}$/.test(year)) {
      filters.push(
        sql`extract(year from ${journalEntriesTable.entryDate}) = ${Number(year)}`,
      );
    }
    if (month && /^\d{1,2}$/.test(month)) {
      filters.push(
        sql`extract(month from ${journalEntriesTable.entryDate}) = ${Number(month)}`,
      );
    }
    if (favorite === "true") {
      filters.push(eq(journalEntriesTable.favorite, true));
    }
    if (source) {
      filters.push(eq(journalEntriesTable.source, source as never));
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      filters.push(
        sql`(${journalEntriesTable.body} ilike ${term} or coalesce(${journalEntriesTable.title}, '') ilike ${term})`,
      );
    }

    const rows = await db
      .select()
      .from(journalEntriesTable)
      .where(and(...filters))
      .orderBy(
        // Undated pages sort to the end; otherwise newest entry date first.
        sql`${journalEntriesTable.entryDate} desc nulls last`,
        desc(journalEntriesTable.createdAt),
      );

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List entries route error");
    res.status(500).json({ error: "Failed to list entries" });
  }
});

// POST /entries — create a manual entry.
router.post("/entries", async (req, res): Promise<void> => {
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A body is required" });
    return;
  }

  try {
    const [row] = await db
      .insert(journalEntriesTable)
      .values({
        userId: req.userId!,
        title: parsed.data.title ?? null,
        body: parsed.data.body,
        entryDate: parsed.data.entryDate ?? null,
        source: "manual",
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Create entry route error");
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// GET /entries/:id — a single entry (must belong to the user, not deleted).
router.get("/entries/:id", async (req, res): Promise<void> => {
  try {
    const [row] = await db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.id, req.params.id),
          eq(journalEntriesTable.userId, req.userId!),
          isNull(journalEntriesTable.deletedAt),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Get entry route error");
    res.status(500).json({ error: "Failed to fetch entry" });
  }
});

// PATCH /entries/:id — edit title/body/date/favorite/resurfacing preference.
router.patch("/entries/:id", async (req, res): Promise<void> => {
  const parsed = UpdateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (parsed.data.entryDate !== undefined)
    updates.entryDate = parsed.data.entryDate;
  if (parsed.data.favorite !== undefined)
    updates.favorite = parsed.data.favorite;
  if (parsed.data.resurfacingPreference !== undefined)
    updates.resurfacingPreference = parsed.data.resurfacingPreference;

  try {
    const [row] = await db
      .update(journalEntriesTable)
      .set(updates)
      .where(
        and(
          eq(journalEntriesTable.id, req.params.id),
          eq(journalEntriesTable.userId, req.userId!),
          isNull(journalEntriesTable.deletedAt),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Update entry route error");
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE /entries/:id — soft delete (sets deleted_at).
router.delete("/entries/:id", async (req, res): Promise<void> => {
  try {
    const [row] = await db
      .update(journalEntriesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(journalEntriesTable.id, req.params.id),
          eq(journalEntriesTable.userId, req.userId!),
          isNull(journalEntriesTable.deletedAt),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Delete entry route error");
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

export default router;
