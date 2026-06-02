# Launch plan — prototype → real product

Goal: publish Still as a real, trustworthy product on a real domain.

## Decisions (locked with Mahdis)
- **Posture: harden first, then invite real journals.** Get the trust/safety
  layer done before opening to real (non-sample) journals.
- **Privacy: pragmatic at-rest + policy.** Encryption at rest with server-managed
  keys + access controls + a real privacy policy/ToS. (Not zero-knowledge — the
  engine must read text to work; that tension is documented below.)
- **Name: DECIDED → Yadegar.** Domain purchased: **yadegarjournal.com**.
  (Persian: a keepsake / what remains — ties to the founder's story.) "Still" was
  dropped due to category crowding in journaling apps. Tagline direction:
  *"yadegar — Persian: a keepsake, the thing that remains"* + *"letters between
  you and who you were" / "the pages that find you again."*
- **Brand vs. code:** user-facing copy now says **Yadegar**. Internal code
  identifiers are intentionally left as "still" (no user impact, avoids risky
  churn): the `@workspace/still` package + `artifacts/still` dir, the `useStill`
  store / `StillProvider`, the engine's `/still/extract` + `/still/score`
  routes, the `still_results` cache table, and the GitHub repo name. APP_URL at
  deploy = the yadegarjournal.com domain.

## The encryption tension (important)
Still's engine must read the user's words (it sends them to Anthropic to choose
what to surface). So true zero-knowledge isn't compatible with the engine in v1.
**v1 plan:** application-level encryption of journal text (entries, reflections,
import bodies, returned-memory text) with a server-held key, plus provider disk
encryption + HTTPS. A stolen DB dump is then useless without the app key. The
engine decrypts in memory to call the model. **Tradeoff:** server-side SQL search
can't run on encrypted columns → Library search stays client-side (already is).

## Sequence
**Phase A — finish the product** (me): onboarding ("What brings you to Still?");
notification settings + nudges (needs email provider).

**Phase B — get a real URL live** (me + Replit + you): deploy on Replit
(persistent Deployment, not the ephemeral dev URL); point the custom domain;
production Postgres with **automated backups**; production secrets (APP_URL = real
domain, ANTHROPIC_API_KEY, DATABASE_URL, NODE_ENV=production, Google keys on the
real domain).

**Phase C — trust & safety before real journals** (the gate):
- [x] Privacy Policy + Terms pages (`/privacy-policy`, `/terms`) — DRAFT, need
      human/legal review + real contact address before public launch.
- [x] **Encryption at rest** for journal text (app-level, AES-256-GCM). Done via
      a transparent Drizzle `encryptedText` custom column type (`lib/db/src/crypto.ts`
      + `schema/encrypted.ts`) on: entry body/title, reflection body, import
      raw_text, parsed-entry body/title, returned-memory label/observation/quote.
      Reads/writes are transparent; the engine still sees plaintext in memory.
      Legacy-plaintext tolerant (rows without the `enc:v1:` prefix pass through),
      so the rollout needs no data wipe. **Requires a new secret
      `ENCRYPTION_KEY`** (32 bytes / 64 hex) in every environment that reads or
      writes — generate with `openssl rand -hex 32`. Server-side text search was
      removed (can't ILIKE ciphertext); Library search is client-side.
      NOTE: `returned_memories.full_engine_response` (jsonb debug trace) is left
      unencrypted for now — a fast-follow.
- [ ] Auth completeness: password reset + email verification (needs email).
- [ ] Rate limiting / per-user quotas (Anthropic cost protection).
- [ ] Error monitoring + uptime.

**Phase D — launch**: soft launch to a few trusted people → fix → public.

## What only Mahdis can do
- Pick + register the domain (Cloudflare Registrar recommended).
- Create a **Resend** account (free) → API key for email (unlocks password reset,
  email verification, nudges).
- Create Google OAuth credentials against the real domain (Client ID + Secret).
- Own the Anthropic billing account.
- Have a human review the Privacy Policy + Terms before public launch.

## Costs (rough)
Domain ~$12/yr · Replit Deployment ~$a few–$20+/mo · Anthropic API per-run (cents)
· Resend free tier for early use.
