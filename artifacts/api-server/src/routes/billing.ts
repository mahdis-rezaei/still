import { Router } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { sendEmail, membershipWelcomeEmail } from "../lib/email";

// Phase 2 — Stripe membership. The webhook is the SOURCE OF TRUTH for users.plan;
// checkout/portal just hand the user off to Stripe-hosted pages. Everything here
// no-ops gracefully (503 "billing not configured") until the four env vars are set
// — STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY,
// STRIPE_PRICE_ANNUAL — so the app runs unchanged before Stripe is wired.

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

// current_period_end lives on the subscription in older API versions and on the
// first subscription item in newer ones (Basil, 2025-03+). Read both so the
// renewal date survives an API-version change.
function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const ts =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

// Reconcile a user's plan from a Stripe subscription. Active/trialing → member;
// anything else (canceled, unpaid, past_due, incomplete_expired) → free. Looked up
// by stripe_customer_id, which checkout persisted before the first webhook. Never
// touches the user's pages — a lapsed member keeps everything, just loses the
// unlimited fresh-return allowance (the quota gate then applies).
async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const active = sub.status === "active" || sub.status === "trialing";
  await db
    .update(usersTable)
    .set({
      plan: active ? "member" : "free",
      planRenewsAt: active ? periodEnd(sub) : null,
      stripeSubscriptionId: sub.id,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.stripeCustomerId, customerId));
}

function billingEnabled(): boolean {
  return (
    stripe != null &&
    !!process.env.STRIPE_PRICE_MONTHLY &&
    !!process.env.STRIPE_PRICE_ANNUAL
  );
}

const router = Router();

// GET /billing/config — public, unauthenticated. Lets the client show the real
// purchase UI only once Stripe is actually wired (else a gentle "coming soon"),
// so the Phase 2 page can ship before the keys are set without a dead CTA.
router.get("/billing/config", (_req, res): void => {
  res.json({ enabled: billingEnabled() });
});

// POST /billing/checkout { interval: "monthly" | "annual" } → { url }
// Creates (or reuses) the user's Stripe customer and a subscription Checkout
// Session, returning the hosted URL for the client to redirect to.
router.post("/billing/checkout", requireAuth, async (req, res): Promise<void> => {
  if (!stripe) {
    res.status(503).json({ error: "Billing is not configured yet" });
    return;
  }
  const interval =
    (req.body as { interval?: string })?.interval === "annual"
      ? "annual"
      : "monthly";
  const price =
    interval === "annual"
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;
  if (!price) {
    res.status(503).json({ error: "Billing is not configured yet" });
    return;
  }

  try {
    const user = req.user!;
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db
        .update(usersTable)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl()}/settings/plan?status=success`,
      cancel_url: `${appUrl()}/settings/plan?status=cancelled`,
    });
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Checkout session failed");
    res.status(500).json({ error: "Could not start checkout" });
  }
});

// POST /billing/portal → { url } — the Stripe Billing Portal to update payment,
// switch monthly/annual, or cancel. Source of truth stays the webhook.
router.post("/billing/portal", requireAuth, async (req, res): Promise<void> => {
  if (!stripe) {
    res.status(503).json({ error: "Billing is not configured yet" });
    return;
  }
  const user = req.user!;
  if (!user.stripeCustomerId) {
    res.status(400).json({ error: "No membership to manage" });
    return;
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl()}/settings/plan`,
    });
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Billing portal session failed");
    res.status(500).json({ error: "Could not open the billing portal" });
  }
});

// POST /billing/webhook — Stripe → us. Mounted with a RAW body parser (see app.ts)
// so the signature verifies. This is the authority for plan changes; checkout's
// success redirect is only a UX hint. Always 2xx on a handled event so Stripe
// stops retrying; 400 only on a bad signature.
router.post("/billing/webhook", async (req, res): Promise<void> => {
  if (!stripe) {
    res.status(503).end();
    return;
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];
  if (!secret || typeof sig !== "string") {
    res.status(400).send("Missing signature");
    return;
  }

  let event: Stripe.Event;
  try {
    // req.body is a Buffer here (raw parser), exactly what constructEvent needs.
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    req.log.error({ err }, "Stripe webhook signature verification failed");
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        // Look up the user once — for the welcome email AND to know whether this
        // is a genuinely NEW membership (so a redelivered event can't re-send it).
        let recipient: { email: string; name: string | null } | null = null;
        let wasMember = false;
        if (userId) {
          const [u] = await db
            .select({
              email: usersTable.email,
              name: usersTable.name,
              plan: usersTable.plan,
            })
            .from(usersTable)
            .where(eq(usersTable.id, userId));
          if (u) {
            recipient = { email: u.email, name: u.name };
            wasMember = u.plan === "member";
          }
        }
        // Persist the customer id against the user (idempotent) so later
        // subscription events resolve by customer.
        if (userId && customerId) {
          await db
            .update(usersTable)
            .set({ stripeCustomerId: customerId, updatedAt: new Date() })
            .where(eq(usersTable.id, userId));
        }
        if (typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(sub);
        }
        // Warm welcome — best-effort, and only on the transition into membership
        // (not on a renewal or a redelivered event).
        if (!wasMember && recipient?.email) {
          sendEmail({
            to: recipient.email,
            ...membershipWelcomeEmail({ name: recipient.name }),
          }).catch((err) =>
            req.log.error({ err }, "Membership welcome email failed"),
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(event.data.object);
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    req.log.error({ err, type: event.type }, "Stripe webhook handler error");
    // 500 so Stripe retries — the event was authentic, our handling failed.
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

export default router;
