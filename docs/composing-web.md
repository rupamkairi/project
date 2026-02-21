# Composing Web — Pluggable Frontend Architecture

> A pattern for building self-contained, enable/disable-able feature modules in the web app.

---

## Overview

The frontend is composed of independent **modules** that can be added, removed, or toggled without affecting other parts of the application. Each module is a self-contained unit with its own:

- Routes
- Components
- Types
- State (stores)
- Mock data
- Configuration

This enables:

- **Plug-and-play**: Enable/disable modules via configuration
- **Team autonomy**: Different teams can own different modules
- **Clean boundaries**: No implicit dependencies between modules
- **Easier testing**: Modules can be tested in isolation
- **Progressive migration**: Legacy code can coexist with new modules

---

## Module Structure

Each module lives in `src/modules/<module-name>/`:

```
src/modules/<module-name>/
├── index.ts                    # Module entry point (exports public API)
├── config.ts                   # Module metadata, navigation, feature flags
├── types/
│   └── index.ts                # All TypeScript types for the module
├── lib/
│   ├── store.ts                # Zustand stores (state management)
│   └── mock-data.ts            # Mock data for development
├── components/
│   ├── layout/                 # Layout components (sidebars, headers)
│   ├── auth/                   # Auth guards, role checks
│   └── shared/                 # Reusable components within the module
└── routes/
    ├── layout.tsx              # Layout route (parent for all module routes)
    ├── login.tsx               # Login page (if module has auth)
    ├── <feature>/
    │   ├── index.tsx           # List/view page
    │   └── $id.tsx             # Detail page (dynamic param)
    └── ...
```

### Example: LMS Module

```
src/modules/lms/
├── index.ts
├── config.ts
├── types/index.ts
├── lib/
│   ├── store.ts
│   └── mock-data.ts
├── components/
│   ├── layout/dashboard-layout.tsx
│   ├── auth/auth-guard.tsx
│   └── shared/
│       ├── status-badge.tsx
│       ├── page-header.tsx
│       ├── kpi-card.tsx
│       ├── empty-state.tsx
│       └── loading-skeleton.tsx
└── routes/
    ├── layout.tsx              # /lms
    ├── login.tsx               # /lms/login
    ├── dashboard/index.tsx     # /lms/dashboard
    ├── courses/
    │   ├── index.tsx           # /lms/courses
    │   └── $courseId.tsx       # /lms/courses/:courseId
    └── ...
```

---

## Integration Points

### 1. Router Integration (`src/router.ts`)

The root router imports module routes and merges them into the route tree:

```typescript
// src/router.ts
import { Route as rootRoute } from "./routes/__root";

// Root-level routes (non-module)
import { Route as indexRoute } from "./routes/index";
import { Route as aboutRoute } from "./routes/about";

// Module routes
import { Route as lmsLoginRoute } from "./modules/lms/routes/login";
import { Route as lmsLayoutRoute } from "./modules/lms/routes/layout";
import { Route as lmsDashboardRoute } from "./modules/lms/routes/dashboard/index";
// ... more module routes

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  lmsLoginRoute,
  lmsLayoutRoute.addChildren([
    lmsDashboardRoute,
    // ... all module child routes
  ]),
]);

export const router = createRouter({ routeTree });
```

### 2. Module Entry Point (`index.ts`)

Exports the module's public API:

```typescript
// src/modules/lms/index.ts
export * from "./types";
export * from "./lib/mock-data";
export * from "./lib/store";
export { lmsNavigation, lmsMeta } from "./config";
export type { NavItem, NavGroup, NavigationItem } from "./config";
```

### 3. Module Configuration (`config.ts`)

Defines module metadata and navigation structure:

```typescript
// src/modules/lms/config.ts
import type { NavItem, NavGroup, NavigationItem } from "./types";

export const lmsNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/lms/dashboard", icon: LayoutDashboard },
  { name: "Courses", href: "/lms/courses", icon: BookOpen },
  // ... more nav items
];

export const lmsMeta = {
  name: "LMS Admin",
  description: "Learning Management System Admin Panel",
  version: "1.0.0",
  routePrefix: "/lms",
};
```

---

## Creating a New Module

### Step 1: Create Directory Structure

```bash
mkdir -p src/modules/<module-name>/{types,lib,components/{layout,auth,shared},routes}
```

### Step 2: Define Types

```typescript
// src/modules/<module-name>/types/index.ts
export interface Widget {
  id: string;
  name: string;
  // ...
}

export type WidgetStatus = "active" | "inactive";
```

### Step 3: Create Mock Data

```typescript
// src/modules/<module-name>/lib/mock-data.ts
import type { Widget } from "../types";

export const mockWidgets: Widget[] = [
  { id: "1", name: "Widget 1" },
  // ...
];
```

### Step 4: Create Stores (if needed)

```typescript
// src/modules/<module-name>/lib/store.ts
import { create } from "zustand";

interface WidgetState {
  selectedWidget: string | null;
  setSelectedWidget: (id: string | null) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  selectedWidget: null,
  setSelectedWidget: (id) => set({ selectedWidget: id }),
}));
```

### Step 5: Create Configuration

```typescript
// src/modules/<module-name>/config.ts
import type { NavItem, NavGroup, NavigationItem } from "./types";

export const widgetNavigation: NavigationItem[] = [
  { name: "Widgets", href: "/widgets", icon: Box },
];

export const widgetMeta = {
  name: "Widget Manager",
  description: "Manage your widgets",
  version: "1.0.0",
  routePrefix: "/widgets",
};
```

### Step 6: Create Layout Route

```typescript
// src/modules/<module-name>/routes/layout.tsx
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { WidgetLayout } from "../components/layout/widget-layout";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/widgets",
  component: WidgetLayout,
});
```

### Step 7: Create Feature Routes

```typescript
// src/modules/<module-name>/routes/index.tsx
import { createRoute } from "@tanstack/react-router";
import { Route as widgetLayoutRoute } from "./layout";

export const Route = createRoute({
  getParentRoute: () => widgetLayoutRoute,
  path: "/",
  component: WidgetList,
});

function WidgetList() {
  // ...
}
```

### Step 8: Create Entry Point

```typescript
// src/modules/<module-name>/index.ts
export * from "./types";
export * from "./lib/mock-data";
export * from "./lib/store";
export { widgetNavigation, widgetMeta } from "./config";
```

### Step 9: Register in Router

```typescript
// src/router.ts
import { Route as widgetLayoutRoute } from "./modules/widget/routes/layout";
import { Route as widgetIndexRoute } from "./modules/widget/routes/index";
// ...

const routeTree = rootRoute.addChildren([
  // ...existing routes
  widgetLayoutRoute.addChildren([
    widgetIndexRoute,
    // ...more widget routes
  ]),
]);
```

---

## Shared Resources

### What Stays at Root Level

- **UI Components** (`src/components/ui/`): shadcn/ui components, shared across all modules
- **Utilities** (`src/lib/utils.ts`): Common utility functions
- **Root Layout** (`src/routes/__root.tsx`): App shell, global providers
- **Public Routes** (`src/routes/`): Non-module pages (home, about, contact)

### What Goes in Modules

- Feature-specific components
- Feature-specific types
- Feature-specific stores
- Feature-specific mock data
- Feature routes
- Feature navigation config

---

## Route Naming Conventions

| Pattern               | Description        | Example                  |
| --------------------- | ------------------ | ------------------------ |
| `/module`             | Module layout/base | `/lms`                   |
| `/module/login`       | Module login       | `/lms/login`             |
| `/module/feature`     | Feature list       | `/lms/courses`           |
| `/module/feature/$id` | Feature detail     | `/lms/courses/$courseId` |
| `/module/feature/sub` | Sub-feature        | `/lms/analytics/revenue` |

---

## Module Isolation Rules

1. **No cross-module imports**: Modules should not import from other modules
2. **Shared via root**: Use root-level shared components/utilities only
3. **Self-contained routes**: All route components live in the module
4. **Own types**: Each module defines its own types, no sharing via root types
5. **Own stores**: State management is module-scoped

---

## Future: Module Registry (Optional Enhancement)

A `modules.config.ts` at root level could control which modules are enabled:

```typescript
// src/modules.config.ts (future)
export const enabledModules = {
  lms: true,
  widgets: false,
  analytics: true,
};

// Router would conditionally include routes based on this config
```

---

## Summary Checklist

When creating a new module:

- [ ] Create `src/modules/<name>/` directory
- [ ] Add `types/index.ts` with all module types
- [ ] Add `lib/mock-data.ts` with mock data
- [ ] Add `lib/store.ts` with Zustand stores (if needed)
- [ ] Add `config.ts` with navigation and metadata
- [ ] Add `components/layout/` with layout component
- [ ] Add `components/auth/` with auth guard (if needed)
- [ ] Add `components/shared/` with shared components
- [ ] Add `routes/layout.tsx` as parent route
- [ ] Add feature routes under `routes/`
- [ ] Add `index.ts` exporting public API
- [ ] Register routes in `src/router.ts`
- [ ] Verify build passes: `npm run build`
- [ ] Verify types: `npx tsc --noEmit`
