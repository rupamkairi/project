# Ecommerce — Phase 20: Data Seeding

## Goal

Populate DB with ecommerce tables, default region/tax/shipping data, dev users, and sample products so the compose is testable locally.

---

## 20.1 DB Schema Push

Ecommerce tables are defined in `composes/ecommerce/server/src/db/schema/` and re-exported via `apps/server/src/infra/db/schema/index.ts`.

```bash
cd apps/server && bun run db:push
```

### Why `db:push` not `db:migrate`

Same reason as CRM: Neon serverless driver uses WebSocket. `db:migrate` requires TCP — fails on Neon URLs. `db:push` uses native WebSocket and works.

`drizzle.config.ts` must have `strict: false`:
```typescript
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema/index.ts",
  out: "./src/infra/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: false,
  strict: false,   // required — prevents TTY hang in non-interactive shells
});
```

### Verify tables after push

```
eco_products
eco_variants
eco_categories
eco_regions
eco_carts
eco_cart_items
eco_orders
eco_order_items
eco_fulfillments
eco_returns
eco_customers
eco_shipping_options
eco_tax_profiles
eco_tax_rates
eco_coupons
```

If any table missing: check `apps/server/src/infra/db/schema/index.ts` has `export * from "./ecommerce"`.

---

## 20.2 Ecommerce Dev Users Seed

File: `apps/server/src/infra/db/seed-eco-dev.ts`

Creates 5 roles + 3 admin actors + 2 test customers.

```bash
cd apps/server && bun run db:seed:eco
```

### Admin Users Created

| Email | Password | Role |
|-------|----------|------|
| `eco-admin@platform.local` | `eco123` | `eco:admin` |
| `eco-manager@platform.local` | `eco123` | `eco:manager` |
| `eco-fulfillment@platform.local` | `eco123` | `eco:fulfillment` |

### Test Customers Created (in `eco_customers` table, NOT `actors`)

| Email | Password | Notes |
|-------|----------|-------|
| `customer1@test.local` | `test123` | Has 2 completed orders (from seed) |
| `customer2@test.local` | `test123` | Empty account |

Customers are stored in `eco_customers` table with bcrypt `passwordHash`. They do NOT exist in `actors` or `actor_roles` — customer auth is separate.

### Roles Created

| Role ID | Name | Permissions |
|---------|------|-------------|
| `plt_role_eco-admin` | `eco:admin` | `eco:*` |
| `plt_role_eco-manager` | `eco:manager` | `eco:read, eco:create, eco:update, eco:analytics` |
| `plt_role_eco-fulfillment` | `eco:fulfillment` | `eco:orders:read, eco:fulfillment:*` |
| `plt_role_eco-support` | `eco:support` | `eco:orders:read, eco:returns:*` |
| `plt_role_eco-customer` | `eco:customer` | `eco:store:*` |

Seed is **idempotent** — uses `onConflictDoNothing` for roles, `onConflictDoUpdate` for actors/customers (refreshes password hash).

---

## 20.3 Default Region + Tax + Shipping Seed

File: `composes/ecommerce/server/src/db/seed/ecommerce.ts` — `seedEcommerce(db)` function.

Uses direct Drizzle inserts (NOT mediator — handlers may not be registered at seed time).

### What it creates

**Region:**
```typescript
db.insert(ecoRegion).values({
  id: generatePrefixedId("erg"),
  orgId: DEFAULT_ORG_ID,
  name: "United States",
  currency: "USD",
  countries: JSON.stringify(["US"]),
  taxIncluded: false,
  taxProfileId: taxProfileId,  // see below
}).onConflictDoNothing();
```

**Tax Profile:**
```typescript
db.insert(ecoTaxProfile).values({
  id: taxProfileId,
  orgId: DEFAULT_ORG_ID,
  name: "Standard US Tax",
  provider: "built-in",
}).onConflictDoNothing();

db.insert(ecoTaxRate).values({
  id: generatePrefixedId("etr"),
  profileId: taxProfileId,
  name: "No Tax (default)",
  rate: 0,
  jurisdiction: "US",
  isDefault: true,
}).onConflictDoNothing();
```

**Shipping Options:**
```typescript
// Standard
db.insert(ecoShippingOption).values({
  id: generatePrefixedId("eso"),
  regionId: usRegionId,
  name: "Standard Shipping",
  type: "flat",
  rate: 599,  // $5.99 in cents
  estimatedDays: 7,
}).onConflictDoNothing();

// Express
db.insert(ecoShippingOption).values({
  id: generatePrefixedId("eso"),
  regionId: usRegionId,
  name: "Express Shipping",
  type: "flat",
  rate: 1499,  // $14.99 in cents
  estimatedDays: 2,
}).onConflictDoNothing();

// Free (conditional — applied server-side when cart > $50)
db.insert(ecoShippingOption).values({
  id: generatePrefixedId("eso"),
  regionId: usRegionId,
  name: "Free Shipping",
  type: "free",
  rate: 0,
  estimatedDays: 10,
  conditions: JSON.stringify({ minOrderValue: 5000 }),  // $50.00 in cents
}).onConflictDoNothing();
```

---

## 20.4 Sample Products Seed

File: `composes/ecommerce/server/src/db/seed/products.seed.ts`

5 products with variants. Used for storefront testing.

```typescript
const SAMPLE_PRODUCTS = [
  {
    title: "Classic Tee",
    handle: "classic-tee",
    description: "Everyday essential cotton t-shirt.",
    status: "published",
    variants: [
      { sku: "TEE-BLK-S", options: { color: "Black", size: "S" }, price: 1999, stock: 20 },
      { sku: "TEE-BLK-M", options: { color: "Black", size: "M" }, price: 1999, stock: 15 },
      { sku: "TEE-BLK-L", options: { color: "Black", size: "L" }, price: 1999, stock: 8 },
      { sku: "TEE-WHT-M", options: { color: "White", size: "M" }, price: 1999, stock: 0 },  // OOS
    ],
  },
  {
    title: "Running Sneaker X",
    handle: "running-sneaker-x",
    description: "Lightweight performance running shoe.",
    status: "published",
    variants: [
      { sku: "SNK-BLU-42", options: { color: "Blue", size: "42" }, price: 7999, compareAtPrice: 9999, stock: 5 },
      { sku: "SNK-BLU-43", options: { color: "Blue", size: "43" }, price: 7999, compareAtPrice: 9999, stock: 3 },
      { sku: "SNK-RED-42", options: { color: "Red", size: "42" }, price: 7999, compareAtPrice: 9999, stock: 0 },
    ],
  },
  {
    title: "Canvas Backpack",
    handle: "canvas-backpack",
    description: "Durable 20L canvas backpack.",
    status: "published",
    variants: [
      { sku: "BAG-GRN-1", options: { color: "Olive" }, price: 4999, stock: 10 },
      { sku: "BAG-BRN-1", options: { color: "Brown" }, price: 4999, stock: 7 },
    ],
  },
  {
    title: "Wireless Earbuds",
    handle: "wireless-earbuds",
    description: "True wireless earbuds, 24h battery.",
    status: "published",
    variants: [
      { sku: "EAR-BLK-1", options: { color: "Black" }, price: 5999, stock: 25 },
      { sku: "EAR-WHT-1", options: { color: "White" }, price: 5999, stock: 18 },
    ],
  },
  {
    title: "Draft Hoodie",
    handle: "draft-hoodie",
    description: "Work in progress — not visible on storefront.",
    status: "draft",
    variants: [
      { sku: "HOD-BLK-M", options: { color: "Black", size: "M" }, price: 5999, stock: 100 },
    ],
  },
];
```

Run: `cd apps/server && bun run db:seed:eco:products`

---

## 20.5 Full Local Setup Order

```bash
# 1. Push ecommerce tables to DB
cd apps/server && bun run db:push

# 2. Seed platform base data (orgs, admin user) — if not done yet
bun run db:seed

# 3. Seed ecommerce dev users + roles
bun run db:seed:eco

# 4. Seed default region/tax/shipping + sample products
bun run db:seed:eco:products

# 5. Start server (registers handlers at boot)
bun run dev
```

---

## 20.6 Add Seeds to `package.json` Scripts

**File:** `apps/server/package.json`

Add:
```json
"db:seed:eco": "bun run src/infra/db/seed-eco-dev.ts",
"db:seed:eco:products": "bun run src/infra/db/seed-eco-products.ts"
```

---

## 20.7 Edge Cases

| Situation | Symptom | Fix |
|-----------|---------|-----|
| `db:push` hangs | Process doesn't exit | `strict: false` in drizzle.config.ts |
| `eco_customers` missing | Login returns 500 | Customers in separate table — verify `export * from "./ecommerce"` in schema barrel |
| Customer login returns 404 | Store auth routes not mounted | Verify `createEcommerceCompose` mounted in `apps/server/src/index.ts` |
| PaymentAdapter missing | Checkout step 3 → 500 | Register payment plugin before compose boots; see Phase 11 shell integration |
| `eco_shipping_options` empty | Step 2 shipping selector empty | Run `db:seed:eco:products` — creates default options |
| `cartId` stale after DB reset | 404 on cart operations | Clear browser localStorage (`eco-cart-storage`) |
| Sample products not visible | Storefront shows empty catalog | Run `db:seed:eco:products`; confirm `status = published` in `eco_products` |
