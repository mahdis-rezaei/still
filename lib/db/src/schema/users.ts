import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// A Still account. Either authentication method may be absent:
//   - passwordHash is null for accounts created via Google sign-in only.
//   - googleId   is null for accounts created via email + password only.
// An account can have both once linked (same verified email).
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
