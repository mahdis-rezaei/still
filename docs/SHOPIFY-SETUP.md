# Shopify setup — Yadegar shop (headless)

How to wire the headless storefront. The code is in the repo and **dormant by
default**: with no Shopify env vars, `/shop` shows a gentle "coming soon" and the
`/api/shop/*` routes answer 503 — nothing breaks. This takes you to a working store.

> Architecture: we proxy Shopify's **Storefront API (GraphQL)** through our Node
> layer (`routes/shop.ts`), build the cart with the **Cart API**, and hand off to
> Shopify's **hosted checkout** (payments, tax, shipping). The token stays
> server-side; the client only calls `/api/shop/*`.

## What the code expects (2 env vars)

| Env var | What it is | Example |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | Your store's myshopify domain | `yadegar.myshopify.com` |
| `SHOPIFY_STOREFRONT_TOKEN` | Storefront API access token (public-scoped) | `xxxxxxxx…` |
| `SHOPIFY_API_VERSION` | optional; defaults to `2024-10` | `2024-10` |

`GET /api/shop/config` returns `{ enabled: true }` only when domain + token are set
— that's what flips `/shop` from "coming soon" to the real store.

## Steps

1. **Create a store (free).** Go to https://partners.shopify.com → create a Partner
   account → **Stores → Add store → Development store**. Dev stores are full-featured
   and free, ideal for a demo. (Checkout works in test mode via Bogus Gateway.)

2. **Add the hero product.** Products → **Add product**:
   - Title: **Yadegar Journal**, a description, an image, a price.
   - Add a variant or two if you like (e.g., cover color) under Variants.
   - Set inventory (or mark "continue selling when out of stock" for the demo).
   - Add a couple of accessories the same way (a pen, a bookmark) for cross-sell.

3. **Make a collection.** Products → Collections → **Create collection** named
   **"The Desk"** and add your products. (The site features this collection; the
   handle defaults to `the-desk`.)

4. **Enable the Storefront API.** Settings → **Apps and sales channels** → **Develop
   apps** → **Allow custom app development** → **Create an app** (name it "Yadegar
   headless") → **Configure Storefront API scopes**, check:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
   Then **Install app** → API credentials → copy the **Storefront API access token**.

5. **Set the env vars** (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`) in
   Replit secrets, restart, and `/shop` lights up.

## Verify
- `GET /api/shop/config` → `{ "enabled": true }`.
- `/shop` lists your products; a product page shows variants + "Add to cart."
- Add to cart → the cart shows the line + subtotal → **Checkout** redirects to your
  Shopify hosted checkout. Pay with the test gateway to confirm the full flow.

## Going live (later)
A dev store can't take real payments. To actually sell: upgrade the store to a paid
plan (or move products to a live store), connect a real payment provider, and swap
in that store's domain + Storefront token. The code doesn't change.

## How it works (for maintainers)
- **`artifacts/api-server/src/routes/shop.ts`** — Storefront API proxy:
  `GET /shop/config`, `GET /shop/products` (`?collection=`), `GET /shop/products/:handle`,
  `GET /shop/cart/:id`, `POST /shop/cart` (create/add), `POST /shop/cart/:id/lines`
  (update/remove). Raw GraphQL over fetch — no SDK.
- **Frontend** — the `/shop` (PLP), `/shop/:handle` (PDP), and cart UI call only
  `/api/shop/*`; cart id is persisted in localStorage; checkout is `cart.checkoutUrl`.
