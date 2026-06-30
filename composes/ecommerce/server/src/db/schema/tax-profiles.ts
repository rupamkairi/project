import { baseColumns, pgTable, text } from "@db/schema/helpers";

export const ecoTaxProfiles = pgTable("eco_tax_profiles", {
  ...baseColumns,
  name: text("name").notNull(),
  provider: text("provider").notNull().default("manual"),
});

export type EcoTaxProfile = typeof ecoTaxProfiles.$inferSelect;
