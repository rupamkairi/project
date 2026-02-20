# Core Reference

Layer 1: Primitives without business logic. Zero vendor dependencies.

## Entity System

```typescript
type ID = string; // ULID
type Timestamp = number; // Unix ms
interface Money {
  amount: number;
  currency: string;
} // integer in smallest unit
type Meta = Record<string, unknown>;

interface Entity {
  id: ID;
  organizationId: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
  version: number;
  meta: Meta;
}
```

### Schema System

```typescript
type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "ref"
  | "ref[]"
  | "json"
  | "money"
  | "geo.point"
  | "geo.polygon"
  | "geo.linestring";

interface FieldSchema {
  key: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  validators?: Validator[];
  enumValues?: string[];
  refEntity?: string;
  indexed?: boolean;
  searchable?: boolean;
  sensitive?: boolean;
  computed?: (entity: Record<string, unknown>) => unknown;
}

interface EntitySchema {
  name: string;
  namespace: string;
  idPrefix?: string;
  fields: FieldSchema[];
  indexes?: string[][];
  softDelete?: boolean;
  timestamps?: boolean;
  versioned?: boolean;
  searchSync?: boolean;
  rtChannel?: string;
}

interface EntitySchemaRegistry {
  register(schema: EntitySchema): void;
  get(name: string): EntitySchema;
  validate(entityName: string, data: unknown): ValidationResult;
  generateTypeScript(entityName: string): string;
  generateOpenAPISchema(entityName: string): object;
}
```

## Event System

```typescript
interface DomainEvent<T = unknown> {
  id: ID;
  type: string; // 'order.placed'
  aggregateId: ID;
  aggregateType: string;
  payload: T;
  occurredAt: Timestamp;
  actorId?: ID;
  orgId: ID;
  correlationId: ID;
  causedBy?: ID;
  version: number;
  source: string;
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): Unsubscribe;
  // Patterns: 'order.placed', 'order.*', '*.created', '*'
}

interface EventStore {
  append(event: DomainEvent): Promise<void>;
  read(aggregateId: ID, opts?: ReadOptions): AsyncIterable<DomainEvent>;
  replay(filter: EventFilter, from: Timestamp): AsyncIterable<DomainEvent>;
}

interface EventOutbox {
  write(event: DomainEvent, tx: Transaction): Promise<void>;
  pollUnpublished(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: ID): Promise<void>;
}
```

## State Machine (FSM)

```typescript
interface StateMachine<S = string, E = string> {
  id: string;
  entityType: string;
  initial: S;
  states: Record<S, StateNode<S, E>>;
}

interface StateNode<S, E> {
  on: Partial<Record<E, Transition<S> | Transition<S>[]>>;
  entry?: Action[];
  exit?: Action[];
  after?: TimedTransition<S>[];
}

interface Transition<S> {
  target: S;
  guard?: RuleExpr;
  actions?: Action[];
}

type Action =
  | { type: "emit"; event: string; payload?: Record<string, unknown> }
  | { type: "dispatch"; command: string; payload?: Record<string, unknown> }
  | { type: "assign"; field: string; value: unknown }
  | { type: "log"; message: string };

interface FSMEngine {
  register(machine: StateMachine): void;
  can(
    machineId: string,
    currentState: string,
    event: string,
    ctx: FSMContext,
  ): boolean;
  transition(
    machineId: string,
    currentState: string,
    event: string,
    ctx: FSMContext,
  ): Promise<TransitionResult>;
  validEvents(
    machineId: string,
    currentState: string,
    ctx: FSMContext,
  ): string[];
}
```

## Rule Engine

```typescript
type RuleExpr =
  | { field: string; op: Op; value: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string }
  | { template: string; params: Record<string, unknown> };

type Op =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "containsAll"
  | "matches"
  | "exists"
  | "empty"
  | "withinDays"
  | "spatialWithin";

interface RuleEngine {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
  compile(expr: RuleExpr): CompiledRule;
  register(id: string, expr: RuleExpr): void;
  resolve(id: string): RuleExpr;
  explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation;
}
```

## CQRS Mediator

```typescript
interface Command<T = unknown> {
  type: string;
  payload: T;
  actorId: ID;
  orgId: ID;
  correlationId: ID;
  causedBy?: ID;
  idempotencyKey?: string;
}

interface Query<T = unknown> {
  type: string;
  params: T;
  actorId: ID;
  orgId: ID;
}

interface Mediator {
  dispatch<R>(cmd: Command): Promise<R>;
  query<R>(q: Query): Promise<R>;
  registerCommand(type: string, handler: CommandHandler): void;
  registerQuery(type: string, handler: QueryHandler): void;
  use(middleware: MediatorMiddleware): void;
}

// Built-in middleware: Authorization, Validation, Idempotency, Logging, Tracing, RateLimit, Retry
```

## Repository

```typescript
interface Repository<T extends Entity> {
  findById(id: ID): Promise<T | null>;
  findByIdOrFail(id: ID): Promise<T>;
  findMany(filter: Filter<T>, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  findOne(filter: Filter<T>): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>; // soft
  hardDelete(id: ID): Promise<void>;
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;
}

interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: SortSpec[];
  include?: string[];
  withDeleted?: boolean;
}

// BaseRepository auto-injects: organizationId, timestamps, version, soft-delete filter, validation, outbox
```

## Module System

```typescript
interface ModuleManifest {
  id: string;
  version: string;
  dependsOn?: string[];
  entities: EntitySchema[];
  idPrefixes: Record<string, string>;
  events: string[];
  commands: string[];
  queries: string[];
  fsms: string[];
  migrations?: Migration[];
  scheduledJobs?: JobDefinition[];
}

interface AppModule {
  manifest: ModuleManifest;
  boot(registry: BootRegistry): Promise<void>;
  shutdown(): Promise<void>;
}

interface ModuleRegistry {
  register(module: AppModule): void;
  boot(ids?: string[]): Promise<void>; // topological sort on dependsOn
}
```

## Queue & Scheduler

```typescript
interface Queue {
  add<T>(name: string, payload: T, opts?: JobOptions): Promise<Job<T>>;
  process<T>(name: string, handler: JobHandler<T>): void;
  retry(id: ID): Promise<void>;
  cancel(id: ID): Promise<void>;
}

interface JobOptions {
  priority?: "critical" | "standard" | "bulk";
  delay?: number;
  attempts?: number;
  backoff?: { type: "fixed" | "exponential"; delay: number };
  jobId?: string;
  timeout?: number;
}

interface Scheduler {
  define(
    name: string,
    cron: string,
    handler: JobHandler,
    opts?: SchedulerOptions,
  ): void;
  runOnce(name: string, at: Date, payload: unknown, handler: JobHandler): void;
  cancel(name: string): void;
}
```

## Real-Time

```typescript
interface RealTimeGateway {
  publish(channel: string, payload: unknown): Promise<void>;
  connect(clientId: ID, actorId: ID, orgId: ID): void;
  subscribe(clientId: ID, channel: string): void;
  broadcast(orgId: ID, payload: unknown): void;
}

interface RealTimeBridge {
  forward(
    eventPattern: string,
    toChannel: (e: DomainEvent) => string,
    filter?: (e: DomainEvent) => boolean,
  ): void;
}

// Channels: org:{orgId}:{scope}, org:{orgId}:{scope}:{resourceId}, org:{orgId}:actor:{actorId}:{scope}
```

## SystemContext

```typescript
interface SystemContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api-key";
  };
  org: { id: ID; slug: string; settings: Record<string, unknown> };
  correlationId: ID;
  dispatch<R>(
    cmd: Omit<Command, "actorId" | "orgId" | "correlationId">,
  ): Promise<R>;
  query<R>(q: Omit<Query, "actorId" | "orgId">): Promise<R>;
  publish(
    event: Omit<DomainEvent, "actorId" | "orgId" | "correlationId">,
  ): Promise<void>;
  rules: RuleEngine;
  fsm: FSMEngine;
  repo<T>(entityName: string): Repository<T>;
  queue: Queue;
  scheduler: Scheduler;
  realtime: RealTimeGateway;
  adapters: AdapterRegistry;
  logger: Logger;
}
```

## Errors

```typescript
class CoreError extends Error {
  constructor(
    public code: string,
    public message: string,
    public meta?: Meta,
  ) {}
}
class NotFoundError extends CoreError {} // 404
class ValidationError extends CoreError {
  constructor(public failures: ValidationFailure[]) {}
} // 422
class AuthenticationError extends CoreError {} // 401
class AuthorizationError extends CoreError {} // 403
class ConflictError extends CoreError {} // 409
class BusinessError extends CoreError {} // 422
class IntegrationError extends CoreError {} // 502

type Result<T, E = CoreError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

## Adapters

```typescript
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

interface AdapterRegistry {
  get<T>(type: AdapterType): T;
  register<T>(type: AdapterType, adapter: T): void;
}

// Storage: upload, download, getSignedUrl, delete
// Notification: send(to, message) per channel
// Payment: createPaymentSession, capturePayment, refund, handleWebhook
// Geo: geocode, reverseGeocode, getRoute, getDistanceMatrix
// Search: index, search, delete, sync
```
