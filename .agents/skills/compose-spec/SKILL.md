---
name: compose-spec
description: >
  Generate a complete, architecturally consistent feature specification for any functionality
  inside a Core → Module → Compose application. Use this skill whenever the user asks to
  "spec out" a feature, "write a spec for", "design the spec for", "plan the implementation
  of", or asks what a feature should look like before coding it. Also use when the user
  provides a Compose document and wants to implement a specific section of it — this skill
  produces the canonical spec document that compose-todo then converts into tasks. Trigger
  for any request involving entity design, FSM design, command/query design, API surface
  design, permission matrices, event flows, or real-time channel planning within this architecture.
---

# Compose Spec Skill

Produces a **complete, consistent feature spec** that follows the Core → Module → Compose
architecture. A spec is the source of truth before any code is written.

---

## How to Use This Skill

1. Identify the **Compose** (crm, erp, ecommerce, restaurant, etc.) and the **feature area**
   being specced (e.g. "Deal Pipeline", "Order Fulfillment", "Room Reservations").
2. Read the relevant Compose doc from project knowledge if not already in context.
3. Identify which **Modules** are involved (see Module Composition Map).
4. Output the spec using the **Standard Spec Format** below — every section, in order.
5. Never skip a section. If a section is empty (e.g. no scheduled jobs), write `None.`

---

## Architecture Orientation (always keep in mind)

```
Core     → primitives only. Entity, ID, Money, EventBus, FSM, RuleEngine, CQRS, Repository.
           Zero business logic. Zero domain vocab. Everything depends on Core.

Module   → bounded domain unit. Owns entities, commands, queries, events, FSMs, jobs.
           Communicates only via EventBus + Mediator. Never imports another module's internals.
           Standard modules: identity, catalog, inventory, ledger, workflow, scheduling,
           document, notification, geo, analytics.

Compose  → orchestration only. Wires modules together via hooks, rules, and config.
           Never contains logic that belongs inside a single module.
           Adds domain-specific entity extensions on top of module primitives.
```

**Key constraints to enforce in every spec:**
- Every entity extends `Entity` → always has `id`, `organizationId`, `createdAt`, `updatedAt`, `deletedAt`, `version`, `meta`
- IDs are ULIDs with a namespaced prefix (`ord_`, `prod_`, `deal_`, etc.)
- Money is always `{ amount: number (integer, smallest unit), currency: string (ISO 4217) }`
- Timestamps are Unix epoch ms — never `Date` objects
- No module ever calls another module's repository directly
- Compose hooks react to events; they never own state
- All async work (notifications, webhooks, reports) goes through Queue

---

## Standard Spec Format

### Section 1 — Spec Header

```
Spec:         [Feature Name]
Compose:      [compose-id]
Version:      1.0.0
Feature Area: [e.g. Deal Management / Order Fulfillment / Room Reservation]
Modules Used: [comma-separated list of modules this feature touches]
Apps Served:  [which sub-apps use this feature]
```

---

### Section 2 — Actor Roles & Permission Matrix

List every role relevant to this feature. Then produce a permission matrix in this format:

```
Permission key format: resource:action

Scope modifiers:
  ✓       = full access
  ◑(own)  = only own records (ownerId = actorId)
  —       = no access

Columns = roles, Rows = permission keys
```

Rules for permissions:
- Admin role always gets full access
- Scope-restricted roles (`own`) require a `guard: { field: 'ownerId', op: 'eq', value: { ref: 'actor.id' } }` rule
- Every mutating route must have at least one permission key assigned
- Read permissions are always less restrictive than write permissions

---

### Section 3 — Entity Extensions

For each new or extended entity, produce a TypeScript interface and a matching EntitySchema block.

**Interface format:**
```typescript
interface [EntityName] extends Entity {
  // fields with types
  // ref fields use ID type, with a comment naming the referenced entity
  // enum fields use a named union type defined below
  // Money fields use the Money type
}

type [EnumName] = 'value1' | 'value2' | 'value3';
```

**EntitySchema block:**
```typescript
const [EntityName]Schema: EntitySchema = {
  name: '[EntityName]',
  namespace: '[module-id or compose-id]',
  idPrefix: '[prefix_]',
  softDelete: true,
  timestamps: true,
  versioned: true,
  searchSync: false, // set true if this entity needs full-text search
  rtChannel: 'org:{orgId}:[compose]:[scope]', // omit if no real-time needed
  fields: [
    { key: 'fieldName', type: 'string|number|boolean|enum|ref|ref[]|money|date|json|geo.point|geo.polygon', required: true/false, ... },
    // ...
  ],
};
```

**Rules for entity design:**
- `ref` fields point to another entity's `id` — always name the target in a comment
- `enum` fields must list all `enumValues`
- Computed/virtual fields use `computed: (entity) => ...`
- Mark fields `sensitive: true` for PII (email, phone, passwordHash)
- Mark fields `searchable: true` if needed for SearchAdapter sync
- Mark fields `indexed: true` for FK lookups and high-cardinality filter fields

---

### Section 4 — State Machines (FSMs)

For each entity that has a lifecycle, define its FSM.

**Textual format (readable):**
```
[EntityName] FSM:

States: [list all states]
Initial: [initial state]

Transitions:
  [from] → [to]   [on: command.name]   guard: [condition if any]   entry: [actions if any]
```

**FSM Engine format:**
```typescript
const [EntityName]FSM: StateMachine = {
  id: '[entity-name]-fsm',
  initial: '[state]',
  states: {
    [stateName]: {
      on: {
        '[event.name]': {
          target: '[next-state]',
          guard: RuleExpr | undefined,
          actions: ['emit:[event.name]', 'notify:[template-key]'] | [],
        },
      },
    },
  },
};
```

---

### Section 5 — Commands (Write Path)

For each command the feature requires:

```
[module.commandName]

Payload:
  field: type   ← description

Guards:
  - [precondition that must be true before executing]
  - [role/permission check]

Steps:
  1. [what the handler does step by step]
  2. ...

Emits:
  [event.name] { payload shape }

Side Effects:
  - [queue jobs, notifications, state transitions triggered]
```

**Rules:**
- Commands are dispatched via `ctx.dispatch('module.commandName', payload)`
- Handlers always use `ctx.repo('[EntityName]')` — never raw SQL
- Commands never read from another module's repo — use `ctx.query()` instead
- Every command that changes state must emit at least one DomainEvent
- Validation failures throw `ValidationError`; not-found throws `NotFoundError`; permission failures throw `AuthorizationError`

---

### Section 6 — Queries (Read Path)

For each query:

```
[module.queryName](params)

Params:
  field: type   ← description

Returns:
  [TypeScript shape of the response]

Implementation Notes:
  - [repo filter used, joins, pagination shape]
  - [permissions applied at query level]
```

**Rules:**
- Queries never mutate state
- Queries use `PaginatedResult<T>` for list operations
- Heavy queries (reports, aggregations) dispatch to Queue and return a `jobId`
- Org scope is injected automatically by `BaseRepository` — never filter by orgId manually

---

### Section 7 — Event Flow

Map every event emitted → what reacts to it.

```
[event.name] { payload shape }
  ↳ [handler / hook name] → [what it does]
  ↳ [notification trigger] → [template key, recipient expression]
  ↳ [analytics listener] → [metric updated]
  ↳ [real-time bridge] → [channel, payload forwarded]
```

---

### Section 8 — API Surface

Group by resource. Use this format:

```
── [Resource Name] ─────────────────────────────────────────
METHOD  /[compose]/[resource]                [permission:key]
METHOD  /[compose]/[resource]/:id            [permission:key]
METHOD  /[compose]/[resource]/:id/[action]   [permission:key]
```

**Rules:**
- Every route has exactly one permission key annotation
- `GET /list` routes support `?page=`, `?limit=`, `?sort=`, `?filter=` query params
- Action routes (non-CRUD) use `POST /resource/:id/action-name`
- Webhook ingestion routes: `POST /webhooks/[provider]` (no auth, signature-verified)
- All routes return `Result<T>` — success or structured error, never raw throws

---

### Section 9 — Real-Time Channels

```
Channel: [pattern]
Subscribers: [who subscribes]
Events Forwarded: [event patterns]
Payload Shape: [what the client receives]
```

Channel naming convention:
- `org:{orgId}:{compose}:{scope}` → org-wide scope
- `org:{orgId}:{compose}:{scope}:{resourceId}` → resource-scoped
- `org:{orgId}:actor:{actorId}:{scope}` → private to one actor

---

### Section 10 — Scheduled Jobs

```
Job ID: [compose.job-name]
Schedule: [cron expression or human: daily / hourly / every 30min]
Description: [what it does]
Steps:
  1. ...
Emits: [events, if any]
```

---

### Section 11 — Business Rules (RuleExpr)

For each rule:

```typescript
{
  id: '[kebab-case-id]',
  scope: '[permission:key or command name this guards]',
  condition?: { field: '...', op: 'eq|gte|lte|contains|exists|...', value: ... },
  guard?: { field: '...', op: '...', value: ... },
  action?: 'require-approval | block | warn',
  approverRole?: '[role name]',
}
```

---

### Section 12 — Integration Points

```
Adapter Type     Implementation Options      Used For
─────────────────────────────────────────────────────
notification.email   Resend / SendGrid / SMTP    [what triggers email]
notification.sms     Twilio / MSG91              [what triggers SMS]
payment              Stripe / Razorpay           [payment flow]
geo                  Google Maps / Mapbox / OSRM [what geo ops]
search               Typesense / Algolia         [what is indexed]
storage              S3 / R2 / GCS               [what files are stored]
```

Only list adapter types actually used by this feature.

---

## Quality Checklist

Before finalizing a spec, verify:

- [ ] Every entity has `idPrefix` defined
- [ ] Every FSM has an `initial` state and at least one `entry` action that emits an event
- [ ] Every command emits at least one DomainEvent
- [ ] Every event in Section 7 has at least one listener
- [ ] Every API route has a permission annotation
- [ ] No module references another module's internal repo
- [ ] Money fields use integer amounts (never float)
- [ ] Sensitive fields are marked `sensitive: true`
- [ ] Real-time channels follow the naming convention
- [ ] All async work is queued (no sync notification sends in command handlers)

---

## Reference Files

- `references/module-contracts.md` — Full command/query/event contracts for all 10 standard modules
- `references/compose-patterns.md` — Common compose hook patterns and rule templates

Read these when you need to cross-reference a module's exact API surface before speccing a command or event handler.
