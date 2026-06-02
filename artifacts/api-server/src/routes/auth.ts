import { Router } from "express";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, type User } from "@workspace/db";
import {
  RegisterBody,
  LoginBody,
  VerifyEmailBody,
  RequestPasswordResetBody,
  ResetPasswordBody,
} from "@workspace/api-zod";
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
  createAuthToken,
  consumeAuthToken,
} from "../lib/auth";
import {
  sendEmail,
  verificationEmail,
  passwordResetEmail,
} from "../lib/email";
import { rateLimit, ipKey } from "../lib/rate-limit";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

// Create + email a verification link. Best-effort: never throws into the caller.
async function sendVerification(
  user: User,
  log: { error: (o: unknown, m: string) => void },
): Promise<void> {
  try {
    const token = await createAuthToken(user.id, "email_verify", VERIFY_TTL_MS);
    const link = `${appUrl()}/verify-email?token=${token}`;
    const mail = verificationEmail(link);
    await sendEmail({ to: user.email, ...mail });
  } catch (err) {
    log.error({ err }, "Failed to send verification email");
  }
}

const router = Router();

// Per-IP throttle on credential endpoints to blunt brute-force / signup abuse.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyOf: ipKey,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

const OAUTH_STATE_COOKIE = "still_oauth_state";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

// The public shape of a user — never leak passwordHash or googleId.
function toAuthUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    onboardingCompleted: u.onboardingCompleted,
    emailVerified: u.emailVerified,
  };
}

async function startSession(res: import("express").Response, userId: string) {
  const { token, expiresAt } = await createSession(userId);
  setSessionCookie(res, token, expiresAt);
}

// ── Email + password ─────────────────────────────────────────────────────────

router.post("/auth/register", credentialLimiter, async (req, res): Promise<void> => {
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
    // SECURITY: never attach a password (and a session) to an existing account
    // via an unauthenticated register call — including a Google-only account.
    // Doing so would let anyone who knows the email take it over. Linking a
    // password to a Google account must happen from an authenticated session
    // (a future "set a password" flow), not here.
    if (existing) {
      res.status(409).json({ error: "That email is already registered" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, name: parsed.data.name ?? null })
      .returning();

    await startSession(res, user.id);
    await sendVerification(user, req.log); // best-effort; soft verification
    res.status(201).json(toAuthUser(user));
  } catch (err) {
    req.log.error({ err }, "Register route error");
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/auth/login", credentialLimiter, async (req, res): Promise<void> => {
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

router.post(
  "/auth/complete-onboarding",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const [user] = await db
        .update(usersTable)
        .set({ onboardingCompleted: true, updatedAt: new Date() })
        .where(eq(usersTable.id, req.userId!))
        .returning();
      res.json(toAuthUser(user));
    } catch (err) {
      req.log.error({ err }, "Complete onboarding error");
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  },
);

// ── Email verification & password reset ──────────────────────────────────────

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A token is required" });
    return;
  }
  try {
    const userId = await consumeAuthToken(parsed.data.token, "email_verify");
    if (!userId) {
      res.status(400).json({ error: "That link is invalid or has expired." });
      return;
    }
    await db
      .update(usersTable)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Verify email error");
    res.status(500).json({ error: "Failed to verify email" });
  }
});

router.post(
  "/auth/resend-verification",
  requireAuth,
  async (req, res): Promise<void> => {
    if (req.user!.emailVerified) {
      res.status(204).end();
      return;
    }
    await sendVerification(req.user!, req.log);
    res.status(204).end();
  },
);

router.post(
  "/auth/request-password-reset",
  credentialLimiter,
  async (req, res): Promise<void> => {
    const parsed = RequestPasswordResetBody.safeParse(req.body);
    // Always respond 204 — never reveal whether an email exists.
    if (!parsed.success) {
      res.status(204).end();
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));
      if (user && user.passwordHash) {
        const token = await createAuthToken(
          user.id,
          "password_reset",
          RESET_TTL_MS,
        );
        const link = `${appUrl()}/reset-password?token=${token}`;
        const mail = passwordResetEmail(link);
        await sendEmail({ to: user.email, ...mail });
      }
    } catch (err) {
      req.log.error({ err }, "Request password reset error");
    }
    res.status(204).end();
  },
);

router.post(
  "/auth/reset-password",
  credentialLimiter,
  async (req, res): Promise<void> => {
    const parsed = ResetPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A token and an 8+ character password are required" });
      return;
    }
    try {
      const userId = await consumeAuthToken(
        parsed.data.token,
        "password_reset",
      );
      if (!userId) {
        res.status(400).json({ error: "That link is invalid or has expired." });
        return;
      }
      const passwordHash = await hashPassword(parsed.data.password);
      await db
        .update(usersTable)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
      // Invalidate all existing sessions for safety.
      await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
      res.status(204).end();
    } catch (err) {
      req.log.error({ err }, "Reset password error");
      res.status(500).json({ error: "Failed to reset password" });
    }
  },
);

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
