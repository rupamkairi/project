import { pgTable, text, integer, boolean, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

// Master tables: generic, persisted status flows for any entity type.
// Each compose seeds its own pipelines (e.g. entityType "crm_deal", "eco_order").
// Stage movement is enforced by the Core FSM primitive; these tables store the stages.
export const pipelines = pgTable(
  "pipelines",
  {
    ...baseColumns,
    entityType: text("entity_type").notNull(), // what it sequences, e.g. "crm_deal"
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    index("pipelines_org_entity_idx").on(table.organizationId, table.entityType),
  ],
);

// meta holds stage-specific knobs: probability, rotPeriodDays, color, etc.
export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    ...baseColumns,
    pipelineId: text("pipeline_id").notNull(), // → pipelines
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    index("pipeline_stages_org_pipeline_position_idx").on(
      table.organizationId,
      table.pipelineId,
      table.position,
    ),
  ],
);

export type Pipeline = typeof pipelines.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
