import { and, eq } from "drizzle-orm";
import { db, usageTable, type User } from "@workspace/db";
import { monthStartUTC, REROLL_WINDOW_MS } from "./usage";

// Phase 1 — free-tier quota on the one costly thing: a FRESH AI return (a
// cache-miss /memories/run). Writing, keeping, importing, browsing, exporting, and
// date-based returns are always free and never metered. We gate the AI, never the
// journal.
//
// The billable counter is usage.freshReturns (incremented in usage.ts ONLY on a
// real model call, with rapid re-rolls already collapsed into one). This module
// reads that counter and decides whether the NEXT user-initiated run is allowed.

// Free allowance per calendar month — "about one a week". A new account gets a
// one-time onboarding bonus in its FIRST calendar month so the first session never
// hits a wall (the magic has to land before any limit does).
export const FREE_MONTHLY_RETURNS = 4;
export const ONBOARDING_BONUS = 3;

// Members are unlimited; this soft per-day ceiling only exists to catch runaway
// abuse, far above any real cadence. (No members exist until Stripe lands in
// Phase 2, so this is currently inert — enforced member-side once it can matter.)
export const MEMBER_DAILY_SOFT_CAP = 8;

// SHADOW BY DEFAULT. Until payments exist (Phase 2) a capped free user has no way
// to upgrade, so we METER and EXPOSE usage but never actually block. Flip
// STILL_QUOTA_ENFORCED=1 (the day membership is purchasable) to turn the gate from
// shadow into a real 402. Everything else — counter, usage summary, client nudge —
// already works; this is the single switch.
export const QUOTA_ENFORCED = process.env.STILL_QUOTA_ENFORCED === "1";

export class QuotaExceeded extends Error {
  constructor(
    readonly summary: UsageSummary,
    readonly enforced: boolean,
  ) {
    super("quota_exceeded");
    this.name = "QuotaExceeded";
  }
}

export interface UsageSummary {
  plan: "free" | "member";
  // Fresh returns counted this calendar month.
  used: number;
  // The effective monthly allowance (free: base + any onboarding bonus). null =
  // unlimited (members).
  limit: number | null;
  // Whether the user is currently at/over their allowance (false for members).
  atLimit: boolean;
  // ISO start of the counting period (this month, UTC).
  periodStart: string;
  // Last counted return (for re-roll grace); null if none this period.
  lastReturnAt: string | null;
}

// The effective monthly allowance for a free account: base + onboarding bonus
// during the account's first calendar month only.
function freeLimitFor(user: Pick<User, "createdAt">): number {
  const created = new Date(user.createdAt);
  const inFirstMonth =
    monthStartUTC(created).getTime() === monthStartUTC().getTime();
  return FREE_MONTHLY_RETURNS + (inFirstMonth ? ONBOARDING_BONUS : 0);
}

// Read the current month's usage for a user (no model calls — a single indexed
// row read). Safe to call on every /auth/me.
export async function getUsageSummary(
  user: Pick<User, "id" | "plan" | "createdAt">,
): Promise<UsageSummary> {
  const period = monthStartUTC();
  const [row] = await db
    .select({
      freshReturns: usageTable.freshReturns,
      lastReturnAt: usageTable.lastReturnAt,
    })
    .from(usageTable)
    .where(
      and(eq(usageTable.userId, user.id), eq(usageTable.periodStart, period)),
    );

  const used = row?.freshReturns ?? 0;
  const limit = user.plan === "member" ? null : freeLimitFor(user);
  return {
    plan: user.plan,
    used,
    limit,
    atLimit: limit != null && used >= limit,
    periodStart: period.toISOString(),
    lastReturnAt: row?.lastReturnAt ? new Date(row.lastReturnAt).toISOString() : null,
  };
}

// Gate the billable path. Members always pass. A free user passes while under
// their monthly allowance; at the limit they still pass if this run is a re-roll
// of the return they just got (within the same window usage.ts collapses for
// billing) — refining a return you already paid for must never be blocked. Only a
// genuinely NEW return past the limit is denied.
//
// In SHADOW mode (default) this never throws — it returns the summary so the
// caller/logs can see who WOULD have been blocked. When STILL_QUOTA_ENFORCED=1 it
// throws QuotaExceeded for a real over-limit new return.
export async function assertCanRunMemory(
  user: Pick<User, "id" | "plan" | "createdAt">,
): Promise<UsageSummary> {
  const summary = await getUsageSummary(user);
  if (summary.plan === "member") return summary;
  if (!summary.atLimit) return summary;

  // At the limit — allow a re-roll of the just-counted return (grace), block a
  // new one.
  const lastMs = summary.lastReturnAt ? new Date(summary.lastReturnAt).getTime() : 0;
  const withinRerollGrace = lastMs > 0 && Date.now() - lastMs <= REROLL_WINDOW_MS;
  if (withinRerollGrace) return summary;

  if (QUOTA_ENFORCED) throw new QuotaExceeded(summary, true);
  return summary; // shadow: metered, not blocked
}
