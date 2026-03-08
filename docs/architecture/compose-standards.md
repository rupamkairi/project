# Compose Standards

This document defines the project standards for the **Compose layer**. It is not an implementation plan. It is the reference used to judge whether future server, web, and shared work is aligned with the architecture.

## Source Documents

This standard is derived from these existing references and from the current repo state:

- [master-architecture.md](./master-architecture.md)
- [core.md](./core.md)
- [module.md](./module.md)
- [compose-lms.md](./compose-lms.md)
- [composing-server.md](../web/lms/composing-server.md)
- [composing-web.md](../web/lms/composing-web.md)
- [lms-frontend.md](../web/lms/lms-frontend.md)

These standards take precedence over temporary code structure when the two differ.

## Compose Essence

A **Compose** is the application layer that turns reusable Modules into a real product.

A Compose:

- selects which Modules are active
- defines the application identity, roles, permissions, settings, and route base
- owns application-specific aggregates that do not belong in a reusable Module
- wires Modules together through hooks, rules, jobs, views, and navigation
- defines how the application plugs into server and web shells

A Compose is **not**:

- Core infrastructure
- a reusable bounded Module
- a place for vendor SDK code
- a dumping ground for shared code that should live in Core, a Module, or shared UI
- a second host application

The short form for this project is:

- **Core** = how the system works
- **Module** = what the system knows in reusable bounded contexts
- **Compose** = what application is being shipped
- **Host App** = the thin runtime shell that mounts one active Compose

## Layer Boundaries

### Core

Core owns primitives and runtime machinery only:

- entity and ID primitives
- result and error types
- event bus, mediator, scheduler, realtime bridge
- rule engine and state machine engine
- registries and adapter contracts

Core must never contain business vocabulary from a specific application domain.

### Module

A Module is a reusable bounded capability.

Modules:

- own their own entities, commands, queries, events, FSMs, and jobs
- communicate only through commands, queries, and events
- stay reusable across multiple Composes

Modules must never:

- import another module's internals
- read another module's tables or repositories directly
- depend on a Compose
- contain UI navigation or application-specific route structure

### Compose

Compose owns orchestration and application-specific meaning.

Compose is the correct place for:

- role matrices and permission maps
- application naming and base path
- compose-specific settings and feature defaults
- dashboard definitions and navigation structure
- compose-specific routes and pages
- compose-specific hooks and rules
- application-specific aggregates built from multiple Modules
- integration defaults chosen for one application type

Compose must never:

- absorb logic that belongs entirely inside one Module
- leak app-specific naming into Core
- replace proper shared packages with copy-pasted types
- bypass Module boundaries

### Host App

The host app is the runtime shell. It should stay thin.

The host app is responsible for:

- loading the active Compose
- providing runtime infrastructure and adapters
- mounting server routes and web route trees
- exposing generic health, auth, and platform shell capabilities

The host app must not hardcode compose-specific business behavior.

## Compose Ownership Rules

Use these rules when deciding where something belongs.

### Belongs in a Compose

Put it in a Compose when it is tied to a specific application type:

- LMS `Course`, `Enrollment`, `Certificate`, `Cohort`
- Ecommerce `Order`, `Cart`, `Coupon`
- Project `Project`, `Milestone`, `TimeEntry`
- compose-specific dashboards, review queues, settings panels, notification templates, and landing pages
- orchestration such as "when enrollment activates, create progress, post ledger entries, notify learner"

### Belongs in a Module

Put it in a Module when it is reusable across application types:

- identity and access management
- workflow engine behavior
- generic notifications
- documents and files
- scheduling primitives
- analytics capture primitives
- ledger primitives

### Promote From Compose to Module When

Promote something out of a Compose when it becomes:

- reusable in two or more Composes
- a bounded capability with its own stable commands, queries, and events
- independent of one application's route structure and UX

## Standards for New Composes

Every new Compose must define the following as documentation before implementation:

- purpose and app surfaces
- selected Modules
- actor roles and permissions
- compose-owned aggregates
- core hooks and rules
- server surface
- web surface
- shared assets and settings
- integration defaults
- gotchas and boundary notes

The naming standard is:

- compose ID: kebab-case
- architecture doc: `docs/architecture/compose-<id>.md`
- web doc directory: `docs/web/<id>/`
- default route base: `/<compose-id>`

## Plugging a Compose Into the Application

The standard plug model for this project is:

- one active Compose per deployment or workspace
- the host app mounts the active Compose through a single compose entry
- the host app does not manually import feature routes page by page
- the host app does not manually wire compose business rules into startup files

### Server Plug Standard

Each Compose must expose a server entry that declares:

- compose manifest
- required Modules
- compose-owned schemas and aggregates
- command and query registrations
- route registrations
- hooks and rules
- jobs and realtime bindings
- seeds and default settings

Server-specific business orchestration must live in compose hooks and rules, not in host startup code.

### Web Plug Standard

Each Compose must expose a web entry that declares:

- base route
- auth entry points
- route subtree
- navigation tree
- dashboard shells and widgets
- page metadata
- compose-scoped client stores and queries

The web shell should mount a Compose through its web entry, not by enumerating all of its routes in the root router.

## Shared Things Across a Compose

The project must be strict about what is shared, who owns it, and where it lives.

### Shared Across All Composes

These belong in Core, shared packages, or root shared UI:

- primitives such as money, date, pagination, errors, result types
- generic UI primitives such as tables, forms, status badges, page shells
- auth shell and provider wiring
- generic adapter contracts
- generic rule and FSM machinery

### Shared Within One Compose

These belong in the Compose itself:

- role definitions
- permission maps
- navigation structure
- widget catalog
- template keys
- compose-scoped DTOs and view models
- compose settings schema and defaults

### Mutable Runtime Shared Data

Mutable compose data must not live only in code. The standard split is:

- code stores defaults and schemas
- runtime storage stores overrides and user-configurable values

Use these storage keys:

- `compose_id` for compose scope
- `organization_id` for tenant scope
- `actor_id` for user-specific customizations

Typical runtime-shared records:

- compose settings
- feature flags
- saved views
- dashboard layouts
- template overrides
- integration selections

The precedence order is:

1. code defaults
2. deployment overrides
3. organization overrides
4. actor overrides where relevant

## Web Standards

The web side is currently dashboard/admin-first.

Future compose web work must follow these rules:

- keep each Compose self-contained from the web point of view
- keep shared UI generic and root-level
- keep compose-specific navigation, routes, mock/reference data, and stores inside the Compose
- do not make one Compose import screens from another Compose
- do not treat current hardcoded LMS routing as the long-term standard

For cross-compose reuse on the web:

- generic UI primitives go in shared UI
- generic admin patterns go in shared admin UI
- application-specific screens stay inside the Compose

## Server Standards

The server side must preserve Module boundaries while allowing Compose orchestration.

Rules:

- Compose may call Modules only through public commands, queries, and events
- Compose must not directly touch Module repositories or tables
- Compose hooks are the correct place for cross-module flows
- Compose rules are the correct place for application-specific policy
- Compose configuration can override Module defaults, but it must not mutate Module ownership boundaries

## Current Repo Guidance

The current repo contains useful reference code, but some of it is transitional rather than normative.

Treat these as **reference implementations**, not final standards:

- hardcoded module registration in the server host
- hardcoded LMS route registration in the web router
- mock-data-driven LMS admin screens
- ecommerce compose logic embedded inside the current server app

New work should follow the standards in this document even when the current codebase has not yet fully caught up.

## Gotchas and Anti-Patterns

These are hard gotchas for future work:

- Do not put reusable domain logic in a Compose just because the first use case is LMS.
- Do not put compose-specific vocabulary in Core.
- Do not let Modules import Compose code.
- Do not let Compose import Module internals.
- Do not bypass commands, queries, and events to save time.
- Do not let the host router or server entry become a list of compose pages or compose endpoints.
- Do not treat mock data shapes as canonical domain contracts.
- Do not create shared code inside one Compose and import it outward.
- Do not store all compose behavior in environment variables.
- Do not mix global defaults, tenant settings, and user preferences into one undifferentiated settings object.
- Do not duplicate the same business aggregate in both Module and Compose layers.

## Documentation Checklist for Future Compose Work

Before implementation of any new Compose or major Compose change, the docs must answer:

- What Modules are selected and why?
- What does the Compose own that Modules do not?
- What are the main server hooks and rules?
- What are the main web surfaces?
- What is shared across server and web?
- What is configurable at runtime?
- What belongs in code defaults vs persisted storage?
- What are the plug points into the host application?
- What are the non-obvious gotchas?

## Default Project Decisions

Until explicitly changed by a future architecture decision, this project assumes:

- one active Compose per deployment or workspace
- dashboard/admin-first web surfaces
- docs first, implementation second
- Composes are pluggable application profiles, not mini-frameworks
- the host application should be thin
- Modules remain reusable and Compose remains orchestration-only
