import { Router } from "express";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  SESSION_COOKIE,
  googleConfigured,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
} from "../lib/auth";

const router = Router();

const OAUTH_STATE_COOKIE = "still_oauth_state";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

// The public shape of a user — never leak passwordHash or googleId.
function toAuthUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl };
}

async function startSession(res: import("express").Response, userId: number) {
  const { token, expiresAt } = await createSession(userId);
  setSessionCookie(res, token, expiresAt);
}

// ── Email + password ─────────────────────────────────────────────────────────

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Email and a password (8+ characters) are required" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing?.passwordHash) {
      res.status(409).json({ error: "That email is already registered" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    let user: User;
    if (existing) {
      // Email exists from a Google-only account — set a password to link it.
      [user] = await db
        .update(usersTable)
        .set({ passwordHash, name: existing.name ?? parsed.data.name ?? null })
        .where(eq(usersTable.id, existing.id))
        .returning();
    } else {
      [user] = await db
        .insert(usersTable)
        .values({ email, passwordHash, name: parsed.data.name ?? null })
        .returning();
    }

    await startSession(res, user.id);
    res.status(201).json(toAuthUser(user));
  } catch (err) {
    req.log.error({ err }, "Register route error");
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    const ok = await verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? null,
    );
    if (!user || !ok) {
      res.status(401).json({ error: "Incorrect email or password" });
      return;
    }
    await startSession(res, user.id);
    res.json(toAuthUser(user));
  } catch (err) {
    req.log.error({ err }, "Login route error");
    res.status(500).json({ error: "Failed to sign in" });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  try {
    await deleteSession(req.cookies?.[SESSION_COOKIE]);
  } catch (err) {
    req.log.error({ err }, "Logout route error");
  }
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, (req, res): void => {
  res.json(toAuthUser(req.user!));
});

// ── Google OAuth ─────────────────────────────────────────────────────────────

router.get("/auth/google", (req, res): void => {
  if (!googleConfigured()) {
    res.redirect(`${appUrl()}/login?error=google_unconfigured`);
    return;
  }
  const state = randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 10,
    path: "/",
  });
  res.redirect(buildGoogleAuthUrl(state));
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code, state } = req.query as { code?: string; state?: string };
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || state !== expectedState) {
    res.redirect(`${appUrl()}/login?error=google_failed`);
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const email = profile.email.trim().toLowerCase();

    // Find by google id, then by email (link accounts), else create.
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, profile.googleId));

    if (!user) {
      const [byEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));
      if (byEmail) {
        [user] = await db
          .update(usersTable)
          .set({
            googleId: profile.googleId,
            name: byEmail.name ?? profile.name,
            avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl,
          })
          .where(eq(usersTable.id, byEmail.id))
          .returning();
      } else {
        [user] = await db
          .insert(usersTable)
          .values({
            email,
            googleId: profile.googleId,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
          })
          .returning();
      }
    }

    await startSession(res, user.id);
    res.redirect(appUrl());
  } catch (err) {
    req.log.error({ err }, "Google callback error");
    res.redirect(`${appUrl()}/login?error=google_failed`);
  }
});

export default router;
