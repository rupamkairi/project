# Compose Server Architecture

## Plugable Compose Pattern

This document defines the architecture for creating plugable, self-contained compose modules that can be attached to any core system. The LMS Compose serves as the reference implementation.

---

## 1. Philosophy

### 1.1 Core Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOST APPLICATION                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    CORE SYSTEM                           │    │
│  │  EventBus │ FSMEngine │ RuleEngine │ Scheduler │ Queue  │    │
│  │  Database │ Logger    │ Mediator   │ Realtime          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ Interface Contract                │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    COMPOSE PLUGIN                        │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │ Entities │ │   FSMs   │ │ Commands │ │ Queries  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │  Hooks   │ │  Rules   │ │  Routes  │ │   Jobs   │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │ Events   │ │ Realtime │ │ Adapters │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

1. **Zero Core Dependencies** - Compose imports nothing from the core project
2. **Interface Segregation** - All dependencies defined as local interfaces
3. **Dependency Injection** - Host injects implementations at runtime
4. **Self-Contained** - All types, schemas, and logic live within the compose
5. **Manifest-Driven** - Plugin declares capabilities and requirements

### 1.2 Dependency Inversion

```
Traditional (Tightly Coupled):
┌────────────┐
│  Compose   │──────imports──────▶ Core
└────────────┘

Plugable (Inverted):
┌────────────┐     implements     ┌────────────┐
│   Core     │◀───────────────────│ Interfaces │
└────────────┘                    └────────────┘
                                        ▲
                                        │ imports
┌────────────┐                          │
│  Compose   │──────────────────────────┘
└────────────┘
```

---

## 2. Directory Structure

Every compose MUST follow this structure:

```
composes/{compose-name}/
│
├── interfaces/                    # ← CRITICAL: All external contracts
│   └── index.ts                   #     No imports from outside
│
├── types/                         # Domain-specific types
│   └── index.ts                   # Imports from ./interfaces
│
├── db/                            # Database layer
│   └── schema/
│       ├── helpers.ts             # Schema utilities
│       └── index.ts               # Entity schemas (drizzle-orm)
│
├── fsm/                           # State machines
│   └── index.ts                   # FSM definitions
│
├── commands/                      # Write operations
│   └── index.ts                   # Command handlers
│
├── queries/                       # Read operations
│   └── index.ts                   # Query handlers
│
├── hooks/                         # Event handlers
│   └── index.ts                   # Hook registrations
│
├── rules/                         # Business rules
│   └── index.ts                   # Rule definitions
│
├── routes/                        # HTTP routes
│   └── index.ts                   # Route definitions
│
├── jobs/                          # Scheduled jobs
│   └── index.ts                   # Job definitions
│
├── events/                        # Domain events
│   └── index.ts                   # Event definitions
│
├── realtime/                      # WebSocket channels
│   └── index.ts                   # Realtime bridge
│
├── adapters/                      # External integrations
│   └── index.ts                   # Adapter implementations
│
├── seed/                          # Initial data
│   └── index.ts                   # Seed functions
│
├── docs/                          # Documentation
│   ├── API.md                     # API reference
│   ├── SETUP.md                   # Setup guide
│   └── INTEGRATION.md             # Integration guide
│
├── index.ts                       # Main entry point
├── package.json                   # Package definition
├── tsconfig.json                  # TypeScript config
├── tsconfig.build.json            # Build config
└── README.md                      # Overview
```

---

## 3. Interface Contract

### 3.1 Required Interface Definitions

Every compose MUST define these interfaces in `interfaces/index.ts`:

```typescript
// ============================================================
// CORE TYPES - Basic building blocks
// ============================================================

export type ID = string;
export type Timestamp = number;
export type Meta = Record<string, unknown>;

export interface Money {
  amount: number;
  currency: string;
}

// ============================================================
// ENTITY BASE
// ============================================================

export interface Entity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: ID; // Multi-tenancy
  meta: Meta;
}

// ============================================================
// DOMAIN EVENT
// ============================================================

export interface DomainEvent<T = unknown> {
  id: ID;
  type: string; // 'course.created', 'enrollment.activated'
  aggregateId: ID;
  aggregateType: string;
  payload: T;
  occurredAt: Timestamp;
  actorId?: ID;
  orgId: ID;
  causedBy?: ID; // Event chaining
  correlationId: ID; // Distributed tracing
  version: number; // Optimistic concurrency
}

// ============================================================
// CQRS
// ============================================================

export interface Command<T = unknown> {
  type: string;
  payload: T;
  actorId: ID;
  orgId: ID;
  correlationId: ID;
}

export interface Query<T = unknown> {
  type: string;
  params: T;
  actorId: ID;
  orgId: ID;
}

// ============================================================
// EVENT BUS
// ============================================================

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(
    pattern: string, // Supports wildcards: 'order.*', '*.created'
    handler: (event: DomainEvent) => Promise<void>,
  ): () => void; // Returns unsubscribe function
}

// ============================================================
// STATE MACHINE
// ============================================================

export interface StateMachine<S extends string, E extends string> {
  id: string;
  initial: S;
  states: Record<S, StateNode<S, E>>;
}

export interface StateNode<S, E> {
  on?: Partial<Record<E, Transition<S>>>;
  entry?: Action[];
  exit?: Action[];
  meta?: {
    label: string;
    color?: string;
    terminal?: boolean;
  };
}

export interface Transition<S> {
  target: S;
  guard?: RuleExpr;
  actions?: Action[];
}

export interface Action {
  type: "emit" | "dispatch" | "assign" | "notify";
  event?: string;
  command?: string;
  payload?: unknown;
  field?: string;
  value?: unknown;
}

export interface FSMEngine {
  register(machine: StateMachine<string, string>): void;
  transition(
    entityType: string,
    entityId: ID,
    event: string,
    context: unknown,
  ): Promise<unknown>;
  getState(entityType: string, entityId: ID): Promise<string | null>;
}

// ============================================================
// RULE ENGINE
// ============================================================

export type Op =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "matches"
  | "exists";

export type RuleExpr =
  | { field: string; op: Op; value: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string }; // Named rule reference

export interface RuleEngine {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
  register(id: string, expr: RuleExpr): void;
  resolve(id: string): RuleExpr | undefined;
}

// ============================================================
// REPOSITORY
// ============================================================

export interface Filter {
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore?: boolean;
}

export interface Repository<T extends Entity> {
  findById(id: ID): Promise<T | null>;
  findMany(filter: Filter): Promise<PaginatedResult<T>>;
  findOne(filter: Filter): Promise<T | null>;
  save(entity: Partial<T> & { id?: ID }): Promise<T>;
  delete(id: ID): Promise<void>;
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;
}

export interface Transaction {
  findById(id: ID): Promise<Entity | null>;
  save(entity: Entity): Promise<Entity>;
  delete(id: ID): Promise<void>;
}

// ============================================================
// QUEUE & SCHEDULER
// ============================================================

export interface Job {
  id: ID;
  name: string;
  data: unknown;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress: number;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface JobOptions {
  delay?: number; // Milliseconds
  attempts?: number;
  priority?: "critical" | "standard" | "bulk";
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
}

export interface Queue {
  add(name: string, data: unknown, opts?: JobOptions): Promise<Job>;
  getJob(id: ID): Promise<Job | null>;
  getJobs(types: string[]): Promise<Job[]>;
}

export interface Scheduler {
  schedule(
    cron: string,
    name: string,
    data: unknown,
    opts?: { repeat?: { cron: string } },
  ): Promise<void>;
  cancel(name: string): Promise<void>;
}

// ============================================================
// REALTIME
// ============================================================

export interface RealtimeGateway {
  broadcast(channel: string, event: string, payload: unknown): Promise<void>;
  subscribe(clientId: ID, channels: string[]): void;
  unsubscribe(clientId: ID, channels: string[]): void;
}

// ============================================================
// DATABASE
// ============================================================

export interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
  execute(sql: string, params: unknown[]): Promise<{ rowsAffected: number }>;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}

// ============================================================
// LOGGER
// ============================================================

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// ============================================================
// ACTOR CONTEXT
// ============================================================

export interface ActorContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };
  org: {
    id: ID;
    slug: string;
    settings: Record<string, unknown>;
  };
  correlationId: ID;
}
```

### 3.2 Plugin Context Interface

```typescript
// ============================================================
// PLUGIN CONTEXT - All dependencies in one place
// ============================================================

export interface PluginContext {
  // Core systems
  eventBus: EventBus;
  fsmEngine: FSMEngine;
  ruleEngine: RuleEngine;
  scheduler: Scheduler;
  queue: Queue;
  realtime?: RealtimeGateway; // Optional

  // Data layer
  db: DatabaseClient;

  // Logging
  logger: Logger;

  // CQRS mediator
  dispatch: <R = unknown>(command: Command) => Promise<R>;
  query: <R = unknown>(query: Query) => Promise<R>;

  // Configuration
  config: PluginConfig;
}

export interface PluginConfig {
  features: Record<string, boolean>; // Feature flags
  defaults: Record<string, unknown>; // Default values
  adapters: {
    // External adapters
    payment?: PaymentAdapter;
    storage?: StorageAdapter;
    notification?: NotificationAdapter;
    // ... domain-specific adapters
  };
}
```

### 3.3 Adapter Interfaces

```typescript
// ============================================================
// COMMON ADAPTER INTERFACES
// ============================================================

export interface PaymentAdapter {
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: Money): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

export interface StorageAdapter {
  upload(
    key: string,
    file: Buffer,
    meta?: Record<string, unknown>,
  ): Promise<StoredFile>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export interface NotificationAdapter {
  send(to: string, message: NotificationPayload): Promise<NotificationResult>;
}

export interface SearchAdapter {
  index(collection: string, documents: unknown[]): Promise<void>;
  search(collection: string, query: SearchQuery): Promise<SearchResult>;
  delete(collection: string, ids: string[]): Promise<void>;
}

// Adapter result types...
export interface StoredFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface NotificationPayload {
  subject?: string;
  body: string;
  template?: string;
  variables?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

---

## 4. Plugin Class Pattern

### 4.1 Main Entry Point

The `index.ts` must export a Plugin class:

```typescript
// composes/{name}/index.ts

import type { PluginContext, EventBus, FSMEngine, ... } from './interfaces';

// ============================================================
// PLUGIN MANIFEST
// ============================================================

export const PLUGIN_MANIFEST = {
  id: '{name}',                           // kebab-case
  name: '{Human Readable Name}',
  version: '1.0.0',
  description: 'Description of what this plugin provides',
  author: 'Author Name',
  license: 'MIT',

  // What this plugin requires from host
  requiredCapabilities: [
    'eventBus',
    'fsmEngine',
    'ruleEngine',
    'scheduler',
    'database',
  ],

  // Optional capabilities that enhance functionality
  optionalCapabilities: [
    'realtime',
    'payment',
    'storage',
  ],

  // Entities this plugin provides
  entities: ['Entity1', 'Entity2', ...],

  // Events this plugin emits
  events: ['entity1.created', 'entity2.updated', ...],

  // Commands this plugin handles
  commands: ['{name}.entity1.create', ...],

  // Queries this plugin handles
  queries: ['{name}.entity1.list', ...],

  // FSMs this plugin registers
  fsms: ['entity1', 'entity2', ...],

  // Database migrations
  migrations: [
    '0001_entity1',
    '0002_entity2',
  ],
};

// ============================================================
// PLUGIN CLASS
// ============================================================

export class Plugin {
  private context: PluginContext | null = null;
  private unsubscribes: (() => void)[] = [];
  private registeredJobIds: string[] = [];

  constructor(private config: Partial<PluginConfig> = {}) {
    // Set default config
    this.config = {
      features: {
        // Default feature flags
      },
      defaults: {
        // Default values
      },
      adapters: {},
      ...config,
    };
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  async init(context: PluginContext): Promise<void> {
    this.context = context;

    const { logger } = context;
    logger.info(`${PLUGIN_MANIFEST.name} initializing...`, {
      version: PLUGIN_MANIFEST.version,
    });

    // Validate required capabilities
    this.validateCapabilities(context);

    // Register components in order
    await this.registerFSMs(context);
    await this.registerCommands(context);
    await this.registerQueries(context);
    await this.registerHooks(context);
    await this.registerRules(context);
    await this.registerJobs(context);
    await this.registerRealtime(context);

    logger.info(`${PLUGIN_MANIFEST.name} initialized successfully`, {
      entities: PLUGIN_MANIFEST.entities.length,
      events: PLUGIN_MANIFEST.events.length,
      commands: PLUGIN_MANIFEST.commands.length,
      queries: PLUGIN_MANIFEST.queries.length,
    });
  }

  private validateCapabilities(context: PluginContext): void {
    const missing: string[] = [];

    for (const cap of PLUGIN_MANIFEST.requiredCapabilities) {
      if (!(cap in context) || context[cap as keyof PluginContext] === undefined) {
        missing.push(cap);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `${PLUGIN_MANIFEST.name} requires missing capabilities: ${missing.join(', ')}`
      );
    }
  }

  // ========================================
  // COMPONENT REGISTRATION
  // ========================================

  private async registerFSMs(context: PluginContext): Promise<void> {
    const { fsmEngine, logger } = context;

    // Import FSM definitions
    const { registerFSMs } = await import('./fsm');
    registerFSMs(fsmEngine);

    logger.debug('FSMs registered', { count: PLUGIN_MANIFEST.fsms.length });
  }

  private async registerCommands(context: PluginContext): Promise<void> {
    const { logger } = context;

    // Import command handlers
    const { commandHandlers } = await import('./commands');

    // Commands are registered via the dispatch function
    // Store reference for route handlers to use

    logger.debug('Commands registered', { count: PLUGIN_MANIFEST.commands.length });
  }

  // ... other registration methods

  // ========================================
  // PUBLIC API
  // ========================================

  getRoutes(): RouteDefinition[] {
    // Return route definitions for HTTP server registration
    const { routes } = require('./routes');
    return routes;
  }

  getJobs(): ScheduledJob[] {
    // Return job definitions
    const { jobs } = require('./jobs');
    return jobs;
  }

  getManifest(): typeof PLUGIN_MANIFEST {
    return PLUGIN_MANIFEST;
  }

  getConfig(): PluginConfig {
    return { ...this.config } as PluginConfig;
  }

  // ========================================
  // LIFECYCLE
  // ========================================

  async shutdown(): Promise<void> {
    if (!this.context) return;

    const { logger } = this.context;
    logger.info(`${PLUGIN_MANIFEST.name} shutting down...`);

    // Unsubscribe from events
    for (const unsubscribe of this.unsubscribes) {
      try {
        unsubscribe();
      } catch (error) {
        logger.error('Failed to unsubscribe', { error });
      }
    }
    this.unsubscribes = [];

    logger.info(`${PLUGIN_MANIFEST.name} shutdown complete`);
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createPlugin(config?: Partial<PluginConfig>): Plugin {
  return new Plugin(config);
}

// ============================================================
// EXPORTS
// ============================================================

// Re-export all types
export * from './interfaces';
export * from './types';
export * from './db/schema';

// Re-export all components
export * from './fsm';
export * from './commands';
export * from './queries';
export * from './hooks';
export * from './rules';
export * from './routes';
export * from './jobs';
export * from './events';
export * from './realtime';
export * from './adapters';
export * from './seed';

// Default export
export default {
  Plugin,
  createPlugin,
  PLUGIN_MANIFEST,
};
```

---

## 5. Component Patterns

### 5.1 Types (`types/index.ts`)

```typescript
import type { Entity, ID, Timestamp, Money } from "../interfaces";

// Domain-specific enums
export type EntityStatus = "draft" | "active" | "archived";

// Domain entities
export interface MyEntity extends Entity {
  name: string;
  status: EntityStatus;
  // ... domain-specific fields
}

// Payload types for commands
export interface CreateEntityPayload {
  name: string;
  // ...
}

// Result types for queries
export interface EntityDetails {
  id: ID;
  name: string;
  // ... computed fields
}
```

### 5.2 FSMs (`fsm/index.ts`)

```typescript
import type { StateMachine, FSMEngine } from "../interfaces";

// Define states and events as types
export type EntityState = "draft" | "pending" | "active" | "archived";
export type EntityEvent =
  | "submit"
  | "approve"
  | "reject"
  | "archive"
  | "restore";

// Define the FSM
export const entityFSM: StateMachine<EntityState, EntityEvent> = {
  id: "entity",
  initial: "draft",
  states: {
    draft: {
      on: {
        submit: {
          target: "pending",
          guard: { field: "name", op: "exists", value: true },
          actions: [{ type: "emit", event: "entity.submitted" }],
        },
      },
      meta: { label: "Draft", color: "gray" },
    },
    pending: {
      on: {
        approve: {
          target: "active",
          actions: [
            { type: "emit", event: "entity.approved" },
            { type: "assign", field: "approvedAt", value: "now()" },
          ],
        },
        reject: {
          target: "draft",
          actions: [{ type: "emit", event: "entity.rejected" }],
        },
      },
      meta: { label: "Pending Review", color: "yellow" },
    },
    active: {
      on: {
        archive: {
          target: "archived",
          actions: [{ type: "emit", event: "entity.archived" }],
        },
      },
      meta: { label: "Active", color: "green" },
    },
    archived: {
      on: {
        restore: {
          target: "draft",
          actions: [{ type: "emit", event: "entity.restored" }],
        },
      },
      meta: { label: "Archived", color: "red", terminal: true },
    },
  },
};

// Registration function
export function registerFSMs(engine: FSMEngine): void {
  engine.register(entityFSM);
}
```

### 5.3 Commands (`commands/index.ts`)

```typescript
import type {
  Command,
  DomainEvent,
  ActorContext,
  ID,
  Timestamp,
} from "../interfaces";

// Command payload types
export interface CreateEntityPayload {
  name: string;
  // ...
}

// Command context (passed to handlers)
export interface CommandContext extends ActorContext {
  dispatch: <R>(type: string, payload: unknown) => Promise<R>;
  query: <R>(type: string, params: unknown) => Promise<R>;
  publish: (event: DomainEvent) => Promise<void>;
  logger: Logger;
}

// Command handler type
export type CommandHandler<T = unknown, R = unknown> = (
  payload: T,
  context: CommandContext,
) => Promise<R>;

// Handler implementation
export const createEntityHandler: CommandHandler<
  CreateEntityPayload,
  ID
> = async (payload, context) => {
  const { actor, org, logger, publish } = context;

  logger.info("Creating entity", { name: payload.name, actorId: actor.id });

  // 1. Validate
  // 2. Create entity
  // 3. Emit event
  // 4. Return ID

  const entityId = generateId();

  await publish({
    id: generateId(),
    type: "entity.created",
    aggregateId: entityId,
    aggregateType: "Entity",
    payload: { name: payload.name },
    occurredAt: Date.now(),
    actorId: actor.id,
    orgId: org.id,
    correlationId: context.correlationId,
    version: 1,
  });

  return entityId;
};

// Export all handlers as a map
export const commandHandlers = new Map([
  ["{name}.entity.create", createEntityHandler],
  // ... more handlers
]);
```

### 5.4 Queries (`queries/index.ts`)

```typescript
import type {
  Query,
  ActorContext,
  PaginatedResult,
  Filter,
} from "../interfaces";

// Query parameter types
export interface ListEntitiesParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

// Query context
export interface QueryContext extends ActorContext {
  db: DatabaseClient;
  logger: Logger;
}

// Query handler type
export type QueryHandler<T = unknown, R = unknown> = (
  params: T,
  context: QueryContext,
) => Promise<R>;

// Handler implementation
export const listEntitiesHandler: QueryHandler<
  ListEntitiesParams,
  PaginatedResult<Entity>
> = async (params, context) => {
  const { db, org, logger } = context;

  logger.debug("Listing entities", { params, orgId: org.id });

  // Build query
  const filter: Filter = {
    where: { organizationId: org.id },
    limit: params.pageSize ?? 20,
    offset: ((params.page ?? 1) - 1) * (params.pageSize ?? 20),
  };

  if (params.status) {
    filter.where!.status = params.status;
  }

  // Execute query
  const result = await db.query<Entity>("SELECT * FROM entities WHERE ...", []);

  return {
    data: result,
    total: 0, // Get from count query
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };
};

// Export all handlers
export const queryHandlers = new Map([
  ["{name}.entity.list", listEntitiesHandler],
  // ... more handlers
]);
```

### 5.5 Hooks (`hooks/index.ts`)

```typescript
import type { EventBus, DomainEvent, Logger } from "../interfaces";

// Hook context
export interface HookContext {
  dispatch: <R>(type: string, payload: unknown) => Promise<R>;
  query: <R>(type: string, params: unknown) => Promise<R>;
  logger: Logger;
}

// Hook handler type
export type HookHandler<T = unknown> = (
  event: DomainEvent<T>,
  context: HookContext,
) => Promise<void>;

// Hook implementation
export const entityCreatedHandler: HookHandler = async (event, context) => {
  const { logger, dispatch } = context;

  logger.info("Entity created, sending notification", {
    entityId: event.aggregateId,
  });

  // React to event
  await dispatch("notification.send", {
    to: "admin",
    template: "entity-created",
    variables: { entityId: event.aggregateId },
  });
};

// Registration function
export function registerHooks(
  eventBus: EventBus,
  createContext: (event: DomainEvent) => HookContext,
): (() => void)[] {
  const unsubscribes: (() => void)[] = [];

  unsubscribes.push(
    eventBus.subscribe("entity.created", (event) =>
      entityCreatedHandler(event, createContext(event)),
    ),
  );

  return unsubscribes;
}
```

### 5.6 Rules (`rules/index.ts`)

```typescript
import type { RuleExpr, RuleEngine } from "../interfaces";

// Rule definition
export interface Rule {
  id: string;
  scope: string; // 'entity:create', 'entity:update'
  description?: string;
  guard?: RuleExpr; // Must be true to proceed
  condition?: RuleExpr; // If true, apply action
  action?: string; // 'set-status', 'allow-refund'
  value?: unknown;
}

// Rule definitions
export const rules: Rule[] = [
  {
    id: "entity-name-required",
    scope: "entity:create",
    description: "Entity name is required",
    guard: { field: "name", op: "exists", value: true },
  },
  {
    id: "entity-unique-name",
    scope: "entity:create",
    description: "Entity name must be unique within organization",
    guard: { field: "existingNameCount", op: "eq", value: 0 },
  },
  // ... more rules
];

// Registration function
export function registerRules(engine: RuleEngine): void {
  for (const rule of rules) {
    if (rule.guard) {
      engine.register(rule.id, rule.guard);
    }
  }
}

// Helper to get rules for a scope
export function getRulesForScope(scope: string): Rule[] {
  return rules.filter((r) => r.scope === scope);
}
```

### 5.7 Routes (`routes/index.ts`)

```typescript
import type { ID, ActorContext, Logger } from "../interfaces";

// Route context
export interface RouteContext extends ActorContext {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
  logger: Logger;
}

// Route result
export interface RouteResult<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

// Route handler
export type RouteHandler<T = unknown> = (
  context: RouteContext,
) => Promise<RouteResult<T>>;

// Middleware
export type Middleware = (
  context: RouteContext,
  next: () => Promise<RouteResult>,
) => Promise<RouteResult>;

// Route definition
export interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  handler: RouteHandler;
  middleware?: Middleware[];
  permissions?: string[];
  public?: boolean;
}

// Route implementations
export const listEntitiesRoute: RouteHandler = async (context) => {
  const { query, actor, logger } = context;

  logger.info("Listing entities", { actorId: actor.id });

  // Call query handler
  const result = await context.query("entity.list", {
    page: parseInt(query.page ?? "1"),
    pageSize: parseInt(query.pageSize ?? "20"),
  });

  return {
    status: 200,
    body: result,
  };
};

// Middleware implementations
export const isAuthenticated: Middleware = async (context, next) => {
  if (!context.actor || context.actor.type === "system") {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  return next();
};

export const hasPermission =
  (permission: string): Middleware =>
  async (context, next) => {
    // Check if actor has permission
    // ...
    return next();
  };

// Export all routes
export const routes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/{name}/entities",
    handler: listEntitiesRoute,
    middleware: [isAuthenticated],
    permissions: ["entity:read"],
  },
  // ... more routes
];
```

### 5.8 Jobs (`jobs/index.ts`)

```typescript
import type { Scheduler, Logger, ID } from "../interfaces";

// Job definition
export interface ScheduledJob {
  id: string;
  name: string;
  cron: string; // Cron expression
  handler: (context: JobContext) => Promise<void>;
}

// Job context
export interface JobContext {
  logger: Logger;
  dispatch: <R>(type: string, payload: unknown) => Promise<R>;
  query: <R>(type: string, params: unknown) => Promise<R>;
  db: DatabaseClient;
}

// Job implementations
export const dailyCleanupJob: ScheduledJob = {
  id: "{name}.daily-cleanup",
  name: "Daily Cleanup",
  cron: "0 2 * * *", // Daily at 2 AM
  handler: async (context) => {
    const { logger, db } = context;

    logger.info("Running daily cleanup");

    // Cleanup logic
    await db.execute(
      "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days'",
      [],
    );

    logger.info("Daily cleanup complete");
  },
};

// Export all jobs
export const jobs: ScheduledJob[] = [
  dailyCleanupJob,
  // ... more jobs
];

// Registration function
export async function registerJobs(
  scheduler: Scheduler,
  createContext: () => JobContext,
): Promise<string[]> {
  const registeredIds: string[] = [];

  for (const job of jobs) {
    await scheduler.schedule(job.cron, job.id, {});
    registeredIds.push(job.id);
  }

  return registeredIds;
}
```

### 5.9 Events (`events/index.ts`)

```typescript
import type { DomainEvent, ID, Timestamp } from "../interfaces";

// Event types
export const EVENT_TYPES = {
  ENTITY_CREATED: "entity.created",
  ENTITY_UPDATED: "entity.updated",
  ENTITY_DELETED: "entity.deleted",
  // ... more events
} as const;

// Event payload types
export interface EntityCreatedPayload {
  name: string;
  createdBy: ID;
}

// Event factory functions
export function createEntityCreatedEvent(
  entityId: ID,
  payload: EntityCreatedPayload,
  context: { actorId: ID; orgId: ID; correlationId: ID },
): DomainEvent<EntityCreatedPayload> {
  return {
    id: generateId(),
    type: EVENT_TYPES.ENTITY_CREATED,
    aggregateId: entityId,
    aggregateType: "Entity",
    payload,
    occurredAt: Date.now(),
    actorId: context.actorId,
    orgId: context.orgId,
    correlationId: context.correlationId,
    version: 1,
  };
}

// Export all event types and factories
export const eventTypes = Object.values(EVENT_TYPES);
```

### 5.10 Realtime (`realtime/index.ts`)

```typescript
import type { RealtimeGateway, EventBus, DomainEvent, ID } from "../interfaces";

// Channel naming helpers
export function entityChannel(orgId: ID, entityId: ID): string {
  return `org:${orgId}:{name}:entity:${entityId}`;
}

export function userChannel(orgId: ID, userId: ID): string {
  return `org:${orgId}:actor:${userId}:{name}`;
}

// Realtime bridge
export class RealtimeBridge {
  private unsubscribes: (() => void)[] = [];

  constructor(
    private gateway: RealtimeGateway,
    private eventBus: EventBus,
  ) {}

  // Forward events to channels
  forward(
    eventPattern: string,
    channelFn: (event: DomainEvent) => string,
  ): void {
    const unsubscribe = this.eventBus.subscribe(eventPattern, async (event) => {
      const channel = channelFn(event);
      await this.gateway.broadcast(channel, event.type, event.payload);
    });

    this.unsubscribes.push(unsubscribe);
  }

  // Shutdown
  shutdown(): void {
    for (const unsubscribe of this.unsubscribes) {
      unsubscribe();
    }
    this.unsubscribes = [];
  }
}

// Registration function
export function registerRealtime(
  gateway: RealtimeGateway,
  eventBus: EventBus,
): RealtimeBridge {
  const bridge = new RealtimeBridge(gateway, eventBus);

  // Forward entity events to entity channels
  bridge.forward("entity.*", (e) => entityChannel(e.orgId, e.aggregateId));

  // Forward user-specific events
  bridge.forward("notification.*", (e) =>
    userChannel(e.orgId, e.payload.userId),
  );

  return bridge;
}
```

---

## 6. Package Configuration

### 6.1 package.json

```json
{
  "name": "@projectx/compose-{name}",
  "version": "1.0.0",
  "description": "Standalone {Name} plugin - self-contained with zero core dependencies",
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",

  "exports": {
    ".": {
      "types": "./index.ts",
      "import": "./index.ts",
      "default": "./index.ts"
    },
    "./db/schema": "./db/schema/index.ts",
    "./types": "./types/index.ts",
    "./interfaces": "./interfaces/index.ts",
    "./commands": "./commands/index.ts",
    "./queries": "./queries/index.ts",
    "./hooks": "./hooks/index.ts",
    "./rules": "./rules/index.ts",
    "./routes": "./routes/index.ts",
    "./jobs": "./jobs/index.ts",
    "./events": "./events/index.ts",
    "./fsm": "./fsm/index.ts",
    "./realtime": "./realtime/index.ts",
    "./adapters": "./adapters/index.ts",
    "./seed": "./seed/index.ts"
  },

  "dependencies": {
    "drizzle-orm": "^0.45.0"
  },

  "devDependencies": {
    "@types/bun": "^1.3.0",
    "typescript": "^5.0.0"
  },

  "engines": {
    "typescript": "^5.0.0"
  },

  "host": {
    "requires": {
      "eventBus": "Event publishing and subscription",
      "fsmEngine": "State machine management",
      "ruleEngine": "Business rule evaluation",
      "scheduler": "Background job scheduling",
      "database": "PostgreSQL with drizzle-orm"
    },
    "optional": {
      "realtime": "WebSocket support",
      "queue": "Job queue for async processing",
      "searchAdapter": "Full-text search",
      "storageAdapter": "File storage",
      "notificationAdapter": "Notifications"
    }
  },

  "files": [
    "index.ts",
    "interfaces",
    "types",
    "db",
    "fsm",
    "commands",
    "queries",
    "hooks",
    "rules",
    "routes",
    "jobs",
    "events",
    "realtime",
    "adapters",
    "seed",
    "README.md"
  ],

  "keywords": ["{name}", "projectx", "compose", "standalone-plugin"],

  "license": "MIT"
}
```

### 6.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 7. Integration Guide

### 7.1 Host Application Integration

```typescript
// Host application main file

import { createPlugin, type PluginContext } from '@projectx/compose-{name}';

// 1. Create plugin instance
const plugin = createPlugin({
  features: {
    featureA: true,
    featureB: false,
  },
  defaults: {
    someDefault: 'value',
  },
});

// 2. Prepare context with implementations
const context: PluginContext = {
  // Core systems from your application
  eventBus: myEventBus,
  fsmEngine: myFSMEngine,
  ruleEngine: myRuleEngine,
  scheduler: myScheduler,
  queue: myQueue,
  realtime: myRealtimeGateway,

  // Data layer
  db: myDatabaseClient,

  // Logging
  logger: myLogger,

  // CQRS mediator
  dispatch: myMediator.dispatch,
  query: myMediator.query,

  // Configuration
  config: {
    features: { ... },
    defaults: { ... },
    adapters: {
      payment: myStripeAdapter,
      storage: myS3Adapter,
    },
  },
};

// 3. Initialize plugin
await plugin.init(context);

// 4. Register routes with HTTP server
const routes = plugin.getRoutes();
for (const route of routes) {
  server.route(route.method, route.path, createHandler(route));
}

// 5. Jobs are automatically registered with scheduler

// 6. On shutdown
process.on('SIGTERM', async () => {
  await plugin.shutdown();
});
```

### 7.2 Testing

```typescript
// Test setup with mocks

import { createPlugin, type PluginContext } from "@projectx/compose-{name}";

function createMockContext(): PluginContext {
  return {
    eventBus: {
      publish: async () => {},
      subscribe: () => () => {},
    },
    fsmEngine: {
      register: () => {},
      transition: async () => null,
      getState: async () => null,
    },
    ruleEngine: {
      evaluate: () => true,
      register: () => {},
      resolve: () => undefined,
    },
    scheduler: {
      schedule: async () => {},
      cancel: async () => {},
    },
    queue: {
      add: async () => ({
        id: "1",
        name: "test",
        data: {},
        status: "waiting",
        progress: 0,
        attemptsMade: 0,
      }),
      getJob: async () => null,
    },
    db: {
      query: async () => [],
      execute: async () => ({ rowsAffected: 0 }),
      transaction: async (fn) => fn(mockDb),
    },
    logger: {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    },
    dispatch: async () => undefined,
    query: async () => null,
    config: {
      features: {},
      defaults: {},
      adapters: {},
    },
  };
}

describe("Plugin", () => {
  it("should initialize successfully", async () => {
    const plugin = createPlugin();
    const context = createMockContext();

    await plugin.init(context);

    expect(plugin.getManifest()).toBeDefined();
  });
});
```

---

## 8. Checklist for New Composes

Before publishing a new compose, verify:

- [ ] **interfaces/index.ts** - All external contracts defined, no external imports
- [ ] **types/index.ts** - Domain types, imports from interfaces only
- [ ] **db/schema/** - Drizzle schemas, no core imports
- [ ] **fsm/index.ts** - FSM definitions, imports from interfaces only
- [ ] **commands/index.ts** - Command handlers, imports from interfaces only
- [ ] **queries/index.ts** - Query handlers, imports from interfaces only
- [ ] **hooks/index.ts** - Event hooks, imports from interfaces only
- [ ] **rules/index.ts** - Business rules, imports from interfaces only
- [ ] **routes/index.ts** - Route definitions, imports from interfaces only
- [ ] **jobs/index.ts** - Scheduled jobs, imports from interfaces only
- [ ] **events/index.ts** - Domain events, imports from interfaces only
- [ ] **realtime/index.ts** - WebSocket bridge, imports from interfaces only
- [ ] **adapters/index.ts** - Adapter implementations, imports from interfaces only
- [ ] **seed/index.ts** - Seed data, imports from interfaces only
- [ ] **index.ts** - Plugin class, PLUGIN_MANIFEST, factory function
- [ ] **package.json** - No core dependencies, host requirements documented
- [ ] **README.md** - Overview, quick start, features
- [ ] **docs/API.md** - API documentation
- [ ] **docs/SETUP.md** - Setup guide
- [ ] **docs/INTEGRATION.md** - Integration guide

---

## 9. Best Practices

1. **Single Responsibility** - Each file has one purpose
2. **Explicit Exports** - Use named exports, avoid `export *`
3. **Type Safety** - All functions have explicit types
4. **Error Handling** - Graceful degradation, meaningful errors
5. **Logging** - Structured logging with context
6. **Testing** - Testable by design, mock-friendly interfaces
7. **Documentation** - Self-documenting code, comprehensive docs
8. **Versioning** - Semantic versioning, migration paths
9. **Security** - Permission checks, input validation
10. **Performance** - Pagination, lazy loading, caching

---

## 10. Reference Implementation

See `composes/lms/` for a complete reference implementation of this architecture.
