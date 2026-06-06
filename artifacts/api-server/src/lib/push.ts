import { eq } from "drizzle-orm";
import { db, deviceTokensTable } from "@workspace/db";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Best-effort push delivery seam. It looks up the user's registered devices and,
// when APNs/FCM credentials are configured, sends. Without credentials it no-ops
// (returns 0) so the existing email nudge path is unaffected. This is a typed seam
// the nudge cron can call safely today; wiring the actual APNs (.p8) / FCM
// (service account) senders is documented in docs/MOBILE-BUILD-RUNBOOK.md.
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  const fcmConfigured = Boolean(process.env.FCM_SERVICE_ACCOUNT);
  const apnsConfigured = Boolean(
    process.env.APNS_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID,
  );
  if (!fcmConfigured && !apnsConfigured) return 0;

  const devices = await db
    .select()
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.userId, userId));

  // TODO(runbook): deliver `payload` to each device via APNs (iOS) / FCM (Android).
  void payload;
  return devices.length;
}
