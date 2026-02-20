import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const ntfChannelEnum = pgEnum("ntf_channel", [
  "email",
  "sms",
  "push",
  "whatsapp",
  "webhook",
  "in_app",
]);
export const ntfLogStatusEnum = pgEnum("ntf_log_status", [
  "pending",
  "sent",
  "failed",
  "read",
]);

export const ntfTemplates = pgTable(
  "ntf_templates",
  {
    ...baseColumns,
    key: text("key").notNull(),
    channel: ntfChannelEnum("channel").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    locale: text("locale").notNull().default("en"),
    isSystem: boolean("is_system").notNull().default(false),
  },
  (table) => [
    uniqueIndex("ntf_templates_org_key_channel_locale_idx").on(
      table.organizationId,
      table.key,
      table.channel,
      table.locale,
    ),
  ],
);

export const ntfTriggers = pgTable(
  "ntf_triggers",
  {
    ...baseColumns,
    eventPattern: text("event_pattern").notNull(),
    templateKey: text("template_key").notNull(),
    channel: ntfChannelEnum("channel").notNull(),
    recipientExpr: jsonb("recipient_expr").notNull().default("{}"),
    conditions: jsonb("conditions").notNull().default("{}"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("ntf_triggers_org_event_pattern_idx").on(
      table.organizationId,
      table.eventPattern,
    ),
    index("ntf_triggers_org_active_idx").on(
      table.organizationId,
      table.isActive,
    ),
  ],
);

export const ntfLogs = pgTable(
  "ntf_logs",
  {
    ...baseColumns,
    templateKey: text("template_key"),
    channel: ntfChannelEnum("channel").notNull(),
    recipient: text("recipient").notNull(),
    status: ntfLogStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at"),
    readAt: timestamp("read_at"),
    error: text("error"),
    retryCount: integer("retry_count").notNull().default(0),
    metadata: jsonb("metadata").notNull().default("{}"),
  },
  (table) => [
    index("ntf_logs_org_recipient_status_idx").on(
      table.organizationId,
      table.recipient,
      table.status,
    ),
    index("ntf_logs_org_status_idx").on(table.organizationId, table.status),
    index("ntf_logs_org_template_key_idx").on(
      table.organizationId,
      table.templateKey,
    ),
  ],
);

export const ntfPreferences = pgTable(
  "ntf_preferences",
  {
    ...baseColumns,
    actorId: text("actor_id").notNull(),
    channel: ntfChannelEnum("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    muteUntil: timestamp("mute_until"),
  },
  (table) => [
    uniqueIndex("ntf_preferences_org_actor_channel_idx").on(
      table.organizationId,
      table.actorId,
      table.channel,
    ),
  ],
);

export type NtfTemplate = typeof ntfTemplates.$inferSelect;
export type NtfTrigger = typeof ntfTriggers.$inferSelect;
export type NtfLog = typeof ntfLogs.$inferSelect;
export type NtfPreference = typeof ntfPreferences.$inferSelect;
