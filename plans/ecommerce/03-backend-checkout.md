# Ecommerce — Phase 3: Checkout Flow

## Goal

Implement the complete checkout orchestration: cart validation → shipping option selection →
tax calculation → payment session creation → order placement, with explicit compensating actions
at each step. This is the most critical, most failure-prone flow in the compose.

---

## 3.1 Checkout Steps Overview

```
1. Customer has a Cart with items
2. POST /ecommerce/store/cart/:id/shipping-address     — set delivery address
3. GET  /ecommerce/store/cart/:id/shipping-options      — list available options
4. POST /ecommerce/store/cart/:id/shipping-option       — select shipping option
5. GET  /ecommerce/store/cart/:id/tax                   — calculate tax
6. POST /ecommerce/store/cart/:id/payment-session       — create payment session (gateway)
7. [Customer completes payment at gateway redirect URL]
8. POST /ecommerce/payment/webhook/:provider             — gateway webhook fires
9. Compose hook: onPaymentReceived → markOrderPaid command
10. Order transitions: pending → processing → fulfillment
```

---

## 3.2 Cart Validation (pre-checkout guard)

File: `composes/ecommerce/server/src/checkout/validate-cart.ts`

Runs before steps 4–6. Checks:

1. Cart exists and belongs to requesting actor
2. Cart has at least one item
3. Each `cartItem.variantId` exists in catalog and is `published`
4. Each variant has sufficient inventory (`inventory.checkAvailability()`)
5. Any coupon on cart is still valid (not expired, not usage-limit-exceeded)
6. Cart `regionId` is set (required for tax + shipping)

Returns `CartValidationResult { valid: boolean; errors: string[] }`.

---

## 3.3 Shipping Option Resolver

File: `composes/ecommerce/server/src/checkout/resolve-shipping.ts`

```
GET /ecommerce/store/cart/:id/shipping-options
```

Algorithm:
1. Get cart + shippingAddress
2. Resolve `Region` from `shippingAddress.country`
3. Query `eco_shipping_options` where `regionId = region.id AND isActive = true`
4. For each option, evaluate `conditions` RuleExpr against cart (e.g. free shipping if cart.subtotal > 50 USD)
5. For `calculated` type: call FulfillmentAdapter (P1) to get live carrier rates
6. Return list sorted by estimated delivery days

---

## 3.4 Tax Calculation

File: `composes/ecommerce/server/src/checkout/calculate-tax.ts`

```
GET /ecommerce/store/cart/:id/tax
```

Algorithm:
1. Get cart + shippingAddress + region
2. Get `TaxProfile` from `region.taxProfileId`
3. Get `TaxRates` for profile (filtered by `productType = 'physical'` or variant type)
4. For each cart item: `taxAmount = item.unitPrice * quantity * rate / 100`
5. If `region.taxIncluded = true`: extract tax from price (don't add it)
6. Sum all tax lines → `cart.tax`
7. Cache result in cart (`cart.taxLines = [...]`)

If `TaxAdapter` is registered (TaxJar/Avalara), call it instead of manual rates:
```typescript
const adapter = adapters.has("tax")
  ? adapters.get<TaxAdapter>("tax")
  : null;
if (adapter) {
  taxLines = await adapter.calculateTax(items, shippingAddress, region.taxProfileId);
} else {
  taxLines = calculateManualTax(items, rates);
}
```

---

## 3.5 Payment Session Creation

File: `composes/ecommerce/server/src/checkout/create-payment-session.ts`

```
POST /ecommerce/store/cart/:id/payment-session
```

Steps:
1. Run `validateCart()` — fail with 400 if invalid
2. Calculate order total: `subtotal + shipping + tax - coupon_discount`
3. Call `paymentAdapter.createPaymentSession({ amount, currency, metadata: { orderId, cartId } })`
4. Create `eco_orders` record with status = `pending`
5. Reserve inventory: for each cart item, call `inventory.reserve(variantId, qty, orderId)`
6. Save `paymentSession` on order
7. Return `{ sessionId, url, expiresAt, orderId }`

**Compensation on failure:**
- If payment session creation fails → do NOT create order → do NOT reserve inventory
- If inventory reservation fails (partially) → release successfully reserved items → return 409 with which variants are out of stock

---

## 3.6 Saga: Order Confirmation

Triggered by `onPaymentReceived` callback from payment plugin.

File: `composes/ecommerce/server/src/hooks/on-payment-received.ts`

```typescript
async function onPaymentReceived(orderId: string, amount: Money, gatewayRef: string) {
  // Step 1: Record payment in ledger
  await mediator.send({ type: "ledger.recordPayment", orderId, amount, gatewayRef });

  // Step 2: Transition order FSM: pending → processing
  await mediator.send({ type: "ecommerce.markOrderPaid", orderId, gatewayRef });

  // Step 3: Trigger ORDER_FULFILLMENT workflow
  await mediator.send({ type: "workflow.startProcess", templateId: "ORDER_FULFILLMENT", contextId: orderId });

  // Step 4: Send order confirmation notification
  await mediator.send({ type: "notification.send", templateId: "order-confirmation", actorId: order.customerId, context: { orderId, amount } });
}
```

**Compensation for payment failure:**
```typescript
async function onPaymentFailed(orderId: string, gatewayRef: string) {
  // Release reserved inventory
  const order = await getOrder(orderId);
  for (const item of order.items) {
    await mediator.send({ type: "inventory.release", variantId: item.variantId, qty: item.quantity, orderId });
  }

  // Transition order FSM: pending → cancelled
  await mediator.send({ type: "ecommerce.cancelOrder", orderId, reason: "payment_failed" });

  // Notify customer
  await mediator.send({ type: "notification.send", templateId: "payment-failed", actorId: order.customerId });
}
```

---

## 3.7 Order Fulfillment Workflow

The ORDER_FULFILLMENT ProcessTemplate drives post-payment order handling.

Template ID: `ORDER_FULFILLMENT`
Trigger: `workflow.startProcess`

Steps:

```
Step 1 — allocate-inventory
  Command: inventory.fulfillReservation(orderId)
  On fail: release reservation → cancel order

Step 2 — create-fulfillment
  Command: ecommerce.createFulfillment(orderId, locationId, items)
  Creates eco_fulfillments record
  Calls FulfillmentAdapter.createFulfillment() if P1 adapter registered
  On fail: compensate step 1 (release inventory)

Step 3 — notify-shipped
  Event: ecommerce.orderShipped → notification.send(shipping-confirmation, customer)

Step 4 — wait-for-delivery
  Listen for: FulfillmentAdapter webhook → ecommerce.fulfillmentDelivered
  Or: scheduled polling job (every 4h) checks carrier tracking

Step 5 — complete-order
  Command: ecommerce.completeOrder(orderId)
  Transitions FSM: fulfillment → completed
  Creates snapshot in analytics module
```

---

## 3.8 Return Flow

Triggered by `POST /ecommerce/store/orders/:id/returns`.

File: `composes/ecommerce/server/src/checkout/process-return.ts`

Steps:
1. Customer submits return request → creates `eco_returns` with status `requested`
2. Admin approves (`PATCH /ecommerce/admin/returns/:id/approve`) → calculates refund amount → status `approved`
3. Return label generated via FulfillmentAdapter (P1) or manual tracking
4. Customer ships items
5. Warehouse receives → `PATCH /ecommerce/admin/returns/:id/received`
6. Items inspected → condition noted per `eco_return_items`
7. Refund issued:
   - `paymentAdapter.refund(transactionId, refundAmount)`
   - `ledger.issueRefund(orderId, refundAmount)`
   - Inventory restocked: `inventory.adjust(variantId, +qty)` for items in good condition
8. Status → `refunded`
9. Notification: return-processed email to customer

---

## 3.9 Gift Card Application

At checkout, customer can apply a gift card code to their cart.

```
POST /ecommerce/store/cart/:id/gift-card
Body: { code: string }
```

1. Look up `eco_gift_cards` by code for org
2. Verify `status = active` and not expired
3. Apply balance as discount (up to cart total)
4. Store `appliedGiftCardId` + `giftCardDiscount: Money` on cart
5. At payment session: `finalAmount = cartTotal - giftCardDiscount`
6. On order confirmation: deduct used amount from `eco_gift_cards.balance`

---

## 3.10 Draft Order Flow (Admin)

Admin creates order on behalf of customer, bypassing payment session.

```
POST /ecommerce/admin/orders/draft
Body: { customerId, items, shippingOptionId, paymentMethod: "cod" | "bank_transfer" }
```

1. Creates `eco_draft_orders` with status `draft`
2. Admin edits line items, applies discounts
3. `POST /ecommerce/admin/orders/draft/:id/place` — places the real order
4. Creates `eco_orders` from draft, skips payment session
5. ORDER_FULFILLMENT workflow starts immediately (payment is offline)

---

## Files

```
composes/ecommerce/server/src/checkout/
  validate-cart.ts
  resolve-shipping.ts
  calculate-tax.ts
  create-payment-session.ts
  process-return.ts
  draft-order.ts

composes/ecommerce/server/src/hooks/
  on-payment-received.ts
  on-payment-failed.ts
  on-fulfillment-delivered.ts
  on-return-received.ts
```
