# Web Architecture

This document outlines the architecture of the web application. It is part of a larger Turborepo monorepo. For more details on the monorepo structure, see the [Monorepo Architecture](../docs/monorepo-architecture.md) documentation.

## Design System

For UI/UX guidelines, component standards, and styling conventions, see the [Design System Guidelines](../docs/design-system-guidelines.md).

## Directory Structure

```
apps/web/src/
├── components/     # Shell UI only (nav, sidebar, layout wrappers)
├── hooks/          # Shell hooks (auth session, theme)
├── lib/            # API client setup, utils
├── routes/
│   ├── index.tsx   # Home page route
│   └── dashboard.tsx  # Dashboard page route (legacy - moving to composes)
├── index.css       # Imports from @projectx/config for TailwindCSS
├── main.tsx
└── router.ts       # Registers all compose route trees
```

> **Important**: All UI components should be imported from `@projectx/ui` package.
> See [Design System Guidelines](../docs/design-system-guidelines.md) for details.

---

## 1. Entry Point

### `main.tsx`

- **Purpose**: This is the main entry point for the React application.
- **Functions**:
  - Renders the root React component.
  - Sets up the TanStack Router for handling client-side routing.
  - Initializes authentication on app startup.

---

## 2. Routing

### `router.ts`

- **Purpose**: Defines the application's routes using TanStack Router.
- **Functions**:
  - Creates a router instance.
  - Imports and organizes the route tree from the `routes` directory and composes.
  - Uses `sharedRootRoute` from `@projectx/shared-router` as the base.
  - Handles authentication errors and redirects.

> **Important**: The host app must use `sharedRootRoute` from `@projectx/shared-router`
> instead of creating its own root route. This ensures all composes can plug their
> routes into the same route tree without conflicts.

---

## 3. Styling & Design System

### TailwindCSS Configuration

All TailwindCSS configuration is centralized in `packages/config/`:

- **`packages/config/src/index.css`** - Base CSS with Tailwind directives and CSS variables
- **`packages/config/tailwind.config.js`** - Tailwind configuration with theme customization

### Usage in apps/web

```typescript
// apps/web/src/index.css
@import "@projectx/config/src/index.css";
```

### UI Components

All UI components should be imported from `@projectx/ui`:

```typescript
import { Button, Input, Card, Spinner, cn } from "@projectx/ui";
```

See [Design System Guidelines](../docs/design-system-guidelines.md) for detailed component documentation.

---

## 4. Application Structure

### `components/`

- **Purpose**: Contains reusable UI components used throughout the application.
- **Note**: Prefer using `@projectx/ui` components. Only create shell-specific components here.
- **Examples**: Navigation, sidebars, layout wrappers.

### `hooks/`

- **Purpose**: Contains custom React hooks that encapsulate and reuse stateful logic.
- **Examples**: Auth session, theme management, etc.

### `lib/`

- **Purpose**: Contains utility functions and third-party library configurations.
- **Examples**: API client setup, axios configuration.

### `routes/`

- **Purpose**: Defines the application's routes and their corresponding components.
- **Structure**: Each file in this directory typically corresponds to a specific route.
  - `index.tsx`: The component for the home page.
  - `dashboard.tsx`: Legacy - business logic should be in composes.

> **Note**: The root layout (`__root.tsx`) has been moved to `packages/router/`
> as `sharedRootRoute`. All route files in `apps/web/src/routes/` should use
> `sharedRootRoute` as their parent via `getParentRoute: () => sharedRootRoute`.

---

## 5. Authentication

### Auth Flow

The platform compose (`composes/platform/web`) provides authentication:

- **AuthGuard** - Protects routes from unauthorized access
- **Login/Logout** - Handled by platform compose
- **Session Validation** - Checked on app startup via `checkAuth()`

### Router Integration

```typescript
// router.tsx
const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => {
    if (error?.message === "UNAUTHENTICATED") {
      window.location.href = "/login";
      return null;
    }
    throw error;
  },
});
```

---

## Related Documentation

- [Design System Guidelines](../docs/design-system-guidelines.md)
- [Monorepo Architecture](../docs/monorepo-architecture.md)
- [Compose Standards](../docs/architecture/compose-standards.md)
