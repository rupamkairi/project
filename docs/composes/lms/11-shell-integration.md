# Phase 11 — Shell Integration

---

## 11.1 Server Shell Mount

**File:** `apps/server/src/index.ts`

```typescript
import { createLmsCompose } from "@projectx/lms-compose";

const lmsApp = createLmsCompose(mediator, bus, scheduler);
app.use(lmsApp);
```

---

## 11.2 Compose Factory (Full)

**File:** `composes/lms/server/src/index.ts`

```typescript
import Elysia from "elysia";
import { registerLmsHooks } from "./hooks";
import { registerLmsJobs } from "./jobs";

export function createLmsCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerLmsHooks(bus, mediator);
  registerLmsJobs(scheduler, mediator);

  return new Elysia({ prefix: "/lms" })
    .use(publicCourseRoutes(mediator))
    .use(instructorCourseRoutes(mediator))
    .use(enrollmentRoutes(mediator))
    .use(progressRoutes(mediator))
    .use(assignmentRoutes(mediator))
    .use(cohortRoutes(mediator))
    .use(liveSessionRoutes(mediator))
    .use(certificateRoutes(mediator))
    .use(analyticsRoutes(mediator))
    .use(adminRoutes(mediator));
}

export type LmsApp = ReturnType<typeof createLmsCompose>;
```

---

## 11.3 Package.json — Compose

**File:** `composes/lms/server/package.json`

```json
{
  "name": "@projectx/lms-compose",
  "version": "0.1.0",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "dependencies": {
    "elysia": "*",
    "drizzle-orm": "*",
    "@neondatabase/serverless": "*"
  }
}
```

---

## 11.4 Schema Barrel

**File:** `composes/lms/server/src/schema/index.ts`

```typescript
export * from "./categories";
export * from "./courses";
export * from "./modules";
export * from "./enrollments";
export * from "./progress";
export * from "./assignments";
export * from "./submissions";
export * from "./cohorts";
export * from "./sessions";
export * from "./certificates";
export * from "./reviews";
export * from "./coupons";
export * from "./config";
```

---

## 11.5 tsconfig Paths

**File:** `apps/server/tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@projectx/lms-compose": ["../../composes/lms/server/src/index.ts"],
      "@projectx/lms-compose/schema": ["../../composes/lms/server/src/schema/index.ts"]
    }
  }
}
```

---

## 11.6 Drizzle Config

No change to `drizzle.config.ts` — it auto-discovers schemas via re-export from the server package.

Add to `apps/server/src/db/index.ts`:
```typescript
export * from "@projectx/lms-compose/schema";
```

---

## 11.7 Web Shell Router

**File:** `apps/web/src/routes.tsx`

```tsx
import { lazy } from "react";
const LmsLearnerApp = lazy(() => import("@projectx/lms-web/apps/learner"));
const LmsInstructorApp = lazy(() => import("@projectx/lms-web/apps/instructor"));
const LmsAdminApp = lazy(() => import("@projectx/lms-web/apps/admin"));

// Add to router:
{ path: "/learn/*", element: <LmsLearnerApp /> },
{ path: "/teach/*", element: <LmsInstructorApp /> },
{ path: "/lms-admin/*", element: <LmsAdminApp /> },
```

---

## 11.8 Vite Config Aliases

**File:** `apps/web/vite.config.ts`

```typescript
resolve: {
  alias: {
    "@projectx/lms-web": path.resolve(__dirname, "../../packages/lms-web/src"),
  },
}
```

---

## 11.9 Package.json — Web

**File:** `packages/lms-web/package.json`

```json
{
  "name": "@projectx/lms-web",
  "version": "0.1.0",
  "main": "src/index.ts",
  "exports": {
    "./apps/learner": "./src/apps/learner/index.ts",
    "./apps/instructor": "./src/apps/instructor/index.ts",
    "./apps/admin": "./src/apps/admin/index.ts"
  },
  "dependencies": {
    "react": "*",
    "react-router-dom": "*",
    "zustand": "*",
    "@tanstack/react-query": "*",
    "@react-pdf/renderer": "*"
  }
}
```

---

## 11.10 Server .env Additions

```
# LMS
LMS_VIDEO_CDN_BASE_URL=https://cdn.example.com/lms/videos
LMS_PDF_STORAGE_BUCKET=lms-certificates
LMS_MAX_UPLOAD_MB=500
LMS_CERTIFICATE_ISSUER_NAME=YourOrg Academy
```

---

## 11.11 globals.css

```css
@source "../../packages/lms-web/src/**/*.tsx";
```
