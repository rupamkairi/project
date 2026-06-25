import { baseColumns, pgTable, text, integer, boolean, jsonb, index } from "@db/schema/helpers";

export const ecoShippingOptions = pgTable(
  "eco_shipping_options",
  {
    ...baseColumns,
    name: text("name").notNull(),
    providerId: text("provider_id"),
    regionId: text("region_id"),
    type: text("type").notNull().default("flat_rate"),
    rate: jsonb("rate").$type<{ amount: number; currency: string }>(),
    conditions: jsonb("conditions").$type<Record<string, unknown>>(),
    estimatedDays: integer("estimated_days"),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("eco_shipping_options_org_region_idx").on(table.organizationId, table.regionId, table.isActive),
  ],
);

export type EcoShippingOption = typeof ecoShippingOptions.$inferSelect;
