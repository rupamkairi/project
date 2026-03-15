# Server Architecture

This document outlines the architecture of the server application. It is part of a larger Turborepo monorepo. For more details on the monorepo structure, see the [Monorepo Architecture](../monorepo-architecture.md) documentation.

## Directory Structure

```
apps/server/src/
├── core/
├── infra/
├── modules/
├── index.ts
└── worker.ts
```

---

## 1. Entry Points

### `index.ts`

-   **Purpose**: This is the main entry point for the Elysia HTTP server.
-   **Functions**:
    -   Initializes the Elysia server.
    -   Applies middleware for CORS, Swagger API documentation, and Bearer token authentication.
    -   Registers all application modules.
    -   Boots the modules before starting the server.
    -   Defines and exposes endpoints for health checks (`/health`) and application metadata (`/core`, `/schemas`, `/modules`).
    -   Implements a global error handler.
    -   Starts the server.

### `worker.ts`

-   **Purpose**: This is the entry point for a background worker process that processes jobs from a queue.
-   **Functions**:
    -   Initializes and boots all application modules.
    -   Creates queue and worker instances for each module.
    -   Processes jobs from the queues.
    -   Handles graceful shutdown of the worker process.

---

## 2. Core (`src/core`)

This directory contains the core abstractions and building blocks of the application. Each subdirectory represents a key architectural concept.

-   **`context`**: Defines the system context and runtime environment.
-   **`cqrs`**: Implements Command Query Responsibility Segregation (CQRS) with a mediator and handlers.
-   **`entity`**: Provides the base `Entity` interface, ID generation, and other entity-related utilities.
-   **`errors`**: Defines a hierarchy of custom error classes for consistent error handling.
-   **`event`**: Implements a domain event system with an event bus and event store.
-   **`module`**: Contains the logic for the module system and registry, allowing for modular application design.
-   **`primitives`**: Defines basic data types like `Money` and `Pagination`.
-   **`queue`**: Defines interfaces for background job processing.
-   **`realtime`**: Defines interfaces for real-time communication.
-   **`repository`**: Provides repository interfaces for data access.
-   **`rule`**: Implements a rule engine for expression evaluation.
-   **`state`**: Provides a state machine and Finite State Machine (FSM) engine.

---

## 3. Infrastructure (`src/infra`)

This directory contains implementations of the core interfaces, connecting them to specific technologies.

-   **`cache`**: Implementation for caching.
-   **`db`**: Contains the database schema definitions and Drizzle ORM setup.
-   **`queue`**: Implementation for the background job queue (e.g., using Redis).
-   **`realtime`**: Implementation for real-time communication (e.g., using WebSockets).
-   **`env.ts`**: Loads and validates environment variables.

---

## 4. Modules (`src/modules`)

This directory contains the different business modules of the application. Each module is a self-contained unit of functionality.

-   **`analytics`**: Handles analytics and reporting.
-   **`catalog`**: Manages the product catalog.
-   **`document`**: Manages documents and versions.
-   **`geo`**: Provides geolocation services.
-   **`identity`**: Handles user authentication, authorization, and identity management.
-   **`inventory`**: Manages inventory and stock levels.
-   **`ledger`**: Provides accounting and financial ledger functionality.
-   **`notification`**: Handles sending notifications to users.
-   **`scheduling`**: Manages scheduling of events and appointments.
-   **`workflow`**: Implements a workflow engine.
