# Phase 21 — Compose Credentials & Integration

---

## 21.1 Port Assignment

| Service | Port |
|---|---|
| `apps/server` | 3000 |
| `apps/web` (Vite dev) | 5173 |
| LMS backend routes | `/lms/*` (mounted on server) |
| LMS web package | `packages/lms-web` |

No dedicated port — LMS compose mounts to the main Elysia server.

---

## 21.2 Environment Variables

**Server `.env` additions:**

```env
# LMS
LMS_VIDEO_CDN_BASE_URL=https://cdn.example.com/lms
LMS_CERT_STORAGE_BUCKET=lms-certificates
LMS_PDF_SERVICE_URL=http://localhost:3001  # optional external PDF service

# Payment (shared with other composes if already configured)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (shared)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=...
```

**Type-safe config access:**

```typescript
// packages/lms/src/config.ts
export const lmsConfig = {
  videoCdnBaseUrl: process.env.LMS_VIDEO_CDN_BASE_URL ?? "",
  certStorageBucket: process.env.LMS_CERT_STORAGE_BUCKET ?? "lms-certificates",
  pdfServiceUrl: process.env.LMS_PDF_SERVICE_URL ?? null,
} as const;
```

---

## 21.3 Compose Factory Integration

**File:** `packages/lms/src/index.ts`

```typescript
import Elysia from "elysia";
import { Mediator } from "@projectx/core/mediator";
import { EventBus } from "@projectx/core/event-bus";
import { Scheduler } from "@projectx/core/scheduler";

import { registerLmsHooks } from "./hooks";
import { registerLmsJobs } from "./jobs";
import { lmsCourseRoutes } from "./routes/courses";
import { lmsEnrollmentRoutes } from "./routes/enrollments";
import { lmsProgressRoutes } from "./routes/progress";
import { lmsAssignmentRoutes } from "./routes/assignments";
import { lmsCohortRoutes } from "./routes/cohorts";
import { lmsCertificateRoutes } from "./routes/certificates";
import { lmsAnalyticsRoutes } from "./routes/analytics";
import { lmsAdminRoutes } from "./routes/admin";

export type LmsApp = ReturnType<typeof createLmsCompose>;

export function createLmsCompose(
  mediator: Mediator,
  bus: EventBus,
  scheduler: Scheduler,
) {
  registerLmsHooks(bus, mediator);
  registerLmsJobs(scheduler, mediator, bus);

  return new Elysia({ prefix: "/lms" })
    .use(lmsCourseRoutes(mediator, bus))
    .use(lmsEnrollmentRoutes(mediator, bus))
    .use(lmsProgressRoutes(mediator, bus))
    .use(lmsAssignmentRoutes(mediator, bus))
    .use(lmsCohortRoutes(mediator, bus))
    .use(lmsCertificateRoutes(mediator, bus))
    .use(lmsAnalyticsRoutes(mediator))
    .use(lmsAdminRoutes(mediator, bus));
}
```

---

## 21.4 Server Shell Mount

**File:** `apps/server/src/index.ts` (additions only)

```typescript
import { createLmsCompose } from "@projectx/lms";
// ...

app.use(createLmsCompose(mediator, bus, scheduler));
```

---

## 21.5 Package.json

**File:** `packages/lms/package.json`

```json
{
  "name": "@projectx/lms",
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

## 21.6 Schema Barrel

**File:** `packages/lms/src/schema/index.ts`

```typescript
export * from "./courses";
export * from "./categories";
export * from "./instructors";
export * from "./learners";
export * from "./modules";
export * from "./quiz-questions";
export * from "./enrollments";
export * from "./module-progress";
export * from "./assignments";
export * from "./submissions";
export * from "./cohorts";
export * from "./live-sessions";
export * from "./certificates";
export * from "./coupons";
export * from "./org-config";
// 15 table exports
```

---

## 21.7 tsconfig Paths

**`packages/lms/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@projectx/lms/*": ["./src/*"]
    }
  }
}
```

---

## 21.8 Web Shell Router

**File:** `apps/web/src/router.tsx` (additions)

```tsx
import { LearnerApp } from "@projectx/lms-web";
import { InstructorApp } from "@projectx/lms-web";
import { LmsAdminApp } from "@projectx/lms-web";

// Add to root router:
{ path: "/learn/*", element: <LearnerApp /> },
{ path: "/teach/*", element: <InstructorApp /> },
{ path: "/lms-admin/*", element: <LmsAdminApp /> },
```

---

## 21.9 Vite Alias

**`apps/web/vite.config.ts`:**

```typescript
resolve: {
  alias: {
    "@projectx/lms-web": path.resolve(__dirname, "../../packages/lms-web/src"),
  },
},
```

---

## 21.10 Web Package.json

**File:** `packages/lms-web/package.json`

```json
{
  "name": "@projectx/lms-web",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "@projectx/core": "workspace:*",
    "@react-pdf/renderer": "^4.0.0",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^8.0.0",
    "react": "^19.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

---

## 21.11 Stripe Webhook Route

The payment webhook must be mounted at the server level before body parsing (raw body required for signature verification):

```typescript
// apps/server/src/webhooks/stripe.ts
app.post("/webhooks/stripe", async ({ request }) => {
  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();
  // verify + dispatch to mediator
  const event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  await mediator.dispatch({ type: "payment.webhook", payload: event });
  return { received: true };
});
```

---

## 21.12 globals.css

**`apps/web/src/globals.css`** — add LMS web package to Tailwind scan:

```css
@source "../../packages/lms-web/src/**/*.{tsx,ts}";
```
