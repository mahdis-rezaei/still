import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Result cache for the two-pass engine. The key is a SHA-256 of
// stage + PROMPT_VERSION + MODEL + payload, so a cache hit is always correct
// for the current prompt — stale-version entries simply never match and get
// recomputed. This is a performance cache only; losing it costs a recompute,
// not data.
export const stillResultsTable = pgTable("still_results", {
  id: serial("id").primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StillResult = typeof stillResultsTable.$inferSelect;
export type InsertStillResult = typeof stillResultsTable.$inferInsert;
