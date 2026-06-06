import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, deviceTokensTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

// Push-notification device registration for the native apps. The client registers
// its APNs/FCM token here (opt-in, after the user enables a push nudge); the nudge
// path uses it to deliver pushes. See lib/push.ts + the runbook for sending.
const router = Router();

router.post("/devices", requireAuth, async (req, res): Promise<void> => {
  const { token, platform } = (req.body ?? {}) as {
    token?: unknown;
    platform?: unknown;
  };
  if (
    typeof token !== "string" ||
    !token ||
    (platform !== "ios" && platform !== "android")
  ) {
    res
      .status(400)
      .json({ error: "token and platform (ios|android) are required" });
    return;
  }
  try {
    await db
      .insert(deviceTokensTable)
      .values({ userId: req.userId!, token, platform })
      .onConflictDoUpdate({
        target: deviceTokensTable.token,
        set: { userId: req.userId!, platform, updatedAt: new Date() },
      });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Register device token error");
    res.status(500).json({ error: "Failed to register device" });
  }
});

router.delete("/devices/:token", requireAuth, async (req, res): Promise<void> => {
  try {
    await db
      .delete(deviceTokensTable)
      .where(
        and(
          eq(deviceTokensTable.token, String(req.params.token)),
          eq(deviceTokensTable.userId, req.userId!),
        ),
      );
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Delete device token error");
    res.status(500).json({ error: "Failed to remove device" });
  }
});

export default router;
