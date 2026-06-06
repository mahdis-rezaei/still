import {
  pgTable,
  text,
  uuid,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Push-notification device tokens (APNs / FCM), one row per device. Used by the
// nudge path to deliver "a page brought back" / "a nudge to write" as a push when
// the user has opted in. Unique on the token so re-registration upserts.
export const deviceTokensTable = pgTable(
  "device_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    platform: text("platform").$type<"ios" | "android">().notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUnique: unique().on(t.token),
  }),
);

export type DeviceToken = typeof deviceTokensTable.$inferSelect;
export type InsertDeviceToken = typeof deviceTokensTable.$inferInsert;
