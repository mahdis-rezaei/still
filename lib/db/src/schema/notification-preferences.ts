import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type NudgeFrequency = "off" | "weekly" | "monthly";

// One row per user. Nudges are off by default for real users; never guilt-based.
export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    writingNudgesEnabled: boolean("writing_nudges_enabled")
      .notNull()
      .default(false),
    memoryNudgesEnabled: boolean("memory_nudges_enabled")
      .notNull()
      .default(false),
    frequency: text("frequency").$type<NudgeFrequency>().notNull().default(
      "weekly",
    ),
    preferredDay: text("preferred_day"),
    preferredTime: text("preferred_time"),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type NotificationPreference =
  typeof notificationPreferencesTable.$inferSelect;
export type InsertNotificationPreference =
  typeof notificationPreferencesTable.$inferInsert;
