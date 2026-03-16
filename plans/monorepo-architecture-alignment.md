# Monorepo Architecture Alignment Analysis

## Executive Summary

The current monorepo structure partially aligns with the architecture documents but has **significant deviations** in the shell-to-compose integration pattern. The most critical issues are:

1. **Shell apps contain business logic** instead of being "pure shells" that import from composes
2. **Compose packages don't expose pluggable interfaces** (Elysia plugin / route tree)
3. **Missing shell hooks directory** in apps/web

---

## Detailed Analysis

### 1. Directory Structure Comparison

| Path                        | Expected (per docs)                            | Actual                                  | Status       |
| --------------------------- | ---------------------------------------------- | --------------------------------------- | ------------ |
| `apps/server/src/`          | core/, infra/, modules/, index.ts, worker.ts   | ✅ Matches                              | OK           |
| `apps/web/src/`             | components/, hooks/, lib/, routes/             | components/, lib/, routes/, **stores/** | ⚠️ Minor     |
| `composes/platform/server/` | hooks/, routes/, permissions/, seed/, index.ts | db/, lib/, routes/, index.ts            | ⚠️ Different |
| `composes/platform/web/`    | components/, hooks/, lib/, routes/             | lib/, routes/, stores/                  | ⚠️ Different |
| `packages/config/`          | tsconfig/, eslint/, prettier.config.js         | ✅ Exists                               | OK           |

### 2. Path Aliases Analysis

#### `apps/server/tsconfig.json`

```json
{
  "paths": {
    "@core/*": ["./src/core/*"],
    "@modules/*": ["./src/modules/*"],
    "@infra/*": ["./src/infra/*"],
    "@db/*": ["./src/infra/db/*"]
  }
}
```

**Status**: ✅ Correct - matches docs specification

#### `composes/platform/server/tsconfig.json`

```json
{
  "paths": {
    "@core/*": ["../../apps/server/src/core/*"],
    "@modules/*": ["../../apps/server/src/modules/*"],
    "@infra/*": ["../../apps/server/src/infra/*"],
    "@db/*": ["../../apps/server/src/infra/db/*"]
  }
}
```

**Status**: ✅ Correct - matches docs specification (aliases point to apps/server/src/\*)

#### `composes/platform/web/tsconfig.json`

```json
{
  "paths": {
    "@projectx/platform-web": ["./src"],
    "@/*": ["./src/*"]
  }
}
```

**Status**: ✅ Correct - per docs, web compose doesn't need @core/\* aliases

### 3. Shell-Only Pattern Violations

#### Server Shell (`apps/server/src/index.ts`)

**Expected**: Register compose plugins via `.use()`

```typescript
import { platformCompose } from "@repo/platform-server";
const app = new Elysia().use(platformCompose).listen(3000);
```

**Actual**:

```typescript
// Imports modules directly
import { IdentityModule } from "./modules/identity";
// ... registers modules but NOT compose plugins
```

**Issue**: ❌ The server imports and registers modules directly instead of letting composes provide them. The compose plugin is **never imported or used**.

#### Web Shell (`apps/web/src/router.ts`)

**Expected**: Register compose route trees via `rootRoute.addChildren()`

```typescript
import { platformRoutes } from "@repo/platform-web";
const routeTree = rootRoute.addChildren([...platformRoutes, indexRoute]);
```

**Actual**:

```typescript
import { Route as indexRoute } from "./routes/index";
import { Route as dashboardRoute } from "./routes/dashboard";
const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute]);
```

**Issue**: ❌ The router imports routes from `./routes/` (shell) instead of from `@projectx/platform-web` (compose). This means the shell contains business-specific routes.

### 4. Compose Export Pattern Issues

#### `composes/platform/server/src/index.ts`

**Expected** (per docs):

```typescript
export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(authRoutes)
  .use(userRoutes)
  .use(notificationRoutes);
export type PlatformApp = typeof platformCompose;
```

**Actual**:

```typescript
export { authRoutes } from "./routes/auth";
export { userRoutes } from "./routes/users";
// Exports individual route modules, NOT a composed Elysia plugin
```

**Issue**: ❌ The compose exports raw route modules instead of a pluggable Elysia plugin. The shell must manually compose them.

#### `composes/platform/web/src/index.ts`

**Expected** (per docs):

```typescript
export const platformRoutes = [
  loginRoute,
  usersRoute,
  notificationTemplatesRoute,
];
```

**Actual**:

```typescript
export { platformApi } from "./lib/api/platform";
export { useAuthStore } from "./stores/auth";
```

**Issue**: ❌ The compose exports API client and store, NOT a route tree. The shell cannot register routes from the compose.

### 5. Additional Issues

| Issue                   | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| Missing hooks dir       | `apps/web/src/hooks/` doesn't exist (should have auth session, theme hooks)     |
| Stores vs hooks         | `apps/web/src/stores/` exists instead of `hooks/` (React convention uses hooks) |
| Route in shell          | `apps/web/src/routes/dashboard.tsx` is business logic in the shell              |
| No compose registration | Server never imports platformCompose; Web never imports platformRoutes          |

---

## Recommendations

### Priority 1: Fix Shell-to-Compose Integration

**For Server**:

1. Create the Elysia plugin in `composes/platform/server/src/index.ts`:

```typescript
import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
// ... other routes

export const platformCompose = new Elysia({ prefix: "/platform" })
  .use(authRoutes)
  .use(userRoutes);

export type PlatformApp = typeof platformCompose;
```

2. Update `apps/server/src/index.ts` to import and use:

```typescript
import { platformCompose } from "@projectx/platform-server";

const app = new Elysia().use(platformCompose); // Add this
// ... rest of shell setup
```

**For Web**:

1. Create route exports in `composes/platform/web/src/routes/index.ts`:

```typescript
import { loginRoute } from "./auth/login";
import { usersRoute } from "./users";

export const platformRoutes = [loginRoute, usersRoute];
```

2. Update `apps/web/src/router.ts`:

```typescript
import { platformRoutes } from "@projectx/platform-web";

const routeTree = rootRoute.addChildren([...platformRoutes, indexRoute]);
```

### Priority 2: Clean Up Shell Directories

1. **Delete** `apps/web/src/routes/dashboard.tsx` (business logic belongs in compose)
2. **Create** `apps/web/src/hooks/` with shell-level hooks (auth session, theme)
3. **Rename** `apps/web/src/stores/` → `apps/web/src/hooks/` (or migrate to hooks pattern)

### Priority 3: Update AGENTS.md

Add the following clarifications to AGENTS.md:

```
## Shell-Only Pattern Enforcement

The shell apps (`apps/server`, `apps/web`) must NEVER contain:
- Business-specific routes
- Direct module imports for business logic
- Compose-specific functionality

They must ALWAYS:
- Import and use compose plugins (server)
- Import and register compose route trees (web)
- Keep only infrastructure and shell-level concerns
```

---

## Summary

| Aspect              | Alignment |
| ------------------- | --------- |
| Directory structure | 80%       |
| Path aliases        | 100%      |
| Shell-only pattern  | 30%       |
| Compose exports     | 40%       |

**Overall: ~60% alignment** - Significant work needed to achieve full compliance with architecture documents.
