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
