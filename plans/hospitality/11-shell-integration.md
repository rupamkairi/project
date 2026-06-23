# Phase 11 — Shell Integration

---

## 11.1 Server Shell Mount

**File:** `apps/server/src/index.ts`

```typescript
import { createHospitalityCompose } from "@projectx/hospitality-compose";

const hospitalityApp = createHospitalityCompose(mediator, bus, scheduler);
app.use(hospitalityApp);
```

---

## 11.2 Compose Factory (Full)

**File:** `composes/hospitality/server/src/index.ts`

```typescript
import Elysia from "elysia";
import { registerHospitalityHooks } from "./hooks";
import { registerHospitalityJobs } from "./jobs";

export function createHospitalityCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerHospitalityHooks(bus, mediator);
  registerHospitalityJobs(scheduler, mediator);

  return new Elysia({ prefix: "/hospitality" })
    .use(reservationRoutes(mediator))
    .use(frontDeskRoutes(mediator))
    .use(housekeepingRoutes(mediator))
    .use(folioRoutes(mediator))
    .use(ratePlanRoutes(mediator))
    .use(revenueRoutes(mediator))
    .use(maintenanceRoutes(mediator))
    .use(guestRoutes(mediator))
    .use(otaWebhookRoutes(mediator))
    .use(analyticsRoutes(mediator))
    .use(adminRoutes(mediator));
}

export type HospitalityApp = ReturnType<typeof createHospitalityCompose>;
```

---

## 11.3 Package.json — Compose

**File:** `composes/hospitality/server/package.json`

```json
{
  "name": "@projectx/hospitality-compose",
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

**File:** `composes/hospitality/server/src/schema/index.ts`

Only hsp_ prefixed detail tables are exported here. Master tables (locations, persons, transactions, etc.) are imported from their respective foundation module packages.

```typescript
// hsp-owned detail tables only
export * from "./rate-plans";
export * from "./rate-plan-seasons";
export * from "./channel-inventory";
export * from "./payment-records";
export * from "./housekeeping-assignments";
export * from "./maintenance-requests";
export * from "./packages";
export * from "./package-inclusions";
export * from "./org-config";
```

---

## 11.5 tsconfig Paths

```json
{
  "compilerOptions": {
    "paths": {
      "@projectx/hospitality-compose": ["../../composes/hospitality/server/src/index.ts"],
      "@projectx/hospitality-compose/schema": ["../../composes/hospitality/server/src/schema/index.ts"]
    }
  }
}
```

---

## 11.6 Web Shell Router

**File:** `apps/web/src/routes.tsx`

```tsx
const FrontDeskApp = lazy(() => import("@projectx/hospitality-web/apps/front-desk"));
const HousekeepingApp = lazy(() => import("@projectx/hospitality-web/apps/housekeeping"));
const ReservationsApp = lazy(() => import("@projectx/hospitality-web/apps/reservations"));
const RevenueApp = lazy(() => import("@projectx/hospitality-web/apps/revenue"));
const GuestApp = lazy(() => import("@projectx/hospitality-web/apps/guest"));
const HospitalityAdminApp = lazy(() => import("@projectx/hospitality-web/apps/admin"));

// Routes:
{ path: "/front-desk/*", element: <FrontDeskApp /> },
{ path: "/housekeeping/*", element: <HousekeepingApp /> },
{ path: "/reservations/*", element: <ReservationsApp /> },
{ path: "/revenue/*", element: <RevenueApp /> },
{ path: "/guest/*", element: <GuestApp /> },
{ path: "/hospitality-admin/*", element: <HospitalityAdminApp /> },
```

---

## 11.7 Vite Config Aliases

```typescript
resolve: {
  alias: {
    "@projectx/hospitality-web": path.resolve(__dirname, "../../packages/hospitality-web/src"),
  },
}
```

---

## 11.8 Package.json — Web

**File:** `packages/hospitality-web/package.json`

```json
{
  "name": "@projectx/hospitality-web",
  "version": "0.1.0",
  "exports": {
    "./apps/front-desk": "./src/apps/front-desk/index.ts",
    "./apps/housekeeping": "./src/apps/housekeeping/index.ts",
    "./apps/reservations": "./src/apps/reservations/index.ts",
    "./apps/revenue": "./src/apps/revenue/index.ts",
    "./apps/guest": "./src/apps/guest/index.ts",
    "./apps/admin": "./src/apps/admin/index.ts"
  }
}
```

---

## 11.9 Server .env Additions

```
# Hospitality
HSP_BOOKING_COM_API_KEY=xxx
HSP_EXPEDIA_API_KEY=xxx
HSP_BOOKING_COM_PROPERTY_ID=xxx
HSP_EXPEDIA_PROPERTY_ID=xxx
HSP_OTA_SYNC_INTERVAL_MIN=15
HSP_OTA_STALE_THRESHOLD_MIN=30
HSP_KMS_KEY_ID=xxx    # for guest ID encryption
HSP_NO_SHOW_CHARGE_NIGHTS=1
HSP_EARLY_CHECKIN_FEE=50
HSP_LATE_CHECKOUT_FEE=50
```

---

## 11.10 OTA Webhook Routes

OTA webhooks arrive at different paths (channel managers push here):

```typescript
// In hospitalityCompose:
new Elysia()
  .post("/hospitality/webhooks/booking-com", async ({ body, headers }) => {
    verifyBookingComSignature(headers["x-signature"], JSON.stringify(body));
    await handleOtaWebhook("booking-com", body);
    return { received: true };
  })
  .post("/hospitality/webhooks/expedia", async ({ body, headers }) => {
    verifyExpediaSignature(headers["x-expedia-signature"], JSON.stringify(body));
    await handleOtaWebhook("expedia", body);
    return { received: true };
  });
```

---

## 11.11 globals.css

```css
@source "../../packages/hospitality-web/src/**/*.tsx";
```
