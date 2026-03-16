import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Base columns shared across all tables
const baseColumns = {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  version: integer("version").notNull().default(1),
  meta: jsonb("meta").notNull().default({}),
};

// plt_settings - Platform-wide configuration
export const pltSettings = pgTable(
  "plt_settings",
  {
    ...baseColumns,
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    description: text("description"),
  },
  (table) => [uniqueIndex("plt_settings_key_idx").on(table.key)],
);

// plt_compose_config - Compose deployment configuration
export const pltComposeConfig = pgTable(
  "plt_compose_config",
  {
    ...baseColumns,
    composeId: text("compose_id").notNull(),
    version: text("version").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    config: jsonb("config").notNull().default("{}"),
  },
  (table) => [uniqueIndex("plt_compose_compose_id_idx").on(table.composeId)],
);

// plt_organization_settings - Organization-specific platform settings
export const pltOrganizationSettings = pgTable(
  "plt_organization_settings",
  {
    ...baseColumns,
    organizationId: text("organization_id").notNull(),
    settings: jsonb("settings").notNull().default("{}"),
  },
  (table) => [uniqueIndex("plt_org_settings_org_idx").on(table.organizationId)],
);

export type PltSetting = typeof pltSettings.$inferSelect;
export type PltComposeConfig = typeof pltComposeConfig.$inferSelect;
export type PltOrganizationSetting =
  typeof pltOrganizationSettings.$inferSelect;
