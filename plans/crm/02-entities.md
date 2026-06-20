# CRM — Phase 2: Compose Entities

## Goal

Define every DB table owned by the CRM compose, including full field specs, indexes,
and TypeScript type exports. All tables live in `composes/crm/server/src/db/schema/`.

All tables extend `baseColumns` (id, organizationId, createdAt, updatedAt, deletedAt, version, meta).

---

## 2.1 Account (`crm_accounts`)

Represents a company or organisation that contacts belong to.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | Company name |
| `domain` | text | | Website domain e.g. "acme.com" |
| `industry` | text | | e.g. "SaaS", "Manufacturing" |
| `employeeCount` | integer | | Headcount |
| `annualRevenue` | jsonb | `Money` | Annual revenue |
| `ownerId` | text | FK → identity.actors | Account owner (sales rep) |
| `phone` | text | | |
| `address` | jsonb | `Address` | |
| `linkedinUrl` | text | | |
| `websiteUrl` | text | | |
| `status` | text | notNull, default "active" | `active \| inactive \| churned` |
| `tags` | text[] | | |

Indexes: `(organizationId, ownerId)`, `(organizationId, domain)` unique.

---

## 2.2 Contact (`crm_contacts`)

A person. May belong to an Account.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `firstName` | text | notNull | |
| `lastName` | text | notNull | |
| `email` | text | | Unique per org |
| `phone` | text | | |
| `mobile` | text | | |
| `title` | text | | Job title |
| `department` | text | | |
| `accountId` | text | FK → crm_accounts | Owning account |
| `ownerId` | text | FK → identity.actors | Assigned sales rep |
| `leadScore` | integer | notNull, default 0 | 0-100 |
| `status` | text | notNull, default "active" | `active \| inactive \| unsubscribed` |
| `address` | jsonb | `Address` | |
| `linkedinUrl` | text | | |
| `tags` | text[] | | |
| `source` | text | | How contact was acquired |
| `lastContactedAt` | timestamp | | Updated on activity creation |

Indexes: `(organizationId, email)`, `(organizationId, accountId)`, `(organizationId, ownerId)`.

Search sync: `searchable: true` — index `firstName + lastName + email + title + tags`.

---

## 2.3 Lead (`crm_leads`)

A prospective customer before qualification into a Deal.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `contactId` | text | FK → crm_contacts | The person |
| `accountId` | text | FK → crm_accounts | Their company |
| `ownerId` | text | FK → identity.actors | |
| `status` | text | FSM-controlled | `new \| contacted \| qualified \| disqualified \| converted` |
| `source` | text | | `inbound \| outbound \| referral \| import` |
| `score` | integer | notNull, default 0 | |
| `interest` | text | | Product/service they're interested in |
| `estimatedValue` | jsonb | `Money` | |
| `notes` | text | | |
| `qualifiedAt` | timestamp | | Set when FSM transitions to qualified |
| `convertedAt` | timestamp | | Set when converted to deal |
| `dealId` | text | FK → crm_deals | Set on conversion |

Indexes: `(organizationId, status)`, `(organizationId, ownerId)`, `(organizationId, contactId)`.

---

## 2.4 Pipeline (`crm_pipelines`)

Defines a sales process with ordered stages.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | |
| `description` | text | | |
| `isDefault` | boolean | notNull, default false | |
| `currency` | text | notNull, default "USD" | |

---

## 2.5 PipelineStage (`crm_pipeline_stages`)

An ordered stage within a pipeline.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `pipelineId` | text | FK → crm_pipelines, notNull | |
| `name` | text | notNull | |
| `position` | integer | notNull | Sort order (0-based) |
| `probability` | integer | notNull, default 0 | Win probability % |
| `rotPeriodDays` | integer | | Days before deal flags as rotting |

Indexes: `(pipelineId, position)` unique.

---

## 2.6 Deal (`crm_deals`)

An opportunity in a pipeline stage.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `title` | text | notNull | |
| `contactId` | text | FK → crm_contacts | Primary contact |
| `accountId` | text | FK → crm_accounts | |
| `ownerId` | text | FK → identity.actors | |
| `pipelineId` | text | FK → crm_pipelines, notNull | |
| `stageId` | text | FK → crm_pipeline_stages, notNull | |
| `status` | text | FSM-controlled | `open \| won \| lost \| abandoned` |
| `value` | jsonb | `Money` | |
| `probability` | integer | | Override stage default |
| `expectedCloseDate` | timestamp | | |
| `actualCloseDate` | timestamp | | |
| `lostReason` | text | | |
| `rottingAt` | timestamp | | Computed: last stage change + rotPeriodDays |
| `approvalStatus` | text | | `pending \| approved \| rejected` — for high-value deals |
| `approvedById` | text | FK → identity.actors | |

Indexes: `(organizationId, pipelineId, stageId)`, `(organizationId, ownerId)`, `(organizationId, status)`.

Search sync: `searchable: true` — index `title + contact.name + account.name`.

---

## 2.7 Activity (`crm_activities`)

A log item on any CRM record (call, email, meeting, note, task, demo).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `type` | text | notNull | `call \| email \| meeting \| note \| task \| demo` |
| `subject` | text | notNull | |
| `body` | text | | Rich text / markdown |
| `status` | text | notNull, default "done" | `done \| pending \| cancelled` |
| `direction` | text | | `inbound \| outbound` (for calls/emails) |
| `dueAt` | timestamp | | For tasks / scheduled meetings |
| `completedAt` | timestamp | | |
| `durationSeconds` | integer | | For calls / meetings |
| `actorId` | text | FK → identity.actors | Who logged it |
| `contactId` | text | FK → crm_contacts | |
| `accountId` | text | FK → crm_accounts | |
| `leadId` | text | FK → crm_leads | |
| `dealId` | text | FK → crm_deals | |
| `schedulingEventId` | text | FK → sch_events | For meetings |
| `callRecordingUrl` | text | | For calls via telephony adapter |
| `callSid` | text | | External call ID |

Indexes: `(organizationId, contactId)`, `(organizationId, dealId)`, `(organizationId, actorId, dueAt)`.

Note: An activity links to exactly one primary record (contact OR deal OR lead OR account). All foreign keys are nullable; exactly one should be set.

---

## 2.8 Segment (`crm_segments`)

A saved filter query over contacts. Used by Campaign to define the audience.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | |
| `description` | text | | |
| `filters` | jsonb | notNull | `RuleExpr` — evaluated against contact fields |
| `contactCount` | integer | notNull, default 0 | Cached count, refreshed by job |
| `lastComputedAt` | timestamp | | When contactCount was last refreshed |

No direct join table — segment is evaluated dynamically at campaign send time.
Contact matching: `ruleEngine.evaluate(segment.filters, contact)`.

---

## 2.9 Campaign (`crm_campaigns`)

An email or SMS marketing campaign targeting a segment.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | text | notNull | |
| `type` | text | notNull | `email \| sms \| whatsapp` |
| `status` | text | FSM-controlled | `draft \| scheduled \| sending \| sent \| paused \| cancelled` |
| `segmentId` | text | FK → crm_segments | Target audience |
| `templateId` | text | FK → not_notifications or inline | Notification template ID |
| `subject` | text | | Email subject line |
| `fromName` | text | | |
| `fromEmail` | text | | |
| `scheduledAt` | timestamp | | When to send |
| `sentAt` | timestamp | | |
| `recipientCount` | integer | default 0 | |
| `deliveredCount` | integer | default 0 | |
| `openedCount` | integer | default 0 | |
| `clickedCount` | integer | default 0 | |
| `bouncedCount` | integer | default 0 | |
| `unsubscribedCount` | integer | default 0 | |

---

## 2.10 CampaignContact (`crm_campaign_contacts`)

Join table tracking per-contact campaign delivery status.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `campaignId` | text | FK → crm_campaigns, notNull | |
| `contactId` | text | FK → crm_contacts, notNull | |
| `status` | text | notNull, default "pending" | `pending \| sent \| delivered \| opened \| clicked \| bounced \| unsubscribed` |
| `sentAt` | timestamp | | |
| `openedAt` | timestamp | | |
| `clickedAt` | timestamp | | |

Primary key: `(campaignId, contactId)`.

---

## 2.11 EmailThread (`crm_email_threads`)

P1 — requires email-sync adapter. Stores inbound/outbound email threads linked to contacts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `externalThreadId` | text | notNull | Provider thread ID (Gmail, Outlook) |
| `provider` | text | notNull | `gmail \| outlook \| imap` |
| `contactId` | text | FK → crm_contacts | Auto-linked |
| `dealId` | text | FK → crm_deals | Optional |
| `subject` | text | | |
| `lastMessageAt` | timestamp | | |
| `messageCount` | integer | default 1 | |
| `syncedAt` | timestamp | | |

---

## 2.12 EmailMessage (`crm_email_messages`)

P1 — Individual email within a thread.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `threadId` | text | FK → crm_email_threads, notNull | |
| `externalMessageId` | text | notNull | |
| `from` | text | notNull | |
| `to` | text[] | notNull | |
| `bodyText` | text | | |
| `receivedAt` | timestamp | notNull | |
| `direction` | text | notNull | `inbound \| outbound` |

---

## File Map

| Entity | File |
|--------|------|
| Account | `db/schema/accounts.ts` |
| Contact | `db/schema/contacts.ts` |
| Lead | `db/schema/leads.ts` |
| Pipeline | `db/schema/pipelines.ts` |
| PipelineStage | `db/schema/pipeline-stages.ts` |
| Deal | `db/schema/deals.ts` |
| Activity | `db/schema/activities.ts` |
| Segment | `db/schema/segments.ts` |
| Campaign | `db/schema/campaigns.ts` |
| CampaignContact | `db/schema/campaign-contacts.ts` |
| EmailThread (P1) | `db/schema/email-threads.ts` |
| EmailMessage (P1) | `db/schema/email-messages.ts` |
