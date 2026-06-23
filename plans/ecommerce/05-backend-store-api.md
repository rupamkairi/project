# Ecommerce — Phase 5: Store REST API

## Goal

Define every customer-facing (storefront) REST endpoint. All routes under `/ecommerce/store/*`.
Public routes require no auth. Customer routes require `eco:customer` JWT.

---

## Route Files

```
routes/store/
  catalog.ts       — products, categories, collections (public)
  search.ts        — product search (public)
  cart.ts          — cart management (public session or customer)
  checkout.ts      — checkout steps (customer or guest)
  customer.ts      — account management (customer auth required)
  orders.ts        — order history and tracking (customer auth)
  returns.ts       — return requests (customer auth)
```

---

## 5.1 Catalog — `/store/products`

All public. No auth required. Server queries `cat_items` (`type = "product"`) via mediator — never a separate `eco_products` table.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/store/products` | List published products. Server filters `cat_items` by `type="product"` + `orgId` + `status="published"`. Filters: `categoryId`, `tags`, `minPrice`, `maxPrice`, `inStock`, `sort`. Pagination. |
| `GET` | `/store/products/:id` | Product detail with variants, images, stock availability |
| `GET` | `/store/products/:handle` | By URL handle (SEO-friendly slug) |
| `GET` | `/store/categories` | Category tree |
| `GET` | `/store/categories/:id/products` | Products in category |
| `GET` | `/store/collections` | Featured collections |
| `GET` | `/store/collections/:id/products` | Products in collection |

Response enrichment:
- Stock status per variant (`inStock: boolean`, `stockCount` if allowed)
- Active price list resolved by `regionId` header or query param
- Tax-inclusive price if region.taxIncluded = true

---

## 5.2 Search — `/store/search`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/store/search?q=...` | Full-text product search via PgSearchAdapter. Params: `q`, `categoryId`, `minPrice`, `maxPrice`, `inStock`. Returns ranked hits with variant data. |

Search is powered by `PgSearchAdapter`. Catalog items sync on `item.published` event.

---

## 5.3 Cart — `/store/carts`

Cart is a `transactions` row (`type = "order"`) in a draft pipeline stage. Cart lines are `transaction_lines` rows. Guest carts identified by `cartId` (UUID stored client-side — maps to `transactions.id`). Authenticated customers associate the cart transaction with their `persons` record on login.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/store/carts` | none | Create new cart. Inserts into `transactions` (type="order", draft stage) via mediator. Returns `{ cartId, items: [], total }`. |
| `GET` | `/store/carts/:id` | none | Get cart with items, totals, applied coupon |
| `POST` | `/store/carts/:id/items` | none | Add item. Body: `{ variantId, quantity }`. Inserts into `transaction_lines` via mediator. Validates stock. |
| `PATCH` | `/store/carts/:id/items/:itemId` | none | Update quantity |
| `DELETE` | `/store/carts/:id/items/:itemId` | none | Remove item |
| `POST` | `/store/carts/:id/coupon` | none | Apply coupon code |
| `DELETE` | `/store/carts/:id/coupon` | none | Remove coupon |
| `POST` | `/store/carts/:id/gift-card` | none | Apply gift card |
| `DELETE` | `/store/carts/:id/gift-card` | none | Remove gift card |
| `POST` | `/store/carts/:id/associate` | customer | Associate guest cart with customer account on login |

---

## 5.4 Checkout — `/store/cart/:id/...`

The multi-step checkout flow. See Phase 3 for orchestration detail.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/store/carts/:id/shipping-address` | none | Set shipping address. Body: `Address`. Resolves region from country. |
| `POST` | `/store/carts/:id/billing-address` | none | Set billing address |
| `GET` | `/store/carts/:id/shipping-options` | none | Get available shipping options for cart address |
| `POST` | `/store/carts/:id/shipping-option` | none | Select shipping option. Body: `{ shippingOptionId }`. |
| `GET` | `/store/carts/:id/tax` | none | Get calculated tax breakdown |
| `POST` | `/store/carts/:id/payment-session` | none | Create payment session. Returns `{ sessionId, url, expiresAt, orderId }`. |
| `POST` | `/store/carts/:id/complete` | none | Confirm order after payment. Validates webhook received. Returns order. |

---

## 5.5 Customer Account — `/store/customer`

All require `eco:customer` JWT.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/store/customer` | Get current customer profile |
| `PATCH` | `/store/customer` | Update profile (name, phone) |
| `POST` | `/store/customer/addresses` | Add shipping address |
| `PATCH` | `/store/customer/addresses/:id` | Update address |
| `DELETE` | `/store/customer/addresses/:id` | Delete address |
| `GET` | `/store/customer/addresses` | List saved addresses |
| `POST` | `/store/customer/change-password` | Body: `{ currentPassword, newPassword }` |

---

## 5.6 Orders — `/store/orders`

Customer views their own order history and tracking. Server queries `transactions` (`type = "order"`) filtered by `person_id = customerId` via mediator.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/store/orders` | customer | Order list (own only). Server filters `transactions` by `type="order"` + `personId`. Filters: `stageId` (maps to status). |
| `GET` | `/store/orders/:id` | customer | Order detail with items, fulfillments, timeline |
| `GET` | `/store/orders/:id/track` | customer | Fulfillment tracking info (carrier + events) |
| `POST` | `/store/orders/lookup` | none | Guest order lookup by `email + orderNumber`. Returns order summary. |

---

## 5.7 Returns — `/store/returns`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/store/orders/:id/returns` | customer | Submit return request. Body: `{ items: [{ orderItemId, quantity, reason }] }`. |
| `GET` | `/store/orders/:id/returns` | customer | Returns for this order |
| `GET` | `/store/returns/:id` | customer | Return status + tracking |

---

## 5.8 Reviews — `/store/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/store/products/:id/reviews` | customer | Submit review. Guards: order must be in `completed` state for this product + this customer. |
| `GET` | `/store/products/:id/reviews` | none | Published reviews for product |

---

## 5.9 Auth (Customer) — `/store/auth`

Customer auth is handled by the platform auth plugin, but these are
storefront-specific routes that wrap it.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/store/auth/register` | Register new customer account. Assigns `eco:customer` role. |
| `POST` | `/store/auth/login` | Login → returns `{ token, customer }`. Associates guest cart. |
| `POST` | `/store/auth/logout` | Invalidate session |
| `POST` | `/store/auth/forgot-password` | Send reset email |
| `POST` | `/store/auth/reset-password` | Body: `{ token, newPassword }` |

---

## 5.10 Response Shapes

### Product (list item)

```typescript
{
  id: string;
  title: string;
  handle: string;
  thumbnail: string;
  priceRange: { min: Money; max: Money };
  variants: Array<{ id: string; title: string; price: Money; inStock: boolean }>;
  category: { id: string; name: string };
}
```

### Order (customer view)

```typescript
{
  id: string;
  number: string;              // human-readable e.g. "#1042"
  status: string;
  placedAt: string;
  total: Money;
  items: OrderItemSummary[];
  fulfillments: FulfillmentSummary[];
  shippingAddress: Address;
}
```

### Cart

```typescript
{
  id: string;
  items: CartItemDetail[];    // includes variant title, image, current price
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  coupon?: { code: string; discount: Money };
  shippingOption?: ShippingOptionSummary;
  regionId?: string;
}
```
