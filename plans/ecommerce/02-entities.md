# Ecommerce — Phase 2: New Compose Entities

## Goal

Define all new DB tables required by the ecommerce compose that do not yet exist.
These are the P0/P1 entities identified in the gap analysis.
Existing tables (eco_orders, eco_carts, eco_order_items, eco_cart_items, eco_coupons, eco_reviews)
are already spec'd in `docs/composes/ecommerce.md` and are not re-defined here.

All tables use prefix `eco_`. All extend `baseColumns`.

---

## 2.1 Region (`eco_regions`)

Geographic region tying together currency, tax profile, and payment/fulfillment providers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | e.g. "United States", "European Union" |
| `currency` | text | notNull | ISO 4217 e.g. "USD" |
| `countries` | text[] | notNull | ISO 3166-1 alpha-2 e.g. ["US"] |
| `taxProfileId` | text | FK → eco_tax_profiles | |
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
| `taxProfileId` | text | FK → eco_tax_profiles, notNull | |
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
| `regionId` | text | FK → eco_regions | |
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
| `groupId` | text | FK → eco_customer_groups |
| `actorId` | text | FK → identity.actors (customer) |

Primary key: `(groupId, actorId)`.

---

## 2.5 Return (`eco_returns`)

Tracks a return request for one or more items from a completed order.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `orderId` | text | FK → eco_orders, notNull | |
| `status` | text | FSM-controlled | `requested \| approved \| rejected \| received \| processed \| refunded` |
| `reason` | text | notNull | `defective \| wrong_item \| changed_mind \| damaged \| other` |
| `reasonNote` | text | | Customer free-text |
| `shippingOptionId` | text | FK → eco_shipping_options | Return shipping method |
| `trackingNumber` | text | | |
| `refundAmount` | jsonb | `Money` | Calculated on approval |
| `requestedAt` | timestamp | | |
| `approvedAt` | timestamp | | |
| `receivedAt` | timestamp | | |
| `refundedAt` | timestamp | | |

FSM: `requested → approved → received → processed → refunded`
     `requested → rejected` (terminal)

### `eco_return_items` (join)

| Column | Type | Notes |
|--------|------|-------|
| `returnId` | text | FK → eco_returns |
| `orderItemId` | text | FK → eco_order_items |
| `quantity` | integer | |
| `condition` | text | `new \| damaged \| used` |

---

## 2.6 Claim (`eco_claims`)

A customer complaint about damaged/missing items.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `orderId` | text | FK → eco_orders, notNull | |
| `type` | text | notNull | `missing \| damaged \| incorrect \| other` |
| `resolution` | text | | `refund \| replacement \| store_credit \| rejected` |
| `status` | text | notNull, default "open" | `open \| investigating \| resolved \| rejected` |
| `description` | text | | |
| `refundAmount` | jsonb | `Money` | If resolution = refund |
| `replacementOrderId` | text | FK → eco_orders | If resolution = replacement |

---

## 2.7 Swap (`eco_swaps`)

Exchange: customer returns items and receives different items (size/color/product).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `orderId` | text | FK → eco_orders, notNull | |
| `status` | text | FSM-controlled | `pending \| confirmed \| return_received \| fulfilled \| cancelled` |
| `difference` | jsonb | `Money` | Positive = customer owes; negative = refund |
| `paymentSessionId` | text | | If difference > 0 |
| `returnId` | text | FK → eco_returns | Return leg of swap |

### `eco_swap_items` (items being returned in swap)

| Column | Type | Notes |
|--------|------|-------|
| `swapId` | text | FK → eco_swaps |
| `orderItemId` | text | FK → eco_order_items |
| `quantity` | integer | |

### `eco_swap_new_items` (items being received in swap)

| Column | Type | Notes |
|--------|------|-------|
| `swapId` | text | FK → eco_swaps |
| `variantId` | text | FK → cat_variants |
| `quantity` | integer | |
| `unitPrice` | jsonb | `Money` | At time of swap |

---

## 2.8 DraftOrder (`eco_draft_orders`)

An order created by admin on behalf of customer (e.g. phone orders, offline payments).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `customerId` | text | FK → identity.actors | |
| `status` | text | notNull, default "draft" | `draft \| placed \| cancelled` |
| `billingAddress` | jsonb | `Address` | |
| `shippingAddress` | jsonb | `Address` | |
| `shippingOptionId` | text | FK → eco_shipping_options | |
| `regionId` | text | FK → eco_regions | |
| `paymentMethod` | text | | `cod \| bank_transfer \| manual` |
| `discount` | jsonb | `Money` | Admin-applied discount |
| `note` | text | | Admin note |
| `placedOrderId` | text | FK → eco_orders | Set when converted |

### `eco_draft_order_items`

| Column | Type | Notes |
|--------|------|-------|
| `draftOrderId` | text | FK → eco_draft_orders |
| `variantId` | text | FK → cat_variants |
| `quantity` | integer | |
| `unitPrice` | jsonb | `Money` | Admin override price |

---

## 2.9 OrderEdit (`eco_order_edits`)

A proposed edit to a placed order (add/remove items). Requires approval.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `orderId` | text | FK → eco_orders, notNull | |
| `status` | text | notNull, default "requested" | `requested \| confirmed \| declined \| cancelled` |
| `requestedById` | text | FK → identity.actors | Admin who proposed |
| `confirmedById` | text | FK → identity.actors | |
| `note` | text | | |
| `totalDifference` | jsonb | `Money` | Net change in order total |
| `paymentSessionId` | text | | If totalDifference > 0 |
| `refundAmount` | jsonb | `Money` | If totalDifference < 0 |
| `confirmedAt` | timestamp | | |

### `eco_order_edit_items`

| Column | Type | Notes |
|--------|------|-------|
| `editId` | text | FK → eco_order_edits |
| `type` | text | `add \| remove \| update_qty` |
| `variantId` | text | FK → cat_variants |
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
| `purchasedById` | text | FK → identity.actors | |
| `orderId` | text | FK → eco_orders | Order where gift card was purchased |
| `issuedToEmail` | text | | If bought as gift |

---

## 2.11 Fulfillment (`eco_fulfillments`)

A physical shipment fulfilling part or all of an order.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `orderId` | text | FK → eco_orders, notNull | |
| `locationId` | text | FK → inv_locations | Source warehouse |
| `status` | text | notNull, default "pending" | `pending \| shipped \| in_transit \| delivered \| cancelled` |
| `providerId` | text | | Carrier slug: `fedex \| dhl \| shiprocket` |
| `trackingNumber` | text | | |
| `trackingUrl` | text | | |
| `shippedAt` | timestamp | | |
| `deliveredAt` | timestamp | | |
| `estimatedDelivery` | timestamp | | |

### `eco_fulfillment_items`

| Column | Type | Notes |
|--------|------|-------|
| `fulfillmentId` | text | FK → eco_fulfillments |
| `orderItemId` | text | FK → eco_order_items |
| `quantity` | integer | |

---

## File Map

| Entity | File |
|--------|------|
| Region | `db/schema/regions.ts` |
| TaxProfile | `db/schema/tax-profiles.ts` |
| TaxRate | `db/schema/tax-rates.ts` |
| ShippingOption | `db/schema/shipping-options.ts` |
| CustomerGroup | `db/schema/customer-groups.ts` |
| Return + ReturnItems | `db/schema/returns.ts` |
| Claim | `db/schema/claims.ts` |
| Swap + SwapItems | `db/schema/swaps.ts` |
| DraftOrder + Items | `db/schema/draft-orders.ts` |
| OrderEdit + Items | `db/schema/order-edits.ts` |
| GiftCard | `db/schema/gift-cards.ts` |
| Fulfillment + Items | `db/schema/fulfillments.ts` |
