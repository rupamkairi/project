# Core — Deep Dive Reference

## Layer 1 of Core → Module → Compose

---

## What is Core?

**Core** is the foundation every Module and Compose is built on. It provides the primitives, contracts, and machinery that the entire system runs on — without containing any business knowledge whatsoever.

Core answers one question: _"How does the system work?"_  
Modules answer: _"What does the system know?"_  
Compose answers: _"What does the system do?"_

```
Core Rules:
  - Zero business logic
  - Zero domain vocabulary (no "Order", "Customer", "Product")
  - Zero vendor dependencies (no Stripe SDK, no AWS SDK, no Postgres driver)
  - Everything above Core depends on Core. Core depends on nothing.
```

---

## Core Directory Structure

```
core/
  src/
    entity/
      types.ts              ← Entity, ID, Timestamp, Money, Meta
      schema.ts             ← EntitySchema, FieldSchema, Validator
      registry.ts           ← EntitySchemaRegistry
      generator.ts          ← ID generation (ULID), slug, checksum

    event/
      types.ts              ← DomainEvent, EventHandler, Unsubscribe
      bus.ts                ← EventBus interface + InMemoryEventBus
      store.ts              ← EventStore interface + implementations
      outbox.ts             ← Transactional Outbox pattern

    state/
      types.ts              ← StateMachine, StateNode, Transition, Action
      machine.ts            ← FSM engine (evaluate, transition, validate)
      registry.ts           ← StateMachineRegistry

    rule/
      types.ts              ← RuleExpr, Op, CompiledRule
      engine.ts             ← RuleEngine (evaluate, compile, register)
      registry.ts           ← Named rule store

    cqrs/
      types.ts              ← Command, Query, Handler interfaces
      mediator.ts           ← Mediator (dispatch, query, middleware)
      pipeline.ts           ← Middleware pipeline builder

    repository/
      types.ts              ← Repository, Filter, QueryOptions, Tx
      base.ts               ← BaseRepository (abstract, with org-scope injection)

    module/
      types.ts              ← ModuleManifest, AppModule, ModuleConfig
      registry.ts           ← ModuleRegistry (register, resolve, boot)
      lifecycle.ts          ← Boot order resolver (topological sort on deps)

    realtime/
      types.ts              ← RealTimeGateway, RealTimeBridge, Channel
      bridge.ts             ← EventBus → WebSocket forwarding layer

    queue/
      types.ts              ← Queue, Job, JobOptions, JobHandler
      scheduler.ts          ← Scheduler (cron, once, cancel)

    context/
      types.ts              ← SystemContext interface
      factory.ts            ← Creates a bound SystemContext per request

    errors/
      base.ts               ← CoreError, BusinessError, ValidationError, AuthError
      codes.ts              ← Error code registry

    primitives/
      money.ts              ← Money (amount + currency), arithmetic, formatting
      pagination.ts         ← PaginatedResult, PageOptions
      result.ts             ← Result<T, E> (Ok / Err — no thrown exceptions on logic paths)
      logger.ts             ← Logger interface

  index.ts                  ← Public API — only export what Modules need
```

---

## 1. Entity & Identity

### Primitive Types

```typescript
// Universally Unique Lexicographically Sortable Identifier
// Format: 01ARZ3NDEKTSV4RRFFQ69G5FAV
// Properties: monotonically increasing, URL-safe, no special chars
type ID = string; // generated via ULID

type Timestamp = number; // Unix epoch ms — no Date objects in core, avoids tz bugs

interface Money {
  amount: number; // integer in smallest unit (paise, cents) — never float
  currency: string; // ISO 4217 e.g. 'INR', 'USD'
}

type Meta = Record<string, string | number | boolean | null>;
```

### Base Entity

```typescript
// Every object in the system extends this — set automatically by BaseRepository
interface Entity {
  id: ID;
  organizationId: ID; // multi-tenancy anchor — always present
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp; // soft delete — null means active
  version: number; // optimistic concurrency — incremented on every save
  meta: Meta; // arbitrary key-value tags — escape hatch
}
```

### ID Generator

```typescript
interface IDGenerator {
  generate(): ID; // new ULID
  generateFor(namespace: string): ID; // namespaced: 'ord_01ARZ...'
  isValid(id: string): boolean;
  extractTimestamp(id: ID): Timestamp; // decode creation time from ULID
}

// Namespaced ID prefixes — registered per module in ModuleManifest
// 'actor_', 'org_', 'ord_', 'inv_', 'txn_' etc.
// Allows instant identification of entity type from any ID in logs
```

---

## 2. Entity Schema System

The Schema System is what makes the architecture schema-driven. Every entity in every Module is a runtime schema instance — there are no hardcoded entity classes anywhere above Core.

### FieldSchema

```typescript
type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date" // stored as Timestamp
  | "enum" // enumValues must be provided
  | "ref" // foreign key — refEntity must be provided
  | "ref[]" // array of foreign keys
  | "json" // arbitrary nested object
  | "money" // Money type
  | "geo.point" // { lat, lng }
  | "geo.polygon" // GeoJSON polygon
  | "geo.linestring"; // GeoJSON linestring

interface FieldSchema {
  key: string;
  type: FieldType;
  label?: string; // human-readable label (for auto-UI)
  required?: boolean;
  unique?: boolean;
  default?: unknown | (() => unknown);
  validators?: Validator[];
  enumValues?: string[]; // when type = 'enum'
  refEntity?: string; // when type = 'ref' — entity schema name
  refField?: string; // which field to join on (default: 'id')
  indexed?: boolean;
  searchable?: boolean; // include in SearchAdapter sync
  sensitive?: boolean; // redacted from logs + API responses
  computed?: (entity: Record<string, unknown>) => unknown; // virtual field
}
```

### EntitySchema

```typescript
interface EntitySchema {
  name: string; // PascalCase: 'Product', 'OrderItem', 'StockUnit'
  namespace: string; // owning module id: 'catalog', 'inventory'
  idPrefix?: string; // 'prod_', 'si_', 'ord_'
  fields: FieldSchema[];
  indexes?: Array<string[]>; // composite indexes
  uniqueConstraints?: Array<string[]>;
  softDelete?: boolean; // default: true
  timestamps?: boolean; // default: true
  versioned?: boolean; // default: true — enables optimistic locking
  searchSync?: boolean; // auto-sync to SearchAdapter on change
  rtChannel?: string; // real-time channel to broadcast mutations
  hooks?: EntityHooks; // beforeSave, afterSave, beforeDelete, afterDelete
}
```

### EntitySchemaRegistry

```typescript
// Central registry — all modules register their schemas here during boot
interface EntitySchemaRegistry {
  register(schema: EntitySchema): void;
  get(name: string): EntitySchema;
  getAll(namespace?: string): EntitySchema[];
  validate(entityName: string, data: unknown): ValidationResult;
  generateTypeScript(entityName: string): string; // runtime TS type generation
  generateOpenAPISchema(entityName: string): object; // runtime OpenAPI schema
  generateFormSchema(entityName: string): object; // runtime UI form schema
}
```

### Validators

```typescript
// Validators are pure functions — they receive the value and the full entity context
type Validator = (
  value: unknown,
  context: ValidationContext,
) => ValidationError | null;

interface ValidationContext {
  entity: Record<string, unknown>; // full entity being validated
  schema: EntitySchema;
  isCreate: boolean;
  isUpdate: boolean;
  actorId: ID;
  orgId: ID;
}

// Built-in validators shipped with Core:
const Validators = {
  minLength: (n: number) => Validator,
  maxLength: (n: number) => Validator,
  min: (n: number) => Validator,
  max: (n: number) => Validator,
  pattern: (re: RegExp) => Validator,
  email: () => Validator,
  url: () => Validator,
  phone: () => Validator,
  future: () => Validator, // date must be in future
  past: () => Validator, // date must be in past
  positive: () => Validator,
  nonZero: () => Validator,
  refExists: () => Validator, // verifies referenced entity exists in DB
  unique: () => Validator, // verifies field value is unique in org scope
  custom: (fn: ValidatorFn) => Validator,
};
```

---

## 3. Event System

The Event System is the nervous system of the architecture. Every state change that matters produces an event. Events are the only way Modules communicate with each other asynchronously.

### DomainEvent

```typescript
interface DomainEvent<T = unknown> {
  id: ID; // unique event ID
  type: string; // namespaced: 'order.placed', 'stock.low'
  aggregateId: ID; // which entity this is about
  aggregateType: string; // entity schema name: 'Order', 'StockUnit'
  payload: T; // event-specific data — typed per event
  occurredAt: Timestamp;
  actorId?: ID; // who caused this (null for system-generated)
  orgId: ID; // tenant scope
  correlationId: ID; // trace across multiple async hops
  causedBy?: ID; // ID of the event that triggered this one (event chain)
  version: number; // aggregate version at time of event
  source: string; // module id that emitted: 'inventory', 'ledger'
  metadata?: Meta; // transport metadata (queue name, retry count, etc.)
}
```

### EventBus

```typescript
// Synchronous fan-out within the same process
// For cross-process delivery, the EventStore + Outbox handles persistence
interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
  subscribe(
    pattern: string,
    handler: EventHandler,
    opts?: SubscribeOptions,
  ): Unsubscribe;
  // Pattern matching:
  //   'order.placed'        → exact match
  //   'order.*'             → all order events
  //   '*.created'           → all created events across modules
  //   '*'                   → every event (use sparingly — only analytics)
}

interface SubscribeOptions {
  priority?: number; // higher = called first among pattern matches
  filter?: (event: DomainEvent) => boolean; // fine-grained filter beyond pattern
}

type EventHandler = (event: DomainEvent, ctx: SystemContext) => Promise<void>;
type Unsubscribe = () => void;
```

### EventStore

The EventStore is the append-only log of everything that has ever happened. It is the source of truth — not the latest database row.

```typescript
interface EventStore {
  append(event: DomainEvent): Promise<void>;
  appendBatch(events: DomainEvent[]): Promise<void>;

  // Read the history of a single entity
  read(aggregateId: ID, opts?: ReadOptions): AsyncIterable<DomainEvent>;

  // Read all events of a type (for projections / read model rebuilding)
  readByType(type: string, opts?: ReadOptions): AsyncIterable<DomainEvent>;

  // Replay for rebuilding a read model or auditing
  replay(filter: EventFilter, from: Timestamp): AsyncIterable<DomainEvent>;

  // Get the latest version number of an aggregate (for optimistic concurrency)
  getVersion(aggregateId: ID): Promise<number>;
}

interface ReadOptions {
  after?: number; // version — for incremental reads
  from?: Timestamp;
  to?: Timestamp;
  limit?: number;
}

interface EventFilter {
  types?: string[];
  aggregateType?: string;
  orgId?: ID;
  actorId?: ID;
}
```

### Transactional Outbox

Solves the dual-write problem: ensures that DB writes and event publishing are atomic. Without this, a process crash between a DB save and an event publish leaves the system in an inconsistent state.

```typescript
/*
  Pattern:
    1. DB save + outbox record written in the SAME transaction
    2. Outbox poller reads unpublished records
    3. Publishes to EventBus
    4. Marks record as published

  Guarantees at-least-once delivery. Handlers must be idempotent (use correlationId).
*/

interface OutboxRecord {
  id: ID;
  event: DomainEvent;
  publishedAt?: Timestamp;
  attempts: number;
  lastError?: string;
}

interface EventOutbox {
  write(event: DomainEvent, tx: Transaction): Promise<void>;
  writeBatch(events: DomainEvent[], tx: Transaction): Promise<void>;
  pollUnpublished(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: ID): Promise<void>;
  markFailed(id: ID, error: string): Promise<void>;
}
```

---

## 4. State Machine (FSM) Engine

Every entity lifecycle is a Finite State Machine. FSMs are defined as data, registered in Core, and evaluated by the FSM Engine — never as if/else chains.

### Types

```typescript
interface StateMachine<S extends string = string, E extends string = string> {
  id: string; // 'order-fsm', 'booking-fsm'
  entityType: string; // 'Order', 'Booking'
  initial: S;
  states: Record<S, StateNode<S, E>>;
  meta?: {
    description?: string;
    diagram?: string; // mermaid stateDiagram string (auto-generatable)
  };
}

interface StateNode<S, E> {
  label?: string; // human-readable: 'Pending Payment'
  color?: string; // for UI rendering: '#F59E0B'
  terminal?: boolean; // true = no outgoing transitions (absorbed)
  on: Partial<Record<E, Transition<S> | Transition<S>[]>>; // one event → one or many possible transitions
  entry?: Action[]; // fire when entering this state
  exit?: Action[]; // fire when leaving this state
  after?: TimedTransition<S>[]; // auto-transition after a duration
}

interface Transition<S> {
  target: S;
  guard?: RuleExpr; // must evaluate true for transition to proceed
  actions?: Action[]; // fire during the transition
  description?: string; // human-readable: 'Payment confirmed by gateway'
}

interface TimedTransition<S> {
  delay: number; // ms
  target: S;
  guard?: RuleExpr;
}

// Actions are side-effect descriptors — resolved and executed by the FSM engine
// They do NOT call business logic directly — they emit commands into the Mediator
type Action =
  | { type: "emit"; event: string; payload?: Record<string, unknown> }
  | { type: "dispatch"; command: string; payload?: Record<string, unknown> }
  | {
      type: "assign";
      field: string;
      value: unknown | ((ctx: FSMContext) => unknown);
    }
  | { type: "log"; message: string };
```

### FSM Engine

```typescript
interface FSMEngine {
  register(machine: StateMachine): void;
  resolve(id: string): StateMachine;

  // Evaluate if an event is valid for an entity in its current state
  can(
    machineId: string,
    currentState: string,
    event: string,
    context: FSMContext,
  ): boolean;

  // Execute the transition — returns the new state + side-effects
  transition(
    machineId: string,
    currentState: string,
    event: string,
    context: FSMContext,
  ): Promise<TransitionResult>;

  // Get all valid events from the current state (for UI enabling/disabling controls)
  validEvents(
    machineId: string,
    currentState: string,
    context: FSMContext,
  ): string[];

  // Get all reachable states from the current state (for progress indicators)
  reachableStates(machineId: string, currentState: string): string[];
}

interface FSMContext {
  entity: Record<string, unknown>; // current entity data
  actor: { id: ID; roles: string[]; orgId: ID };
  payload?: Record<string, unknown>; // event-specific input
}

interface TransitionResult {
  previousState: string;
  nextState: string;
  actionsExecuted: Action[];
  eventsEmitted: DomainEvent[];
}
```

---

## 5. Rule Engine

Rules are the decision layer of the architecture. They are stored as plain data (`RuleExpr` trees), evaluated at runtime, and can be modified without a code deploy. Every guard, permission check, and business condition runs through here.

### RuleExpr

```typescript
// A rule is a composable tree of conditions
type RuleExpr =
  | LeafRule
  | AndRule
  | OrRule
  | NotRule
  | RefRule // reference to a named rule in the registry
  | TemplateRule; // a rule with injectable parameters

interface LeafRule {
  field: string; // dot-path into context: 'order.total', 'actor.roles'
  op: Op;
  value: unknown; // literal, or { ref: 'fieldPath' } for dynamic comparison
}

type Op =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin" // value IN array / NOT IN array
  | "contains" // array field contains value
  | "containsAll" // array field contains all values
  | "matches" // regex match
  | "exists" // field is not null/undefined
  | "empty" // array or string is empty
  | "withinDays" // date field within N days of now
  | "spatialWithin"; // geo point within polygon (uses PostGIS)

interface AndRule {
  and: RuleExpr[];
}
interface OrRule {
  or: RuleExpr[];
}
interface NotRule {
  not: RuleExpr;
}
interface RefRule {
  ref: string;
} // 'return-window', 'no-double-booking'
interface TemplateRule {
  template: string;
  params: Record<string, unknown>;
}
```

### RuleEngine

```typescript
interface RuleEngine {
  // Evaluate synchronously — returns boolean
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;

  // Compile to a fast executable function — use for hot paths
  compile(expr: RuleExpr): CompiledRule;

  // Named rule registry — store and retrieve rules by ID
  register(id: string, expr: RuleExpr): void;
  resolve(id: string): RuleExpr;
  unregister(id: string): void;

  // Explain — returns which condition failed and why (for debugging + user messages)
  explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation;
}

interface CompiledRule {
  evaluate(context: Record<string, unknown>): boolean;
  explain(context: Record<string, unknown>): RuleExplanation;
}

interface RuleExplanation {
  passed: boolean;
  failures: Array<{
    field: string;
    op: Op;
    expected: unknown;
    actual: unknown;
    message: string;
  }>;
}
```

---

## 6. CQRS — Command & Query Mediator

All reads and writes flow through the Mediator. No Module calls another Module's internal functions — they dispatch Commands and issue Queries.

### Types

```typescript
interface Command<T = unknown> {
  type: string; // 'catalog.createProduct', 'ledger.postTransaction'
  payload: T;
  actorId: ID;
  orgId: ID;
  correlationId: ID; // ties together a chain of commands/events
  causedBy?: ID; // event or command that triggered this
  idempotencyKey?: string; // if set, duplicate dispatches are no-ops
}

interface Query<T = unknown> {
  type: string; // 'catalog.getProduct', 'identity.hasPermission'
  params: T;
  actorId: ID;
  orgId: ID;
}

type CommandHandler<T = unknown, R = unknown> = (
  cmd: Command<T>,
  ctx: SystemContext,
) => Promise<R>;
type QueryHandler<T = unknown, R = unknown> = (
  q: Query<T>,
  ctx: SystemContext,
) => Promise<R>;
```

### Mediator

```typescript
interface Mediator {
  // Write path
  dispatch<R = unknown>(cmd: Command): Promise<R>;

  // Read path
  query<R = unknown>(q: Query): Promise<R>;

  // Registration — called during module boot
  registerCommand(type: string, handler: CommandHandler): void;
  registerQuery(type: string, handler: QueryHandler): void;

  // Middleware pipeline — applied to all commands and queries
  use(middleware: MediatorMiddleware): void;
}

// Middleware signature — same pattern as Express/Koa
type MediatorMiddleware = (
  request: Command | Query,
  ctx: SystemContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;
```

### Built-In Middleware (shipped with Core)

```typescript
// 1. Authorization — checks identity.hasPermission before dispatch
AuthorizationMiddleware(permissionResolver: PermissionResolver)

// 2. Validation — validates command payload against registered schema
ValidationMiddleware(schemaRegistry: EntitySchemaRegistry)

// 3. Idempotency — deduplicates commands with same idempotencyKey within TTL
IdempotencyMiddleware(store: IdempotencyStore, ttl: number)

// 4. Logging — structured log of every command/query with timing
LoggingMiddleware(logger: Logger)

// 5. Tracing — attaches correlationId + spanId to context for distributed tracing
TracingMiddleware(tracer: Tracer)

// 6. Rate Limiting — per-actor, per-command type limits
RateLimitMiddleware(limiter: RateLimiter)

// 7. Retry — auto-retry transient failures with exponential backoff
RetryMiddleware(opts: RetryOptions)

// Middleware is registered in order — runs as a pipeline
mediator.use(AuthorizationMiddleware(resolver))
mediator.use(ValidationMiddleware(registry))
mediator.use(IdempotencyMiddleware(store, 86400000))
mediator.use(LoggingMiddleware(logger))
```

---

## 7. Repository

The Repository is the only way any code in the system touches the database. It enforces organization scoping, soft-delete filtering, optimistic locking, and the entity lifecycle (timestamps, versioning) automatically.

### Interface

```typescript
interface Repository<T extends Entity> {
  // Single entity reads
  findById(id: ID): Promise<T | null>;
  findByIdOrFail(id: ID): Promise<T>; // throws NotFoundError if null

  // Collection reads
  findMany(filter: Filter<T>, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  findOne(filter: Filter<T>): Promise<T | null>;
  findAll(filter: Filter<T>): Promise<T[]>; // no pagination — use carefully
  count(filter: Filter<T>): Promise<number>;
  exists(filter: Filter<T>): Promise<boolean>;

  // Writes
  save(entity: T): Promise<T>; // insert or update (upsert by id)
  saveBatch(entities: T[]): Promise<T[]>;
  delete(id: ID): Promise<void>; // soft delete (sets deletedAt)
  hardDelete(id: ID): Promise<void>; // permanent — use only for data erasure (GDPR)
  restore(id: ID): Promise<T>; // undelete

  // Transactions
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;

  // Raw escape hatch — for complex queries (aggregate reports, spatial joins)
  // Returns plain objects, not Entity instances
  raw<R = unknown>(query: string, params?: unknown[]): Promise<R[]>;
}

interface QueryOptions {
  page?: number;
  limit?: number; // default: 50, max: 500
  sort?: SortSpec[];
  include?: string[]; // ref fields to eagerly load
  withDeleted?: boolean; // include soft-deleted records
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}
```

### BaseRepository

The `BaseRepository` is an abstract class shipped with Core that all concrete repository implementations extend. It handles:

- Injecting `organizationId` into all reads and writes automatically
- Injecting `createdAt`, `updatedAt` on save
- Incrementing `version` on every update (optimistic concurrency)
- Filtering out soft-deleted records from all reads by default
- Validating entity against its `EntitySchema` before every save
- Publishing to the `EventOutbox` within the same transaction after save

```typescript
abstract class BaseRepository<T extends Entity> implements Repository<T> {
  constructor(
    protected readonly schema: EntitySchema,
    protected readonly db: DatabaseAdapter,
    protected readonly outbox: EventOutbox,
    protected readonly orgId: ID, // injected per-request via SystemContext
  ) {}

  // Concrete implementations provide the DB-specific query builder
  abstract buildQuery(filter: Filter<T>): DbQuery;
}
```

---

## 8. Module Registry & Lifecycle

### ModuleManifest

```typescript
interface ModuleManifest {
  id: string; // 'catalog', 'ledger' — globally unique
  version: string; // semver: '1.2.0'
  dependsOn?: string[]; // resolved into boot order

  // Declarations — what this module owns and exposes
  entities: EntitySchema[];
  idPrefixes: Record<string, string>; // { Product: 'prod_', Category: 'cat_' }
  events: string[]; // event types this module emits
  commands: string[]; // command types this module handles
  queries: string[]; // query types this module handles
  fsms: string[]; // FSM ids this module registers

  // Infrastructure requirements
  migrations: Migration[]; // DB schema changes, run in version order
  scheduledJobs?: JobDefinition[]; // cron jobs to register on boot
  queueWorkers?: WorkerDefinition[];

  // Optional
  defaultConfig?: Record<string, unknown>; // defaults for moduleConfig overrides
}
```

### AppModule

```typescript
interface AppModule {
  manifest: ModuleManifest;
  boot(registry: BootRegistry): Promise<void>;
  shutdown(): Promise<void>;
}

interface BootRegistry {
  mediator: Mediator;
  bus: EventBus;
  store: EventStore;
  schemas: EntitySchemaRegistry;
  fsms: StateMachineRegistry;
  rules: RuleEngine;
  queue: Queue;
  scheduler: Scheduler;
  realtime: RealTimeBridge;
  db: DatabaseAdapter;
  adapters: AdapterRegistry; // storage, notifications, payment, etc.
  logger: Logger;
}
```

### ModuleRegistry & Boot Order

```typescript
interface ModuleRegistry {
  register(module: AppModule): void;
  resolve(id: string): AppModule;
  boot(ids?: string[]): Promise<void>; // if ids omitted, boots all registered modules
  shutdown(): Promise<void>;
}

// Boot order is determined by topological sort of dependsOn graph
// Example dependency graph:
//   identity  (no deps)
//   catalog   (no deps)
//   inventory → catalog
//   ledger    (no deps)
//   workflow  → identity
//   scheduling → identity, catalog
//   notification → identity
//   geo       (no deps)
//   analytics → (all — but read-only, no write dep)

// Resolved boot order:
//   [identity, catalog, ledger, geo] → [inventory, workflow, scheduling, notification] → [analytics]
```

---

## 9. Queue & Scheduler

### Queue

```typescript
interface Queue {
  // Add a job
  add<T>(name: string, payload: T, opts?: JobOptions): Promise<Job<T>>;
  addBatch<T>(
    name: string,
    payloads: T[],
    opts?: JobOptions,
  ): Promise<Job<T>[]>;

  // Register a processor — called during module boot
  process<T>(name: string, handler: JobHandler<T>, concurrency?: number): void;

  // Job management
  getJob<T>(id: ID): Promise<Job<T> | null>;
  retry(id: ID): Promise<void>;
  cancel(id: ID): Promise<void>;
  drain(name: string): Promise<void>; // wait for all jobs in queue to complete

  // Dead Letter Queue
  getDLQ(name: string): Promise<Job[]>;
  replayDLQ(name: string, limit?: number): Promise<void>;
}

interface JobOptions {
  priority?: "critical" | "standard" | "bulk"; // affects worker concurrency + queue ordering
  delay?: number; // ms before the job becomes available
  attempts?: number; // retry count before DLQ (default: 3)
  backoff?: { type: "fixed" | "exponential"; delay: number };
  jobId?: string; // idempotency key — duplicate adds are ignored
  timeout?: number; // ms before job is considered hung
  removeOnComplete?: boolean; // clean up after success (default: true)
}

interface Job<T = unknown> {
  id: ID;
  name: string;
  payload: T;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  attempts: number;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  failedReason?: string;
  progress?: number; // 0–100 for long-running jobs
}

type JobHandler<T> = (job: Job<T>, ctx: SystemContext) => Promise<void>;
```

### Scheduler

```typescript
interface Scheduler {
  // Recurring — standard cron expression
  define(
    name: string,
    cron: string,
    handler: JobHandler,
    opts?: SchedulerOptions,
  ): void;

  // One-shot — fires once at a specific time
  runOnce(
    name: string,
    at: Date | Timestamp,
    payload: unknown,
    handler: JobHandler,
  ): void;

  // Management
  cancel(name: string): void;
  pause(name: string): void;
  resume(name: string): void;
  list(): ScheduledJob[];
  getNext(name: string): Timestamp | null; // next scheduled execution time
}

interface SchedulerOptions {
  timezone?: string; // IANA tz: 'Asia/Kolkata', 'UTC'
  overlap?: boolean; // allow concurrent runs if previous hasn't finished (default: false)
  catchUp?: boolean; // run missed executions after downtime (default: false)
}
```

---

## 10. Real-Time Bridge

The Real-Time layer is entirely decoupled from business logic. No Module knows about WebSockets. The RealTimeBridge listens to the EventBus and forwards events to the appropriate channels.

```typescript
interface RealTimeGateway {
  // Push to a specific named channel
  publish(channel: string, payload: unknown): Promise<void>;

  // Client lifecycle (called by WebSocket transport)
  connect(clientId: ID, actorId: ID, orgId: ID): void;
  disconnect(clientId: ID): void;
  subscribe(clientId: ID, channel: string): void;
  unsubscribe(clientId: ID, channel: string): void;

  // Broadcast to all clients in an org
  broadcast(orgId: ID, payload: unknown): void;

  // Presence — who is connected right now
  getPresence(channel: string): ID[];
  getChannels(clientId: ID): string[];
}

// RealTimeBridge is configured in each Compose (or Module)
// It declares which EventBus patterns map to which channels
interface RealTimeBridge {
  forward(
    eventPattern: string,
    toChannel: (event: DomainEvent) => string,
    filter?: (event: DomainEvent) => boolean,
  ): void;
}

// Example registrations:
bridge.forward("order.*", (e) => `org:${e.orgId}:orders`);
bridge.forward(
  "stock.*",
  (e) => `org:${e.orgId}:inventory:${e.payload.locationId}`,
);
bridge.forward("task.*", (e) => `org:${e.orgId}:workflow`);
bridge.forward(
  "*.created",
  (e) => `org:${e.orgId}:actor:${e.actorId}:inbox`,
  (e) => e.source === "notification",
);

// Channel naming convention:
//   org:{orgId}:{scope}                  → org-wide broadcast to a scope
//   org:{orgId}:{scope}:{resourceId}     → scoped to a specific resource
//   org:{orgId}:actor:{actorId}:{scope}  → private to a single actor
//   system:{topic}                       → cross-org system messages
```

---

## 11. SystemContext

The `SystemContext` is the single object injected into every Handler, Hook, and Job. It provides a fully scoped, actor-aware interface to all Core capabilities. Modules never import Core singletons directly — they receive context.

```typescript
interface SystemContext {
  // Identity of the current request
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api-key";
  };
  org: { id: ID; slug: string; settings: Record<string, unknown> };
  correlationId: ID;

  // CQRS
  dispatch<R = unknown>(
    command: Omit<Command, "actorId" | "orgId" | "correlationId">,
  ): Promise<R>;
  query<R = unknown>(query: Omit<Query, "actorId" | "orgId">): Promise<R>;

  // Events
  publish(
    event: Omit<DomainEvent, "actorId" | "orgId" | "correlationId">,
  ): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;

  // Rules
  rules: RuleEngine;

  // FSM
  fsm: FSMEngine;

  // Repository factory — returns a repository scoped to orgId automatically
  repo<T extends Entity>(entityName: string): Repository<T>;

  // Infrastructure
  queue: Queue;
  scheduler: Scheduler;
  realtime: RealTimeGateway;
  adapters: AdapterRegistry; // storage, notification, payment, geo, search
  logger: Logger;

  // Request metadata
  requestId: ID;
  startedAt: Timestamp;
  ip?: string;
  userAgent?: string;
}
```

---

## 12. Error System

```typescript
// All errors extend CoreError — never throw raw Error in business code
class CoreError extends Error {
  constructor(
    public readonly code: string, // 'NOT_FOUND', 'VALIDATION_FAILED'
    public readonly message: string,
    public readonly meta?: Meta,
    public readonly cause?: unknown,
  ) {}
}

class NotFoundError extends CoreError {} // 404 — entity not found
class ValidationError extends CoreError {
  // 422 — schema or rule violation
  constructor(public readonly failures: ValidationFailure[]) {}
}
class AuthenticationError extends CoreError {} // 401 — not authenticated
class AuthorizationError extends CoreError {} // 403 — authenticated but not permitted
class ConflictError extends CoreError {} // 409 — optimistic lock conflict / duplicate
class BusinessError extends CoreError {} // 422 — domain rule violated (return window, etc.)
class IntegrationError extends CoreError {} // 502 — external service failure

// Result type — for operations that can fail without throwing
type Result<T, E extends CoreError = CoreError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const Ok = <T>(value: T): Result<T> => ({ ok: true, value });
const Err = <E extends CoreError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});
```

---

## 13. Adapter Registry

Core defines the interfaces. Modules consume them. Compose registers the concrete implementations. Nothing above Core ever imports a vendor SDK directly.

```typescript
interface AdapterRegistry {
  get<T>(type: AdapterType): T;
  register<T>(type: AdapterType, adapter: T): void;
  has(type: AdapterType): boolean;
}

type AdapterType =
  | "storage"
  | "notification.email"
  | "notification.sms"
  | "notification.push"
  | "notification.whatsapp"
  | "notification.webhook"
  | "payment"
  | "geo"
  | "search"
  | "fx-rates"
  | "ocr"
  | "translate";
```

Each adapter type has a Core-defined interface contract (see Master Architecture §4.4). The registry allows multiple implementations to be registered (e.g. both Stripe and Razorpay for `payment`) and the active one is selected from config.

---

## Core Public API (`index.ts`)

Only these are exported from Core. Modules import from `@yourplatform/core` — never from internal paths.

```typescript
// Entity
export type { Entity, ID, Timestamp, Money, Meta };
export type {
  EntitySchema,
  FieldSchema,
  FieldType,
  Validator,
  ValidationContext,
};
export { Validators };

// Events
export type { DomainEvent, EventHandler, Unsubscribe };
export type { EventBus, EventStore, EventOutbox };

// State
export type {
  StateMachine,
  StateNode,
  Transition,
  Action,
  FSMContext,
  FSMEngine,
};

// Rules
export type { RuleExpr, Op, RuleEngine, CompiledRule };

// CQRS
export type {
  Command,
  Query,
  CommandHandler,
  QueryHandler,
  Mediator,
  MediatorMiddleware,
};
export {
  AuthorizationMiddleware,
  ValidationMiddleware,
  IdempotencyMiddleware,
  LoggingMiddleware,
  TracingMiddleware,
  RateLimitMiddleware,
};

// Repository
export type { Repository, Filter, QueryOptions, PaginatedResult, Transaction };
export { BaseRepository };

// Module
export type { ModuleManifest, AppModule, ModuleRegistry, BootRegistry };

// Queue & Scheduler
export type { Queue, Job, JobOptions, JobHandler, Scheduler, ScheduledJob };

// Real-Time
export type { RealTimeGateway, RealTimeBridge };

// Context
export type { SystemContext };

// Errors
export {
  CoreError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  BusinessError,
  IntegrationError,
};
export { Ok, Err };
export type { Result };

// Primitives
export type { AdapterRegistry, AdapterType };
export { IDGenerator };
```
