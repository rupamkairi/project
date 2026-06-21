# Phase 11 — Shell Integration

---

## 11.1 Server Shell Mount

**File:** `apps/server/src/index.ts`

```typescript
import { createRestaurantCompose } from "@projectx/restaurant-compose";

const restaurantApp = createRestaurantCompose(mediator, bus, scheduler);
app.use(restaurantApp);
```

---

## 11.2 Compose Factory (Full)

**File:** `composes/restaurant/server/src/index.ts`

```typescript
import Elysia from "elysia";
import { registerRestaurantHooks } from "./hooks";
import { registerRestaurantJobs } from "./jobs";

export function createRestaurantCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerRestaurantHooks(bus, mediator);
  registerRestaurantJobs(scheduler, mediator);

  return new Elysia({ prefix: "/restaurant" })
    .use(outletRoutes(mediator))
    .use(menuRoutes(mediator))
    .use(orderRoutes(mediator))
    .use(kotRoutes(mediator))
    .use(deliveryRoutes(mediator))
    .use(billingRoutes(mediator))
    .use(aggregatorRoutes(mediator))
    .use(inventoryRoutes(mediator))
    .use(analyticsRoutes(mediator))
    .use(adminRoutes(mediator));
}

export type RestaurantApp = ReturnType<typeof createRestaurantCompose>;
```

---

## 11.3 Package.json — Compose

**File:** `composes/restaurant/server/package.json`

```json
{
  "name": "@projectx/restaurant-compose",
  "version": "0.1.0",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  }
}
```

---

## 11.4 Schema Barrel

**File:** `composes/restaurant/server/src/schema/index.ts`

```typescript
export * from "./outlets";
export * from "./categories";
export * from "./menu-items";
export * from "./modifiers";
export * from "./orders";
export * from "./kots";
export * from "./deliveries";
export * from "./riders";
export * from "./bills";
export * from "./shifts";
export * from "./ingredients";
export * from "./recipes";
export * from "./aggregator-orders";
export * from "./coupons";
export * from "./table-reservations";
export * from "./tables";
```

---

## 11.5 tsconfig Paths

```json
{
  "compilerOptions": {
    "paths": {
      "@projectx/restaurant-compose": ["../../composes/restaurant/server/src/index.ts"],
      "@projectx/restaurant-compose/schema": ["../../composes/restaurant/server/src/schema/index.ts"]
    }
  }
}
```

---

## 11.6 Web Shell Router

**File:** `apps/web/src/routes.tsx`

```tsx
const RestaurantPosApp = lazy(() => import("@projectx/restaurant-web/apps/pos"));
const RestaurantKdsApp = lazy(() => import("@projectx/restaurant-web/apps/kds"));
const RestaurantDeliveryApp = lazy(() => import("@projectx/restaurant-web/apps/delivery"));
const RestaurantCustomerApp = lazy(() => import("@projectx/restaurant-web/apps/customer"));
const RestaurantAdminApp = lazy(() => import("@projectx/restaurant-web/apps/admin"));

// Routes:
{ path: "/pos/*", element: <RestaurantPosApp /> },
{ path: "/kds/*", element: <RestaurantKdsApp /> },
{ path: "/delivery/*", element: <RestaurantDeliveryApp /> },
{ path: "/order/*", element: <RestaurantCustomerApp /> },
{ path: "/restaurant-admin/*", element: <RestaurantAdminApp /> },
```

---

## 11.7 Vite Config Aliases

```typescript
resolve: {
  alias: {
    "@projectx/restaurant-web": path.resolve(__dirname, "../../packages/restaurant-web/src"),
  },
}
```

---

## 11.8 Package.json — Web

**File:** `packages/restaurant-web/package.json`

```json
{
  "name": "@projectx/restaurant-web",
  "version": "0.1.0",
  "exports": {
    "./apps/pos": "./src/apps/pos/index.ts",
    "./apps/kds": "./src/apps/kds/index.ts",
    "./apps/delivery": "./src/apps/delivery/index.ts",
    "./apps/customer": "./src/apps/customer/index.ts",
    "./apps/admin": "./src/apps/admin/index.ts"
  }
}
```

---

## 11.9 Server .env Additions

```
# Restaurant
RST_SWIGGY_WEBHOOK_SECRET=xxx
RST_ZOMATO_WEBHOOK_SECRET=xxx
RST_UBEREATS_WEBHOOK_SECRET=xxx
RST_KITCHEN_SLA_MINUTES=20
RST_VARIANCE_THRESHOLD=50
RST_REQUIRE_POD=false
RST_SERVICE_CHARGE_PCT=10
```

---

## 11.10 WebSocket Configuration

KDS requires WebSocket support in Bun/Elysia. Add to server:

```typescript
// In restaurant compose factory
const wsPlugin = new Elysia()
  .ws("/restaurant/ws/kds/:outletId", {
    open(ws) {
      const outletId = ws.data.params.outletId;
      ws.subscribe(`kds:${outletId}`);
    },
    message(ws, message) { /* client pings */ },
  })
  .ws("/restaurant/ws/pos/:outletId", {
    open(ws) { ws.subscribe(`pos:${ws.data.params.outletId}`); },
    message() {},
  });

// Bus handler publishes to WebSocket topic
bus.on("rst.kds.new-kot", ({ kotId, outletId, station }) => {
  server.publish(`kds:${outletId}`, JSON.stringify({ type: "new-kot", kotId, station }));
});
```

---

## 11.11 globals.css

```css
@source "../../packages/restaurant-web/src/**/*.tsx";
```
