# CRM — Phase 2: Compose Entities

## Goal

Define the data the CRM compose owns. The CRM reuses the shared **master tables** for
contacts, accounts, leads, pipelines, transactions, and activities. It defines its own
**detail tables** only for columns it genuinely owns (deals, campaigns, segments, email).

Detail tables live in `composes/crm/server/src/db/schema/` and all extend `baseColumns`
(id, organizationId, createdAt, updatedAt, deletedAt, version, meta). Master tables are
not defined here — they live in the foundation modules.

---

## Master Table Alignment

The CRM reuses these masters instead of redefining them. See
[../../docs/master-tables.md](../../docs/master-tables.md) for the full spec.

| Master (module) | CRM uses `type` value(s) | Replaces old CRM table |
|-----------------|--------------------------|------------------------|
| `parties` (party) | `company` | `crm_accounts` |
| `persons` (party) | `contact`, `lead` | `crm_contacts` |
| `pipelines` (pipeline) | `entityType` = `crm.deal`, `crm.lead`, `crm.campaign` | `crm_pipelines` |
| `pipeline_stages` (pipeline) | stages per pipeline | `crm_pipeline_stages` |
| `activities` (activity) | `call`, `email`, `meeting`, `note`, `task`, `log` | `crm_activities` |
| `transactions` (commerce) | `quote` (deal quote, optional) | — |
| `cat_items` (catalog) | `product`, `service` (deal line items, optional) | — |
| `geo_addresses` (geo) | contact/account addresses (polymorphic) | inline `address` jsonb |

Reads filter masters by `organizationId` + `type`. CRM never inserts a contact or
account directly — it dispatches `party.createPerson` / `party.createParty` via the
Mediator. Sparse CRM-specific fields go in the master row's `meta` jsonb.

---

## Master Tables (reused — not redefined)

### Accounts → `parties` (type = `company`)

A company an org manages. Use `party.createParty` / `party.listParties` /
`party.countParties` with `type: "company"`. Master columns cover `name`, `domain`,
`industry`, `employeeCount`. CRM-only fields (`ownerId`, `status`, `annualRevenue`,
`tags`, `linkedinUrl`, `websiteUrl`) live in `parties.meta`. Address → `geo_addresses`
(entityType `party`).

### Contacts → `persons` (type = `contact`)

A person who may belong to a `party`. Use `party.createPerson` / `party.listPersons`
with `type: "contact"`. Master columns cover `firstName`, `lastName`, `email`, `phone`,
`source`, `party_id` (their company), `actor_id` (login bridge). CRM-only fields
(`ownerId`, `title`, `department`, `mobile`, `leadScore`, `status`, `tags`,
`lastContactedAt`, `linkedinUrl`) live in `persons.meta`. Search sync indexes
`firstName + lastName + email + meta.title + meta.tags`.

### Leads → `persons` (type = `lead`)

A prospective person before qualification. Same master as contacts, discriminated by
`type: "lead"`. On qualification the person's `type` flips to `contact`. Lead-specific
sequencing columns live in the **detail** table `crm_leads` (below); lead score and
source live in `persons.meta`.

### Pipelines → `pipelines` + `pipeline_stages`

Sales process and ordered stages. Seed via `seedPipeline(orgId, "crm.deal", stages)`.
`pipelines` carries `entityType`, `name`, `isDefault`. `pipeline_stages` carries
`pipelineId`, `name`, `position`; `probability` and `rotPeriodDays` live in
`pipeline_stages.meta`. Sequenced CRM entities carry a plain `stage_id` column.

### Activities → `activities` (type)

A log item on any CRM record. Use `activity.log` / `activity.list`. Master columns:
`type` (`call | email | meeting | note | task | log`), `subject`, `body`, `status`,
`actorId`, `entityId` + `entityType` (polymorphic target — `person`, `party`,
`crm_lead`, `crm_deal`), `dueAt`, `completedAt`. CRM-only fields (`direction`,
`durationSeconds`, `callRecordingUrl`, `callSid`, `schedulingEventId`) live in
`activities.meta`. One activity targets exactly one record via `entityId`+`entityType`.

---

## Detail Tables (compose-owned, prefixed `crm_`)

These hold only the columns CRM genuinely owns. Each links to masters via plain
`text` id columns — no `references()` (implicit FKs, per conventions §7).

### 2.1 Lead — `crm_leads`

Sequencing/qualification detail for a person of `type = lead`.

Master FKs: `person_id` → persons, `party_id` → parties, `stage_id` → pipeline_stages.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `person_id` | text | notNull | → persons (type=lead) |
| `party_id` | text | | → parties (their company) |
| `stage_id` | text | | → pipeline_stages (lead pipeline) |
| `ownerId` | text | | Assigned rep (→ identity.actors) |
| `status` | text | FSM-controlled | `new \| contacted \| qualified \| disqualified \| converted` |
| `interest` | text | | Product/service of interest |
| `estimatedValue` | jsonb | `Money` | |
| `notes` | text | | |
| `qualifiedAt` | timestamp | | Set on FSM → qualified |
| `convertedAt` | timestamp | | Set on conversion |
| `dealId` | text | | → crm_deals (set on conversion) |

Indexes: `(organizationId, status)`, `(organizationId, ownerId)`, `(organizationId, person_id)`.

Note: lead `source` and `score` live in the linked `persons.meta`.

### 2.2 Deal — `crm_deals`

An opportunity in a pipeline stage. The canonical multi-master detail row.

Master FKs: `person_id` → persons, `party_id` → parties, `stage_id` →
pipeline_stages, `transaction_id` → transactions (optional quote), `item_id` →
cat_items (optional primary product).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `title` | text | notNull | |
| `person_id` | text | | → persons (primary contact) |
| `party_id` | text | | → parties (account) |
| `stage_id` | text | | → pipeline_stages |
| `transaction_id` | text | | → transactions (quote, optional) |
| `item_id` | text | | → cat_items (primary product, optional) |
| `pipelineId` | text | | → pipelines |
| `ownerId` | text | | → identity.actors |
| `status` | text | FSM-controlled | `open \| won \| lost \| abandoned` |
| `value` | jsonb | `Money` | |
| `probability` | integer | | Override stage default |
| `expectedCloseDate` | timestamp | | |
| `actualCloseDate` | timestamp | | |
| `lostReason` | text | | |
| `rottingAt` | timestamp | | last stage change + stage.meta.rotPeriodDays |
| `approvalStatus` | text | | `pending \| approved \| rejected` |
| `approvedById` | text | | → identity.actors |

Indexes: `(organizationId, pipelineId, stage_id)`, `(organizationId, ownerId)`, `(organizationId, status)`.

Search sync: `searchable: true` — index `title + person.name + party.name`.

### 2.3 Segment — `crm_segments`

A saved filter query over persons (contacts). Defines the audience for a Campaign.

Carries no master FK — it is a rule expression evaluated dynamically.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | |
| `description` | text | | |
| `filters` | jsonb | notNull | `RuleExpr` — evaluated against person fields |
| `contactCount` | integer | notNull, default 0 | Cached count, refreshed by job |
| `lastComputedAt` | timestamp | | When contactCount was last refreshed |

No join table — segment is evaluated at campaign send time via
`ruleEngine.evaluate(segment.filters, person)` over `persons` (type=contact).

### 2.4 Campaign — `crm_campaigns`

An email/SMS marketing campaign targeting a segment.

Master FKs: `segment_id` → crm_segments (detail), `stage_id` → pipeline_stages
(optional campaign workflow pipeline).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | |
| `type` | text | notNull | `email \| sms \| whatsapp` |
| `status` | text | FSM-controlled | `draft \| scheduled \| sending \| sent \| paused \| cancelled` |
| `segment_id` | text | | → crm_segments |
| `stage_id` | text | | → pipeline_stages (optional) |
| `templateId` | text | | Notification template ID |
| `subject` | text | | Email subject line |
| `fromName` | text | | |
| `fromEmail` | text | | |
| `scheduledAt` | timestamp | | |
| `sentAt` | timestamp | | |
| `recipientCount` | integer | default 0 | |
| `deliveredCount` | integer | default 0 | |
| `openedCount` | integer | default 0 | |
| `clickedCount` | integer | default 0 | |
| `bouncedCount` | integer | default 0 | |
| `unsubscribedCount` | integer | default 0 | |

### 2.5 CampaignContact — `crm_campaign_contacts`

Join table tracking per-person campaign delivery status.

Master FK: `person_id` → persons (type=contact).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `campaign_id` | text | notNull | → crm_campaigns |
| `person_id` | text | notNull | → persons |
| `status` | text | notNull, default "pending" | `pending \| sent \| delivered \| opened \| clicked \| bounced \| unsubscribed` |
| `sentAt` | timestamp | | |
| `openedAt` | timestamp | | |
| `clickedAt` | timestamp | | |

Primary key: `(campaign_id, person_id)`.

### 2.6 EmailThread — `crm_email_threads`

P1 — requires email-sync adapter. Inbound/outbound email threads linked to a person.

Master FKs: `person_id` → persons, `transaction_id` → transactions (optional, links a
thread to a deal's quote).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `externalThreadId` | text | notNull | Provider thread ID (Gmail, Outlook) |
| `provider` | text | notNull | `gmail \| outlook \| imap` |
| `person_id` | text | | → persons (auto-linked) |
| `transaction_id` | text | | → transactions (optional) |
| `subject` | text | | |
| `lastMessageAt` | timestamp | | |
| `messageCount` | integer | default 1 | |
| `syncedAt` | timestamp | | |

Note: to associate a thread with a deal, resolve the deal's `transaction_id` or
join `crm_deals` on `person_id`.

### 2.7 EmailMessage — `crm_email_messages`

P1 — Individual email within a thread.

Detail FK: `thread_id` → crm_email_threads.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `thread_id` | text | notNull | → crm_email_threads |
| `externalMessageId` | text | notNull | |
| `from` | text | notNull | |
| `to` | text[] | notNull | |
| `bodyText` | text | | |
| `receivedAt` | timestamp | notNull | |
| `direction` | text | notNull | `inbound \| outbound` |

---

## File Map

Master-backed entities have no schema file — they are read/written via Mediator.

| Entity | Backing | File |
|--------|---------|------|
| Account | `parties` (type=company) | — (party module) |
| Contact | `persons` (type=contact) | — (party module) |
| Lead (person) | `persons` (type=lead) | — (party module) |
| Pipeline / Stage | `pipelines` / `pipeline_stages` | — (pipeline module) |
| Activity | `activities` | — (activity module) |
| Lead (detail) | `crm_leads` | `db/schema/leads.ts` |
| Deal | `crm_deals` | `db/schema/deals.ts` |
| Segment | `crm_segments` | `db/schema/segments.ts` |
| Campaign | `crm_campaigns` | `db/schema/campaigns.ts` |
| CampaignContact | `crm_campaign_contacts` | `db/schema/campaign-contacts.ts` |
| EmailThread (P1) | `crm_email_threads` | `db/schema/email-threads.ts` |
| EmailMessage (P1) | `crm_email_messages` | `db/schema/email-messages.ts` |
