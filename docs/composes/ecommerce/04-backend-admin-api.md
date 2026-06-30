# Ecommerce — Phase 4: Admin REST API

## Goal

Define every admin-facing REST endpoint. All routes under `/ecommerce/admin/*`.
Require `eco:admin`, `eco:manager`, `eco:fulfillment`, or `eco:support` role.

---

## Route Files

```
routes/admin/
  products.ts
  orders.ts
  customers.ts
  returns.ts
  claims.ts
  swaps.ts
  fulfillments.ts
  draft-orders.ts
  order-edits.ts
  regions.ts
  shipping.ts
  tax.ts
  promotions.ts
  gift-cards.ts
  analytics.ts
  import.ts
```

---

## 4.1 Products — `/admin/products`

Server implementation queries `cat_items` (`type = "product"`) via mediator. Never query `eco_products`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/products` | manager+ | List products. Server filters `cat_items` by `type="product"` + `orgId`. Filters: `status`, `categoryId`, `tags`, `search`. |
| `POST` | `/admin/products` | manager+ | Create product (status=draft by default) |
| `GET` | `/admin/products/:id` | manager+ | Product detail with variants, inventory levels |
| `PATCH` | `/admin/products/:id` | manager+ | Update product fields |
| `DELETE` | `/admin/products/:id` | admin | Soft delete (requires no active orders) |
| `POST` | `/admin/products/:id/publish` | manager+ | Transition to published |
| `POST` | `/admin/products/:id/unpublish` | manager+ | Transition back to draft |
| `GET` | `/admin/products/:id/variants` | manager+ | List variants with stock levels |
| `POST` | `/admin/products/:id/variants` | manager+ | Add variant |
| `PATCH` | `/admin/products/:id/variants/:variantId` | manager+ | Update variant |
| `DELETE` | `/admin/products/:id/variants/:variantId` | admin | Delete variant (no pending orders) |
| `GET` | `/admin/products/:id/inventory` | fulfillment+ | Variant stock levels per location |
| `POST` | `/admin/products/import` | admin | CSV/JSON product import. Returns `{ jobId }`. |
| `GET` | `/admin/products/import/:jobId` | admin | Import job status |

---

## 4.2 Orders — `/admin/orders`

Server implementation queries `transactions` (`type = "order"`) via mediator. Never query `eco_orders`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/orders` | manager+ | List. Server filters `transactions` by `type="order"` + `orgId`. Filters: `stageId` (maps to status), `personId` (customer), `dateFrom/To`, `minTotal`. |
| `GET` | `/admin/orders/:id` | manager+ | Order detail with items, fulfillments, returns, payments |
| `PATCH` | `/admin/orders/:id` | admin | Admin fields only (note, tags) |
| `POST` | `/admin/orders/:id/cancel` | admin | Cancel unfulfilled order. Releases inventory. Triggers refund if paid. |
| `POST` | `/admin/orders/:id/capture` | admin | Manually capture authorized payment |
| `GET` | `/admin/orders/:id/fulfillments` | fulfillment+ | Fulfillments for order |
| `POST` | `/admin/orders/:id/fulfillments` | fulfillment+ | Create fulfillment (ships partial items) |
| `PATCH` | `/admin/orders/:id/fulfillments/:fid` | fulfillment+ | Update fulfillment status / tracking number |
| `GET` | `/admin/orders/:id/returns` | support+ | Returns for this order |
| `GET` | `/admin/orders/:id/timeline` | support+ | Full event timeline (status changes, payments, notes) |

---

## 4.3 Customers — `/admin/customers`

Server implementation queries `persons` (`type = "customer"`) via mediator. Never query `eco_customers`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/customers` | manager+ | List customers. Server filters `persons` by `type="customer"` + `orgId`. Filters: `groupId`, `search`. |
| `GET` | `/admin/customers/:id` | manager+ | Customer profile with orders, returns, lifetime value |
| `PATCH` | `/admin/customers/:id` | admin | Update customer (block/unblock) |
| `GET` | `/admin/customers/:id/orders` | support+ | Customer order history |
| `GET` | `/admin/customer-groups` | manager+ | List customer groups |
| `POST` | `/admin/customer-groups` | admin | Create group |
| `PATCH` | `/admin/customer-groups/:id` | admin | Update group |
| `POST` | `/admin/customer-groups/:id/members` | admin | Add customer to group |
| `DELETE` | `/admin/customer-groups/:id/members/:actorId` | admin | Remove customer from group |

---

## 4.4 Returns — `/admin/returns`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/returns` | support+ | List returns. Filters: `status`, `orderId`. |
| `GET` | `/admin/returns/:id` | support+ | Return detail with items, order |
| `POST` | `/admin/returns/:id/approve` | manager+ | Approve return. Calculates refund. |
| `POST` | `/admin/returns/:id/reject` | manager+ | Reject return. Requires `reason`. |
| `POST` | `/admin/returns/:id/receive` | fulfillment+ | Mark return items received. Updates item conditions. |
| `POST` | `/admin/returns/:id/refund` | admin | Issue refund via payment adapter + ledger |

---

## 4.5 Claims — `/admin/claims`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/claims` | support+ | List claims |
| `GET` | `/admin/claims/:id` | support+ | Claim detail |
| `PATCH` | `/admin/claims/:id` | manager+ | Set resolution type |
| `POST` | `/admin/claims/:id/resolve` | admin | Execute resolution: trigger refund or replacement |

---

## 4.6 Swaps — `/admin/swaps`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/swaps` | manager+ | List swaps |
| `GET` | `/admin/swaps/:id` | manager+ | Swap detail |
| `POST` | `/admin/swaps/:id/confirm` | manager+ | Confirm swap. Create payment session if difference > 0. |
| `POST` | `/admin/swaps/:id/fulfill` | fulfillment+ | Ship new items |

---

## 4.7 Draft Orders — `/admin/orders/draft`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/orders/draft` | manager+ | List draft orders |
| `POST` | `/admin/orders/draft` | manager+ | Create draft order |
| `GET` | `/admin/orders/draft/:id` | manager+ | Draft detail |
| `PATCH` | `/admin/orders/draft/:id` | manager+ | Update items, addresses, discount |
| `POST` | `/admin/orders/draft/:id/place` | manager+ | Convert to real order |
| `DELETE` | `/admin/orders/draft/:id` | manager+ | Delete draft |

---

## 4.8 Order Edits — `/admin/orders/edits`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/admin/orders/:id/edit` | admin | Begin order edit session |
| `GET` | `/admin/orders/edits/:editId` | admin | Edit detail with proposed changes |
| `POST` | `/admin/orders/edits/:editId/items` | admin | Add item to edit |
| `DELETE` | `/admin/orders/edits/:editId/items/:lineId` | admin | Remove item from edit |
| `POST` | `/admin/orders/edits/:editId/confirm` | admin | Apply edit to order. Recalculate total. |
| `POST` | `/admin/orders/edits/:editId/decline` | admin | Decline edit |

---

## 4.9 Regions — `/admin/regions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/regions` | manager+ | List regions |
| `POST` | `/admin/regions` | admin | Create region |
| `GET` | `/admin/regions/:id` | manager+ | Region detail with tax profile, shipping options |
| `PATCH` | `/admin/regions/:id` | admin | Update |
| `DELETE` | `/admin/regions/:id` | admin | Delete (must have no active orders in region) |

---

## 4.10 Shipping Options — `/admin/shipping`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/shipping` | manager+ | List shipping options |
| `POST` | `/admin/shipping` | admin | Create shipping option |
| `PATCH` | `/admin/shipping/:id` | admin | Update |
| `DELETE` | `/admin/shipping/:id` | admin | Delete |
| `POST` | `/admin/shipping/:id/activate` | admin | Enable option |
| `POST` | `/admin/shipping/:id/deactivate` | admin | Disable option |

---

## 4.11 Tax — `/admin/tax`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/tax/profiles` | admin | List tax profiles |
| `POST` | `/admin/tax/profiles` | admin | Create tax profile |
| `GET` | `/admin/tax/profiles/:id/rates` | admin | List rates for profile |
| `POST` | `/admin/tax/profiles/:id/rates` | admin | Add tax rate |
| `PATCH` | `/admin/tax/rates/:rateId` | admin | Update rate |
| `DELETE` | `/admin/tax/rates/:rateId` | admin | Delete rate |

---

## 4.12 Gift Cards — `/admin/gift-cards`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/gift-cards` | manager+ | List gift cards |
| `POST` | `/admin/gift-cards` | admin | Issue gift card manually |
| `GET` | `/admin/gift-cards/:id` | manager+ | Gift card detail + usage history |
| `POST` | `/admin/gift-cards/:id/disable` | admin | Disable gift card |

---

## 4.13 Analytics — `/admin/analytics`

All require `eco:admin` or `eco:manager`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/analytics/overview` | GMV, order count, AOV, refund rate for date range |
| `GET` | `/admin/analytics/revenue` | Revenue over time (daily/weekly/monthly breakdown) |
| `GET` | `/admin/analytics/products` | Top products by revenue and units sold |
| `GET` | `/admin/analytics/customers` | New vs returning, LTV distribution |
| `GET` | `/admin/analytics/inventory` | Stock levels, reorder alerts, turnover rate |
| `GET` | `/admin/analytics/returns` | Return rate per product, per region |
| `GET` | `/admin/analytics/conversion` | Cart → checkout → order conversion funnel |

---

## 4.14 Import — `/admin/import`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/admin/import/products` | admin | CSV product import |
| `POST` | `/admin/import/inventory` | admin | CSV inventory adjustment import |
| `GET` | `/admin/import/jobs/:jobId` | admin | Import job status and error log |
