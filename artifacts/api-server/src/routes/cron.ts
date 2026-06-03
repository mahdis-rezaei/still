import { Router } from "express";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import {
  db,
  usersTable,
  notificationPreferencesTable,
  type NudgeFrequency,
} from "@workspace/db";
import {
  sendEmail,
  writingNudgeEmail,
  memoryNudgeEmail,
} from "../lib/email";
import { runMemoryForUser } from "../lib/memory-engine";
import { tagPendingEntries } from "../lib/resurface-safety";

const router = Router();

function requireCronSecret(req: {
  header: (name: string) => string | undefined;
}): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, status: 503, error: "CRON_SECRET not configured" };
  if (req.header("x-cron-secret") !== secret)
    return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

function isDue(freq: NudgeFrequency, last: Date | null): boolean {
  if (freq === "off") return false;
  if (!last) return true;
  const days = (Date.now() - last.getTime()) / 86_400_000;
  return freq === "weekly" ? days >= 7 : days >= 28;
}

// POST /cron/run-nudges — machine-triggered (e.g. a daily Scheduled Deployment).
// Authenticated by the x-cron-secret header matching CRON_SECRET. Sends due
// writing nudges and memory nudges. Memory nudges run the engine, so they
// inherit every safety gate — crisis/nothing simply send nothing.
router.post("/cron/run-nudges", async (req, res): Promise<void> => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ error: "CRON_SECRET not configured" });
    return;
  }
  if (req.header("x-cron-secret") !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const summary = {
    considered: 0,
    writingSent: 0,
    memorySent: 0,
    memorySilent: 0,
    errors: 0,
  };

  try {
    const rows = await db
      .select({ prefs: notificationPreferencesTable, user: usersTable })
      .from(notificationPreferencesTable)
      .innerJoin(
        usersTable,
        eq(notificationPreferencesTable.userId, usersTable.id),
      )
      .where(
        and(
          isNull(usersTable.deletedAt),
          or(
            ne(notificationPreferencesTable.writingFrequency, "off"),
            ne(notificationPreferencesTable.memoryFrequency, "off"),
          ),
        ),
      );

    for (const { prefs, user } of rows) {
      summary.considered++;

      // Writing nudge — a gentle reminder, no engine.
      if (isDue(prefs.writingFrequency, prefs.lastWritingNudgeAt)) {
        try {
          await sendEmail({
            to: user.email,
            ...writingNudgeEmail(`${appUrl()}/today`),
          });
          summary.writingSent++;
        } catch (err) {
          req.log.error({ err, userId: user.id }, "Writing nudge failed");
          summary.errors++;
        }
        await db
          .update(notificationPreferencesTable)
          .set({ lastWritingNudgeAt: new Date(), updatedAt: new Date() })
          .where(eq(notificationPreferencesTable.id, prefs.id));
      }

      // Memory nudge — runs the engine; sends only when a real page surfaces.
      if (isDue(prefs.memoryFrequency, prefs.lastMemoryNudgeAt)) {
        try {
          const result = await runMemoryForUser(user.id, {});
          if (result.surfaced && result.memory) {
            const m = result.memory;
            const link = m.journalEntryId
              ? `${appUrl()}/library/${m.journalEntryId}`
              : `${appUrl()}/returns`;
            await sendEmail({
              to: user.email,
              ...memoryNudgeEmail({
                observation: m.observation,
                quote: m.quote,
                quoteDate: m.quoteDate,
                link,
              }),
            });
            summary.memorySent++;
          } else {
            summary.memorySilent++;
          }
        } catch (err) {
          req.log.error({ err, userId: user.id }, "Memory nudge failed");
          summary.errors++;
        }
        // Update regardless so we don't re-run the engine every tick.
        await db
          .update(notificationPreferencesTable)
          .set({ lastMemoryNudgeAt: new Date(), updatedAt: new Date() })
          .where(eq(notificationPreferencesTable.id, prefs.id));
      }
    }

    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Cron run-nudges error");
    res.status(500).json({ error: "Failed to run nudges", ...summary });
  }
});

// POST /cron/tag-resurface-safety — machine-triggered (e.g. a Scheduled
// Deployment every few minutes). Authenticated by x-cron-secret == CRON_SECRET.
// Classifies a batch of entries that still need a date-resurfacing safety verdict
// (resurface_safety IS NULL), so the date-based surfacer stays a pure DB query.
// Optional ?limit=N bounds the batch. Idempotent; the backlog drains over ticks.
router.post("/cron/tag-resurface-safety", async (req, res): Promise<void> => {
  const auth = requireCronSecret(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const limitRaw = Number((req.query as { limit?: string }).limit);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : undefined;

  try {
    const summary = await tagPendingEntries(req.log, limit);
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Cron tag-resurface-safety error");
    res.status(500).json({ error: "Failed to tag entries" });
  }
});

export default router;
