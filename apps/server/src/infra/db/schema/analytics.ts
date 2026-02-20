import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

export const anlMetrics = pgTable(
  "anl_metrics",
  {
    ...baseColumns,
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    aggregation: text("aggregation").notNull(),
    unit: text("unit"),
    queryTemplate: text("query_template").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
  },
  (table) => [
    uniqueIndex("anl_metrics_org_key_idx").on(table.organizationId, table.key),
  ],
);

export const anlSnapshots = pgTable(
  "anl_snapshots",
  {
    ...baseColumns,
    metricKey: text("metric_key").notNull(),
    value: text("value").notNull(),
    capturedAt: timestamp("captured_at").notNull(),
    dimensions: jsonb("dimensions").notNull().default("{}"),
  },
  (table) => [
    index("anl_snapshots_org_metric_captured_idx").on(
      table.organizationId,
      table.metricKey,
      table.capturedAt,
    ),
    index("anl_snapshots_org_metric_idx").on(
      table.organizationId,
      table.metricKey,
    ),
  ],
);

export const anlReportDefinitions = pgTable(
  "anl_report_definitions",
  {
    ...baseColumns,
    name: text("name").notNull(),
    description: text("description"),
    queryTemplate: text("query_template").notNull(),
    parameters: jsonb("parameters").notNull().default("[]"),
    format: text("format").notNull().default("json"),
    isScheduled: boolean("is_scheduled").notNull().default(false),
    scheduleCron: text("schedule_cron"),
  },
  (table) => [
    index("anl_report_definitions_org_scheduled_idx").on(
      table.organizationId,
      table.isScheduled,
    ),
  ],
);

export type AnlMetric = typeof anlMetrics.$inferSelect;
export type AnlSnapshot = typeof anlSnapshots.$inferSelect;
export type AnlReportDefinition = typeof anlReportDefinitions.$inferSelect;
