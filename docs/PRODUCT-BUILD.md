# PRODUCT BUILD — turning the engine into the app

Tracks the build of the user-facing product (PRD steps 3–6 + §8) on top of the
verified engine. Phased, foundation-first. The app + Postgres + OAuth run in
**Replit**; code is authored here and synced there to run.

## Phase status

| Phase | Scope | State |
|---|---|---|
| 1 | Auth (Google + email/password) + user-scoped storage | **code complete, needs Replit setup + verify** |
| 2 | Write / store / list / read full entry (DB-backed) | not started |
| 3 | Filter year/month → run engine | not started |
| 4 | Cadence + "on this day" + favorites + email + Google Doc import | not started |

---

## Phase 1 — what was built

**DB (`lib/db/src/schema/`)**
- `users` — email (unique), name, `passwordHash` (null for Google-only),
  `googleId` (unique, null for password-only), avatarUrl.
- `sessions` — `id` = SHA-256 of the cookie token (no usable credential at
  rest), userId, expiresAt.
- `entries` — added nullable `userId` FK. All routes scope by it; pre-auth rows
  (userId null) are never surfaced.

**Server (`artifacts/api-server/`)**
- `src/lib/auth.ts` — password hashing (node `crypto.scrypt`, constant-time
  compare), opaque session tokens (cookie holds token, DB stores its hash),
  `requireAuth` middleware (sets `req.user`/`req.userId`), Google OAuth
  authorization-code flow via `fetch` (no SDK). **Zero new dependencies.**
- `src/routes/auth.ts` — `POST /auth/register`, `POST /auth/login`,
  `POST /auth/logout`, `GET /auth/me`, `GET /auth/google`,
  `GET /auth/google/callback`.
- `app.ts` — added `cookie-parser` + `cors({ origin:true, credentials:true })`.
- `still.ts` — entry routes now behind `requireAuth` and scoped to `req.userId`.

**Contract (`lib/api-spec/openapi.yaml`)** — added the auth tag, `/auth/*`
JSON endpoints, and `AuthUser`/`RegisterInput`/`LoginInput` schemas. Regenerated
`lib/api-zod` + `lib/api-client-react` via `pnpm --filter @workspace/api-spec run codegen`.

**Frontend (`artifacts/still/`)**
- `src/lib/auth.tsx` — `AuthProvider` + `useAuth` (login / register / logout /
  loginWithGoogle, current user via `GET /auth/me`).
- `src/pages/login.tsx` — email/password + "Continue with Google", sign-in /
  register toggle, error handling.
- `App.tsx` — `/login` route + auth guard: everything else requires a session.
- `home.tsx` — discreet "Signed in as … · Sign out" footer.
- `custom-fetch.ts` — sends `credentials: "include"` so the session cookie flows.

---

## Replit setup to make Phase 1 live (do this after syncing)

1. **Migrate the schema** (adds users/sessions tables + entries.userId):
   ```
   pnpm --filter @workspace/db exec drizzle-kit push
   ```
   (Existing `entries` rows get `userId = null` and simply won't show — fine for
   a prototype. Wipe the table first if you want a clean slate.)

2. **Environment variables** on the api-server:
   - `APP_URL` — the app's public origin, e.g. `https://<slug>.replit.app`
     (no trailing slash). Used for cookies + OAuth redirects.
   - `NODE_ENV=production` — so the session cookie is marked `secure`.
   - For Google sign-in (optional — email/password works without it):
     - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
     - In Google Cloud Console → OAuth 2.0 Client (Web): add the redirect URI
       `${APP_URL}/api/auth/google/callback`. Override with `GOOGLE_REDIRECT_URI`
       if your proxy path differs.
   - (Already needed) `DATABASE_URL`, `ANTHROPIC_API_KEY`, `PORT`.

3. **Verify the loop:** register with email/password → land on Home → "Sign out"
   → sign back in. Then (if configured) "Continue with Google". Confirm entries
   are now per-account.

### Security notes (prototype-honest)
- Passwords: scrypt + per-user salt, constant-time compare. Fine for a
  prototype; revisit work-factor/argon2 before real users.
- Sessions: httpOnly, sameSite=lax, secure in prod; DB stores only the token
  hash. 30-day TTL.
- §8 (encryption at rest for the journal text) is still **not** built — keep the
  "prototype, use sample entries" framing until it is.
