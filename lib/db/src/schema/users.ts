import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

// A Still account. UUID primary key (non-enumerable — entry/user IDs appear in
// URLs, so guessable serial ids would leak counts and identities). Either auth
// method may be absent: passwordHash is null for Google-only accounts; googleId
// is null for password-only accounts.
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
