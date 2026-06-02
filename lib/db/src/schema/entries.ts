import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  // The owning account. Nullable so the column can be added to an existing
  // table without a backfill; all routes scope reads/writes to the logged-in
  // user, so pre-auth rows (userId null) are simply never surfaced.
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  date: text("date").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Entry = typeof entriesTable.$inferSelect;
export type InsertEntry = typeof entriesTable.$inferInsert;
