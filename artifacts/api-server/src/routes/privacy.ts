import { Router } from "express";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  journalEntriesTable,
  reflectionsTable,
  returnedMemoriesTable,
} from "@workspace/db";
import { requireAuth, clearSessionCookie } from "../lib/auth";

const router = Router();
// Scope auth to /privacy (not path-less) so it never blocks /still/*.
router.use("/privacy", requireAuth);

// GET /privacy/export — everything the user has written and been returned.
router.get("/privacy/export", async (req, res): Promise<void> => {
  try {
    const user = req.user!;

    const entries = await db
      .select()
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.userId, user.id),
          isNull(journalEntriesTable.deletedAt),
        ),
      )
      .orderBy(asc(journalEntriesTable.entryDate));

    const reflections = await db
      .select()
      .from(reflectionsTable)
      .where(
        and(
          eq(reflectionsTable.userId, user.id),
          isNull(reflectionsTable.deletedAt),
        ),
      )
      .orderBy(asc(reflectionsTable.createdAt));

    const memories = await db
      .select()
      .from(returnedMemoriesTable)
      .where(eq(returnedMemoriesTable.userId, user.id))
      .orderBy(desc(returnedMemoriesTable.createdAt));

    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      entries,
      reflections,
      memories,
    });
  } catch (err) {
    req.log.error({ err }, "Export error");
    res.status(500).json({ error: "Failed to export your data" });
  }
});

// DELETE /privacy/account — permanent. Deleting the user row cascades to every
// child table (sessions, entries, reflections, memories, imports, prefs) via
// the schema's onDelete: "cascade" foreign keys, and frees the email for reuse.
router.delete("/privacy/account", async (req, res): Promise<void> => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.userId!));
    clearSessionCookie(res);
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Account deletion error");
    res.status(500).json({ error: "Failed to delete your account" });
  }
});

export default router;
