# Phase 21 — Compose Credentials & Integration

---

## 21.1 Port Assignment

| Service | Port |
|---|---|
| `apps/server` | 3000 |
| `apps/web` (Vite dev) | 5173 |
| Restaurant backend routes | `/restaurant/*` (mounted on server) |
| Restaurant web package | `packages/restaurant-web` |

WebSocket upgrades also go through the same server on port 3000.

---

## 21.2 Environment Variables

**Server `.env` additions:**

```env
# Restaurant
RST_SWIGGY_HMAC_SECRET=swiggy_hmac_secret_here
RST_ZOMATO_HMAC_SECRET=zomato_hmac_secret_here
RST_KITCHEN_SLA_MINUTES=20
RST_SHIFT_VARIANCE_THRESHOLD=200
RST_DELIVERY_UNASSIGNED_ALERT_MINUTES=10
RST_OPERATING_HOURS_CHECK_INTERVAL_MINUTES=10

# Google Maps (for rider distance)
GOOGLE_MAPS_API_KEY=AIza...
# Or use Haversine only (no external service needed)
```

**Type-safe config access:**

```typescript
// packages/restaurant/src/config.ts
export const rstConfig = {
  swiggyHmacSecret: process.env.RST_SWIGGY_HMAC_SECRET ?? "",
  zomatoHmacSecret: process.env.RST_ZOMATO_HMAC_SECRET ?? "",
  kitchenSlaMinutes: parseInt(process.env.RST_KITCHEN_SLA_MINUTES ?? "20"),
  shiftVarianceThreshold: parseFloat(process.env.RST_SHIFT_VARIANCE_THRESHOLD ?? "200"),
  deliveryUnassignedAlertMinutes: parseInt(process.env.RST_DELIVERY_UNASSIGNED_ALERT_MINUTES ?? "10"),
} as const;
```

---

## 21.3 Compose Factory Integration

**File:** `packages/restaurant/src/index.ts`

```typescript
import Elysia from "elysia";
import type { Mediator } from "@projectx/core/mediator";
import type { EventBus } from "@projectx/core/event-bus";
import type { Scheduler } from "@projectx/core/scheduler";

import { registerRestaurantHooks } from "./hooks";
import { registerRestaurantJobs } from "./jobs";
import { outletRoutes } from "./routes/outlets";
import { menuRoutes } from "./routes/menu";
import { orderRoutes } from "./routes/orders";
import { kotRoutes } from "./routes/kots";
import { deliveryRoutes } from "./routes/delivery";
import { billingRoutes } from "./routes/billing";
import { inventoryRoutes } from "./routes/inventory";
import { analyticsRoutes } from "./routes/analytics";
import { adminRoutes } from "./routes/admin";
import { aggregatorWebhookRoutes } from "./routes/aggregator-webhooks";
import { wsKdsRoutes } from "./routes/ws-kds";

export type RestaurantApp = ReturnType<typeof createRestaurantCompose>;

export function createRestaurantCompose(
  mediator: Mediator,
  bus: EventBus,
  scheduler: Scheduler,
) {
  registerRestaurantHooks(bus, mediator);
  registerRestaurantJobs(scheduler, mediator, bus);

  return new Elysia({ prefix: "/restaurant" })
    .use(outletRoutes(mediator, bus))
    .use(menuRoutes(mediator, bus))
    .use(orderRoutes(mediator, bus))
    .use(kotRoutes(mediator, bus))
    .use(deliveryRoutes(mediator, bus))
    .use(billingRoutes(mediator, bus))
    .use(inventoryRoutes(mediator))
    .use(analyticsRoutes(mediator))
    .use(adminRoutes(mediator))
    .use(aggregatorWebhookRoutes(mediator, bus))
    .use(wsKdsRoutes(bus));  // WebSocket routes
}
```

---

## 21.4 WebSocket Configuration

Elysia `.ws()` routes for KDS real-time. These are mounted inside the compose:

```typescript
// packages/restaurant/src/routes/ws-kds.ts
import Elysia from "elysia";

export function wsKdsRoutes(bus: EventBus) {
  return new Elysia()
    .ws("/restaurant/ws/kds/:outletId/:station", {
      open(ws) {
        const { outletId, station } = ws.data.params;
        ws.subscribe(`kds:${outletId}:${station}`);
        ws.subscribe(`kds:${outletId}:all`);
      },
      close(ws) {
        const { outletId, station } = ws.data.params;
        ws.unsubscribe(`kds:${outletId}:${station}`);
        ws.unsubscribe(`kds:${outletId}:all`);
      },
    })
    .ws("/restaurant/ws/delivery/:outletId", {
      open(ws) {
        ws.subscribe(`delivery:${ws.data.params.outletId}`);
      },
      close(ws) {
        ws.unsubscribe(`delivery:${ws.data.params.outletId}`);
      },
    });
}
```

**Broadcast from hooks:**
```typescript
// In the order.placed hook:
server.publish(`kds:${outletId}:${station}`, JSON.stringify({ type: "new_kot", kot }));
```

---

## 21.5 Aggregator Webhook Routes

```typescript
// packages/restaurant/src/routes/aggregator-webhooks.ts
import Elysia from "elysia";

export function aggregatorWebhookRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/restaurant/webhooks" })
    .post("/swiggy/:outletCode", async ({ params, request, body }) => {
      // Store raw payload first for idempotency
      const rawPayload = await request.text();
      const hmac = request.headers.get("x-swiggy-signature") ?? "";
      // verify HMAC, then queue ingestion
      await mediator.dispatch({ type: "restaurant.aggregator.webhook", payload: { source: "swiggy", rawPayload, hmac, outletCode: params.outletCode } });
      return { status: "ack" };  // Must return within 90s
    })
    .post("/zomato/:outletCode", async ({ params, request }) => {
      const rawPayload = await request.text();
      const hmac = request.headers.get("x-zomato-signature") ?? "";
      await mediator.dispatch({ type: "restaurant.aggregator.webhook", payload: { source: "zomato", rawPayload, hmac, outletCode: params.outletCode } });
      return { status: "ack" };
    });
}
```

---

## 21.6 Server Shell Mount

**File:** `apps/server/src/index.ts` (additions only)

```typescript
import { createRestaurantCompose } from "@projectx/restaurant";
// ...

app.use(createRestaurantCompose(mediator, bus, scheduler));
```

---

## 21.7 Package.json

**File:** `packages/restaurant/package.json`

```json
{
  "name": "@projectx/restaurant",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./seed": "./src/seed.ts"
  },
  "dependencies": {
    "@projectx/core": "workspace:*",
    "@paralleldrive/cuid2": "^2.2.2",
    "elysia": "^1.2.0"
  }
}
```

---

## 21.8 Schema Barrel

**File:** `packages/restaurant/src/schema/index.ts`

```typescript
export * from "./outlets";
export * from "./categories";
export * from "./menu-items";
export * from "./tables";
export * from "./orders";
export * from "./order-items";
export * from "./kots";
export * from "./kot-items";
export * from "./deliveries";
export * from "./riders";
export * from "./bills";
export * from "./bill-items";
export * from "./shifts";
export * from "./ingredients";
export * from "./org-config";
// 15 table exports
```

---

## 21.9 Web Shell Router

**File:** `apps/web/src/router.tsx` (additions)

```tsx
import { PosApp, KdsApp, DeliveryApp, CustomerApp, RestaurantAdminApp } from "@projectx/restaurant-web";

{ path: "/pos/*", element: <PosApp /> },
{ path: "/kds/*", element: <KdsApp /> },
{ path: "/delivery/*", element: <DeliveryApp /> },
{ path: "/menu/*", element: <CustomerApp /> },  // customer QR scan
{ path: "/restaurant-admin/*", element: <RestaurantAdminApp /> },
```

---

## 21.10 Vite Alias

**`apps/web/vite.config.ts`:**

```typescript
resolve: {
  alias: {
    "@projectx/restaurant-web": path.resolve(__dirname, "../../packages/restaurant-web/src"),
  },
},
```

---

## 21.11 Web Package.json

**File:** `packages/restaurant-web/package.json`

```json
{
  "name": "@projectx/restaurant-web",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "@projectx/core": "workspace:*",
    "react": "^19.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "recharts": "^2.15.0"
  }
}
```

---

## 21.12 globals.css

```css
@source "../../packages/restaurant-web/src/**/*.{tsx,ts}";
```
