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

export const instanceStatusEnum = pgEnum("wf_instance_status", [
  "pending",
  "active",
  "completed",
  "cancelled",
]);
export const taskStatusEnum = pgEnum("wf_task_status", [
  "open",
  "in_progress",
  "completed",
  "failed",
  "skipped",
]);

export const wfProcessTemplates = pgTable(
  "wf_process_templates",
  {
    ...baseColumns,
    name: text("name").notNull(),
    description: text("description"),
    entityType: text("entity_type").notNull(),
    stages: jsonb("stages").notNull().default("[]"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("wf_process_templates_org_entity_type_idx").on(
      table.organizationId,
      table.entityType,
    ),
    index("wf_process_templates_org_active_idx").on(
      table.organizationId,
      table.isActive,
    ),
  ],
);

export const wfProcessInstances = pgTable(
  "wf_process_instances",
  {
    ...baseColumns,
    templateId: text("template_id").notNull(),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    currentStage: text("current_stage"),
    context: jsonb("context").notNull().default("{}"),
    status: instanceStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("wf_process_instances_org_entity_idx").on(
      table.organizationId,
      table.entityId,
      table.entityType,
    ),
    index("wf_process_instances_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("wf_process_instances_org_template_idx").on(
      table.organizationId,
      table.templateId,
    ),
  ],
);

export const wfTasks = pgTable(
  "wf_tasks",
  {
    ...baseColumns,
    instanceId: text("instance_id").notNull(),
    stageId: text("stage_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    assigneeRole: text("assignee_role"),
    assigneeId: text("assignee_id"),
    status: taskStatusEnum("status").notNull().default("open"),
    dueAt: timestamp("due_at"),
    completedAt: timestamp("completed_at"),
    outcome: jsonb("outcome"),
  },
  (table) => [
    index("wf_tasks_org_instance_idx").on(
      table.organizationId,
      table.instanceId,
    ),
    index("wf_tasks_org_assignee_status_idx").on(
      table.organizationId,
      table.assigneeId,
      table.status,
    ),
    index("wf_tasks_org_status_idx").on(table.organizationId, table.status),
    index("wf_tasks_org_due_at_idx").on(table.organizationId, table.dueAt),
  ],
);

export type WfProcessTemplate = typeof wfProcessTemplates.$inferSelect;
export type WfProcessInstance = typeof wfProcessInstances.$inferSelect;
export type WfTask = typeof wfTasks.$inferSelect;
