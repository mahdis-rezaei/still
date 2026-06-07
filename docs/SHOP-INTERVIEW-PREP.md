# Shopify PM interview — rehearsal & prep

Mock questions with model answers, grounded in the **Yadegar headless shop** you
actually shipped. Skim the cheat sheet last; practice saying the pitch out loud.

> Context you built: a **headless storefront** on Shopify's **Storefront + Cart
> APIs**, native inside a React app, proxied through a Node layer, handing off to
> **Shopify-hosted checkout**. Hero product: the **Yadegar Journal** (the physical
> companion to a journaling app). Live in production.

---

## 0. The 60-second pitch (memorize this)
> "Yadegar is a journaling app — the name is Persian for 'the thing that remains.'
> I added a **headless Shopify storefront** so the brand could sell the physical
> object at its heart: the journal you write in, then import into the app. I used
> Shopify's **Storefront and Cart APIs**, kept the storefront **native inside our
> React app** for brand consistency, and **handed checkout to Shopify** so I didn't
> rebuild payments, tax, or fraud. It's a third revenue line beside our
> subscription, launched on **print-on-demand** for zero inventory, and the growth
> levers are **AOV** (bundles, cross-sell) and **journal→app activation** — the
> omnichannel loop."

---

## 1. Architecture (they'll go deep here)

**Q: Why headless instead of a Shopify Online Store / Liquid theme?**
> We already had a React app with its own design system and brand. A separate themed
> store would fracture the experience and the brand. Headless lets the shop live
> *inside* Yadegar — same nav, fonts, palette, account. The trade-off is we own more
> of the frontend (no themes/templates for free), which is fine because the catalog
> is small and brand consistency was the whole point.

**Q: Storefront API vs Admin API — when each?**
> Storefront API is the **customer-facing** read + cart surface, with a
> public-scoped token. Admin API is **back-office** (inventory, orders, fulfillment)
> with a secret key. The shop uses Storefront for browse + cart; Admin would only
> come in for back-office automation. (War story: our first 401 was an **Admin token
> in the Storefront slot** — `shpat_…` — which the Storefront API rejects. Right API,
> right token per job.)

**Q: You proxied the Storefront API through your own server — why not call it from
the browser? Hydrogen does client-side.**
> True — Storefront tokens are public-scoped, so browser-direct is legitimate. I
> proxied through our Node layer to (1) keep the token out of the client bundle,
> (2) centralize error handling and future caching, (3) reshape GraphQL into lean UI
> payloads, and (4) match our existing `/api` architecture. The cost is one extra
> hop. If we needed edge performance at scale, I'd revisit (Hydrogen/Oxygen on the
> edge), but for our catalog size the proxy's simplicity + control won.

**Q: Why Shopify-hosted checkout instead of building your own?**
> Checkout is where PCI compliance, fraud, tax calculation, shipping rates,
> discounts, and wallets (Shop Pay, Apple Pay) live. Rebuilding that is enormous risk
> for zero differentiation. The principle: **own browsing and merchandising; let
> Shopify own checkout.** I build the cart with the Cart API, then redirect to
> `cart.checkoutUrl`. (It's also how Shopify recommends headless should work.)

**Q: How does the cart work / persist?**
> Cart API: `cartCreate` on first add, `cartLinesAdd/Update/Remove` after; I store the
> cart id in the client (localStorage) and rehydrate on load, dropping it if Shopify
> says it's gone. The server stays stateless; the cart is durable across reloads;
> checkout is the cart's `checkoutUrl`.

**Q: How would you handle performance / scale?**
> Cache product/collection reads (they change rarely) at the proxy or a CDN; the
> cart and checkout are dynamic. At real scale, consider Hydrogen on Oxygen for edge
> rendering, and Storefront API query cost budgeting (it's a metered GraphQL API).

---

## 2. Product strategy

**Q: Why does a journaling app sell a physical journal? Isn't that off-strategy?**
> It's the *most* on-strategy thing we could sell. The brand is literally "the thing
> that remains" — a physical journal is the keepsake. It closes a loop: write by hand
> → import the pages into the app to find what keeps returning. Physical and digital
> reinforce each other (brand recall, a giftable object, higher LTV), and **import is
> the bridge** no pure-commerce or pure-SaaS competitor has.

**Q: Why one hero product instead of a big catalog?**
> A sharp thesis converts and demos better than breadth, and it keeps the brand
> legible. I led with the Journal and added a small "Desk" collection (pen, bundle)
> to show merchandising and cross-sell without diluting the story. Expand on signal,
> not on hope.

**Q: A product-brand-alignment call you made?**
> The mockup interior was a productivity template (Key Tasks, Action Steps,
> "discipline creates freedom"). That fights Yadegar's freeform, "in your own words"
> ethos. I kept the interior **mostly lined with a few gentle prompts in the app's
> voice**, and reserved a structured version as a *separate* SKU. Aligning the
> physical object to the digital brand mattered more than copying a template.

---

## 3. Commerce, merchandising & pricing

**Q: How do you grow revenue from the shop?**
> Two levers once traffic exists: **AOV** (a "Desk Set" bundle + cross-sell the pen
> on the journal PDP + a free-shipping threshold) and **conversion** (PDP trust copy,
> reviews). Plus a cross-line play unique to us: **bundle the journal with a year of
> membership** — neither a pure retailer nor a pure SaaS can match that.

**Q: Margins on physical goods?**
> Launch on **print-on-demand** (Gelato/Lulu) — zero inventory, ~30–40% margin, fast
> to market. Move to **private-label at volume** for ~50–60% and the premium finish
> (embossed hardcover, ribbon, the branded pen POD can't do well). The silent margin
> killers are **shipping and returns**, so I'd price with those in and use a
> free-shipping threshold to lift AOV.

**Q: How would you price?**
> Value- and margin-aware. Journal ~$28–34 (POD COGS + healthy margin), pen ~$12–16,
> the bundle ~10–15% below buying separately to drive AOV. Test, don't guess.

---

## 4. Metrics

**Q: What do you instrument? What's success?**
> Funnel: visit → PLP → PDP → add-to-cart → checkout → order, watching the **PDP→cart**
> and **cart→checkout** drop-offs. Then **conversion rate, AOV, attach/cross-sell
> rate, cart-abandonment, repeat-purchase**, and the omnichannel signal I care most
> about: **journal→app activation** (do buyers import pages?). Success = the shop is
> a healthy third revenue line *and* it lifts app activation/retention — not just SKU
> sales.

**Q: First metric you'd fix?**
> Whatever the funnel says — likely cart→checkout (trust/shipping clarity) or
> PDP→cart (imagery/social proof). Instrument first, then act.

---

## 5. Build vs buy / platform

**Q: Why Shopify at all?**
> Checkout, payments, tax, fraud, inventory, and fulfillment-app ecosystem (POD)
> out of the box — the undifferentiated heavy lifting. We add value in brand,
> merchandising, and the app integration, not in re-deriving commerce primitives.

**Q: What Shopify capabilities would you reach for next?**
> Shopify **Subscriptions** (a refill-journal subscription), **Markets** (intl
> pricing/currency), **Functions** (custom discounts/bundles in checkout),
> **metafields** (structured product data like the "why it's on the desk" note),
> and **Hydrogen/Oxygen** if we go edge-rendered. Shows I know the platform beyond
> the basics.

---

## 6. Risks & trade-offs

**Q: Biggest risks?**
> (1) **IP** — you can't relabel someone's retail product; mitigate by making our own
> via POD/private-label and only *recommending* others via affiliate. (2)
> **Fulfillment/quality** — POD cedes control; sample before launch, move to vetted
> private-label at volume. (3) **Platform dependency** — Shopify owns checkout; the
> trade is speed/reliability for some lock-in, acceptable here. (4) **Scope creep** —
> hosted checkout caps the build; resist rebuilding what's free.

---

## 7. PM-craft / behavioral

**Q: How did you scope v1?**
> One hero product + a small collection + the full browse→cart→checkout path, on POD
> so there's zero inventory risk. Deferred breadth (more SKUs, bundles, reviews) to
> post-signal. Ship the loop, learn, expand.

**Q: A trade-off you made under uncertainty?**
> Proxy vs browser-direct for the Storefront API — both valid. I chose the proxy for
> token hygiene + control, knowing it costs a hop and that I can move to edge later.
> I documented the decision so it's revisitable, not dogma.

**Q: How do you decide what to build next?**
> Tie to the funnel + the thesis. The omnichannel loop (journal→app) is the
> differentiator, so I'd prioritize anything that strengthens activation and AOV
> over catalog breadth.

---

## 8. Questions to ask THEM (have 3–4 ready)
- How does the team weigh **merchant outcomes vs. Shopify revenue** when they
  conflict?
- Where is **headless / Hydrogen** heading vs. the themed Online Store — how do you
  think about that tension for merchants?
- What does **checkout extensibility** unlock next for the kind of merchant I'd
  serve?
- How does the team decide what becomes a **platform primitive** vs. left to apps?

---

## Cheat sheet (glance before you walk in)
- **Stack:** Storefront API (GraphQL) + Cart API, proxied via Node, → Shopify hosted
  checkout. Native in a React app. POD fulfillment.
- **Hero thesis:** the journal *is* the brand; import bridges physical ↔ digital.
- **Decisions:** headless (brand) · proxy (token hygiene/control) · hosted checkout
  (don't rebuild payments) · Storefront≠Admin token (the 401).
- **Margins:** POD ~30–40% → private-label ~50–60%; shipping/returns are the killers;
  AOV (bundle/cross-sell) is the lever.
- **Metrics:** funnel drop-offs, conversion, AOV, attach, **journal→app activation**.
- **Next platform bets:** Subscriptions, Markets, Functions, metafields, Hydrogen.
- **One line:** "Own merchandising; let Shopify own checkout."
