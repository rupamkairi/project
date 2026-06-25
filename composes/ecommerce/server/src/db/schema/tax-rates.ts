import { numeric } from "drizzle-orm/pg-core";
import { baseColumns, pgTable, text, boolean } from "@db/schema/helpers";

export const ecoTaxRates = pgTable("eco_tax_rates", {
  ...baseColumns,
  taxProfileId: text("tax_profile_id").notNull(),
  name: text("name").notNull(),
  rate: numeric("rate").notNull(),
  jurisdiction: text("jurisdiction"),
  productType: text("product_type"),
  isDefault: boolean("is_default").notNull().default(false),
});

export type EcoTaxRate = typeof ecoTaxRates.$inferSelect;
