# Generic Application Architecture

## Core → Module → Compose

---

## Part I — Formalized Use Case Registry

Every domain application has been analyzed, extended, and formalized below. Each entry captures the primary actors, resources, key workflows, and the modules required to compose it.

---

### UC-01 · Customer Relationship Management (CRM)

**Purpose:** Manage relationships between a business and its customers across the full customer lifecycle.

| Aspect             | Detail                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Actors**         | Sales Rep, Account Manager, Customer, Support Agent, Marketing, Admin                     |
| **Resources**      | Contact, Lead, Deal, Pipeline, Activity, Note, Campaign, Segment                          |
| **Core Workflows** | Lead Capture → Qualification → Proposal → Negotiation → Won/Lost                          |
| **Key Behaviors**  | Lead scoring, activity timeline, deal forecasting, email sequences, customer segmentation |
| **Integrations**   | Email (Gmail/Outlook), Calendar, Marketing tools, Telephony                               |
| **Modules**        | identity, catalog, workflow, scheduling, notification, document, analytics                |

---

### UC-02 · Enterprise Resource Planning (ERP)

**Purpose:** Unify core business operations — procurement, manufacturing, finance, and distribution — into a single system of record.

| Aspect             | Detail                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Actors**         | Procurement Officer, Warehouse Manager, Finance Controller, Vendor, Auditor, C-Suite                |
| **Resources**      | PurchaseOrder, SalesOrder, BOM (Bill of Materials), GoodsReceipt, Vendor, Asset                     |
| **Core Workflows** | Purchase Requisition → PO → Goods Receipt → Invoice Matching → Payment                              |
| **Key Behaviors**  | Multi-location inventory, cost-center accounting, approval chains, asset depreciation, audit trails |
| **Integrations**   | Banking APIs, Customs/Tax systems, 3PL providers, EDI                                               |
| **Modules**        | identity, catalog, inventory, ledger, workflow, geo, notification, document, analytics              |

---

### UC-03 · Human Resources & Office Management

**Purpose:** Manage the full employee lifecycle, attendance, payroll, field submissions, and internal office operations.

| Aspect             | Detail                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Employee, Manager, HR Admin, Field Worker, Payroll Officer, Director                                                                   |
| **Resources**      | Employee, Department, Attendance, Leave, Payslip, Claim, Appraisal, Policy                                                             |
| **Core Workflows** | Onboarding → Probation → Confirmation; Leave Apply → Approve → Deduct                                                                  |
| **Key Behaviors**  | Biometric/geo-fenced attendance, shift scheduling, payroll computation, performance cycles, field task submissions with photo evidence |
| **Integrations**   | Biometric devices, payroll banks, government compliance APIs (PF, TDS, ESI)                                                            |
| **Modules**        | identity, workflow, scheduling, ledger, document, geo, notification, analytics                                                         |

---

### UC-04 · Medical & Healthcare Management

**Purpose:** Support clinical and administrative operations across hospitals, clinics, and diagnostic labs.

| Aspect             | Detail                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Patient, Doctor, Nurse, Lab Technician, Pharmacist, Receptionist, Insurance Provider                                                     |
| **Resources**      | Appointment, EMR (Electronic Medical Record), Prescription, Lab Test, Bed, Ward, Billing                                                 |
| **Core Workflows** | Registration → Triage → Consultation → Diagnosis → Treatment → Discharge → Billing                                                       |
| **Key Behaviors**  | OPD/IPD management, bed allocation, prescription tracking, lab result integration, insurance claim workflows, HIPAA-compliant audit logs |
| **Integrations**   | HL7/FHIR health data standards, diagnostic lab APIs, insurance clearinghouses, pharmacy systems                                          |
| **Modules**        | identity, catalog, scheduling, document, ledger, workflow, notification, analytics                                                       |

---

### UC-05 · Hotel & Hospitality Management

**Purpose:** Manage property operations including reservations, housekeeping, F&B, and guest experience.

| Aspect             | Detail                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Guest, Front Desk, Housekeeper, F&B Staff, Revenue Manager, General Manager                                                         |
| **Resources**      | Room, RoomType, Reservation, Folio (guest bill), Housekeeping Task, Amenity, Rate Plan                                              |
| **Core Workflows** | Booking → Pre-arrival → Check-in → Stay → Check-out → Settlement                                                                    |
| **Key Behaviors**  | Dynamic pricing (RevPAR), room blocking/allocation, housekeeping automation, minibar charging, group bookings, channel manager sync |
| **Integrations**   | OTA channels (Booking.com, Expedia), POS systems, payment terminals, door-lock systems, GDS                                         |
| **Modules**        | identity, catalog, inventory, scheduling, ledger, workflow, notification, analytics                                                 |

---

### UC-06 · Restaurant & Food Delivery Management

**Purpose:** Manage dine-in table service, kitchen operations, and last-mile delivery.

| Aspect             | Detail                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Customer, Waiter, Kitchen Staff, Delivery Rider, Restaurant Manager, Aggregator Platform                                |
| **Resources**      | Menu, Table, Order, KOT (Kitchen Order Ticket), Delivery Zone, Rider, Coupon                                            |
| **Core Workflows** | Order Placed → KOT Printed → Prepared → Served/Dispatched → Paid                                                        |
| **Key Behaviors**  | Table QR ordering, real-time kitchen display, rider assignment & tracking, aggregator webhook ingestion, loyalty points |
| **Integrations**   | Swiggy/Zomato/UberEats webhooks, POS terminals, payment gateways, SMS/WhatsApp                                          |
| **Modules**        | identity, catalog, inventory, scheduling, ledger, workflow, geo, notification, analytics                                |

---

### UC-07 · E-Commerce Platform

**Purpose:** Enable online retail with product discovery, cart, checkout, fulfillment, and returns.

| Aspect             | Detail                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Shopper, Store Admin, Warehouse Picker, Delivery Partner, Seller (marketplace), Finance                                     |
| **Resources**      | Product, Variant, Cart, Order, Shipment, Return, Coupon, Review, Storefront                                                 |
| **Core Workflows** | Browse → Add to Cart → Checkout → Payment → Fulfillment → Delivery → Return                                                 |
| **Key Behaviors**  | Multi-vendor marketplace, flash sales, tiered pricing, abandoned cart recovery, returns/refunds, SEO-friendly product pages |
| **Integrations**   | Payment gateways, shipping carriers (FedEx, Delhivery), CDN, Search (Algolia/Typesense), Tax APIs                           |
| **Modules**        | identity, catalog, inventory, ledger, workflow, geo, notification, analytics                                                |

---

### UC-08 · Project Management System

**Purpose:** Plan, track, and deliver projects with tasks, milestones, time tracking, and team collaboration.

| Aspect             | Detail                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Project Manager, Developer, Designer, Client, Stakeholder, QA                                                 |
| **Resources**      | Project, Epic, Sprint, Task, Milestone, TimeLog, Comment, Attachment                                          |
| **Core Workflows** | Project Init → Backlog Grooming → Sprint Planning → Development → Review → Release                            |
| **Key Behaviors**  | Kanban/Scrum/Gantt views, time tracking, dependency mapping, burndown charts, client portals, git integration |
| **Integrations**   | GitHub/GitLab, Slack, Google Drive, Figma, CI/CD pipelines                                                    |
| **Modules**        | identity, workflow, scheduling, document, notification, analytics                                             |

---

### UC-09 · Learning Management System (EdTech)

**Purpose:** Deliver, track, and certify structured learning programs for students and employees.

| Aspect             | Detail                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Actors**         | Student, Instructor, Course Admin, Parent, Institution Admin                                            |
| **Resources**      | Course, Module, Lesson, Quiz, Assignment, Certificate, Cohort, Progress                                 |
| **Core Workflows** | Enroll → Learn → Assess → Grade → Certify                                                               |
| **Key Behaviors**  | Video streaming, adaptive learning paths, live classes, peer reviews, SCORM compliance, bulk enrollment |
| **Integrations**   | Zoom/Meet, Stripe (payments), S3 (media), SCORM packages, SSO (SAML/OAuth)                              |
| **Modules**        | identity, catalog, scheduling, document, workflow, ledger, notification, analytics                      |

---

### UC-10 · Field Service & Asset Maintenance

**Purpose:** Dispatch field technicians to service or maintain assets at customer or remote locations.

| Aspect             | Detail                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Actors**         | Dispatcher, Field Technician, Customer, Asset Owner, Supervisor                                              |
| **Resources**      | Asset, WorkOrder, ServiceTicket, Part, Route, SLA, Inspection Report                                         |
| **Core Workflows** | Ticket Raised → Diagnosed → Dispatched → On-site → Resolved → Invoice                                        |
| **Key Behaviors**  | SLA tracking, mobile-first field app, parts consumption, geo-route optimization, offline-capable submissions |
| **Integrations**   | Maps/Navigation APIs, IoT sensor feeds, parts supplier APIs, SMS                                             |
| **Modules**        | identity, catalog, inventory, workflow, scheduling, geo, document, notification, analytics                   |

---

### UC-11 · Legal & Case Management

**Purpose:** Manage legal matters, case documentation, deadlines, and billing for law firms or legal teams.

| Aspect             | Detail                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Lawyer, Paralegal, Client, Judge (reference), Opposing Counsel, Billing Admin                                 |
| **Resources**      | Matter, Case, Document, Deadline, HearingDate, TimeEntry, Invoice                                             |
| **Core Workflows** | Intake → Conflict Check → Engagement → Active Matter → Closure → Billing                                      |
| **Key Behaviors**  | Document version control, court deadline tracking, billable hours, client portal, conflict-of-interest checks |
| **Modules**        | identity, workflow, scheduling, document, ledger, notification, analytics                                     |

---

### UC-12 · Real Estate & Property Management

**Purpose:** Manage property listings, rentals, sales, and tenant relationships.

| Aspect             | Detail                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Actors**         | Owner, Tenant, Agent, Buyer, Property Manager, Inspector                                                 |
| **Resources**      | Property, Unit, Listing, Lease, MaintenanceRequest, Payment, Inspection                                  |
| **Core Workflows** | Listing → Inquiry → Viewing → Application → Lease Signing → Occupancy → Renewal/Exit                     |
| **Key Behaviors**  | Geo-tagged listings, lease lifecycle, automated rent reminders, maintenance workflows, occupancy reports |
| **Modules**        | identity, catalog, scheduling, ledger, workflow, geo, document, notification, analytics                  |

---

### UC-13 · Fleet & Logistics Management

**Purpose:** Track vehicles, drivers, and freight across routes and delivery operations.

| Aspect             | Detail                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Fleet Manager, Driver, Dispatcher, Customer, Compliance Officer                                                |
| **Resources**      | Vehicle, Driver, Trip, Shipment, Route, Fuel Log, Compliance Doc                                               |
| **Core Workflows** | Load Planning → Dispatch → In-transit → Delivery → POD → Invoice                                               |
| **Key Behaviors**  | Real-time GPS tracking, route optimization, driver behaviour scoring, fuel analytics, compliance expiry alerts |
| **Integrations**   | Telematics devices, Maps APIs, ELD (Electronic Logging Devices)                                                |
| **Modules**        | identity, catalog, inventory, workflow, scheduling, geo, document, notification, analytics                     |

---

### UC-14 · Event & Venue Management

**Purpose:** Plan, sell, and execute events — conferences, concerts, sports, corporate gatherings.

| Aspect             | Detail                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Organizer, Attendee, Sponsor, Vendor, Volunteer, Check-in Staff                                               |
| **Resources**      | Event, Session, Ticket, Seat, Booth, Agenda, Badge                                                            |
| **Core Workflows** | Event Create → Publish → Registration → Payment → Check-in → Session Attendance → Feedback                    |
| **Key Behaviors**  | Seating maps, multi-tier ticketing, sponsor portals, QR check-in, live session tracking, post-event analytics |
| **Modules**        | identity, catalog, scheduling, ledger, workflow, document, notification, analytics                            |

---

### UC-15 · Insurance Management

**Purpose:** Manage policy issuance, premium collection, claims processing, and settlements.

| Aspect             | Detail                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Actors**         | Policyholder, Agent, Underwriter, Claims Adjuster, Surveyor, Finance                                                   |
| **Resources**      | Policy, Premium, Claim, Document, Settlement, Endorsement                                                              |
| **Core Workflows** | Application → Underwriting → Issuance → Premium Collection → Claim Filing → Assessment → Settlement                    |
| **Key Behaviors**  | Risk scoring, automated premium reminders, multi-stage claim adjudication, document verification, regulatory reporting |
| **Modules**        | identity, catalog, workflow, ledger, document, scheduling, notification, analytics                                     |

---

## Part II — Architecture

### The Three-Layer Model

```
┌────────────────────────────────────────────────────────────┐
│  COMPOSE  (Layer 3)                                        │
│  Named application: hooks, API surface, permissions        │
│  "The product you ship"                                    │
├────────────────────────────────────────────────────────────┤
│  MODULE   (Layer 2)                                        │
│  Bounded domain: entities, events, commands, FSMs          │
│  "The vocabulary of a domain"                              │
├────────────────────────────────────────────────────────────┤
│  CORE     (Layer 1)                                        │
│  Primitives: Entity, Event, State, Rule, Bus, Registry     │
│  "The laws of physics"                                     │
├────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                            │
│  DB, Queue, Cache, Storage, Transport, External Services   │
└────────────────────────────────────────────────────────────┘
```

---

## Part III — Core (Layer 1)

### 1.1 Entity & Schema

All entities are runtime schema instances — no hardcoded classes.

```typescript
interface Entity {
  id: ID; // ULID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: ID; // multi-tenancy enforced at this level
  meta: Record<string, unknown>;
}

interface FieldSchema {
  key: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "enum"
    | "ref"
    | "json"
    | "geo";
  required?: boolean;
  default?: unknown;
  validators?: Validator[];
  refEntity?: string;
  enumValues?: string[];
}

interface EntitySchema {
  name: string; // 'Product', 'Room', 'Patient'
  namespace: string; // owning module: 'catalog', 'hotel', 'medical'
  fields: FieldSchema[];
  indexes?: string[][];
  softDelete?: boolean;
}
```

### 1.2 Event System

```typescript
interface DomainEvent<T = unknown> {
  id: ID;
  type: string; // 'order.placed', 'invoice.paid'
  aggregateId: ID;
  aggregateType: string;
  payload: T;
  occurredAt: Timestamp;
  actorId?: ID;
  causedBy?: ID; // event chaining
  correlationId: ID; // trace across async boundaries
  version: number; // for optimistic concurrency
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): Unsubscribe;
  // wildcard support: 'order.*', '*.created', '*'
}

interface EventStore {
  append(event: DomainEvent): Promise<void>;
  read(aggregateId: ID, from?: number): AsyncIterable<DomainEvent>;
  replay(pattern: string, from: Timestamp): AsyncIterable<DomainEvent>;
}
```

### 1.3 State Machine (FSM)

Every entity lifecycle is a named FSM registered in Core.

```typescript
interface StateMachine<S extends string, E extends string> {
  id: string;
  initial: S;
  states: Record<S, StateNode<S, E>>;
}

interface StateNode<S, E> {
  on: Partial<Record<E, Transition<S>>>;
  entry?: Action[];
  exit?: Action[];
  meta?: { label: string; color: string }; // for UI rendering
}

interface Transition<S> {
  target: S;
  guard?: RuleExpr;
  actions?: Action[];
}
```

### 1.4 Rule Engine

Rules are data, not code. They can be stored in the database and modified at runtime.

```typescript
type RuleExpr =
  | { field: string; op: Op; value: unknown }
  | { and: RuleExpr[] }
  | { or: RuleExpr[] }
  | { not: RuleExpr }
  | { ref: string }; // named rule stored in registry

type Op =
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

interface RuleEngine {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
  compile(expr: RuleExpr): CompiledRule;
  register(id: string, expr: RuleExpr): void; // named rules
  resolve(id: string): RuleExpr;
}
```

### 1.5 CQRS — Command & Query Mediator

```typescript
interface Command<T = unknown> {
  type: string; // 'catalog.createProduct'
  payload: T;
  actorId: ID;
  orgId: ID;
  correlationId: ID;
}

interface Query<T = unknown> {
  type: string; // 'catalog.getProduct'
  params: T;
  actorId: ID;
  orgId: ID;
}

interface Mediator {
  dispatch<R>(cmd: Command): Promise<R>;
  query<R>(q: Query): Promise<R>;
  register(type: string, handler: Handler): void;
  middleware(fn: MiddlewareFn): void; // auth, logging, rate-limiting
}
```

### 1.6 Repository

```typescript
interface Repository<T extends Entity> {
  findById(id: ID): Promise<T | null>;
  findMany(filter: Filter, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
  transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
  // organization scope is injected automatically — no manual filtering needed
}
```

### 1.7 Module Registry & Lifecycle

```typescript
interface ModuleManifest {
  id: string; // 'catalog', 'ledger', 'geo'
  version: string;
  dependsOn?: string[];
  entities: EntitySchema[];
  events: string[];
  commands: string[];
  queries: string[];
  migrations?: Migration[]; // DB schema changes
}

interface ModuleRegistry {
  register(module: AppModule): void;
  resolve(id: string): AppModule;
  boot(ids?: string[]): Promise<void>; // respects dependency order
}
```

---

## Part IV — Technical Systems

### 4.1 Real-Time System

Used for: live order tracking, kitchen displays, chat, collaborative editing, live dashboards, IoT feeds.

```
Architecture: WebSocket gateway backed by a pub/sub channel (Redis or in-memory).

Flow:
  Client connects → authenticates JWT → subscribes to channel(s)
  Server event → EventBus → RealTimeGateway → filter by channel → push to client

Channel naming convention:
  org:{orgId}:entity:{type}:{id}         → single entity updates
  org:{orgId}:scope:{scopeName}          → broadcast to a role/group
  system:{topic}                         → cross-org system messages
```

```typescript
interface RealTimeGateway {
  publish(channel: string, event: DomainEvent): Promise<void>;
  subscribe(clientId: ID, channels: string[]): void;
  unsubscribe(clientId: ID, channels: string[]): void;
  broadcast(orgId: ID, event: DomainEvent): void;
}

// Modules register which events should be forwarded to real-time
interface RealTimeBridge {
  forward(eventPattern: string, toChannel: ChannelFn): void;
  // e.g: forward('order.*', e => `org:${e.orgId}:scope:kitchen`)
}
```

---

### 4.2 Queue System

Used for: async task processing, email/SMS sending, report generation, webhook delivery, background syncs.

```
Queue Tiers:
  critical   → payment processing, fraud checks        (no delay, high priority)
  standard   → notifications, webhook delivery         (seconds)
  bulk       → report generation, CSV exports, imports (minutes, best-effort)
  scheduled  → jobs running at a future time

Backends: BullMQ (Redis), or native DB-backed queue for simple setups.
Dead Letter Queue (DLQ): failed jobs after N retries land here for manual review.
```

```typescript
interface Queue {
  add<T>(name: string, payload: T, opts?: JobOptions): Promise<Job>;
  process<T>(name: string, handler: JobHandler<T>): void;
  retry(jobId: ID): Promise<void>;
  getJob(jobId: ID): Promise<Job | null>;
}

interface JobOptions {
  priority?: "critical" | "standard" | "bulk";
  delay?: number; // ms before processing
  attempts?: number; // retry count
  backoff?: BackoffOpts;
  jobId?: string; // idempotency key
}
```

---

### 4.3 Scheduler (Cron & Recurring Jobs)

Used for: daily payroll runs, nightly inventory sync, subscription renewals, report snapshots, slot expiry.

```typescript
interface Scheduler {
  define(name: string, cron: string, handler: JobHandler): void;
  // cron: standard 5-part or 6-part cron expression
  // e.g. '0 9 * * 1-5' → weekdays at 9AM

  runOnce(name: string, at: Date, handler: JobHandler): void;
  cancel(name: string): void;
  list(): ScheduledJob[];
}

// Modules register their own jobs during boot
// Example from ledger module:
scheduler.define("ledger.monthly-close", "0 0 1 * *", async (ctx) => {
  await ctx.dispatch("ledger.runMonthClose", { month: currentMonth() });
});
```

---

### 4.4 Integration Architecture

Every external service is accessed through a typed **Adapter** registered in Core. No module calls a vendor SDK directly.

#### Storage & CDN

```typescript
interface StorageAdapter {
  upload(key: string, file: Buffer, meta: FileMeta): Promise<StoredFile>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
  move(fromKey: string, toKey: string): Promise<void>;
}

// Implementations: S3Adapter, GCSAdapter, R2Adapter, LocalAdapter
// CDN: signed URLs from storage adapter can be fronted by CloudFront / Cloudflare

// StoredFile
interface StoredFile {
  key: string;
  url: string; // CDN url
  size: number;
  mimeType: string;
  etag: string;
}
```

#### Notification Channels

```typescript
interface NotificationAdapter {
  channel: "email" | "sms" | "push" | "whatsapp" | "webhook" | "in-app";
  send(to: string, message: NotificationPayload): Promise<NotificationResult>;
  health(): Promise<boolean>;
}

// Each channel has a concrete adapter:
// EmailAdapter     → SendGrid, Resend, AWS SES, SMTP
// SMSAdapter       → Twilio, MSG91, AWS SNS
// PushAdapter      → FCM, APNs
// WhatsAppAdapter  → Twilio, Meta Business API
// WebhookAdapter   → signed POST to external URL
```

#### Payment Systems

```typescript
interface PaymentAdapter {
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: Money): Promise<RefundResult>;
  getTransaction(id: string): Promise<Transaction>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Implementations: StripeAdapter, RazorpayAdapter, PayUAdapter, PhonePeAdapter
// Webhook events from payment gateways are normalized into DomainEvents
// and published to the EventBus — so modules react via subscriptions, not direct calls
```

#### Maps & Geospatial

```typescript
interface GeoAdapter {
  geocode(address: string): Promise<Coordinates>;
  reverseGeocode(coords: Coordinates): Promise<Address>;
  getRoute(
    origin: Coordinates,
    destinations: Coordinates[],
    mode: TravelMode,
  ): Promise<Route>;
  getDistanceMatrix(
    origins: Coordinates[],
    destinations: Coordinates[],
  ): Promise<Matrix>;
}
// Implementations: GoogleMapsAdapter, MapboxAdapter, OSRMAdapter (self-hosted)
// PostGIS is used internally by the geo module for spatial queries
```

#### Search

```typescript
interface SearchAdapter {
  index(
    collection: string,
    documents: Record<string, unknown>[],
  ): Promise<void>;
  search(collection: string, query: SearchQuery): Promise<SearchResult>;
  delete(collection: string, ids: string[]): Promise<void>;
  sync(collection: string, event: DomainEvent): Promise<void>; // event-driven index update
}
// Implementations: TypesenseAdapter, AlgoliaAdapter, MeilisearchAdapter, PGFullTextAdapter
```

#### Third-Party Webhooks (Inbound)

External systems pushing events in (Stripe, Razorpay, Shopify, Zomato, etc.) are handled by a unified webhook ingestion layer:

```
POST /webhooks/{provider}
  → verify signature (provider-specific)
  → normalize payload to DomainEvent
  → publish to EventBus
  → return 200 immediately (async processing via Queue)
```

---

## Part V — Module Composition Map

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

---

## Part VI — Key Design Principles

1. **Schema-Driven Everything** — No hardcoded entity classes. Entities are runtime schema instances. This propagates automatically to REST routes, GraphQL types, TypeScript types, form schemas, and OpenAPI specs.

2. **Event Sourcing at Core** — EventStore is the source of truth. All state is derived. Audit logs, time-travel, and event replay come for free.

3. **CQRS** — Commands mutate via FSMs and the ledger. Queries read from materialized views maintained by the analytics module. They never share a path.

4. **Module = Bounded Context** — Modules own their data, their events, and their FSMs. They communicate only through Commands and Events via the Core bus. Never direct function calls across module boundaries.

5. **Compose = Orchestration Only** — A Compose never contains logic that belongs inside a single module. It only wires modules together through hooks and rules.

6. **Multi-Tenancy by Default** — Every entity carries `organizationId`. The Repository layer applies this as an implicit query scope. A single deployment serves multiple tenants.

7. **Rules as Data** — Business conditions (guards, triggers, access rules) are stored as `RuleExpr` trees in the database. Admins can modify system behavior without a code deploy.

8. **Adapter Pattern for All Integrations** — No module ever imports a vendor SDK. All external services are accessed through typed Core adapter interfaces. Swapping vendors is a one-line config change.

9. **Async by Default** — Anything that isn't a direct user-response path is pushed to a queue. Payment confirmations, notification dispatch, webhook delivery, report generation — all async.

10. **Real-Time as a Layer** — Real-time is not baked into modules. The RealTimeBridge listens to the EventBus and forwards events to the appropriate WebSocket channels. Modules declare which events are real-time without knowing anything about WebSockets.
