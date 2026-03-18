# Web Architecture

This document outlines the architecture of the web application. It is part of a larger Turborepo monorepo. For more details on the monorepo structure, see the [Monorepo Architecture](../monorepo-architecture.md) documentation.

## Directory Structure

```
apps/web/src/
├── components/
├── hooks/
├── lib/
├── routes/
│   ├── index.tsx       # Home page route
│   └── dashboard.tsx   # Dashboard page route
├── types/
├── index.css
├── main.tsx
└── router.ts
```

> **Note**: The root route (`__root.tsx`) is no longer in `apps/web/src/routes/`.
> It has been moved to `packages/router/` as a shared root route that both the
> host app and all composes use. This solves the TanStack Router limitation of
> having only one root route per application.

---

## 1. Entry Point

### `main.tsx`

- **Purpose**: This is the main entry point for the React application.
- **Functions**:
  - Renders the root React component.
  - Sets up the TanStack Router for handling client-side routing.

---

## 2. Routing

### `router.ts`

- **Purpose**: Defines the application's routes using TanStack Router.
- **Functions**:
  - Creates a router instance.
  - Imports and organizes the route tree from the `routes` directory.
  - Uses `sharedRootRoute` from `@projectx/shared-router` as the base.

> **Important**: The host app must use `sharedRootRoute` from `@projectx/shared-router`
> instead of creating its own root route. This ensures all composes can plug their
> routes into the same route tree without conflicts.

---

## 3. Application Structure

### `components/`

- **Purpose**: Contains reusable UI components used throughout the application.
- **Examples**: Buttons, inputs, modals, etc.

### `hooks/`

- **Purpose**: Contains custom React hooks that encapsulate and reuse stateful logic.
- **Examples**: `use-local-storage`, `use-api`, etc.

### `lib/`

- **Purpose**: Contains utility functions and third-party library configurations.
- **Examples**: `utils.ts`, `axios.ts`, etc.

### `modules/`

- **Purpose**: Contains components and hooks that are specific to a particular business module.
- **Structure**: This directory is often organized by feature or domain.

### `routes/`

- **Purpose**: Defines the application's routes and their corresponding components.
- **Structure**: Each file in this directory typically corresponds to a specific route.
  - `index.tsx`: The component for the home page.
  - `dashboard.tsx`: The component for the dashboard page.

> **Note**: The root layout (`__root.tsx`) has been moved to `packages/router/`
> as `sharedRootRoute`. All route files in `apps/web/src/routes/` should use
> `sharedRootRoute` as their parent via `getParentRoute: () => sharedRootRoute`.

### `types/`

- **Purpose**: Contains TypeScript type definitions used throughout the application.
- **Examples**: `user.ts`, `product.ts`, etc.
