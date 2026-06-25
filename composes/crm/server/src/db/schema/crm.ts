// CRM Compose — detail tables (prefixed `crm_`).
//
// The CRM compose reuses shared master tables (persons, parties, pipelines,
// pipeline_stages, activities) and defines its own detail tables here for the
// columns it genuinely owns (leads sequencing, deals, campaigns, segments,
// email). Each detail row links to a master via a plain `text(...)` id column —
// no `references()` (implicit FKs, per docs/conventions.md §7 and master-tables.md).
//
// Master-backed CRM entities have NO schema file here:
//   Account → parties (type = "company")
//   Contact → persons (type = "contact")
//   Lead (person) → persons (type = "lead")
//   Pipeline / Stage → pipelines / pipeline_stages
//   Activity → activities
//
// All tables extend `baseColumns` (id, organizationId, createdAt, updatedAt,
// deletedAt, version, meta) imported from the identity module's helpers.

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  baseColumns,
} from "@db/schema/helpers";
import { primaryKey } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Money helper — value jsonb columns store `{ amount: number; currency: string }`.
// Kept loose (plain jsonb) rather than a typed object so FSMs and import/export
// can mutate freely; the API layer validates shape.
// ---------------------------------------------------------------------------

// --- 2.1 Lead — crm_leads ---------------------------------------------------
// Sequencing/qualification detail for a person of type = "lead".
// Lead `source` and `score` live on the linked `persons.meta`.
export const crmLead = pgTable(
  "crm_leads",
  {
    ...baseColumns,
    personId: text("person_id").notNull(), // → persons (type=lead)
    partyId: text("party_id"), // → parties (their company)
    stageId: text("stage_id"), // → pipeline_stages (lead pipeline)
    ownerId: text("owner_id"), // → actors (assigned rep)
    status: text("status").notNull().default("new"), // FSM: new|contacted|qualified|disqualified|converted
    interest: text("interest"), // product/service of interest
    estimatedValue: jsonb("estimated_value"), // Money { amount, currency }
    notes: text("notes"),
    qualifiedAt: timestamp("qualified_at"),
    convertedAt: timestamp("converted_at"),
    dealId: text("deal_id"), // → crm_deals (set on conversion)
  },
  (table) => [
    index("crm_leads_org_status_idx").on(table.organizationId, table.status),
    index("crm_leads_org_owner_idx").on(table.organizationId, table.ownerId),
    index("crm_leads_org_person_idx").on(table.organizationId, table.personId),
  ],
);

// --- 2.2 Deal — crm_deals ---------------------------------------------------
// An opportunity in a pipeline stage. The canonical multi-master detail row.
export const crmDeal = pgTable(
  "crm_deals",
  {
    ...baseColumns,
    title: text("title").notNull(),
    personId: text("person_id"), // → persons (primary contact)
    partyId: text("party_id"), // → parties (account)
    stageId: text("stage_id"), // → pipeline_stages
    transactionId: text("transaction_id"), // → transactions (quote, optional)
    itemId: text("item_id"), // → cat_items (primary product, optional)
    pipelineId: text("pipeline_id"), // → pipelines
    ownerId: text("owner_id"), // → actors
    status: text("status").notNull().default("open"), // FSM: open|won|lost|abandoned
    value: jsonb("value"), // Money { amount, currency }
    probability: integer("probability"), // override stage default
    expectedCloseDate: timestamp("expected_close_date"),
    actualCloseDate: timestamp("actual_close_date"),
    lostReason: text("lost_reason"),
    rottingAt: timestamp("rotting_at"), // last stage change + stage.meta.rotPeriodDays
    approvalStatus: text("approval_status"), // pending|approved|rejected
    approvedById: text("approved_by_id"), // → actors
  },
  (table) => [
    index("crm_deals_org_pipeline_stage_idx").on(
      table.organizationId,
      table.pipelineId,
      table.stageId,
    ),
    index("crm_deals_org_owner_idx").on(table.organizationId, table.ownerId),
    index("crm_deals_org_status_idx").on(table.organizationId, table.status),
  ],
);

// --- 2.3 Segment — crm_segments ---------------------------------------------
// A saved filter query over persons (contacts). Defines the audience for a campaign.
// No master FK — it is a rule expression evaluated dynamically at send time.
export const crmSegment = pgTable(
  "crm_segments",
  {
    ...baseColumns,
    name: text("name").notNull(),
    description: text("description"),
    filters: jsonb("filters").notNull(), // RuleExpr — evaluated against person fields
    contactCount: integer("contact_count").notNull().default(0), // cached, refreshed by job
    lastComputedAt: timestamp("last_computed_at"),
  },
  (table) => [index("crm_segments_org_idx").on(table.organizationId)],
);

// --- 2.4 Campaign — crm_campaigns -------------------------------------------
// An email/SMS/whatsapp marketing campaign targeting a segment.
export const crmCampaign = pgTable(
  "crm_campaigns",
  {
    ...baseColumns,
    name: text("name").notNull(),
    type: text("type").notNull(), // email|sms|whatsapp
    status: text("status").notNull().default("draft"), // FSM: draft|scheduled|sending|sent|paused|cancelled
    segmentId: text("segment_id"), // → crm_segments
    stageId: text("stage_id"), // → pipeline_stages (optional campaign workflow)
    templateId: text("template_id"), // notification template id
    subject: text("subject"), // email subject line
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    body: text("body"),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    recipientCount: integer("recipient_count").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    openedCount: integer("opened_count").notNull().default(0),
    clickedCount: integer("clicked_count").notNull().default(0),
    bouncedCount: integer("bounced_count").notNull().default(0),
    unsubscribedCount: integer("unsubscribed_count").notNull().default(0),
  },
  (table) => [
    index("crm_campaigns_org_status_idx").on(table.organizationId, table.status),
    index("crm_campaigns_org_segment_idx").on(
      table.organizationId,
      table.segmentId,
    ),
  ],
);

// --- 2.5 CampaignContact — crm_campaign_contacts ----------------------------
// Join table tracking per-person campaign delivery status.
export const crmCampaignContact = pgTable(
  "crm_campaign_contacts",
  {
    ...baseColumns,
    campaignId: text("campaign_id").notNull(), // → crm_campaigns
    personId: text("person_id").notNull(), // → persons (type=contact)
    status: text("status").notNull().default("pending"), // pending|sent|delivered|opened|clicked|bounced|unsubscribed
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
  },
  (table) => [
    primaryKey({ columns: [table.campaignId, table.personId] }),
    index("crm_campaign_contacts_org_campaign_idx").on(
      table.organizationId,
      table.campaignId,
    ),
    index("crm_campaign_contacts_org_person_idx").on(
      table.organizationId,
      table.personId,
    ),
  ],
);

// --- 2.6 EmailThread — crm_email_threads (P1) -------------------------------
// Inbound/outbound email threads linked to a person. Requires email-sync adapter.
export const crmEmailThread = pgTable(
  "crm_email_threads",
  {
    ...baseColumns,
    externalThreadId: text("external_thread_id").notNull(), // provider thread id
    provider: text("provider").notNull(), // gmail|outlook|imap
    personId: text("person_id"), // → persons (auto-linked)
    transactionId: text("transaction_id"), // → transactions (optional)
    subject: text("subject"),
    lastMessageAt: timestamp("last_message_at"),
    messageCount: integer("message_count").notNull().default(1),
    syncedAt: timestamp("synced_at"),
  },
  (table) => [
    index("crm_email_threads_org_person_idx").on(
      table.organizationId,
      table.personId,
    ),
    index("crm_email_threads_org_external_idx").on(
      table.organizationId,
      table.externalThreadId,
    ),
  ],
);

// --- 2.7 EmailMessage — crm_email_messages (P1) -----------------------------
// Individual email within a thread.
export const crmEmailMessage = pgTable(
  "crm_email_messages",
  {
    ...baseColumns,
    threadId: text("thread_id").notNull(), // → crm_email_threads
    externalMessageId: text("external_message_id").notNull(),
    from: text("from").notNull(),
    to: jsonb("to").notNull(), // string[] — jsonb so the array survives neon-http driver
    bodyText: text("body_text"),
    receivedAt: timestamp("received_at").notNull(),
    direction: text("direction").notNull(), // inbound|outbound
  },
  (table) => [
    index("crm_email_messages_org_thread_idx").on(
      table.organizationId,
      table.threadId,
    ),
  ],
);

// --- 2.8 Ticket — crm_tickets -----------------------------------------------
// Support ticket linked to a contact (person) and optionally a deal/account.
// FSM: open → in_progress → resolved → closed; resolved can reopen → open.
export const crmTicket = pgTable(
  "crm_tickets",
  {
    ...baseColumns,
    subject: text("subject").notNull(),
    description: text("description"),
    personId: text("person_id"),        // → persons (contact who raised it)
    partyId: text("party_id"),          // → parties (their account)
    dealId: text("deal_id"),            // → crm_deals (optional related deal)
    assigneeId: text("assignee_id"),    // → actors (support agent)
    status: text("status").notNull().default("open"), // FSM: open|in_progress|resolved|closed
    priority: text("priority").notNull().default("normal"), // low|normal|high|urgent
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    firstResponseAt: timestamp("first_response_at"),
  },
  (table) => [
    index("crm_tickets_org_status_idx").on(table.organizationId, table.status),
    index("crm_tickets_org_assignee_idx").on(table.organizationId, table.assigneeId),
    index("crm_tickets_org_person_idx").on(table.organizationId, table.personId),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CrmLead = typeof crmLead.$inferSelect;
export type CrmDeal = typeof crmDeal.$inferSelect;
export type CrmSegment = typeof crmSegment.$inferSelect;
export type CrmCampaign = typeof crmCampaign.$inferSelect;
export type CrmCampaignContact = typeof crmCampaignContact.$inferSelect;
export type CrmEmailThread = typeof crmEmailThread.$inferSelect;
export type CrmEmailMessage = typeof crmEmailMessage.$inferSelect;
export type CrmTicket = typeof crmTicket.$inferSelect;
