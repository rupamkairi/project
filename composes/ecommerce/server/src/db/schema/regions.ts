import { baseColumns, pgTable, text, boolean, index } from "@db/schema/helpers";

export const ecoRegions = pgTable(
  "eco_regions",
  {
    ...baseColumns,
    name: text("name").notNull(),
    currency: text("currency").notNull(),
    countries: text("countries").notNull().array().default([]),
    taxProfileId: text("tax_profile_id"),
    paymentProviders: text("payment_providers").array().default([]),
    fulfillmentProviders: text("fulfillment_providers").array().default([]),
    isDefault: boolean("is_default").notNull().default(false),
    taxIncluded: boolean("tax_included").notNull().default(false),
  },
  (table) => [
    index("eco_regions_org_default_idx").on(table.organizationId, table.isDefault),
  ],
);

export type EcoRegion = typeof ecoRegions.$inferSelect;
