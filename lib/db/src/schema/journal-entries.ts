import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type EntrySource =
  | "manual"
  | "pasted_import"
  | "file_import"
  | "google_doc"
  | "sample";

export type ResurfacingPreference = "normal" | "more_often" | "never";

// Every journal page. entry_date is intentionally NULLABLE: real lifelong
// archives contain genuinely undated pages, which live in an "undated" group
// rather than being forced a false date. The engine reads dates as
// "YYYY-MM-DD" strings, which is exactly how the `date` column serializes.
export const journalEntriesTable = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title"),
  body: text("body").notNull(),
  entryDate: date("entry_date"),
  source: text("source").$type<EntrySource>().notNull().default("manual"),
  sourceDocumentId: uuid("source_document_id"),
  sourceTitle: text("source_title"),
  favorite: boolean("favorite").notNull().default(false),
  resurfacingPreference: text("resurfacing_preference")
    .$type<ResurfacingPreference>()
    .notNull()
    .default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
});

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type InsertJournalEntry = typeof journalEntriesTable.$inferInsert;
