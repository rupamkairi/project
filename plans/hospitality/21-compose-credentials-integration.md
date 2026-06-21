# Phase 21 — Compose Credentials & Integration

---

## 21.1 Port Assignment

| Service | Port |
|---|---|
| `apps/server` | 3000 |
| `apps/web` (Vite dev) | 5173 |
| Hospitality backend routes | `/hospitality/*` (mounted on server) |
| Hospitality web package | `packages/hospitality-web` |

---

## 21.2 Environment Variables

**Server `.env` additions:**

```env
# Hospitality
HSP_DEFAULT_CHECKIN_TIME=14:00
HSP_DEFAULT_CHECKOUT_TIME=11:00
HSP_NO_SHOW_PROCESS_HOUR=2          # 2AM cron
HSP_NIGHTLY_CHARGE_HOUR=23          # 11PM cron
HSP_CHANNEL_SYNC_INTERVAL_MINUTES=15

# OTA Channel Credentials
HSP_BOOKING_COM_API_KEY=...
HSP_BOOKING_COM_PROPERTY_ID=...
HSP_BOOKING_COM_HMAC_SECRET=...

HSP_EXPEDIA_API_KEY=...
HSP_EXPEDIA_PROPERTY_ID=...
HSP_EXPEDIA_HMAC_SECRET=...

HSP_AIRBNB_CLIENT_ID=...
HSP_AIRBNB_CLIENT_SECRET=...

# Guest ID encryption (PII at rest)
HSP_KMS_KEY_ID=arn:aws:kms:...
# Or local dev: use static key
HSP_ENCRYPTION_KEY=hex_32_bytes_here

# Email for guest communications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=...
```

**Type-safe config access:**

```typescript
// packages/hospitality/src/config.ts
export const hspConfig = {
  defaultCheckInTime: process.env.HSP_DEFAULT_CHECKIN_TIME ?? "14:00",
  defaultCheckOutTime: process.env.HSP_DEFAULT_CHECKOUT_TIME ?? "11:00",
  noShowProcessHour: parseInt(process.env.HSP_NO_SHOW_PROCESS_HOUR ?? "2"),
  nightlyChargeHour: parseInt(process.env.HSP_NIGHTLY_CHARGE_HOUR ?? "23"),
  channelSyncIntervalMinutes: parseInt(process.env.HSP_CHANNEL_SYNC_INTERVAL_MINUTES ?? "15"),
  channels: {
    bookingCom: {
      apiKey: process.env.HSP_BOOKING_COM_API_KEY ?? "",
      propertyId: process.env.HSP_BOOKING_COM_PROPERTY_ID ?? "",
      hmacSecret: process.env.HSP_BOOKING_COM_HMAC_SECRET ?? "",
    },
    expedia: {
      apiKey: process.env.HSP_EXPEDIA_API_KEY ?? "",
      propertyId: process.env.HSP_EXPEDIA_PROPERTY_ID ?? "",
      hmacSecret: process.env.HSP_EXPEDIA_HMAC_SECRET ?? "",
    },
  },
  encryptionKey: process.env.HSP_ENCRYPTION_KEY ?? "",
} as const;
```

---

## 21.3 Compose Factory Integration

**File:** `packages/hospitality/src/index.ts`

```typescript
import Elysia from "elysia";
import type { Mediator } from "@projectx/core/mediator";
import type { EventBus } from "@projectx/core/event-bus";
import type { Scheduler } from "@projectx/core/scheduler";

import { registerHospitalityHooks } from "./hooks";
import { registerHospitalityJobs } from "./jobs";
import { reservationRoutes } from "./routes/reservations";
import { frontDeskRoutes } from "./routes/front-desk";
import { housekeepingRoutes } from "./routes/housekeeping";
import { folioRoutes } from "./routes/folios";
import { ratePlanRoutes } from "./routes/rate-plans";
import { revenueRoutes } from "./routes/revenue";
import { maintenanceRoutes } from "./routes/maintenance";
import { adminRoutes } from "./routes/admin";
import { guestPortalRoutes } from "./routes/guest-portal";
import { otaWebhookRoutes } from "./routes/ota-webhooks";

export type HospitalityApp = ReturnType<typeof createHospitalityCompose>;

export function createHospitalityCompose(
  mediator: Mediator,
  bus: EventBus,
  scheduler: Scheduler,
) {
  registerHospitalityHooks(bus, mediator);
  registerHospitalityJobs(scheduler, mediator, bus);

  return new Elysia({ prefix: "/hospitality" })
    .use(reservationRoutes(mediator, bus))
    .use(frontDeskRoutes(mediator, bus))
    .use(housekeepingRoutes(mediator, bus))
    .use(folioRoutes(mediator, bus))
    .use(ratePlanRoutes(mediator))
    .use(revenueRoutes(mediator))
    .use(maintenanceRoutes(mediator, bus))
    .use(adminRoutes(mediator))
    .use(guestPortalRoutes(mediator))
    .use(otaWebhookRoutes(mediator, bus));
}
```

---

## 21.4 OTA Webhook Routes

```typescript
// packages/hospitality/src/routes/ota-webhooks.ts
import Elysia from "elysia";
import { timingSafeEqual } from "crypto";

function verifyOtaSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function otaWebhookRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/hospitality/ota" })
    .post("/booking-com", async ({ request }) => {
      const raw = await request.text();
      const sig = request.headers.get("x-booking-signature") ?? "";
      if (!verifyOtaSignature(raw, sig, hspConfig.channels.bookingCom.hmacSecret)) {
        return new Response("Unauthorized", { status: 401 });
      }
      await mediator.dispatch({ type: "hospitality.ota.reservation", payload: { source: "booking.com", raw } });
      return { ack: true };
    })
    .post("/expedia", async ({ request }) => {
      const raw = await request.text();
      const sig = request.headers.get("x-expedia-signature") ?? "";
      if (!verifyOtaSignature(raw, sig, hspConfig.channels.expedia.hmacSecret)) {
        return new Response("Unauthorized", { status: 401 });
      }
      await mediator.dispatch({ type: "hospitality.ota.reservation", payload: { source: "expedia", raw } });
      return { ack: true };
    });
}
```

---

## 21.5 Guest Portal Auth (Token-Based)

Guest portal uses signed link tokens (not session auth):

```typescript
// packages/hospitality/src/lib/guest-token.ts
import { createHmac } from "crypto";

export function generateGuestToken(reservationId: string, guestEmail: string): string {
  const payload = `${reservationId}:${guestEmail}`;
  const sig = createHmac("sha256", hspConfig.encryptionKey).update(payload).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyGuestToken(token: string): { reservationId: string; guestEmail: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    const [reservationId, guestEmail, sig] = [parts[0], parts[1], parts[2]];
    const expected = createHmac("sha256", hspConfig.encryptionKey)
      .update(`${reservationId}:${guestEmail}`)
      .digest("hex").slice(0, 16);
    if (sig !== expected) return null;
    return { reservationId, guestEmail };
  } catch {
    return null;
  }
}
```

Guest portal routes use `verifyGuestToken` middleware instead of standard auth.

---

## 21.6 Server Shell Mount

**File:** `apps/server/src/index.ts` (additions only)

```typescript
import { createHospitalityCompose } from "@projectx/hospitality";
// ...

app.use(createHospitalityCompose(mediator, bus, scheduler));
```

---

## 21.7 Package.json

**File:** `packages/hospitality/package.json`

```json
{
  "name": "@projectx/hospitality",
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

**File:** `packages/hospitality/src/schema/index.ts`

```typescript
export * from "./room-types";
export * from "./rooms";
export * from "./guest-profiles";
export * from "./reservations";
export * from "./folios";
export * from "./folio-charges";
export * from "./rate-plans";
export * from "./rate-plan-prices";
export * from "./rate-date-overrides";
export * from "./housekeeping-tasks";
export * from "./maintenance-requests";
export * from "./service-requests";
export * from "./channel-inventory";
export * from "./group-bookings";
export * from "./org-config";
export * from "./reservation-sequence";
// 16 table exports
```

---

## 21.9 Web Shell Router

**File:** `apps/web/src/router.tsx` (additions)

```tsx
import { FrontDeskApp, HousekeepingApp, ReservationsApp, RevenueApp, GuestApp, HospitalityAdminApp } from "@projectx/hospitality-web";

{ path: "/front-desk/*", element: <FrontDeskApp /> },
{ path: "/housekeeping/*", element: <HousekeepingApp /> },
{ path: "/reservations/*", element: <ReservationsApp /> },
{ path: "/revenue/*", element: <RevenueApp /> },
{ path: "/guest/*", element: <GuestApp /> },              // token-based, public
{ path: "/hospitality-admin/*", element: <HospitalityAdminApp /> },
```

---

## 21.10 Vite Alias

**`apps/web/vite.config.ts`:**

```typescript
resolve: {
  alias: {
    "@projectx/hospitality-web": path.resolve(__dirname, "../../packages/hospitality-web/src"),
  },
},
```

---

## 21.11 Web Package.json

**File:** `packages/hospitality-web/package.json`

```json
{
  "name": "@projectx/hospitality-web",
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
@source "../../packages/hospitality-web/src/**/*.{tsx,ts}";
```
