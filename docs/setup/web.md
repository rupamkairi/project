# Web Setup

React + Vite web shell (`apps/web`).

→ For monorepo structure and workspaces: [monorepo.md](../monorepo.md)
→ For compose route/manifest exports: [compose.md](../compose.md)
→ For UI components and design tokens: [design-system.md](../design-system.md)

---

## Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| Vite | 6 | Dev server + bundler |
| TanStack Router | latest | Client-side routing |
| TanStack Query | latest | Server state / data fetching |
| Zustand | latest | Client state stores |
| Eden Treaty | latest | Type-safe Elysia API client |
| Tailwind CSS | v4 | Utility styling |
| shadcn/ui | latest | Component library (via `@projectx/ui`) |

---

## Directory structure

```
apps/web/src/
├── components/     ← Shell UI only (nav, sidebar, layout wrappers)
├── hooks/          ← Shell hooks (auth session, theme)
├── lib/
│   └── api.ts      ← Combined Eden Treaty client (App type from apps/server)
├── routes/
│   └── index.tsx   ← Entry redirect route
├── index.css       ← @import "@projectx/config/src/index.css"
├── main.tsx        ← React root + auth init
└── router.tsx      ← Route tree assembly + router creation
```

**Shell rule:** `apps/web` owns zero feature logic. No business routes, no compose-specific screens.

---

## Entry point — `main.tsx`

```typescript
import { initializeAuth } from "./hooks/auth";

initializeAuth();   // calls checkAuth() on startup

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

---

## Routing — `router.tsx`

Uses `sharedRootRoute` from `@projectx/shared-router` as the single root. All compose route trees attach as children.

```typescript
import { sharedRootRoute } from "@projectx/shared-router";
import { platformRoutes } from "@projectx/platform-web";
// import { crmRoutes } from "@projectx/crm-web";   ← add future composes here

const routeTree = sharedRootRoute.addChildren([
  ...platformRoutes,
  // ...crmRoutes,
  indexRoute,
]);

export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => {
    if (error?.message === "UNAUTHENTICATED") {
      window.location.href = "/platform/login";
      return null;
    }
    throw error;
  },
});
```

**Why `sharedRootRoute`:** TanStack Router allows only one `createRootRoute()` per app. If both the shell and a compose create their own root, route ID collisions crash. `packages/router` owns the single instance.

---

## Sidebar (compose registry)

The sidebar renders dynamically from a compose manifest registry. No hardcoded nav links.

```typescript
// apps/web/src/lib/compose-registry.ts
import { platformManifest } from "@projectx/platform-web";
// import { crmManifest } from "@projectx/crm-web";

export const composeRegistry = [
  platformManifest,
  // crmManifest,
];
```

Each compose web must export a `ComposeManifest`:

```typescript
interface ComposeManifest {
  id: string;
  label: string;
  icon: React.ComponentType;
  prefix: string;
  navItems: Array<{ label: string; path: string; icon: React.ComponentType }>;
}
```

---

## API client — two tiers

**Scoped client** — within a compose (typed to its own server):

```typescript
// composes/{name}/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { {Name}App } from "@projectx/{name}-server";

export const {name}Api = treaty<{Name}App>(import.meta.env.VITE_API_URL);
```

**Combined client** — shell level or cross-compose (typed to all registered composes):

```typescript
// apps/web/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "@projectx/server";

export const api = treaty<App>(import.meta.env.VITE_API_URL);
```

Use the scoped client by default. Only use the combined client for shell hooks (`useSession`, `useInbox`) or when one compose needs to call another's API.

---

## Authentication

Provided by the platform compose:

- `AuthGuard` component — wraps routes requiring auth
- `useAuthStore` — Zustand store with `checkAuth()`, `login()`, `logout()`
- `requireAuth` — utility for loader-level guards

Auth is initialized in `main.tsx` via `checkAuth()` before the router renders.

```typescript
// Router handles unauthenticated errors globally:
if (error?.message === "UNAUTHENTICATED") {
  window.location.href = "/platform/login";
}
```

---

## Styling

All Tailwind config is in `packages/config`. Import in `apps/web/src/index.css`:

```css
@import "@projectx/config/src/index.css";
```

CSS variables (design tokens) are set in `packages/config/src/index.css`. Never define custom tokens in an app or compose — add them to `packages/config` instead.

---

## Adding a new compose to the web shell

1. Install: add `@projectx/{name}-web` to `apps/web/package.json`
2. Import routes: `import { {name}Routes } from "@projectx/{name}-web"`
3. Add to `routeTree`: `sharedRootRoute.addChildren([...{name}Routes])`
4. Import manifest: `import { {name}Manifest } from "@projectx/{name}-web"`
5. Add to registry: `composeRegistry.push({name}Manifest)`

Full compose setup: [compose.md](../compose.md)

---

## Environment variables

```bash
VITE_API_URL=http://localhost:3000
```
