# AI Code Editor Prompts

## Core + Module Foundation — System Agnostic

---

## Prompt 1 — Project Foundation Setup

> Paste into Cursor / Windsurf / Copilot Workspace after `bun init`.
> Attach the Core deep-dive doc and Module deep-dive doc as context.

---

```
I am building a generic multi-tenant application platform using Bun as the runtime.
The architecture follows three layers: Core → Module → Compose.

I have already run `bun init`. Extend existing files where needed — do not recreate them.

This setup covers ONLY Layer 1 (Core) and Layer 2 (Modules).
No Compose, no business application, no domain-specific logic of any kind.
The goal is a system-agnostic foundation that any future Compose can be built on top of.

---

LAYER BOUNDARY RULES — enforce these throughout every file generated:

  Core   → imports nothing from modules/, compose/, or infra/ (except type contracts)
  Module → imports from core/ and infra/ only. Never from another module's internals.
  Infra  → implements Core interfaces. Imports from core/ only.
  Compose → not built yet. No files, no references.

Any import that crosses these boundaries is a hard architectural violation.

---

STEP 1 — Install dependencies

Production:
  elysia                        # HTTP + WebSocket framework
  @elysiajs/bearer              # JWT extraction
  @elysiajs/cors                # CORS
  @elysiajs/swagger             # OpenAPI auto-generation
  @sinclair/typebox             # schema validation (native to Elysia)
  drizzle-orm                   # ORM
  @neondatabase/serverless      # Neon Postgres driver
  bullmq                        # queue system
  ioredis                       # Redis client
  ulid                          # ID generation
  zod                           # env + config validation only
  dotenv                        # env loading
  pino                          # structured logger
  pino-pretty                   # dev formatting
  cron                          # cron scheduler
  handlebars                    # template rendering (notification module)
  jose                          # JWT sign/verify (pure ESM, Bun-compatible)

Dev:
  drizzle-kit
  @types/bun
  typescript


STEP 2 — tsconfig.json

Extend the existing tsconfig.json:
  - "target": "ESNext"
  - "module": "ESNext"
  - "moduleResolution": "bundler"
  - "strict": true
  - paths:
      "@core/*"     → "src/core/*"
      "@modules/*"  → "src/modules/*"
      "@infra/*"    → "src/infra/*"
      "@db/*"       → "src/infra/db/*"


STEP 3 — Folder structure

Create every folder with a placeholder index.ts.
No logic yet — structure only.

src/
  core/
    entity/index.ts           ← Entity, ID, Timestamp, Money, Meta, IDGenerator
    event/index.ts            ← DomainEvent, EventBus, EventStore, EventOutbox
    state/index.ts            ← StateMachine, FSMEngine, StateNode, Transition
    rule/index.ts             ← RuleExpr, Op, RuleEngine
    cqrs/index.ts             ← Command, Query, Mediator, middleware pipeline
    repository/index.ts       ← Repository<T>, BaseRepository, Filter, QueryOptions
    module/index.ts           ← ModuleManifest, AppModule, ModuleRegistry
    realtime/index.ts         ← RealTimeGateway interface, RealTimeBridge
    queue/index.ts            ← Queue, Job, JobOptions, Scheduler interfaces
    context/index.ts          ← SystemContext interface + factory
    errors/index.ts           ← CoreError hierarchy, Result<T,E>
    primitives/index.ts       ← Money helpers, PaginatedResult, PageOptions
    index.ts                  ← public API — re-exports only what modules need

  modules/
    identity/
      entities/index.ts       ← EntitySchema definitions only (no DB code)
      commands/index.ts       ← command handlers
      queries/index.ts        ← query handlers
      events/index.ts         ← event emitters + listeners
      fsm/index.ts            ← Actor FSM, Session FSM
      jobs/index.ts           ← scheduled jobs for this module
      index.ts                ← AppModule export
    catalog/      (same structure)
    inventory/    (same structure)
    ledger/       (same structure)
    workflow/     (same structure)
    scheduling/   (same structure)
    document/     (same structure)
    notification/ (same structure)
    geo/          (same structure)
    analytics/    (same structure)

  infra/
    db/
      schema/
        helpers.ts            ← baseColumns, moneyColumns, shared column builders
        identity.ts
        catalog.ts
        inventory.ts
        ledger.ts
        workflow.ts
        scheduling.ts
        document.ts
        notification.ts
        geo.ts
        analytics.ts
        events.ts             ← EventStore table
        outbox.ts             ← Transactional Outbox table
        index.ts              ← re-exports all schemas
      migrations/             ← drizzle-kit output (do not hand-write)
      client.ts               ← Drizzle + Neon singleton
      index.ts
    queue/
      client.ts               ← BullMQ + ioredis setup
      index.ts
    cache/
      client.ts               ← Redis cache helpers
      index.ts
    realtime/
      gateway.ts              ← Bun WebSocket implementation of RealTimeGateway
      index.ts
    env.ts                    ← zod-validated env

  index.ts                    ← app entry (Elysia server)
  worker.ts                   ← queue worker entry (no HTTP server)


STEP 4 — Environment

Create .env.example:

  # Server
  PORT=3000
  NODE_ENV=development
  APP_VERSION=0.1.0

  # Neon (Postgres)
  DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

  # Redis
  REDIS_URL=redis://localhost:6379

  # Auth
  JWT_SECRET=changeme_min_32_chars
  JWT_EXPIRES_IN=7d
  REFRESH_TOKEN_EXPIRES_IN=30d

  # Storage (used by document module)
  STORAGE_PROVIDER=local          # local | s3 | gcs | r2
  STORAGE_LOCAL_PATH=./uploads
  S3_BUCKET=
  S3_REGION=
  S3_ACCESS_KEY=
  S3_SECRET_KEY=
  CDN_BASE_URL=

  # Notification adapters (used by notification module)
  EMAIL_PROVIDER=console          # console | smtp | resend | sendgrid
  SMTP_HOST=
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASS=
  RESEND_API_KEY=

  SMS_PROVIDER=console            # console | twilio | msg91
  TWILIO_ACCOUNT_SID=
  TWILIO_AUTH_TOKEN=
  TWILIO_FROM=

  # Maps (used by geo module)
  GEO_PROVIDER=osm                # osm | google | mapbox

src/infra/env.ts:
  - Parse process.env with zod
  - Throw a descriptive error on startup for any missing required variable
  - Export typed `env` object — used everywhere instead of process.env directly
  - Required at startup: PORT, DATABASE_URL, REDIS_URL, JWT_SECRET
  - All others are optional with sensible defaults


STEP 5 — Core primitives (implement fully, not as stubs)

src/core/errors/index.ts
  class CoreError extends Error
    constructor(code: string, message: string, meta?: Record<string,unknown>, cause?: unknown)

  class NotFoundError      extends CoreError   // 404
  class ValidationError    extends CoreError   // 422 — holds failures[]: {field, message}[]
  class AuthenticationError extends CoreError  // 401
  class AuthorizationError  extends CoreError  // 403
  class ConflictError       extends CoreError  // 409 — optimistic lock / duplicate
  class BusinessError       extends CoreError  // 422 — domain rule violation
  class IntegrationError    extends CoreError  // 502 — external service failure

  type Result<T, E extends CoreError = CoreError> =
    | { ok: true;  value: T }
    | { ok: false; error: E }

  function Ok<T>(value: T): Result<T>
  function Err<E extends CoreError>(error: E): Result<never, E>

src/core/primitives/index.ts
  interface Money { amount: number; currency: string }
    // amount = integer in smallest unit (paise, cents) — NEVER float
  moneyAdd(a: Money, b: Money): Money
  moneySubtract(a: Money, b: Money): Money
  moneyMultiply(m: Money, factor: number): Money
  moneyFormat(m: Money, locale?: string): string

  interface PaginatedResult<T> {
    data: T[]; total: number; page: number; limit: number; hasNext: boolean
  }
  interface PageOptions { page?: number; limit?: number; sort?: SortSpec[] }

src/core/entity/index.ts
  type ID = string               // ULID
  type Timestamp = number        // Unix epoch ms
  type Meta = Record<string, string | number | boolean | null>

  interface Entity {
    id: ID
    organizationId: ID           // multi-tenancy — always present
    createdAt: Timestamp
    updatedAt: Timestamp
    deletedAt?: Timestamp        // soft delete
    version: number              // optimistic concurrency
    meta: Meta
  }

  function generateId(): ID                          // new ULID
  function generatePrefixedId(prefix: string): ID   // 'ord_01ARZ...'
  function isValidId(id: string): boolean
  function extractTimestamp(id: ID): Timestamp

src/core/event/index.ts
  interface DomainEvent<T = unknown> {
    id: ID
    type: string                 // 'actor.created', 'stock.low'
    aggregateId: ID
    aggregateType: string
    payload: T
    occurredAt: Timestamp
    actorId?: ID
    orgId: ID
    correlationId: ID
    causedBy?: ID
    version: number              // aggregate version at time of event
    source: string               // module id that emitted
    metadata?: Meta
  }

  interface EventBus {
    publish(event: DomainEvent): Promise<void>
    publishBatch(events: DomainEvent[]): Promise<void>
    subscribe(pattern: string, handler: EventHandler, opts?: SubscribeOptions): Unsubscribe
    // patterns: 'actor.created' | 'actor.*' | '*.created' | '*'
  }

  interface EventStore {
    append(event: DomainEvent): Promise<void>
    appendBatch(events: DomainEvent[]): Promise<void>
    read(aggregateId: ID, opts?: ReadOptions): AsyncIterable<DomainEvent>
    readByType(type: string, opts?: ReadOptions): AsyncIterable<DomainEvent>
    replay(filter: EventFilter, from: Timestamp): AsyncIterable<DomainEvent>
    getVersion(aggregateId: ID): Promise<number>
  }

  interface EventOutbox {
    write(event: DomainEvent, tx: unknown): Promise<void>
    pollUnpublished(limit: number): Promise<OutboxRecord[]>
    markPublished(id: ID): Promise<void>
    markFailed(id: ID, error: string): Promise<void>
  }

  Create an InMemoryEventBus implementation — wildcard pattern matching using split on '.':
    'actor.*'    matches 'actor.created', 'actor.suspended'
    '*.created'  matches 'actor.created', 'stock.created'
    '*'          matches everything

src/core/state/index.ts
  interface StateMachine<S extends string, E extends string> {
    id: string
    entityType: string
    initial: S
    states: Record<S, StateNode<S, E>>
  }

  interface StateNode<S, E> {
    label?: string
    terminal?: boolean
    on: Partial<Record<E, Transition<S> | Transition<S>[]>>
    entry?: Action[]
    exit?: Action[]
    after?: TimedTransition<S>[]
  }

  interface Transition<S> {
    target: S
    guard?: RuleExpr
    actions?: Action[]
  }

  type Action =
    | { type: 'emit';     event: string; payload?: Record<string, unknown> }
    | { type: 'dispatch'; command: string; payload?: Record<string, unknown> }
    | { type: 'assign';   field: string; value: unknown }
    | { type: 'log';      message: string }

  interface FSMEngine {
    register(machine: StateMachine<any, any>): void
    resolve(id: string): StateMachine<any, any>
    can(machineId: string, currentState: string, event: string, context: FSMContext): boolean
    transition(machineId: string, currentState: string, event: string, context: FSMContext): Promise<TransitionResult>
    validEvents(machineId: string, currentState: string, context: FSMContext): string[]
  }

  Create createFSMEngine(): FSMEngine — in-memory implementation

src/core/rule/index.ts
  type RuleExpr =
    | { field: string; op: Op; value: unknown }
    | { and: RuleExpr[] }
    | { or: RuleExpr[] }
    | { not: RuleExpr }
    | { ref: string }

  type Op = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'in'|'nin'|'contains'|'matches'|'exists'|'empty'

  interface RuleEngine {
    evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean
    compile(expr: RuleExpr): { evaluate(ctx: Record<string, unknown>): boolean }
    register(id: string, expr: RuleExpr): void
    resolve(id: string): RuleExpr
    explain(expr: RuleExpr, context: Record<string, unknown>): RuleExplanation
  }

  Create createRuleEngine(): RuleEngine — full recursive implementation
  The explain() method must return which leaf conditions failed and why.

src/core/cqrs/index.ts
  interface Command<T = unknown> {
    type: string
    payload: T
    actorId: ID
    orgId: ID
    correlationId: ID
    causedBy?: ID
    idempotencyKey?: string
  }

  interface Query<T = unknown> {
    type: string
    params: T
    actorId: ID
    orgId: ID
  }

  interface Mediator {
    dispatch<R = unknown>(cmd: Command): Promise<R>
    query<R = unknown>(q: Query): Promise<R>
    registerCommand(type: string, handler: CommandHandler): void
    registerQuery(type: string, handler: QueryHandler): void
    use(middleware: MediatorMiddleware): void
  }

  type MediatorMiddleware = (
    request: Command | Query,
    ctx: SystemContext,
    next: () => Promise<unknown>
  ) => Promise<unknown>

  Create createMediator(): Mediator
  Middleware runs as a pipeline in registration order before every dispatch/query.
  If idempotencyKey is present on a Command, check an in-memory Map before dispatching —
  if the key exists and TTL hasn't expired, return the cached result instead of re-running.

src/core/context/index.ts
  interface SystemContext {
    actor: { id: ID; roles: string[]; orgId: ID; type: 'human'|'system'|'api_key' }
    org: { id: ID; slug: string; settings: Record<string, unknown> }
    correlationId: ID
    requestId: ID
    startedAt: Timestamp
    dispatch<R = unknown>(cmd: Omit<Command, 'actorId'|'orgId'|'correlationId'>): Promise<R>
    query<R = unknown>(q: Omit<Query, 'actorId'|'orgId'>): Promise<R>
    publish(event: Omit<DomainEvent, 'actorId'|'orgId'|'correlationId'>): Promise<void>
    rules: RuleEngine
    fsm: FSMEngine
    queue: Queue
    logger: Logger
  }

  function createSystemContext(opts: SystemContextOptions): SystemContext

Export everything from src/core/index.ts — this is the only file modules import from.


STEP 6 — Infrastructure implementations

src/infra/env.ts
  - Zod schema + parse as described in Step 4

src/infra/db/client.ts
  import { neon }    from '@neondatabase/serverless'
  import { drizzle } from 'drizzle-orm/neon-http'
  import * as schema from './schema'
  - Create and export `db` singleton
  - Export `DB` type (typeof db)
  - Graceful error if DATABASE_URL is missing

src/infra/queue/client.ts
  - Export `redis` — ioredis connection using REDIS_URL
  - Export createQueue(name: string): Queue  — wraps BullMQ Queue
  - Export createWorker(name, handler, options?): Worker  — wraps BullMQ Worker
  - Both createQueue and createWorker use the same redis connection

src/infra/cache/client.ts
  - Separate ioredis connection for cache (not shared with queue)
  - Export: get(key), set(key, value, ttlSeconds?), del(key), exists(key)
  - All keys are namespaced automatically with APP_VERSION prefix

src/infra/realtime/gateway.ts
  Implements RealTimeGateway from core using Bun's native WebSocket:

  State:
    clients: Map<clientId, { ws: ServerWebSocket; orgId: ID; actorId: ID; channels: Set<string> }>
    channels: Map<channelName, Set<clientId>>

  On client connect:
    - Authenticate JWT from query param ?token=
    - Assign clientId (ULID)
    - Store in clients map

  On message { type: 'subscribe', channels: string[] }:
    - Verify client is authorized for each channel
      Rule: channel must start with `org:${client.orgId}:` or be public
    - Call ws.subscribe(channel) — uses Bun's native pub/sub
    - Update channels map

  On message { type: 'unsubscribe', channels: string[] }:
    - ws.unsubscribe(channel)
    - Update maps

  publish(channel, payload):
    - server.publish(channel, JSON.stringify({ channel, data: payload, ts: Date.now() }))

  broadcast(orgId, payload):
    - publish(`org:${orgId}:broadcast`, payload)

  Export: gateway instance + getElysiaWSHandler() → Elysia WebSocket route handler


STEP 7 — Module stubs

For each of the 10 modules (identity, catalog, inventory, ledger, workflow,
scheduling, document, notification, geo, analytics):

Create a valid AppModule export in modules/{name}/index.ts:

  export const {Name}Module: AppModule = {
    manifest: {
      id: '{name}',
      version: '0.1.0',
      dependsOn: [],       // fill in actual dependencies
      entities: [],        // fill in after schema step
      events: [],
      commands: [],
      queries: [],
      fsms: [],
      migrations: [],
    },
    async boot(registry: BootRegistry) {
      // register command handlers, query handlers, event listeners, FSMs
      // stub — implement per module in later steps
    },
    async shutdown() {}
  }

Actual dependency graph (dependsOn):
  identity:     []
  catalog:      []
  inventory:    ['catalog']
  ledger:       []
  workflow:     ['identity']
  scheduling:   ['identity', 'catalog']
  document:     ['identity']
  notification: ['identity']
  geo:          []
  analytics:    []   ← analytics reads from all, but no write dependency


STEP 8 — Elysia entry point (src/index.ts)

  - Create Elysia app
  - Add cors, swagger, bearer plugins
  - Mount WebSocket handler from infra/realtime/gateway.ts at /ws
  - Add GET /health → { status: 'ok', version: env.APP_VERSION, timestamp: Date.now() }
  - Add GET /modules → list all registered module manifests (useful for debugging)
  - Global onError handler — map CoreError subclasses to HTTP status codes:
      NotFoundError       → 404
      ValidationError     → 422  (include failures[] in response body)
      AuthenticationError → 401
      AuthorizationError  → 403
      ConflictError       → 409
      BusinessError       → 422
      IntegrationError    → 502
      Unknown             → 500
  - Boot all modules in dependency order before starting server
  - Log: port, environment, modules loaded, DB connected
  - Never expose stack traces in production (NODE_ENV check)


STEP 9 — Worker entry point (src/worker.ts)

  Separate Bun process — no HTTP server.
  - Connect Redis via infra/queue/client
  - Connect DB via infra/db/client
  - Register one BullMQ worker per module queue (stubs for now)
  - Log which queues are being watched
  - Handle SIGTERM/SIGINT gracefully — drain in-flight jobs before exit


STEP 10 — package.json scripts

  "dev":          "bun run --hot src/index.ts"
  "start":        "bun run src/index.ts"
  "worker":       "bun run src/worker.ts"
  "worker:dev":   "bun run --hot src/worker.ts"
  "typecheck":    "tsc --noEmit"
  "db:generate":  "drizzle-kit generate"
  "db:migrate":   "drizzle-kit migrate"
  "db:studio":    "drizzle-kit studio"
  "db:seed":      "bun run src/infra/db/seed.ts"


GLOBAL CONSTRAINTS:
  - No `any` — use `unknown` where type is truly unknown
  - No hardcoded strings for event types, command types, entity names —
    all declared as constants in their module's index.ts
  - No business logic anywhere in this setup — commands and queries are stubs
  - Core files must be pure TypeScript — no Bun/Node-specific APIs
    (only infra/ files use Bun.* APIs)
  - Every infrastructure connection must log clearly on failure and exit with code 1
```

---

## Prompt 2 — Drizzle + Neon Schema (Core + Modules Only)

> Run after Prompt 1 is complete.
> These tables represent ONLY Core infrastructure and the 10 generic Modules.
> No Compose-level tables. No application-specific entities.
> A Compose will add its own schema files later — they are not built here.

---

```
Set up Drizzle ORM schemas for the Core and Module layers only.
The project uses Bun, TypeScript, Drizzle ORM, and Neon (serverless Postgres).

BOUNDARY RULE:
  These tables must be usable by ANY future Compose — CRM, ERP, Hotel, Medical, Ecommerce.
  If a table would only make sense in one type of application, it does not belong here.
  Compose-specific tables (Order, Room, Patient, etc.) are NOT created in this step.

---

STEP 1 — drizzle.config.ts (project root)

  export default defineConfig({
    dialect: 'postgresql',
    schema: './src/infra/db/schema/index.ts',
    out: './src/infra/db/migrations',
    dbCredentials: { connectionString: process.env.DATABASE_URL! },
    verbose: true,
    strict: true,
  })


STEP 2 — Column helpers (src/infra/db/schema/helpers.ts)

  import { text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

  Export baseColumns (used by every module table — not Core infrastructure tables):
    id               text PRIMARY KEY          ← ULID set by application, never DB serial
    organization_id  text NOT NULL
    created_at       timestamp NOT NULL DEFAULT now()
    updated_at       timestamp NOT NULL DEFAULT now()
    deleted_at       timestamp                 ← null = active (soft delete)
    version          integer NOT NULL DEFAULT 1 ← optimistic concurrency
    meta             jsonb NOT NULL DEFAULT '{}'

  Export moneyColumns(prefix: string):
    Returns { `${prefix}_amount`: integer, `${prefix}_currency`: text }
    Example: moneyColumns('price') → { price_amount: integer, price_currency: text }
    Always integer — smallest currency unit. Never numeric or float.

  Export softDeleteFilter:
    A reusable isNull(table.deleted_at) expression for queries


STEP 3 — Core infrastructure tables

These two tables are NOT module-level. They belong to Core infrastructure.
They have their own column structure — do NOT use baseColumns() on them.

FILE: src/infra/db/schema/events.ts

  Table: evt_store  ← append-only EventStore. Never updated. Never deleted.
    id               text PRIMARY KEY              ← ULID
    type             text NOT NULL                 ← 'actor.created', 'stock.low'
    aggregate_id     text NOT NULL
    aggregate_type   text NOT NULL                 ← 'Actor', 'StockUnit'
    payload          jsonb NOT NULL
    occurred_at      timestamp NOT NULL
    actor_id         text                          ← nullable (system events)
    org_id           text NOT NULL
    correlation_id   text NOT NULL
    caused_by        text                          ← evt_store.id, nullable
    version          integer NOT NULL              ← aggregate version at event time
    source           text NOT NULL                 ← module id: 'identity', 'inventory'
    metadata         jsonb NOT NULL DEFAULT '{}'

    Indexes:
      (aggregate_id, version) UNIQUE    ← enforces optimistic concurrency at DB level
      (org_id, type)
      (org_id, aggregate_type)
      (org_id, aggregate_id)
      (correlation_id)
      (occurred_at)                     ← for time-range replay queries
      (source)

FILE: src/infra/db/schema/outbox.ts

  Table: evt_outbox  ← Transactional Outbox. Written in same tx as entity save.
    id               text PRIMARY KEY
    event            jsonb NOT NULL               ← full DomainEvent JSON
    published_at     timestamp                    ← null = not yet published
    attempts         integer NOT NULL DEFAULT 0
    last_error       text
    created_at       timestamp NOT NULL DEFAULT now()

    Indexes:
      (published_at) WHERE published_at IS NULL   ← partial index: only unpublished rows
      (attempts)     WHERE published_at IS NULL
      (created_at)   WHERE published_at IS NULL   ← for ordering unpublished by age


STEP 4 — Module schemas

One file per module. Every table uses baseColumns() unless stated otherwise.
Table name prefix matches module namespace — this prevents collisions when
multiple Compose schemas are added later.

Prefix map:
  identity    → no prefix (core tables, referenced by all)
  catalog     → cat_
  inventory   → inv_
  ledger      → ldg_
  workflow    → wf_
  scheduling  → sch_
  document    → doc_
  notification→ ntf_
  geo         → geo_
  analytics   → anl_

All enums are pgEnum. Define each enum in the same file as the table that owns it.
All foreign keys are text (ULID) — never integer FK references.
Cross-module FK references are text columns without a DB-level FK constraint.
  Reason: modules are bounded contexts — DB-level FKs across module boundaries
  create coupling that prevents modules from being independently deployed later.
  Referential integrity across modules is enforced at the application layer.
  FK constraints WITHIN the same module file are fine and encouraged.

---

FILE: src/infra/db/schema/identity.ts

  organizations   ← no baseColumns — org IS the tenant root
    id             text PRIMARY KEY
    name           text NOT NULL
    slug           text NOT NULL
    plan           text NOT NULL DEFAULT 'free'
    settings       jsonb NOT NULL DEFAULT '{}'
    status         text NOT NULL DEFAULT 'active'
    created_at     timestamp NOT NULL DEFAULT now()
    updated_at     timestamp NOT NULL DEFAULT now()
    Indexes: slug UNIQUE

  actor_type_enum: pgEnum('actor_type', ['human', 'system', 'api_key'])
  actor_status_enum: pgEnum('actor_status', ['pending', 'active', 'suspended', 'deleted'])

  actors   (+ baseColumns)
    email          text NOT NULL
    password_hash  text                       ← nullable (SSO actors have no password)
    type           actor_type_enum NOT NULL DEFAULT 'human'
    status         actor_status_enum NOT NULL DEFAULT 'pending'
    first_name     text
    last_name      text
    avatar_url     text
    last_login_at  timestamp
    Indexes:
      (organization_id, email) UNIQUE
      (organization_id, status)
      (organization_id, type)

  roles   (+ baseColumns)
    name           text NOT NULL
    description    text
    permissions    jsonb NOT NULL DEFAULT '[]'  ← string[]: 'resource:action' pairs
    is_default     boolean NOT NULL DEFAULT false
    is_system      boolean NOT NULL DEFAULT false
    Indexes:
      (organization_id, name) UNIQUE

  actor_roles   ← junction table — NO baseColumns
    actor_id       text NOT NULL               ← actors.id
    role_id        text NOT NULL               ← roles.id
    assigned_at    timestamp NOT NULL DEFAULT now()
    assigned_by    text                        ← actors.id, nullable
    PRIMARY KEY (actor_id, role_id)
    Indexes: actor_id, role_id

  sessions   (+ baseColumns)
    actor_id       text NOT NULL               ← actors.id
    token_hash     text NOT NULL
    refresh_token_hash text
    expires_at     timestamp NOT NULL
    refresh_expires_at timestamp
    ip             text
    user_agent     text
    revoked_at     timestamp
    Indexes:
      token_hash UNIQUE
      refresh_token_hash UNIQUE (partial: WHERE refresh_token_hash IS NOT NULL)
      (actor_id, expires_at)
      (organization_id, actor_id)

  api_keys   (+ baseColumns)
    name           text NOT NULL
    actor_id       text NOT NULL               ← actors.id
    key_hash       text NOT NULL
    scopes         jsonb NOT NULL DEFAULT '[]' ← string[]
    expires_at     timestamp
    last_used_at   timestamp
    revoked_at     timestamp
    Indexes:
      key_hash UNIQUE
      (organization_id, actor_id)

---

FILE: src/infra/db/schema/catalog.ts

  item_status_enum: pgEnum('cat_item_status', ['draft', 'active', 'archived'])

  cat_categories   (+ baseColumns)
    name           text NOT NULL
    slug           text NOT NULL
    parent_id      text                        ← cat_categories.id (self-ref, nullable)
    attribute_set  jsonb NOT NULL DEFAULT '[]' ← FieldSchema[] defining valid attributes
    sort_order     integer NOT NULL DEFAULT 0
    status         text NOT NULL DEFAULT 'active'
    Indexes:
      (organization_id, slug) UNIQUE
      (organization_id, parent_id)
      (organization_id, status)

  cat_items   (+ baseColumns)
    ← Generic name. Compose config renames this label to 'Product', 'Room', 'Course', etc.
    name           text NOT NULL
    slug           text NOT NULL
    category_id    text                        ← cat_categories.id
    description    text
    attributes     jsonb NOT NULL DEFAULT '{}'  ← dynamic values per category attribute_set
    status         item_status_enum NOT NULL DEFAULT 'draft'
    tags           jsonb NOT NULL DEFAULT '[]' ← string[]
    media          jsonb NOT NULL DEFAULT '[]' ← { url, type, alt, sortOrder }[]
    Indexes:
      (organization_id, slug) UNIQUE
      (organization_id, status)
      (organization_id, category_id)
      Using GIN on attributes for attribute-value queries

  cat_variants   (+ baseColumns)
    item_id        text NOT NULL               ← cat_items.id
    sku            text NOT NULL
    attributes     jsonb NOT NULL DEFAULT '{}'  ← { color: 'red', size: 'L' }
    stock_tracked  boolean NOT NULL DEFAULT true
    status         text NOT NULL DEFAULT 'active'
    Indexes:
      (organization_id, sku) UNIQUE
      (organization_id, item_id)

  price_list_status_enum: pgEnum('cat_price_list_status', ['draft', 'active', 'archived'])

  cat_price_lists   (+ baseColumns)
    name           text NOT NULL
    currency       text NOT NULL DEFAULT 'USD'
    audience       jsonb NOT NULL DEFAULT '{}'  ← { roles: string[], segmentIds: string[] }
    valid_from     timestamp
    valid_to       timestamp
    status         price_list_status_enum NOT NULL DEFAULT 'draft'
    Indexes:
      (organization_id, status)
      (organization_id, valid_from, valid_to)

  cat_price_rules   (+ baseColumns)
    price_list_id  text NOT NULL               ← cat_price_lists.id
    variant_id     text NOT NULL               ← cat_variants.id
    ...moneyColumns('price')                   ← price_amount integer, price_currency text
    min_qty        integer NOT NULL DEFAULT 1
    conditions     jsonb NOT NULL DEFAULT '{}'  ← RuleExpr JSON (empty = always applies)
    Indexes:
      (organization_id, price_list_id, variant_id)
      (organization_id, variant_id)

---

FILE: src/infra/db/schema/inventory.ts

  location_type_enum: pgEnum('inv_location_type', ['warehouse', 'store', 'shelf', 'virtual'])

  inv_locations   (+ baseColumns)
    name           text NOT NULL
    type           location_type_enum NOT NULL DEFAULT 'warehouse'
    address        jsonb
    is_default     boolean NOT NULL DEFAULT false
    Indexes:
      (organization_id, is_default)
      (organization_id, type)

  inv_stock_units   (+ baseColumns)
    variant_id     text NOT NULL               ← cat_variants.id (cross-module: text, no FK)
    location_id    text NOT NULL               ← inv_locations.id
    on_hand        integer NOT NULL DEFAULT 0
    reserved       integer NOT NULL DEFAULT 0
    ← available = on_hand - reserved: computed in application layer, NOT stored
    ← Reason: storing computed fields creates consistency bugs under concurrent updates
    Indexes:
      (organization_id, variant_id, location_id) UNIQUE
      (organization_id, location_id)
      (organization_id, variant_id)

  inv_movements   (+ baseColumns)
    ← Append-only log of every stock change. Never updated.
    variant_id       text NOT NULL
    from_location_id text                      ← null = external (receiving from supplier)
    to_location_id   text                      ← null = external (shipping to customer)
    quantity         integer NOT NULL
    reason           text NOT NULL             ← 'sale', 'transfer', 'adjustment', 'return', 'receive'
    reference_id     text                      ← Compose entity id (order, transfer slip, etc.)
    reference_type   text                      ← 'Order', 'PurchaseOrder', etc.
    actor_id         text
    Indexes:
      (organization_id, variant_id)
      (organization_id, reference_id, reference_type)
      (organization_id, reason)
      (created_at)

---

FILE: src/infra/db/schema/ledger.ts

  account_type_enum: pgEnum('ldg_account_type', ['asset','liability','revenue','expense','equity'])
  tx_status_enum: pgEnum('ldg_tx_status', ['pending','posted','voided'])

  ldg_accounts   (+ baseColumns)
    code           text NOT NULL               ← 'ACC-001', 'REVENUE-SALES'
    name           text NOT NULL
    type           account_type_enum NOT NULL
    currency       text NOT NULL DEFAULT 'USD'
    parent_id      text                        ← ldg_accounts.id (hierarchy, nullable)
    is_system      boolean NOT NULL DEFAULT false
    description    text
    Indexes:
      (organization_id, code) UNIQUE
      (organization_id, type)
      (organization_id, parent_id)

  ldg_transactions   (+ baseColumns)
    reference      text NOT NULL               ← source entity id (Compose-level)
    reference_type text NOT NULL               ← 'Order', 'Invoice', 'Payroll'
    description    text NOT NULL
    currency       text NOT NULL
    ...moneyColumns('amount')                  ← total amount in smallest unit
    status         tx_status_enum NOT NULL DEFAULT 'pending'
    posted_at      timestamp
    voided_at      timestamp
    void_reason    text
    actor_id       text
    Indexes:
      (organization_id, reference, reference_type)
      (organization_id, status)
      (organization_id, posted_at)

  ldg_journal_entries   (+ baseColumns)
    ← Double-entry: every transaction has exactly 2 entries (debit + credit)
    transaction_id text NOT NULL               ← ldg_transactions.id
    account_id     text NOT NULL               ← ldg_accounts.id
    debit          integer NOT NULL DEFAULT 0
    credit         integer NOT NULL DEFAULT 0
    currency       text NOT NULL
    ← Invariant enforced in app layer: debit XOR credit must be > 0, not both
    Indexes:
      (transaction_id)                         ← always query entries by transaction
      (account_id)                             ← balance queries by account
      (organization_id, account_id)

---

FILE: src/infra/db/schema/workflow.ts

  instance_status_enum: pgEnum('wf_instance_status', ['pending','active','completed','cancelled'])
  task_status_enum: pgEnum('wf_task_status', ['open','in_progress','completed','failed','skipped'])

  wf_process_templates   (+ baseColumns)
    name           text NOT NULL
    description    text
    entity_type    text NOT NULL               ← 'Order', 'Patient', 'Claim' — Compose declares this
    stages         jsonb NOT NULL DEFAULT '[]' ← Stage[] with tasks and entry guards
    is_active      boolean NOT NULL DEFAULT true
    Indexes:
      (organization_id, entity_type)
      (organization_id, is_active)

  wf_process_instances   (+ baseColumns)
    template_id    text NOT NULL               ← wf_process_templates.id
    entity_id      text NOT NULL               ← any Compose entity id
    entity_type    text NOT NULL
    current_stage  text
    context        jsonb NOT NULL DEFAULT '{}'  ← runtime data available to guards/actions
    status         instance_status_enum NOT NULL DEFAULT 'pending'
    started_at     timestamp
    completed_at   timestamp
    Indexes:
      (organization_id, entity_id, entity_type) UNIQUE ← one active process per entity
      (organization_id, status)
      (organization_id, template_id)

  wf_tasks   (+ baseColumns)
    instance_id    text NOT NULL               ← wf_process_instances.id
    stage_id       text NOT NULL               ← matches stage id in template stages JSON
    title          text NOT NULL
    description    text
    assignee_role  text                        ← role name (no FK — string match)
    assignee_id    text                        ← specific actor id, nullable
    status         task_status_enum NOT NULL DEFAULT 'open'
    due_at         timestamp
    completed_at   timestamp
    outcome        jsonb                       ← freeform result data from completer
    Indexes:
      (organization_id, instance_id)
      (organization_id, assignee_id, status)
      (organization_id, status)
      (organization_id, due_at) WHERE status = 'open'  ← partial: only open tasks

---

FILE: src/infra/db/schema/scheduling.ts

  slot_status_enum: pgEnum('sch_slot_status', ['available','partially_booked','fully_booked','cancelled','expired'])
  booking_status_enum: pgEnum('sch_booking_status', ['pending','confirmed','checked_in','completed','cancelled','no_show'])

  sch_calendars   (+ baseColumns)
    owner_id       text NOT NULL               ← actor id, item id, location id
    owner_type     text NOT NULL               ← 'Actor', 'Item', 'Location'
    timezone       text NOT NULL DEFAULT 'UTC'
    working_hours  jsonb NOT NULL DEFAULT '{}'  ← { mon: {from:'09:00',to:'17:00'}, ... }
    Indexes:
      (organization_id, owner_id, owner_type) UNIQUE

  sch_slots   (+ baseColumns)
    calendar_id    text NOT NULL               ← sch_calendars.id
    resource_id    text NOT NULL               ← what is being booked
    resource_type  text NOT NULL               ← 'Room', 'Doctor', 'Table', 'Seat'
    start_at       timestamp NOT NULL
    end_at         timestamp NOT NULL
    capacity       integer NOT NULL DEFAULT 1
    booked_count   integer NOT NULL DEFAULT 0
    status         slot_status_enum NOT NULL DEFAULT 'available'
    recurrence_id  text                        ← sch_recurrences.id if generated from rule
    Indexes:
      (organization_id, calendar_id, start_at)
      (organization_id, resource_id, resource_type, start_at)
      (organization_id, status)

  sch_recurrences   (+ baseColumns)
    calendar_id    text NOT NULL               ← sch_calendars.id
    rrule          text NOT NULL               ← RFC 5545 RRULE string
    slot_template  jsonb NOT NULL              ← capacity, resource_id, resource_type
    generated_until timestamp                  ← how far ahead slots have been generated
    is_active      boolean NOT NULL DEFAULT true
    Indexes:
      (organization_id, calendar_id)

  sch_bookings   (+ baseColumns)
    slot_id        text NOT NULL               ← sch_slots.id
    actor_id       text NOT NULL               ← who is booking (cross-module: text)
    status         booking_status_enum NOT NULL DEFAULT 'pending'
    notes          text
    confirmed_at   timestamp
    cancelled_at   timestamp
    cancellation_reason text
    checked_in_at  timestamp
    Indexes:
      (organization_id, slot_id)
      (organization_id, actor_id, status)
      (organization_id, status)

---

FILE: src/infra/db/schema/document.ts

  doc_status_enum: pgEnum('doc_status', ['draft','under_review','approved','archived'])

  doc_folders   (+ baseColumns)
    name           text NOT NULL
    parent_id      text                        ← doc_folders.id (self-ref, nullable)
    owner_id       text NOT NULL               ← entity this folder belongs to
    owner_type     text NOT NULL               ← 'Actor', 'Organization', any Compose type
    Indexes:
      (organization_id, owner_id, owner_type)
      (organization_id, parent_id)

  doc_documents   (+ baseColumns)
    folder_id      text                        ← doc_folders.id (nullable = root)
    name           text NOT NULL
    mime_type      text NOT NULL
    status         doc_status_enum NOT NULL DEFAULT 'draft'
    latest_version_id text                     ← doc_versions.id (updated on each upload)
    tags           jsonb NOT NULL DEFAULT '[]'
    Indexes:
      (organization_id, folder_id)
      (organization_id, status)

  doc_versions   (+ baseColumns)
    document_id    text NOT NULL               ← doc_documents.id
    storage_key    text NOT NULL               ← key in StorageAdapter (S3/R2/local)
    size_bytes     integer NOT NULL
    checksum       text NOT NULL               ← SHA-256 of file content
    uploaded_by    text NOT NULL               ← actor_id
    Indexes:
      (organization_id, document_id)
      (organization_id, document_id, created_at)

  doc_attachments   (+ baseColumns)
    entity_id      text NOT NULL               ← any entity in any module or compose
    entity_type    text NOT NULL
    document_id    text NOT NULL               ← doc_documents.id
    label          text
    Indexes:
      (organization_id, entity_id, entity_type)
      (organization_id, document_id)

---

FILE: src/infra/db/schema/notification.ts

  ntf_channel_enum: pgEnum('ntf_channel', ['email','sms','push','whatsapp','webhook','in_app'])
  ntf_log_status_enum: pgEnum('ntf_log_status', ['pending','sent','failed','read'])

  ntf_templates   (+ baseColumns)
    key            text NOT NULL               ← 'welcome', 'task-assigned'
    channel        ntf_channel_enum NOT NULL
    subject        text                        ← for email channel
    body           text NOT NULL               ← Handlebars template string
    locale         text NOT NULL DEFAULT 'en'
    is_system      boolean NOT NULL DEFAULT false ← system templates can't be deleted
    Indexes:
      (organization_id, key, channel, locale) UNIQUE

  ntf_triggers   (+ baseColumns)
    event_pattern  text NOT NULL               ← 'task.assigned', 'stock.*'
    template_key   text NOT NULL
    channel        ntf_channel_enum NOT NULL
    recipient_expr jsonb NOT NULL DEFAULT '{}'  ← RuleExpr to resolve recipient from event
    conditions     jsonb NOT NULL DEFAULT '{}'  ← RuleExpr — when to fire (empty = always)
    is_active      boolean NOT NULL DEFAULT true
    Indexes:
      (organization_id, event_pattern)
      (organization_id, is_active)

  ntf_logs   (+ baseColumns)
    template_key   text
    channel        ntf_channel_enum NOT NULL
    recipient      text NOT NULL               ← email, phone, actor_id depending on channel
    status         ntf_log_status_enum NOT NULL DEFAULT 'pending'
    sent_at        timestamp
    read_at        timestamp
    error          text
    retry_count    integer NOT NULL DEFAULT 0
    metadata       jsonb NOT NULL DEFAULT '{}'
    Indexes:
      (organization_id, recipient, status)
      (organization_id, status)
      (organization_id, template_key)

  ntf_preferences   (+ baseColumns)
    actor_id       text NOT NULL
    channel        ntf_channel_enum NOT NULL
    enabled        boolean NOT NULL DEFAULT true
    mute_until     timestamp
    Indexes:
      (organization_id, actor_id, channel) UNIQUE

---

FILE: src/infra/db/schema/geo.ts

  geo_entities   (+ baseColumns)
    entity_id      text NOT NULL               ← any entity in any module/compose
    entity_type    text NOT NULL
    geometry_type  text NOT NULL               ← 'Point', 'Polygon', 'LineString'
    coordinates    jsonb NOT NULL              ← GeoJSON geometry object
    ← Note: use jsonb for now. When PostGIS extension is confirmed on Neon,
      add a migration to add a geometry column alongside for spatial indexing.
    properties     jsonb NOT NULL DEFAULT '{}'
    Indexes:
      (organization_id, entity_id, entity_type) UNIQUE
      (organization_id, geometry_type)

  geo_territories   (+ baseColumns)
    name           text NOT NULL
    type           text NOT NULL               ← 'delivery_zone', 'sales_region', 'district'
    polygon        jsonb NOT NULL              ← GeoJSON Polygon geometry
    properties     jsonb NOT NULL DEFAULT '{}'
    is_active      boolean NOT NULL DEFAULT true
    Indexes:
      (organization_id, type)
      (organization_id, is_active)

  geo_addresses   (+ baseColumns)
    entity_id      text NOT NULL
    entity_type    text NOT NULL
    label          text                        ← 'home', 'billing', 'shipping'
    line1          text NOT NULL
    line2          text
    city           text NOT NULL
    state          text
    country        text NOT NULL
    postcode       text
    coordinates    jsonb                       ← { lat, lng } nullable (geocoded on save)
    is_default     boolean NOT NULL DEFAULT false
    Indexes:
      (organization_id, entity_id, entity_type)
      (organization_id, entity_id, entity_type, is_default)

---

FILE: src/infra/db/schema/analytics.ts

  anl_metrics   (+ baseColumns)
    key            text NOT NULL               ← 'orders.total', 'inventory.turnover'
    label          text NOT NULL
    description    text
    aggregation    text NOT NULL               ← 'sum', 'avg', 'count', 'min', 'max'
    unit           text                        ← 'INR', 'units', 'minutes', '%'
    query_template text NOT NULL               ← parameterized SQL template
    is_system      boolean NOT NULL DEFAULT false
    Indexes:
      (organization_id, key) UNIQUE

  anl_snapshots   (+ baseColumns)
    ← Append-only point-in-time metric values. Never updated.
    metric_key     text NOT NULL
    value          text NOT NULL               ← stored as text to handle any numeric type
    captured_at    timestamp NOT NULL
    dimensions     jsonb NOT NULL DEFAULT '{}'  ← { category: 'electronics', location: 'main' }
    Indexes:
      (organization_id, metric_key, captured_at)
      (organization_id, metric_key)
      Using GIN on dimensions for dimension-filtered queries

  anl_report_definitions   (+ baseColumns)
    name           text NOT NULL
    description    text
    query_template text NOT NULL
    parameters     jsonb NOT NULL DEFAULT '[]'  ← { name, type, required, default }[]
    format         text NOT NULL DEFAULT 'json' ← 'json', 'csv', 'pdf'
    is_scheduled   boolean NOT NULL DEFAULT false
    schedule_cron  text                         ← cron expression if is_scheduled
    Indexes:
      (organization_id, is_scheduled)

---

STEP 5 — Schema index (src/infra/db/schema/index.ts)

  export * from './helpers'
  export * from './events'
  export * from './outbox'
  export * from './identity'
  export * from './catalog'
  export * from './inventory'
  export * from './ledger'
  export * from './workflow'
  export * from './scheduling'
  export * from './document'
  export * from './notification'
  export * from './geo'
  export * from './analytics'


STEP 6 — Run migrations

  bun run db:generate
  bun run db:migrate


STEP 7 — Seed file (src/infra/db/seed.ts)

The seed must be:
  - Idempotent: safe to run multiple times (use onConflictDoNothing() on all inserts)
  - Minimal: seed only what is needed for any Compose to bootstrap
  - System-agnostic: no ecommerce accounts, no ecommerce templates, no domain-specific data

Seed in this order:

1. Default Organization
   { id: generateId(), name: 'Default Org', slug: 'default', plan: 'free', status: 'active' }

2. System Roles (is_system: true)
   These are generic roles — not ecommerce roles, not HR roles.
   - 'super-admin'  permissions: ['*:*']
   - 'admin'        permissions: ['*:read', '*:create', '*:update', '*:delete']
   - 'member'       permissions: ['*:read']
   - 'viewer'       permissions: ['*:read']
   Compose will extend these or add domain-specific roles in its own seed.

3. System Actor (for development)
   email: 'system@platform.local'
   password_hash: await Bun.password.hash('changeme')
   type: 'system', status: 'active'
   Assign 'super-admin' role.

4. Default Inventory Location
   name: 'Default Location', type: 'warehouse', is_default: true
   ← Every inventory module needs at least one location. Compose can rename/add more.

5. System Notification Templates (generic — not domain-specific)
   For each: { organization_id: defaultOrgId, is_system: true, locale: 'en' }

   key: 'actor.welcome'        channel: 'email'
     subject: 'Welcome to {{orgName}}'
     body: 'Hi {{firstName}}, your account has been created.'

   key: 'actor.password-reset' channel: 'email'
     subject: 'Reset your password'
     body: 'Click here to reset: {{resetUrl}}'

   key: 'actor.invite'         channel: 'email'
     subject: 'You have been invited to {{orgName}}'
     body: 'Accept your invitation: {{inviteUrl}}'

   key: 'task.assigned'        channel: 'in_app'
     body: 'You have been assigned: {{taskTitle}}'

   key: 'task.overdue'         channel: 'in_app'
     body: 'Task overdue: {{taskTitle}}'

   No ecommerce templates. No order templates. Those are seeded by the Ecommerce Compose seed.

Log each step. End with: '✓ Core + Module seed complete'


STEP 8 — Infra DB index (src/infra/db/index.ts)

  export { db } from './client'
  export type { DB } from './client'
  export * from './schema'


```
