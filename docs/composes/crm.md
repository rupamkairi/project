# Compose — CRM

## Customer Relationship Management

---

## 1. Compose Overview

```
Compose ID:   crm
Version:      1.0.0
Purpose:      Manage the full customer lifecycle — lead capture through deal closure
              and ongoing account relationship management.
Apps Served:  SalesApp     → field sales, deal management, activity logging
              SupportApp   → customer support, ticket management
              MarketingApp → campaigns, segments, lead scoring
              AdminApp     → pipeline config, team management, reporting
```

---

## 2. Module Selection & Configuration

```typescript
const CRMCompose: ComposeDefinition = {
  id: "crm",
  name: "Customer Relationship Management",
  modules: [
    "identity",
    "catalog", // Product/Service catalog for deal line items
    "workflow", // Sales process, support ticket workflows
    "scheduling", // Meetings, follow-up calls, demos
    "document", // Contracts, proposals, attachments
    "notification", // Follow-up reminders, deal alerts, assignment notices
    "geo", // Territory management, account mapping
    "analytics", // Pipeline metrics, conversion rates, forecasts
  ],

  moduleConfig: {
    catalog: {
      itemLabel: "Product/Service",
      enableVariants: false,
      enablePriceLists: true,
    },
    scheduling: {
      resourceLabel: "Sales Rep",
      slotLabel: "Meeting Slot",
    },
    workflow: {
      processLabel: "Sales Process",
    },
  },
};
```

---

## 3. Actor Roles & Permission Matrix

| Role            | Who                                                          |
| --------------- | ------------------------------------------------------------ |
| `crm-admin`     | CRM administrator — pipeline config, team setup, full access |
| `sales-manager` | Manages a team, sees all team deals, can reassign            |
| `sales-rep`     | Owns their leads and deals                                   |
| `support-agent` | Handles tickets, reads account info                          |
| `marketing`     | Manages campaigns, segments, lead scoring rules              |
| `viewer`        | Read-only — C-suite, external stakeholders                   |

```
                        crm-admin  sales-manager  sales-rep  support-agent  marketing  viewer
───────────────────────────────────────────────────────────────────────────────────────────────
contact:read                ✓           ✓            ✓            ✓            ✓         ✓
contact:create              ✓           ✓            ✓            —            ✓         —
contact:update              ✓           ✓            ◑ (own)      —            —         —
contact:delete              ✓           —            —            —            —         —
contact:reassign            ✓           ✓            —            —            —         —

lead:read                   ✓           ✓            ◑ (own)      —            ✓         ✓
lead:create                 ✓           ✓            ✓            —            ✓         —
lead:qualify                ✓           ✓            ◑ (own)      —            —         —
lead:disqualify             ✓           ✓            ◑ (own)      —            —         —
lead:convert                ✓           ✓            ◑ (own)      —            —         —

deal:read                   ✓           ✓            ◑ (own)      —            —         ✓
deal:create                 ✓           ✓            ✓            —            —         —
deal:update                 ✓           ✓            ◑ (own)      —            —         —
deal:close-won              ✓           ✓            ◑ (own)      —            —         —
deal:close-lost             ✓           ✓            ◑ (own)      —            —         —
deal:delete                 ✓           —            —            —            —         —

activity:read               ✓           ✓            ◑ (own)      ✓            —         ✓
activity:create             ✓           ✓            ✓            ✓            —         —
activity:update             ✓           ✓            ◑ (own)      ◑ (own)      —         —

ticket:read                 ✓           —            —            ✓            —         —
ticket:create               ✓           —            —            ✓            —         —
ticket:assign               ✓           —            —            ✓            —         —
ticket:resolve              ✓           —            —            ✓            —         —

campaign:read               ✓           ✓            —            —            ✓         ✓
campaign:create             ✓           —            —            —            ✓         —
campaign:launch             ✓           —            —            —            ✓         —

pipeline:manage             ✓           —            —            —            —         —
analytics:read              ✓           ✓            —            —            ✓         ✓
```

---

## 4. CRM Entity Extensions

### Contact

```typescript
interface Contact extends Entity {
  type: "person" | "company";
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone?: string;
  ownerId: ID; // actor_id of assigned sales rep
  source: ContactSource; // 'web', 'referral', 'cold-outreach', 'campaign', 'import'
  stage: ContactStage; // 'prospect' | 'qualified' | 'customer' | 'churned'
  score: number; // lead score 0–100
  tags: string[];
  customFields: Record<string, unknown>;
  lastActivityAt?: Timestamp;
  addressId?: ID; // geo_addresses.id
}
```

### Lead

```typescript
interface Lead extends Entity {
  contactId: ID;
  title: string;
  source: string;
  ownerId: ID;
  status: LeadStatus;
  score: number;
  disqualificationReason?: string;
  convertedToDealId?: ID;
  convertedAt?: Timestamp;
}

type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "disqualified"
  | "converted";
```

**Lead FSM:**

```
new → contacted        [on: lead.contacted]
    → disqualified     [on: lead.disqualify]   guard: reason provided
contacted → qualified  [on: lead.qualify]
          → disqualified [on: lead.disqualify]
qualified → converted  [on: lead.convert]      → creates Deal automatically
          → disqualified [on: lead.disqualify]
disqualified → new     [on: lead.reopen]
```

### Deal

```typescript
interface Deal extends Entity {
  contactId: ID;
  title: string;
  pipelineId: ID;
  stageId: ID; // current pipeline stage
  ownerId: ID;
  value: Money;
  expectedCloseDate: Timestamp;
  status: DealStatus;
  probability: number; // 0–100, auto-set per pipeline stage or manual override
  lostReason?: string;
  wonAt?: Timestamp;
  lostAt?: Timestamp;
  lineItems: DealLineItem[]; // from catalog module items
}

type DealStatus = "open" | "won" | "lost" | "abandoned";

interface DealLineItem {
  itemId: ID; // cat_items.id
  variantId?: ID;
  qty: number;
  unitPrice: Money;
}
```

**Deal FSM:**

```
open → won   [on: deal.mark-won]   entry: [emit 'deal.won']
     → lost  [on: deal.mark-lost]  guard: lostReason provided
             entry: [emit 'deal.lost']
     → abandoned [on: deal.abandon]
won → open   [on: deal.reopen]     guard: within 30 days of closing
```

### Pipeline & Stage

```typescript
interface Pipeline extends Entity {
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
}

interface PipelineStage {
  id: string;
  name: string; // 'Proposal Sent', 'Negotiation', 'Closed Won'
  order: number;
  probability: number; // default probability for deals in this stage
  rotPeriodDays?: number; // deal is "rotting" if stuck here beyond this
}
```

### Activity

```typescript
interface Activity extends Entity {
  type: ActivityType;
  contactId: ID;
  dealId?: ID;
  leadId?: ID;
  actorId: ID;
  subject: string;
  body?: string;
  outcome?: string;
  dueAt?: Timestamp;
  completedAt?: Timestamp;
  schedulingBookingId?: ID; // links to sch_bookings if activity = meeting
}

type ActivityType = "call" | "email" | "meeting" | "note" | "task" | "demo";
```

### Campaign

```typescript
interface Campaign extends Entity {
  name: string;
  type: "email" | "sms" | "whatsapp" | "mixed";
  status: "draft" | "scheduled" | "running" | "completed" | "paused";
  segmentId: ID; // which contact segment receives this
  templateKey: string; // ntf_templates key
  scheduledAt?: Timestamp;
  stats: { sent: number; opened: number; clicked: number; converted: number };
}
```

---

## 5. CRM Hooks

### Hook: Lead Converted to Deal

```typescript
compose.hook({
  on: "lead.converted",
  handler: async (event, ctx) => {
    const { leadId, contactId, ownerId } = event.payload;

    // 1. Create Deal from Lead
    const deal = await ctx.dispatch("crm.createDeal", {
      contactId,
      ownerId,
      title: event.payload.title,
      value: event.payload.estimatedValue,
      pipelineId: ctx.config.defaultPipelineId,
    });

    // 2. Start sales workflow process
    await ctx.dispatch("workflow.startProcess", {
      templateId: "SALES_PROCESS",
      entityId: deal.id,
      entityType: "Deal",
      context: { dealId: deal.id, ownerId },
    });

    // 3. Log conversion activity
    await ctx.dispatch("crm.createActivity", {
      type: "note",
      contactId,
      dealId: deal.id,
      actorId: ownerId,
      subject: "Lead converted to Deal",
    });

    // 4. Notify owner
    await ctx.dispatch("notification.send", {
      templateKey: "deal.created-from-lead",
      to: ownerId,
      variables: { dealId: deal.id, contactId },
    });
  },
});
```

### Hook: Deal Won

```typescript
compose.hook({
  on: "deal.won",
  handler: async (event, ctx) => {
    const { dealId, ownerId, contactId } = event.payload;

    // 1. Update contact stage → customer
    await ctx.dispatch("crm.updateContact", {
      id: contactId,
      stage: "customer",
    });

    // 2. Notify sales manager
    const manager = await ctx.query("crm.getManagerOf", { actorId: ownerId });
    await ctx.dispatch("notification.send", {
      templateKey: "deal.won",
      to: manager.id,
      variables: { dealId, ownerId, value: event.payload.value },
    });

    // 3. Trigger post-sale onboarding workflow (optional — if configured)
    if (ctx.config.enablePostSaleOnboarding) {
      await ctx.dispatch("workflow.startProcess", {
        templateId: "CUSTOMER_ONBOARDING",
        entityId: contactId,
        entityType: "Contact",
      });
    }
  },
});
```

### Hook: Deal Rotting

```typescript
compose.hook({
  on: "crm.deal-rotting", // emitted by scheduler job
  handler: async (event, ctx) => {
    const { dealId, ownerId, daysSinceLastActivity } = event.payload;

    await ctx.dispatch("notification.send", {
      templateKey: "deal.rotting",
      to: ownerId,
      variables: { dealId, daysSinceLastActivity },
      channels: ["in_app", "email"],
    });
  },
});
```

### Hook: Activity Completed (Meeting)

```typescript
compose.hook({
  on: "scheduling.booking.completed",
  filter: { resourceType: "SalesRep" },
  handler: async (event, ctx) => {
    // Auto-create follow-up task 24h after meeting
    await ctx.queue.add(
      "crm.schedule-followup",
      {
        actorId: event.payload.actorId,
        contactId: event.payload.contactId,
        dealId: event.payload.dealId,
      },
      { delay: hours(24) },
    );
  },
});
```

---

## 6. Business Rules

```typescript
compose.rules([
  // A deal cannot be marked won without an expected close date
  {
    id: "deal-won-requires-close-date",
    scope: "deal:close-won",
    guard: { field: "deal.expectedCloseDate", op: "exists" },
  },

  // A deal cannot be marked lost without a reason
  {
    id: "deal-lost-requires-reason",
    scope: "deal:close-lost",
    guard: { field: "deal.lostReason", op: "exists" },
  },

  // Deals above configured threshold require manager approval before closing
  {
    id: "high-value-deal-approval",
    scope: "deal:close-won",
    condition: {
      field: "deal.value.amount",
      op: "gte",
      value: { ref: "config.highValueThreshold" },
    },
    action: "require-approval",
    approverRole: "sales-manager",
  },

  // Lead score must be above threshold before qualifying
  {
    id: "lead-qualify-score-threshold",
    scope: "lead:qualify",
    guard: { field: "lead.score", op: "gte", value: 30 },
  },

  // Contact reassignment requires manager role
  {
    id: "contact-reassign-manager-only",
    scope: "contact:reassign",
    guard: { field: "actor.roles", op: "contains", value: "sales-manager" },
  },
]);
```

---

## 7. Sales Process Workflow Template

```
Template ID: SALES_PROCESS
Entity Type: Deal

Stages:
  1. discovery
     Tasks:
       - Conduct needs analysis call     [role: sales-rep]
       - Document pain points            [role: sales-rep]

  2. proposal
     Entry Guard: deal.stage = 'discovery-complete'
     Tasks:
       - Prepare proposal document       [role: sales-rep]
       - Get manager approval (if >threshold) [role: sales-manager]
       - Send proposal to contact        [role: sales-rep]

  3. negotiation
     Entry Guard: proposal sent
     Tasks:
       - Address objections              [role: sales-rep]
       - Update deal value if changed    [role: sales-rep]

  4. closing
     Entry Guard: verbal agreement
     Tasks:
       - Send contract for signature     [role: sales-rep]
       - Confirm signed contract received [role: sales-rep]
       → On complete: dispatch 'deal.mark-won'
```

---

## 8. API Surface

### SalesApp & AdminApp (`/crm/*`)

```
── Contacts ──────────────────────────────────────────────────
GET    /crm/contacts                     contact:read
POST   /crm/contacts                     contact:create
GET    /crm/contacts/:id                 contact:read
PATCH  /crm/contacts/:id                 contact:update
DELETE /crm/contacts/:id                 contact:delete
POST   /crm/contacts/:id/reassign        contact:reassign
GET    /crm/contacts/:id/activities      activity:read
GET    /crm/contacts/:id/deals           deal:read
GET    /crm/contacts/:id/timeline        contact:read   ← merged event history

── Leads ─────────────────────────────────────────────────────
GET    /crm/leads                        lead:read
POST   /crm/leads                        lead:create
GET    /crm/leads/:id                    lead:read
PATCH  /crm/leads/:id                    lead:update
POST   /crm/leads/:id/qualify            lead:qualify
POST   /crm/leads/:id/disqualify         lead:disqualify
POST   /crm/leads/:id/convert            lead:convert

── Deals ─────────────────────────────────────────────────────
GET    /crm/deals                        deal:read
POST   /crm/deals                        deal:create
GET    /crm/deals/:id                    deal:read
PATCH  /crm/deals/:id                    deal:update
POST   /crm/deals/:id/move-stage         deal:update
POST   /crm/deals/:id/won                deal:close-won
POST   /crm/deals/:id/lost               deal:close-lost
DELETE /crm/deals/:id                    deal:delete

── Activities ────────────────────────────────────────────────
GET    /crm/activities                   activity:read
POST   /crm/activities                   activity:create
PATCH  /crm/activities/:id               activity:update
POST   /crm/activities/:id/complete      activity:update

── Pipelines (Admin) ─────────────────────────────────────────
GET    /crm/pipelines                    pipeline:manage
POST   /crm/pipelines                    pipeline:manage
PATCH  /crm/pipelines/:id                pipeline:manage
PATCH  /crm/pipelines/:id/stages         pipeline:manage

── Campaigns (Marketing) ─────────────────────────────────────
GET    /crm/campaigns                    campaign:read
POST   /crm/campaigns                    campaign:create
POST   /crm/campaigns/:id/launch         campaign:launch
GET    /crm/campaigns/:id/stats          campaign:read

── Analytics ─────────────────────────────────────────────────
GET    /crm/analytics/pipeline           analytics:read  ← funnel metrics
GET    /crm/analytics/forecast           analytics:read
GET    /crm/analytics/rep-performance    analytics:read
GET    /crm/analytics/conversion-rates   analytics:read
```

---

## 9. Real-Time Channels

| Channel                       | Subscribers           | Events                                       |
| ----------------------------- | --------------------- | -------------------------------------------- |
| `org:{orgId}:crm:pipeline`    | Sales managers, admin | `deal.*`, `lead.*`                           |
| `org:{orgId}:crm:rep:{repId}` | Individual sales rep  | `deal.*` (own), `activity.*` (own), `task.*` |
| `org:{orgId}:crm:support`     | Support agents        | `ticket.*`                                   |

---

## 10. Scheduled Jobs

```
crm.check-deal-rotting       daily
  → Find open deals with no activity beyond pipeline stage rot period
  → Emit 'crm.deal-rotting' for each

crm.follow-up-reminders      daily (8AM)
  → Find activities with dueAt = today, not completed
  → Notify assigned rep

crm.lead-score-decay         weekly
  → Reduce score of leads with no activity in 30 days

crm.sync-campaign-stats      every 30min
  → Pull delivery stats from email provider
  → Update campaign.stats

crm.analytics-snapshot       nightly
  → Snapshot pipeline value, conversion rates, win/loss ratios
```

---

## 11. Integrations

```typescript
CRMCompose.integrations = {
  email: [ResendAdapter, SMTPAdapter], // campaign + activity email sync
  sms: [TwilioAdapter, MSG91Adapter], // SMS campaigns
  calendar: GoogleCalendarAdapter, // sync meetings to Google Calendar
  telephony: TwilioVoiceAdapter, // call logging, click-to-call
  search: TypesenseAdapter, // contact + deal full-text search
};
```

**Inbound Webhooks:**

```
POST /webhooks/email-events    → track open/click/bounce → update campaign stats
POST /webhooks/telephony       → log inbound/outbound calls as activities
```

---

## 12. Gap Analysis — Twenty CRM vs. ProjectX CRM

**Reference platform:** [Twenty CRM](https://github.com/twentyhq/twenty) — open-source, developer-first CRM.
**Scope:** Backend only. Frontend/UI gaps excluded.

---

### Feature Comparison Table

Status key: ✅ Ready | ⚠️ Partial | ❌ Missing

| Feature | Twenty | ProjectX Mapping | Status | Gap |
|---------|--------|-----------------|--------|-----|
| Contact management | People object | `Contact` entity in CRM compose | ✅ | — |
| Company / Account object | Separate `Company` object with many-to-many to People | `Contact` with `type: "company"` only | ⚠️ | No dedicated Company entity; can't model org hierarchy or multiple contacts-per-company cleanly |
| Lead / opportunity tracking | `Opportunity` object with pipeline stages | `Lead` + `Deal` + `Pipeline` + `PipelineStage` | ✅ | — |
| Activity logging (calls, emails, meetings, notes, tasks) | Activities on any object | `Activity` entity with all six types | ✅ | — |
| Pipeline & stage management | Custom pipelines, Kanban | `Pipeline` + `PipelineStage` with default probability + rot period | ✅ | — |
| Lead FSM | Stage field + manual transitions | Full FSM (`new → contacted → qualified → converted`) | ✅ | — |
| Deal FSM | Status field | Full FSM (`open → won/lost/abandoned`) | ✅ | — |
| Deal approval (high-value) | Manual task in workflow | Rule engine: `high-value-deal-approval` requires sales-manager approval | ✅ | — |
| Follow-up scheduling | Tasks with due dates | Activity with `dueAt` + follow-up queue job | ✅ | — |
| Campaign / email marketing | Via workflow HTTP action + external provider | `Campaign` entity + ntf_templates + Resend/SMTP adapter | ⚠️ | No segmentation engine (filter contacts by field), no built-in campaign stats pipeline |
| Email sync (inbound) — Gmail/Outlook | Core feature: two-way sync, auto-link to contacts | `notification.email` (outbound only) | ❌ | No `email-sync` AdapterType in Core; no inbound email entity; no email thread model |
| Calendar sync (two-way) | Google Calendar / Outlook / CalDAV | `scheduling` module (internal slots/bookings only) | ❌ | No `calendar-sync` AdapterType; scheduling module is internal, not external calendar sync |
| Auto-create contact from email thread | Parses sender/recipient → creates/links contact | — | ❌ | Depends on email-sync adapter (missing) |
| Custom objects (user-defined entities) | Unlimited custom objects via SDK `defineObject()` | EntitySchema system supports it; no compose API to create objects at runtime | ⚠️ | EntitySchemaRegistry exists; needs a compose-level "object management" API |
| Custom fields per object | All field types (text, number, select, relation, etc.) | EntitySchema `FieldSchema` with same types | ✅ | Already architected; needs expose via API |
| Workflow automation (event-triggered) | Visual workflow builder with record events, schedules, webhooks | `workflow` module with code-defined ProcessTemplates + EventBus hooks | ⚠️ | No event-driven workflow trigger API; no HTTP action step type; no UI-configurable workflow |
| Workflow: HTTP action step | Call external URL as step | — | ❌ | Needs new workflow step type: `ExternalHTTPAction` |
| Workflow: delay / scheduling | Delay step before next action | Queue with `delay` option exists | ✅ | Infrastructure ready; needs workflow step type |
| Lead scoring (automated) | No native scoring engine | `lead.score` field + `crm.lead-score-decay` job | ⚠️ | Decay job exists; no event-driven score-increase pipeline (e.g. email open → +5 pts) |
| Row-level permissions | Record-level ACL (Org plan) | Role-based own-record filtering (◑ own) | ❌ | Per-record ACL not in system; identity module roles are coarse-grained |
| Field-level permissions | Show/hide specific fields per role | `sensitive: boolean` on FieldSchema (redacted in logs/API) | ⚠️ | `sensitive` flag exists; needs per-role field visibility enforcement in API layer |
| Multi-workspace / multi-org | Workspace isolation, user in multiple workspaces | `organizationId` on every entity; full multi-tenancy | ✅ | — |
| SSO / SAML | Enterprise SSO (Org plan) | Auth plugin has provider interface; no SAML provider implemented | ⚠️ | Needs SAMLProvider adapter in auth plugin |
| Audit logging | Workflow execution audit trail | EventStore (append-only, all events) | ✅ | Infrastructure ready; no CRM-specific audit API endpoint |
| Import contacts (CSV) | CSV import up to 10k records | No import endpoint in CRM API | ❌ | Needs `POST /crm/import/contacts` endpoint + CSV parser |
| Export contacts (CSV) | CSV export up to 20k records | analytics module has `exportData` (generic) | ⚠️ | Needs CRM-specific export endpoint |
| Full-text search (contacts, deals) | Global workspace search, field-level indexing | Search plugin: **Planned** | ⚠️ | Search plugin not implemented; TypesenseAdapter not wired |
| Telephony (click-to-call, call log) | No native; via workflow HTTP to Twilio | TwilioVoiceAdapter in integrations list; no `telephony` AdapterType in Core | ⚠️ | No Core adapter contract for telephony; webhook-to-activity pipeline needs wiring |
| In-app notifications | Notification center | `notification` module + `org:{orgId}:actor:{actorId}:inbox` RT channel | ✅ | — |
| Email notifications (transactional) | Via connected email or SMTP | `notification.email` adapter (Resend/SMTP) | ✅ | — |
| Deal rotation alerts | Rotation detection via scheduled job | `crm.check-deal-rotting` daily job + `deal-rotting` hook | ✅ | — |
| Analytics / pipeline metrics | Dashboards with bar, pie, line, aggregate charts | `analytics` module with Metric, Dashboard, ReportDefinition entities | ⚠️ | Module is generic; no CRM-specific metric definitions shipped |
| Webhook (inbound) | Webhook triggers for workflows | EventBus + workflow hooks; no generic inbound webhook entity | ⚠️ | No webhook registration API; webhooks are hardcoded per integration |
| API (REST) | Full REST for all objects | Full REST CRM API documented | ✅ | — |
| API (GraphQL) | Full GraphQL with subscriptions | Not in architecture (Elysia is HTTP/REST) | ❌ | No GraphQL layer; by design (REST + EventBus is the pattern) |
| Real-time subscriptions | GraphQL subscriptions for live data | WebSocket real-time bridge (`org:{orgId}:crm:pipeline`, etc.) | ✅ | — |
| Zapier / n8n integration | Zapier app available | No integration platform connector | ❌ | Needs outbound webhook system + documented event schema for integration platforms |

---

### System Preparedness Assessment

**What's solid:**

- Core entity model (Contact, Lead, Deal, Activity, Pipeline, Campaign) is comprehensive and well-designed.
- FSM engine covers all CRM entity lifecycles correctly.
- Rule engine handles all business guard conditions.
- EventBus + hooks architecture maps cleanly to CRM event-driven automation.
- Multi-tenancy is baked into every layer.
- Notification infrastructure (email, SMS, in-app) is ready.
- Scheduling module handles meeting bookings.

**What blocks implementation:**

1. **Payment plugin missing** — not relevant to CRM directly, but signals infra maturity.
2. **Search plugin missing** — contact/deal search won't work without this. Blocks basic CRM usability.
3. **Email inbound sync missing** — Twenty's most-used feature. No adapter contract, no entity model.
4. **Calendar sync missing** — required for meeting auto-linking from Google Calendar / Outlook.
5. **Campaign segmentation missing** — `Campaign.segmentId` references a `Segment` entity that isn't defined anywhere.

---

### What to Build — Ordered by Priority

#### P0 — Required before CRM is usable

| Item | Type | Where | Description |
|------|------|--------|-------------|
| Search plugin | Plugin | `plugins/search/` | Implement `createSearchPlugin()` with TypesenseAdapter. Unblocks contact/deal search. |
| `Segment` entity | Compose entity | CRM compose | Define contact segment (filter-based query saved as entity). `Campaign.segmentId` references this. |
| Campaign segmentation engine | Compose logic | CRM compose | `crm.resolveSegment(segmentId)` → returns filtered contact list for campaign dispatch. |
| Account / Company entity | Compose entity | CRM compose | Separate `Account` entity (`name, domain, industry, employeeCount, ownerId, contacts[]`). Contact gets `accountId?: ID`. |

#### P1 — Required for feature parity with basic Twenty

| Item | Type | Where | Description |
|------|------|--------|-------------|
| `email-sync` AdapterType | Core | `core/src/entity/types.ts` → `AdapterType` | Add `"email-sync"` to AdapterType enum. Define `EmailSyncAdapter` interface (connect, sync, disconnect). |
| Inbound email entity | Module/Compose | New `email-sync` module or CRM compose | `EmailThread`, `EmailMessage` entities. Link to Contact/Deal. Auto-create contact on first email. |
| Email sync plugin | Plugin | `plugins/email-sync/` | Gmail OAuth + Outlook OAuth + IMAP adapters. Syncs inbox → EventBus. |
| `calendar-sync` AdapterType | Core | Same as above | Add `"calendar-sync"` to AdapterType. Define `CalendarSyncAdapter` interface. |
| Calendar sync plugin | Plugin | `plugins/calendar-sync/` | Google Calendar + Outlook Calendar + CalDAV adapters. |
| CSV import/export | Compose API | CRM compose | `POST /crm/import/contacts`, `GET /crm/export/contacts`. Bulk queue-based processing. |
| Lead scoring pipeline | Compose hook | CRM compose | Hook on `activity.created`, `campaign.email-opened` → dispatch `crm.updateLeadScore`. Define scoring rules in compose config. |

#### P2 — Enhances CRM maturity

| Item | Type | Where | Description |
|------|------|--------|-------------|
| `telephony` AdapterType | Core | `AdapterType` | `TelephonyAdapter` interface: `initiateCall`, `getCallLog`. |
| Telephony plugin | Plugin | `plugins/telephony/` | TwilioVoice adapter. Webhook → `Activity` auto-creation. |
| Workflow event trigger | Module extension | `workflow` module | New trigger type: `EventTrigger` (fires ProcessTemplate on EventBus event). Enables no-code automation. |
| Workflow HTTP action step | Module extension | `workflow` module | New task type: `ExternalHTTPAction` (calls URL with payload). |
| Dynamic webhook registration | Compose API | CRM compose | `POST /crm/webhooks` — register outbound webhooks for CRM events. Enables Zapier/n8n. |
| CRM analytics seed | Compose boot | CRM compose | Register standard CRM metrics on boot: pipeline-value, win-rate, avg-deal-cycle, rep-performance. |
| SAML auth provider | Auth plugin | `plugins/auth/` | SAMLProvider adapter for enterprise SSO. |
| Custom object API | Compose API | CRM compose | `POST /crm/objects` (admin only) → creates new EntitySchema + migrates DB + exposes CRUD endpoints. |

---

### Missing Core Adapter Types (both composes affected)

These need to be added to `core/src/entity/types.ts` `AdapterType` union:

```typescript
type AdapterType =
  | "storage"
  | "notification.email"
  | "notification.sms"
  | "notification.push"
  | "notification.whatsapp"
  | "notification.webhook"
  | "payment"            // Planned plugin
  | "geo"
  | "search"             // Planned plugin
  | "fx-rates"
  | "ocr"
  | "translate"
  // ↓ Not yet in Core — need to add:
  | "email-sync"         // inbound email (CRM)
  | "calendar-sync"      // calendar sync (CRM)
  | "telephony"          // click-to-call (CRM)
  | "tax"               // tax calculation at checkout (ecommerce)
  | "fulfillment"        // carrier / 3PL (ecommerce)
```
