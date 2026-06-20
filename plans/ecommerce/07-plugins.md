# Ecommerce — Phase 7: Plugin Wiring

## Goal

Wire all required plugins into the ecommerce compose. Payment plugin is already built.
This phase documents wiring patterns and specifies the P1 plugins (fulfillment, tax).

---

## 7.1 Payment Plugin (P0 — done)

Already implemented: `@projectx/plugin-payment-server`.

Compose wiring (finalize in Phase 1):

```typescript
const payment = createPaymentPlugin({
  provider: env.PAYMENT_PROVIDER as "stripe" | "razorpay",
  stripe: env.PAYMENT_PROVIDER === "stripe" ? {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  } : undefined,
  razorpay: env.PAYMENT_PROVIDER === "razorpay" ? {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  } : undefined,
  onPaymentReceived: hooks.onPaymentReceived,
  onPaymentFailed: hooks.onPaymentFailed,
  onRefundIssued: hooks.onRefundIssued,
});

bootRegistry.adapters.register("payment", payment.adapter);
```

Webhook URL to configure in gateway: `https://your-domain.com/payment/webhook/stripe`

---

## 7.2 Search Plugin (P0 — done)

Already wired at server boot: `PgSearchAdapter` registered for `"search"`.

Compose registers sync hooks for catalog events:

```typescript
// composes/ecommerce/server/src/hooks/search-sync.ts
const searchAdapter = bootRegistry.adapters.get<SearchAdapter>("search");

bus.on("cat.item.published", async (e) => searchAdapter.sync("Product", e));
bus.on("cat.item.updated",   async (e) => searchAdapter.sync("Product", e));
bus.on("cat.item.deleted",   async (e) => searchAdapter.sync("Product", e));
bus.on("cat.item.archived",  async (e) => searchAdapter.sync("Product", e));
```

Store search route uses:
```typescript
const results = await searchAdapter.search("Product", {
  query: q,
  filters: { orgId, ...categoryFilter },
  page,
  limit: 20,
});
```

---

## 7.3 Fulfillment Plugin (P1)

Package: `@projectx/plugin-fulfillment-server` — to be built.
AdapterType: `"fulfillment"` — already in Core.

### Plugin interface contract

```typescript
interface FulfillmentPluginConfig {
  provider: "shiprocket" | "delhivery" | "fedex" | "dhl" | "easypost";
  credentials: Record<string, string>;
  webhookSecret?: string;
  onShipped?: (fulfillmentId: string, trackingNumber: string) => Promise<void>;
  onDelivered?: (fulfillmentId: string) => Promise<void>;
}

interface FulfillmentPlugin {
  plugin: Elysia;
  adapter: FulfillmentAdapter;
}
```

### Compose wiring

```typescript
if (env.FULFILLMENT_PROVIDER) {
  const fulfillment = createFulfillmentPlugin({
    provider: env.FULFILLMENT_PROVIDER,
    credentials: { apiKey: env.FULFILLMENT_API_KEY, ... },
    onShipped: async (fulfillmentId, trackingNumber) => {
      await mediator.send({ type: "ecommerce.updateFulfillment", fulfillmentId, trackingNumber, status: "shipped" });
      bus.emit("ecommerce.fulfillment.shipped", { fulfillmentId, trackingNumber });
    },
    onDelivered: async (fulfillmentId) => {
      await mediator.send({ type: "ecommerce.updateFulfillment", fulfillmentId, status: "delivered" });
      bus.emit("ecommerce.fulfillment.delivered", { fulfillmentId });
    },
  });

  bootRegistry.adapters.register("fulfillment", fulfillment.adapter);
  app.use(fulfillment.plugin); // mounts /ecommerce/fulfillment/webhook/:provider
}
```

### When FulfillmentAdapter is used

At `Step 2 — create-fulfillment` in ORDER_FULFILLMENT workflow:

```typescript
if (adapters.has("fulfillment")) {
  const fulfillmentAdapter = adapters.get<FulfillmentAdapter>("fulfillment");
  const result = await fulfillmentAdapter.createFulfillment({
    orderId,
    items: fulfillmentItems,
  }, order.shippingAddress);
  // Store result.trackingNumber, result.label in eco_fulfillments
} else {
  // Manual fulfillment: admin updates tracking via admin panel
}
```

### Providers to implement

| Provider | Region | Notes |
|----------|--------|-------|
| Shiprocket | India | REST API, HMAC webhooks |
| Delhivery | India | REST API, webhooks |
| FedEx | Global | FedEx Web Services API |
| EasyPost | Global | Aggregator supporting 100+ carriers |
| DHL | Global | DHL Express API |

Start with Shiprocket + Delhivery (primary markets) and EasyPost (global fallback).

---

## 7.4 Tax Plugin (P1)

Package: `@projectx/plugin-tax-server` — to be built.
AdapterType: `"tax"` — already in Core.

### Default behavior (no plugin)

Without TaxAdapter registered, compose uses manual `eco_tax_rates` table:

```typescript
function calculateManualTax(items: CartItem[], profile: TaxProfile, rates: TaxRate[]): TaxLine[] {
  return items.map(item => {
    const rate = rates.find(r => r.productType === "physical" && r.isDefault);
    const taxAmount = Math.round(item.unitPrice.amount * item.quantity * (rate?.rate ?? 0) / 100);
    return { variantId: item.variantId, taxAmount: { amount: taxAmount, currency: item.unitPrice.currency }, taxRate: rate?.rate ?? 0 };
  });
}
```

### TaxJar adapter (P1)

```typescript
interface TaxPluginConfig {
  provider: "taxjar" | "avalara" | "manual";
  taxjar?: { apiKey: string };
  avalara?: { accountId: string; licenseKey: string; environment: "sandbox" | "production" };
}
```

Compose wiring:

```typescript
if (env.TAX_PROVIDER && env.TAX_PROVIDER !== "manual") {
  const taxPlugin = createTaxPlugin({ provider: env.TAX_PROVIDER, ... });
  bootRegistry.adapters.register("tax", taxPlugin.adapter);
}
```

Checkout uses:

```typescript
const taxLines = adapters.has("tax")
  ? await adapters.get<TaxAdapter>("tax").calculateTax(items, shippingAddress, region.taxProfileId)
  : calculateManualTax(items, profile, rates);
```

---

## 7.5 Notification Plugin (P0 — existing)

Compose registers ecommerce templates at boot (see Phase 6.5).
Plugin already implemented. No additional wiring needed beyond template seeding.

---

## 7.6 Environment Variables

All compose-specific env vars:

```
# Payment
PAYMENT_PROVIDER=stripe|razorpay
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Fulfillment (P1)
FULFILLMENT_PROVIDER=shiprocket|delhivery|easypost
FULFILLMENT_API_KEY=...

# Tax (P1)
TAX_PROVIDER=manual|taxjar|avalara
TAXJAR_API_KEY=...
```
