# Ecommerce — Phase 2: New Compose Entities

## Goal

Define the DB tables the ecommerce compose owns that do not yet exist.
These are the P0/P1 entities identified in the gap analysis.

Under the **Master Table Architecture**, the compose does **not** define its own
customers, orders, products, or warehouses. Those are master rows discriminated by
`type`. The compose defines only the **detail tables** that carry columns it genuinely
owns, linking masters via plain `text` id columns (no `references()`).

All detail tables use prefix `eco_`. All extend `baseColumns`.

---

## Master Table Alignment

See **[../../docs/master-tables.md](../../docs/master-tables.md)** for the full pattern.

| Concept | Master table | Discriminator | Notes |
|---------|-------------|---------------|-------|
| Product / variant | `cat_items` (catalog) | `type = "product"` | variants are `cat_items` children / `cat_variants`; storefront reads via catalog |
| Customer | `persons` (party) | `type = "customer"` | guest carts carry `person_id = null`; `actor_id` links a logged-in login |
| Warehouse | `locations` (location) | `type = "warehouse"` | fulfillment source; `address_id` → `geo_addresses` |
| Order + line items | `transactions` / `transaction_lines` (commerce) | `type = "order"` | lines carry `item_id` → `cat_items`; money in `total_*` / `line_total_*` |
| Cart | `transactions` / `transaction_lines` | `type = "order"`, draft stage | a cart is an order parked in an early pipeline stage (+ `eco_cart` detail if needed) |
| Order / fulfillment status | `pipelines` / `pipeline_stages` (pipeline) | `entity_type` | entities carry `stage_id`; FSM enforces movement |
| Address | `geo_addresses` (geo) | polymorphic `entity_id` + `entity_type` | billing/shipping addresses |

**Rule:** never define `eco_orders`, `eco_carts`, `eco_order_items`, `eco_cart_items`,
`eco_customers`, `eco_products`, or `eco_variants`. Read masters filtered by
`organizationId` + `type`. Put sparse domain fields in `meta`.

---

## Detail tables (compose-owned)

Each row links masters through plain `text("..._id")` columns. No FK constraints.

### Reused masters (do not re-define)

| Need | Use instead |
|------|-------------|
| Product, variant, category | `cat_items` (`type = "product"`), `cat_variants`, `cat_categories` |
| Customer | `persons` (`type = "customer"`) |
| Order, order line | `transactions` (`type = "order"`), `transaction_lines` |
| Cart, cart line | `transactions` (`type = "order"`, draft stage), `transaction_lines` |
| Warehouse | `locations` (`type = "warehouse"`) |
| Order / fulfillment / return status | `pipelines` + `pipeline_stages` (carry `stage_id`) |
| Billing / shipping address | `geo_addresses` |

---

## 2.1 Region (`eco_regions`)

Geographic region tying together currency, tax profile, and payment/fulfillment providers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | e.g. "United States", "European Union" |
| `currency` | text | notNull | ISO 4217 e.g. "USD" |
| `countries` | text[] | notNull | ISO 3166-1 alpha-2 e.g. ["US"] |
| `taxProfileId` | text | → eco_tax_profiles | |
| `paymentProviders` | text[] | | e.g. ["stripe", "paypal"] |
| `fulfillmentProviders` | text[] | | e.g. ["fedex", "dhl"] |
| `isDefault` | boolean | notNull, default false | |
| `taxIncluded` | boolean | notNull, default false | If prices include tax |

Indexes: `(organizationId, isDefault)`, GIN on `countries`.

---

## 2.2 TaxProfile + TaxRate

### `eco_tax_profiles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | e.g. "US Default", "EU VAT", "IN GST" |
| `provider` | text | notNull, default "manual" | `manual \| taxjar \| avalara` |

### `eco_tax_rates`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `taxProfileId` | text | → eco_tax_profiles, notNull | |
| `name` | text | notNull | e.g. "Standard VAT", "Reduced VAT" |
| `rate` | numeric | notNull | 0–100, e.g. 20.00 for 20% |
| `jurisdiction` | text | | Country/state code |
| `productType` | text | | Applies to: `physical \| digital \| service \| all` |
| `isDefault` | boolean | notNull, default false | |

---

## 2.3 ShippingOption (`eco_shipping_options`)

A configurable shipping method within a delivery zone.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | e.g. "Standard Shipping", "Express" |
| `providerId` | text | | External carrier ID |
| `regionId` | text | → eco_regions | |
| `type` | text | notNull | `flat_rate \| calculated \| free` |
| `rate` | jsonb | `Money` | Used when type = flat_rate |
| `conditions` | jsonb | `RuleExpr` | e.g. free shipping if cart total > 50 |
| `estimatedDays` | integer | | Estimated delivery days |
| `requiresShipping` | boolean | notNull, default true | |
| `isActive` | boolean | notNull, default true | |

Indexes: `(organizationId, regionId, isActive)`.

---

## 2.4 CustomerGroup (`eco_customer_groups`)

Groups for B2B pricing, tiered discounts, and promotions targeting.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | e.g. "Wholesale", "VIP", "B2B" |
| `description` | text | | |
| `conditions` | jsonb | `RuleExpr` | Auto-assignment rules (optional) |
| `pricingMultiplier` | numeric | | e.g. 0.85 = 15% off list price |

### `eco_customer_group_members` (join table)

| Column | Type | Notes |
|--------|------|-------|
| `groupId` | text | → eco_customer_groups |
| `personId` | text | → persons (type = customer) |

Primary key: `(groupId, personId)`.

---

## 2.5 Return (`eco_returns`)

Tracks a return request for one or more line items from a completed order.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `transactionId` | text | → transactions (type = order), notNull | The original order |
| `stageId` | text | → pipeline_stages | FSM-controlled return status |
| `reason` | text | notNull | `defective \| wrong_item \| changed_mind \| damaged \| other` |
| `reasonNote` | text | | Customer free-text |
| `shippingOptionId` | text | → eco_shipping_options | Return shipping method |
| `trackingNumber` | text | | |
| `refundAmount` | jsonb | `Money` | Calculated on approval |
| `requestedAt` | timestamp | | |
| `approvedAt` | timestamp | | |
| `receivedAt` | timestamp | | |
| `refundedAt` | timestamp | | |

Status pipeline (`entity_type = "eco_return"`): `requested → approved → received → processed → refunded`;
`requested → rejected` (terminal). FSM enforces movement; `stage_id` records the landing.

### `eco_return_items` (join)

| Column | Type | Notes |
|--------|------|-------|
| `returnId` | text | → eco_returns |
| `transactionLineId` | text | → transaction_lines |
| `quantity` | integer | |
| `condition` | text | `new \| damaged \| used` |

---

## 2.6 Claim (`eco_claims`)

A customer complaint about damaged/missing items.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `transactionId` | text | → transactions (type = order), notNull | |
| `type` | text | notNull | `missing \| damaged \| incorrect \| other` |
| `resolution` | text | | `refund \| replacement \| store_credit \| rejected` |
| `status` | text | notNull, default "open" | `open \| investigating \| resolved \| rejected` |
| `description` | text | | |
| `refundAmount` | jsonb | `Money` | If resolution = refund |
| `replacementTransactionId` | text | → transactions (type = order) | If resolution = replacement |

---

## 2.7 Swap (`eco_swaps`)

Exchange: customer returns items and receives different items (size/color/product).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `transactionId` | text | → transactions (type = order), notNull | Original order |
| `stageId` | text | → pipeline_stages | FSM-controlled swap status |
| `difference` | jsonb | `Money` | Positive = customer owes; negative = refund |
| `paymentSessionId` | text | | If difference > 0 |
| `returnId` | text | → eco_returns | Return leg of swap |

Status pipeline (`entity_type = "eco_swap"`): `pending → confirmed → return_received → fulfilled → cancelled`.

### `eco_swap_items` (items being returned in swap)

| Column | Type | Notes |
|--------|------|-------|
| `swapId` | text | → eco_swaps |
| `transactionLineId` | text | → transaction_lines |
| `quantity` | integer | |

### `eco_swap_new_items` (items being received in swap)

| Column | Type | Notes |
|--------|------|-------|
| `swapId` | text | → eco_swaps |
| `itemId` | text | → cat_items |
| `quantity` | integer | |
| `unitPrice` | jsonb | `Money` | At time of swap |

---

## 2.8 DraftOrder (`eco_draft_orders`)

An order created by admin on behalf of a customer (e.g. phone orders, offline payments).
When placed, it converts into a `transactions` row (`type = "order"`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `personId` | text | → persons (type = customer) | |
| `status` | text | notNull, default "draft" | `draft \| placed \| cancelled` |
| `billingAddressId` | text | → geo_addresses | |
| `shippingAddressId` | text | → geo_addresses | |
| `shippingOptionId` | text | → eco_shipping_options | |
| `regionId` | text | → eco_regions | |
| `paymentMethod` | text | | `cod \| bank_transfer \| manual` |
| `discount` | jsonb | `Money` | Admin-applied discount |
| `note` | text | | Admin note |
| `placedTransactionId` | text | → transactions (type = order) | Set when converted |

### `eco_draft_order_items`

| Column | Type | Notes |
|--------|------|-------|
| `draftOrderId` | text | → eco_draft_orders |
| `itemId` | text | → cat_items |
| `quantity` | integer | |
| `unitPrice` | jsonb | `Money` | Admin override price |

---

## 2.9 OrderEdit (`eco_order_edits`)

A proposed edit to a placed order (add/remove items). Requires approval.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `transactionId` | text | → transactions (type = order), notNull | |
| `status` | text | notNull, default "requested" | `requested \| confirmed \| declined \| cancelled` |
| `requestedById` | text | → identity.actors | Admin who proposed |
| `confirmedById` | text | → identity.actors | |
| `note` | text | | |
| `totalDifference` | jsonb | `Money` | Net change in order total |
| `paymentSessionId` | text | | If totalDifference > 0 |
| `refundAmount` | jsonb | `Money` | If totalDifference < 0 |
| `confirmedAt` | timestamp | | |

### `eco_order_edit_items`

| Column | Type | Notes |
|--------|------|-------|
| `orderEditId` | text | → eco_order_edits |
| `type` | text | `add \| remove \| update_qty` |
| `itemId` | text | → cat_items |
| `quantity` | integer | |
| `unitPrice` | jsonb | `Money` |

---

## 2.10 GiftCard (`eco_gift_cards`)

A gift card with a redeemable balance.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `code` | text | notNull, unique per org | Case-insensitive |
| `balance` | jsonb | `Money`, notNull | Remaining balance |
| `originalAmount` | jsonb | `Money`, notNull | Initial amount |
| `currency` | text | notNull | |
| `status` | text | notNull, default "active" | `active \| disabled \| expired` |
| `expiresAt` | timestamp | | |
| `personId` | text | → persons (type = customer) | Purchaser |
| `transactionId` | text | → transactions (type = order) | Order where gift card was purchased |
| `issuedToEmail` | text | | If bought as gift |

---

## 2.11 Fulfillment (`eco_fulfillments`)

A physical shipment fulfilling part or all of an order.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `transactionId` | text | → transactions (type = order), notNull | |
| `locationId` | text | → locations (type = warehouse) | Source warehouse |
| `stageId` | text | → pipeline_stages | FSM-controlled fulfillment status |
| `providerId` | text | | Carrier slug: `fedex \| dhl \| shiprocket` |
| `trackingNumber` | text | | |
| `trackingUrl` | text | | |
| `shippedAt` | timestamp | | |
| `deliveredAt` | timestamp | | |
| `estimatedDelivery` | timestamp | | |

Status pipeline (`entity_type = "eco_fulfillment"`): `pending → shipped → in_transit → delivered`; `→ cancelled`.

### `eco_fulfillment_items`

| Column | Type | Notes |
|--------|------|-------|
| `fulfillmentId` | text | → eco_fulfillments |
| `transactionLineId` | text | → transaction_lines |
| `quantity` | integer | |

---

## 2.12 Cart detail (`eco_cart`, optional)

A cart is a `transactions` row (`type = "order"`) parked in an early pipeline stage,
with lines in `transaction_lines` (each line `item_id` → `cat_items`). Add this detail
table only if the cart needs columns the order master does not carry (e.g. abandonment).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `transactionId` | text | → transactions (type = order), notNull | The cart |
| `regionId` | text | → eco_regions | |
| `couponId` | text | → eco_coupons | |
| `abandonedAt` | timestamp | | Set when abandonment job fires |

---

## File Map

| Entity | File |
|--------|------|
| Region | `db/schema/regions.ts` |
| TaxProfile | `db/schema/tax-profiles.ts` |
| TaxRate | `db/schema/tax-rates.ts` |
| ShippingOption | `db/schema/shipping-options.ts` |
| CustomerGroup + Members | `db/schema/customer-groups.ts` |
| Return + ReturnItems | `db/schema/returns.ts` |
| Claim | `db/schema/claims.ts` |
| Swap + SwapItems + SwapNewItems | `db/schema/swaps.ts` |
| DraftOrder + Items | `db/schema/draft-orders.ts` |
| OrderEdit + Items | `db/schema/order-edits.ts` |
| GiftCard | `db/schema/gift-cards.ts` |
| Fulfillment + Items | `db/schema/fulfillments.ts` |
| Cart detail (optional) | `db/schema/cart.ts` |
