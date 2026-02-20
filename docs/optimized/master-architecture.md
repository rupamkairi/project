# Architecture Overview

Core → Module → Compose

## Three-Layer Model

```
COMPOSE  (Layer 3) → Named application: hooks, API, permissions → "What you ship"
MODULE   (Layer 2) → Bounded domain: entities, events, commands, FSMs → "Domain vocabulary"
CORE     (Layer 1) → Primitives: Entity, Event, State, Rule, Bus → "Laws of physics"
INFRA    (Layer 0) → DB, Queue, Cache, Storage, Transport, External Services
```

## Use Case → Module Map

| UC            | identity | catalog | inventory | ledger | workflow | scheduling | document | notification | geo | analytics |
| ------------- | :------: | :-----: | :-------: | :----: | :------: | :--------: | :------: | :----------: | :-: | :-------: |
| CRM           |    ✓     |    ✓    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |
| ERP           |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     —      |    ✓     |      ✓       |  ✓  |     ✓     |
| HR/Office     |    ✓     |    —    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  ✓  |     ✓     |
| Medical       |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |
| Hotel         |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     ✓      |    —     |      ✓       |  —  |     ✓     |
| Restaurant    |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     ✓      |    —     |      ✓       |  ✓  |     ✓     |
| Ecommerce     |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     —      |    ✓     |      ✓       |  ✓  |     ✓     |
| Project Mgmt  |    ✓     |    —    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |
| EdTech        |    ✓     |    ✓    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |
| Field Service |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  ✓  |     ✓     |
| Legal         |    ✓     |    —    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |
| Real Estate   |    ✓     |    ✓    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  ✓  |     ✓     |
| Fleet         |    ✓     |    ✓    |     ✓     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  ✓  |     ✓     |
| Events        |    ✓     |    ✓    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |
| Insurance     |    ✓     |    ✓    |     —     |   ✓    |    ✓     |     ✓      |    ✓     |      ✓       |  —  |     ✓     |

## Key Principles

1. **Schema-Driven** — Entities are runtime schema instances → auto-generates types, routes, forms
2. **Event Sourcing** — EventStore is source of truth; state is derived
3. **CQRS** — Commands mutate via FSMs; queries read from materialized views
4. **Module = Bounded Context** — Communicate only via Commands/Events, never direct calls
5. **Compose = Orchestration** — Wires modules via hooks/rules, no domain logic
6. **Multi-Tenancy** — Every entity has organizationId; Repository auto-scopes
7. **Rules as Data** — Business conditions stored as RuleExpr, modifiable at runtime
8. **Adapter Pattern** — No vendor SDK imports in modules; swap via config
9. **Async by Default** — Non-response paths → queue
10. **Real-Time as Layer** — Bridge listens to EventBus → WebSocket channels

## Technical Systems

### Real-Time

```
WebSocket gateway (Redis pub/sub)
Flow: Client auth → subscribe channels → EventBus → Bridge → filter → push
Channels: org:{orgId}:{scope}, org:{orgId}:{scope}:{id}, org:{orgId}:actor:{actorId}:{scope}
```

### Queue

```
Tiers: critical (payment, fraud) → standard (notifications, webhooks) → bulk (reports)
DLQ for failed jobs after N retries
Backends: BullMQ/Redis or DB-backed
```

### Scheduler

```
Cron + runOnce. Modules register jobs during boot.
```

### Webhooks (Inbound)

```
POST /webhooks/{provider} → verify sig → normalize → EventBus → 200
```

## Adapter Interfaces

```typescript
// Storage
upload(key, file, meta) → StoredFile
download(key) → Buffer
getSignedUrl(key, expiresIn) → URL

// Notification (per channel: email, sms, push, whatsapp, webhook)
send(to, message) → result

// Payment
createPaymentSession(order) → session
capturePayment(sessionId) → result
refund(transactionId, amount) → result
handleWebhook(payload, sig) → normalized event

// Geo
geocode(address) → coords
reverseGeocode(coords) → address
getRoute(origin, destinations, mode) → route
getDistanceMatrix(origins, destinations) → matrix

// Search
index(collection, docs) → void
search(collection, query) → results
sync(collection, event) → void // event-driven
```
