# ProjectX - Compose-First Application Factory

## Architecture

ProjectX is a **compose-first application factory** for dashboard-style products.

### Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Compose (App-Specific)               │
│  - Orchestrates Modules                                 │
│  - Defines roles, permissions, settings                 │
│  - Wires cross-module behavior                          │
└─────────────────────────────────────────────────────────┘
                           │ uses
┌─────────────────────────────────────────────────────────┐
│              Module (Reusable Bounded Context)          │
│  - Identity, Catalog, Inventory, Ledger, etc.           │
│  - Own entities, commands, queries, events, FSMs        │
│  - Communicates via public interfaces only              │
└─────────────────────────────────────────────────────────┘
                           │ uses
┌─────────────────────────────────────────────────────────┐
│           Core (Primitives & Runtime Machinery)         │
│  - Primitives: Money, Entity, ID, PaginatedResult       │
│  - CQRS: Command, Query, Mediator, Handlers             │
│  - Event: DomainEvent, EventBus, EventStore             │
│  - State: StateMachine, FSMEngine                       │
│  - Rule: RuleEngine, RuleExpr                           │
│  - Repository: BaseRepository, Filter, QueryOptions     │
└─────────────────────────────────────────────────────────┘
```

### Current Modules

| Module | Description |
|--------|-------------|
| **Identity** | Organizations, actors, roles, sessions, API keys |
| **Catalog** | Categories, items, variants, price lists |
| **Inventory** | Stock, movements, locations |
| **Ledger** | Accounts, transactions, journals |
| **Workflow** | Workflows, instances, tasks |
| **Scheduling** | Calendars, events, recurring schedules |
| **Document** | Documents, versions, folders |
| **Notification** | Notifications, channels, preferences |
| **Geo** | Locations, regions, boundaries |
| **Analytics** | Events, metrics, reports |

### Current Composes

| Compose | Location | Description |
|---------|----------|-------------|
| **LMS** | `apps/web` | Learning Management System |
| **Ecommerce** | `apps/server` | E-commerce platform |

## Tech Stack

- **Runtime:** Bun
- **Framework:** Elysia (HTTP), BullMQ (Queue)
- **Database:** PostgreSQL (via Neon)
- **ORM:** Drizzle
- **Type System:** TypeScript (strict)
- **API Docs:** TypeDoc + Swagger

## Documentation

### Auto-Generated Docs

```bash
cd apps/server
bun run docs:build
```

Opens at: `docs/generated/index.html`

### Memory Bank Files

- `architecture.md` - This file
- `dependencies.md` - All dependencies and why
- `tech.md` - Technology decisions
- `brief.md` - Project summary

## Commands

```bash
# Development
bun run dev              # Start server with hot reload
bun run worker:dev       # Start worker with hot reload

# Documentation
bun run docs:build       # Generate all docs
bun run docs:export-openapi  # Export OpenAPI spec

# Database
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema to database
bun run db:studio        # Open Drizzle Studio
```

## Rules

1. **Core** - No business vocabulary, primitives only
2. **Module** - Reusable bounded contexts, public interfaces only
3. **Compose** - Orchestration only, no reusable logic
4. **Host** - Thin shells, no business orchestration
