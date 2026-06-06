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
  avatarColor: text("avatar_color"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  // How Yadegar may bring pages back on its own. open = full (push + pull);
  // gentle = no memory nudges, but in-app date returns still appear; protected =
  // nothing returns unbidden — only when the user goes looking. Hard floors +
  // active-crisis exclusion + mutes apply in every mode (those never move).
  memorySensitivity: text("memory_sensitivity")
    .$type<"open" | "gentle" | "protected">()
    .notNull()
    .default("open"),
  // Billing plan. "free" = the journal + a small monthly quota of fresh AI
  // returns; "member" = unlimited returns (fair use). The Stripe webhook is the
  // source of truth for `plan` once payments land (Phase 2); until then everyone
  // is "free" and enforcement runs in shadow (metered, not blocked).
  plan: text("plan")
    .$type<"free" | "member">()
    .notNull()
    .default("free"),
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
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
