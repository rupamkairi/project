import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const evtStore = pgTable(
  "evt_store",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    actorId: text("actor_id"),
    orgId: text("org_id").notNull(),
    correlationId: text("correlation_id").notNull(),
    causedBy: text("caused_by"),
    version: integer("version").notNull(),
    source: text("source").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("evt_store_aggregate_version_idx").on(
      table.aggregateId,
      table.version,
    ),
    index("evt_store_org_type_idx").on(table.orgId, table.type),
    index("evt_store_org_aggregate_type_idx").on(
      table.orgId,
      table.aggregateType,
    ),
    index("evt_store_org_aggregate_id_idx").on(table.orgId, table.aggregateId),
    index("evt_store_correlation_id_idx").on(table.correlationId),
    index("evt_store_occurred_at_idx").on(table.occurredAt),
    index("evt_store_source_idx").on(table.source),
  ],
);

export type EventStore = typeof evtStore.$inferSelect;
export type NewEventStore = typeof evtStore.$inferInsert;
