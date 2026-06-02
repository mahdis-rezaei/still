import { Router } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  notificationPreferencesTable,
  type NotificationPreference,
} from "@workspace/db";
import { UpdateNotificationsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();
router.use("/notifications", requireAuth);

function toPrefs(row: NotificationPreference) {
  return {
    writingFrequency: row.writingFrequency,
    memoryFrequency: row.memoryFrequency,
  };
}

// GET /notifications — returns prefs, creating a default (off/off) row if none.
router.get("/notifications", async (req, res): Promise<void> => {
  try {
    let [row] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, req.userId!));
    if (!row) {
      [row] = await db
        .insert(notificationPreferencesTable)
        .values({ userId: req.userId! })
        .returning();
    }
    res.json(toPrefs(row));
  } catch (err) {
    req.log.error({ err }, "Get notifications error");
    res.status(500).json({ error: "Failed to load preferences" });
  }
});

// PATCH /notifications — upsert the user's cadence choices.
router.patch("/notifications", async (req, res): Promise<void> => {
  const parsed = UpdateNotificationsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid preferences" });
    return;
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.writingFrequency !== undefined)
    set.writingFrequency = parsed.data.writingFrequency;
  if (parsed.data.memoryFrequency !== undefined)
    set.memoryFrequency = parsed.data.memoryFrequency;

  try {
    const [row] = await db
      .insert(notificationPreferencesTable)
      .values({
        userId: req.userId!,
        writingFrequency: parsed.data.writingFrequency ?? "off",
        memoryFrequency: parsed.data.memoryFrequency ?? "off",
      })
      .onConflictDoUpdate({
        target: notificationPreferencesTable.userId,
        set,
      })
      .returning();
    res.json(toPrefs(row));
  } catch (err) {
    req.log.error({ err }, "Update notifications error");
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

export default router;
