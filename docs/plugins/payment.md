# Payment Plugin

`@projectx/plugin-payment-server` — wraps Stripe and Razorpay behind the Core `PaymentAdapter` interface.

---

## Overview

The payment plugin bridges the ecommerce compose to payment gateways. It:
- Creates hosted checkout sessions (Stripe Checkout / Razorpay Orders)
- Captures authorized payments
- Issues refunds
- Verifies and dispatches webhook events

The plugin follows the standard factory pattern: `createPaymentPlugin(config)` returns `{ plugin, adapter }`. The compose mounts `plugin` as an Elysia sub-app and registers `adapter` in `AdapterRegistry`.

---

## Config

```typescript
import { createPaymentPlugin } from "@projectx/plugin-payment-server";

// Stripe
const payment = createPaymentPlugin({
  provider: "stripe",
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  onPaymentReceived: async (orderId, amount, gatewayRef) => {
    // mark order paid in ecommerce compose
  },
  onPaymentFailed: async (orderId, gatewayRef) => {
    // release reserved inventory
  },
  onRefundIssued: async (orderId, refundId, amount) => {
    // update ledger
  },
});

// Razorpay
const payment = createPaymentPlugin({
  provider: "razorpay",
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
  onPaymentReceived: async (orderId, amount, gatewayRef) => { ... },
});
```

### Config fields

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | `"stripe" \| "razorpay"` | Yes | Active gateway |
| `stripe` | `StripeConfig` | If provider=stripe | Stripe keys |
| `razorpay` | `RazorpayConfig` | If provider=razorpay | Razorpay keys |
| `onPaymentReceived` | fn | No | Called after successful payment |
| `onPaymentFailed` | fn | No | Called after failed payment |
| `onRefundIssued` | fn | No | Called after refund created |

---

## Factory return

```typescript
interface PaymentPlugin {
  plugin: Elysia;       // mount via .use(payment.plugin)
  adapter: PaymentAdapter; // register in AdapterRegistry
}
```

### `plugin`

Elysia instance with prefix `/payment`. Mounts:
- `POST /payment/webhook/:provider` — webhook receiver
- `GET /payment/session/:id` — transaction status

### `adapter`

Implements `PaymentAdapter` from Core:

```typescript
interface PaymentAdapter {
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: Money): Promise<RefundResult>;
  getTransaction(id: string): Promise<PaymentTransaction>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}
```

---

## Compose integration

```typescript
// composes/ecommerce/server/src/index.ts

import { createPaymentPlugin } from "@projectx/plugin-payment-server";

const payment = createPaymentPlugin({
  provider: "stripe",
  stripe: { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET },
  onPaymentReceived: async (orderId, amount, gatewayRef) => {
    await mediator.send({ type: "order.markPaid", orderId, amount, gatewayRef });
  },
});

// Register adapter so modules can resolve it
bootRegistry.adapters.register("payment", payment.adapter);

export const ecommerceCompose = new Elysia({ prefix: "/ecommerce" })
  .use(payment.plugin);
```

---

## Webhook setup

### Stripe

1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-domain.com/payment/webhook/stripe`
3. Events to listen: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy signing secret → set as `STRIPE_WEBHOOK_SECRET`

### Razorpay

1. Go to Razorpay Dashboard → Settings → Webhooks → Add new webhook
2. URL: `https://your-domain.com/payment/webhook/razorpay`
3. Events: `payment.captured`, `payment.failed`, `refund.created`
4. Set secret → use as `RAZORPAY_WEBHOOK_SECRET`

---

## Provider reference

### Stripe method mapping

| `PaymentAdapter` method | Stripe API |
|---|---|
| `createPaymentSession` | `stripe.checkout.sessions.create` |
| `capturePayment` | `stripe.paymentIntents.capture` |
| `refund` | `stripe.refunds.create` |
| `getTransaction` | `stripe.paymentIntents.retrieve` |
| `handleWebhook` | `stripe.webhooks.constructEvent` |

### Razorpay method mapping

| `PaymentAdapter` method | Razorpay API |
|---|---|
| `createPaymentSession` | `razorpay.orders.create` |
| `capturePayment` | `razorpay.payments.capture` |
| `refund` | `razorpay.payments.refund` |
| `getTransaction` | `razorpay.payments.fetch` |
| `handleWebhook` | HMAC-SHA256 verify + JSON parse |

---

## Webhook event normalization

Both providers normalize to the same internal event types:

| Internal type | Stripe | Razorpay |
|---|---|---|
| `payment.received` | `checkout.session.completed` | `payment.captured` |
| `payment.failed` | `payment_intent.payment_failed` | `payment.failed` |
| `refund.created` | `charge.refunded` | `refund.created` |

---

## Error handling

- `createPaymentSession` — throws `IntegrationError` on gateway error
- `capturePayment` — returns `{ success: false, error }` on failure (does not throw)
- `refund` — returns `{ success: false, error }` on failure
- `handleWebhook` — throws `IntegrationError` if signature is invalid → webhook route returns 400

Callbacks (`onPaymentReceived`, etc.) are called with `catch(console.error)` so a failing callback never causes the webhook to return non-200 (Stripe/Razorpay would retry forever).

---

## Security

- Webhook HMAC is verified **inside** `adapter.handleWebhook()` before any callback fires
- Stripe uses `stripe.webhooks.constructEvent()` with timing-safe comparison internally
- Razorpay uses `crypto.createHmac('sha256', secret)` — constant-time equivalent
- Route uses `type: 'text'` to receive raw body as string — required for correct HMAC computation
- Never log `secretKey` or `webhookSecret` values
- `GET /payment/session/:id` is internal — add Bearer auth in compose before mounting

---

## `PaymentOrder` — required metadata

For `onPaymentReceived` to resolve the correct order, pass `orderId` in `metadata`:

```typescript
await adapters.get<PaymentAdapter>("payment").createPaymentSession({
  amount: { amount: 4999, currency: "USD" },
  description: "Order #ORD-123",
  metadata: {
    orderId: "ORD-123",
    successUrl: "https://your-domain.com/checkout/success",
    cancelUrl: "https://your-domain.com/checkout/cancel",
  },
});
```

The webhook handler reads `metadata.orderId` from the gateway event payload and passes it to `onPaymentReceived(orderId, ...)`.
