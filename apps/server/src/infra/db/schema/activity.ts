import { pgTable, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

// Master table: interaction log across composes.
// CRM calls/emails/notes/tasks, EMR visit notes, service requests, approval comments.
export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "task",
  "log",
  "service_request",
  "visit_note",
]);

export const activityStatusEnum = pgEnum("activity_status", [
  "pending",
  "done",
  "cancelled",
]);

// entityId + entityType is a polymorphic target (no DB FK, by design — same idiom as
// geo_addresses and inv_movements.referenceId/referenceType). Validate the target in
// the application layer; the composite (org, entityType, entityId) index keeps lookups fast.
export const activities = pgTable(
  "activities",
  {
    ...baseColumns,
    type: activityTypeEnum("type").notNull(),
    subject: text("subject"),
    body: text("body"),
    status: activityStatusEnum("status").notNull().default("pending"),
    actorId: text("actor_id"), // → actors (who logged it)
    entityId: text("entity_id"), // polymorphic target id
    entityType: text("entity_type"), // polymorphic target table
    dueAt: timestamp("due_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("activities_org_entity_idx").on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
    index("activities_org_actor_idx").on(table.organizationId, table.actorId),
    index("activities_org_status_due_idx").on(
      table.organizationId,
      table.status,
      table.dueAt,
    ),
  ],
);

export type Activity = typeof activities.$inferSelect;
