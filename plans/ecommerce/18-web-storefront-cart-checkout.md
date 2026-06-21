# Phase 18 — Storefront: Cart & Checkout

---

## CartDrawer Component — `components/CartDrawer.tsx`

Slide-in panel (right side). Triggered by cart icon in header.

```
┌─ Sheet (side="right", className="w-96") ───────────────────────┐
│  ┌─ SheetHeader ─────────────────────────────────────────────┐  │
│  │ "Cart"  (3 items)                            [× close]    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Item list (scrollable) ──────────────────────────────────┐  │
│  │  ┌─────────┐  Sneaker X / Red / M                        │  │
│  │  │ [img]   │  $49.99                                     │  │
│  │  └─────────┘  Qty: [- 1 +]   [Remove]                   │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  ┌─────────┐  T-Shirt / Blue / L                        │  │
│  │  │ [img]   │  $19.99                                     │  │
│  │  └─────────┘  Qty: [- 2 +]   [Remove]                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  Subtotal: $89.97                                                 │
│  [Checkout ─────────────────────────────────────────────────]   │
│  [Continue Shopping (close drawer)]                              │
└───────────────────────────────────────────────────────────────────┘
```

Qty update: `useCartStore.updateQty(variantId, qty)` locally + call `ecommerceStoreApi.updateCartItem(cartId, itemId, qty)` async. On error: revert local state.

Remove: `useCartStore.removeItem(variantId)` + `ecommerceStoreApi.removeCartItem(cartId, itemId)`

Checkout CTA: navigate to `/store/checkout`. Close drawer first.

---

## Cart Page — `routes/cart.tsx`

Route: `/store/cart`

Full-page cart view — same items as drawer but with more space.

```
┌─ PageHeader "Your Cart" ───────────────────────────────────────┐
│                                                                  │
│  ┌─ Items (left 65%) ────────────────┐  ┌─ Summary (right) ───┐│
│  │ Table: Image | Product | Qty | Price │  │ Subtotal: $89.97  ││
│  │                                   │  │ Shipping: TBD      ││
│  │ [Update Cart] (if qty changed)    │  │ Tax: TBD           ││
│  │                                   │  │ ─────────────────  ││
│  │ Coupon code:                      │  │ Total: $89.97+     ││
│  │ [──────────────] [Apply]          │  │                    ││
│  └───────────────────────────────────┘  │ [Proceed to        ││
│                                         │  Checkout ───────] ││
│                                         └────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

Coupon apply: `ecommerceStoreApi.applyCoupon(cartId, code)` → show discount line if valid, error toast if invalid.

Empty cart: show "Your cart is empty" + [Browse Products] link.

---

## Checkout Wizard — `routes/checkout.tsx`

Route: `/store/checkout`

4-step wizard. State managed in component (not Zustand — single-page flow).

```
┌─ Checkout Progress ────────────────────────────────────────────┐
│  [1 Address ✓] → [2 Shipping ✓] → [3 Payment ●] → [4 Confirm]│
└────────────────────────────────────────────────────────────────┘
```

---

### Step 1 — Shipping Address

```typescript
interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}
```

If customer is logged in and has saved addresses → show address selector with "+ New address" option.
If not logged in or no saved addresses → show address form directly.

On Next: `ecommerceStoreApi.setShippingAddress(cartId, address)` → proceed if 200.

---

### Step 2 — Shipping Option

```
Available shipping methods:
  ○ Standard Shipping     5-7 business days    $5.99
  ● Express Shipping      1-2 business days    $14.99
  ○ Free Shipping         7-10 business days   FREE  (if cart > $50)
```

Data: `ecommerceStoreApi.getShippingOptions(cartId)` — returns options filtered by region + cart value (free threshold applied server-side).

On Next: `ecommerceStoreApi.selectShippingOption(cartId, shippingOptionId)` → proceed if 200.

---

### Step 3 — Payment

#### If `PAYMENT_PROVIDER=stripe`

Load Stripe.js from env:
```typescript
import { loadStripe } from "@stripe/stripe-js";
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);
```

Create payment session first:
```typescript
const { data: session } = await ecommerceStoreApi.createPaymentSession(cartId);
// session.clientSecret returned from Stripe PaymentIntent creation
```

Render Stripe Elements:
```typescript
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

<Elements stripe={stripePromise} options={{ clientSecret: session.clientSecret }}>
  <StripePaymentForm onSuccess={handlePaymentSuccess} />
</Elements>
```

`StripePaymentForm` uses `useStripe().confirmCardPayment(clientSecret)`.

On success → call `ecommerceStoreApi.completeCart(cartId, { paymentIntentId })` → get order.

#### If `PAYMENT_PROVIDER=razorpay`

```typescript
// Load Razorpay script dynamically
const session = await ecommerceStoreApi.createPaymentSession(cartId);
// session = { orderId, amount, currency, key }

const rzp = new window.Razorpay({
  key: session.key,
  amount: session.amount,
  currency: session.currency,
  order_id: session.orderId,
  handler: async (response) => {
    await ecommerceStoreApi.completeCart(cartId, {
      razorpayPaymentId: response.razorpay_payment_id,
      razorpayOrderId: response.razorpay_order_id,
      razorpaySignature: response.razorpay_signature,
    });
    navigateToConfirmation();
  },
});
rzp.open();
```

#### Payment provider detection

Check at runtime which provider is configured:
```typescript
// Server returns provider in payment session response
const session = await ecommerceStoreApi.createPaymentSession(cartId);
if (session.provider === "stripe") { /* Stripe flow */ }
else if (session.provider === "razorpay") { /* Razorpay flow */ }
```

---

### Step 4 — Order Confirmation

```
┌─ ✓ Order Confirmed! ──────────────────────────────────────────┐
│                                                                  │
│  Order #001  ·  Thank you, John!                                │
│                                                                  │
│  ┌─ Order summary ──────────────────────────────────────────┐  │
│  │  Items: 3   Subtotal: $89.97                              │  │
│  │  Shipping: $5.99 (Standard, 5-7 days)                    │  │
│  │  Total: $95.96                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Delivery to: 123 Main St, New York, NY 10001                    │
│  Confirmation email sent to: john@example.com                   │
│                                                                  │
│  [View Order History]  [Continue Shopping]                      │
└──────────────────────────────────────────────────────────────────┘
```

After successful `completeCart`:
1. Clear cart store: `useCartStore.clearCart()`
2. Navigate to `/store/checkout?step=4&orderId=XXX`
3. Fetch order details for display: `ecommerceStoreApi.getOrder(orderId)`

---

## Order Summary Sidebar (Steps 1-3)

Always visible on right side (or bottom on mobile) during checkout:

```
Cart items count: 3
─────────────────────
Sneaker X × 1   $49.99
T-Shirt × 2     $39.98
─────────────────────
Subtotal:        $89.97
Shipping:        (TBD)
Tax:             (TBD)
Coupon:          -$10.00 (if applied)
─────────────────────
Est. Total:      $79.97+
```

Updates in real-time as shipping option selected (shows shipping cost).

---

## Checks

- CartDrawer opens on cart icon click; items match cart store
- Qty update in drawer reflects immediately (optimistic); API called async
- Checkout step 1 → 2 → 3 progression works with URL or state machine
- Stripe Elements load (check console for Stripe initialization)
- After payment: cart cleared, confirmation page shows order details
- "Continue Shopping" link goes to `/store/products`
