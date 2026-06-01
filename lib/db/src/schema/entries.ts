import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Entry = typeof entriesTable.$inferSelect;
export type InsertEntry = typeof entriesTable.$inferInsert;
