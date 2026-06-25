import { numeric } from "drizzle-orm/pg-core";
import { baseColumns, pgTable, text, jsonb } from "@db/schema/helpers";

export const ecoCustomerGroups = pgTable("eco_customer_groups", {
  ...baseColumns,
  name: text("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").$type<Record<string, unknown>>(),
  pricingMultiplier: numeric("pricing_multiplier"),
});

export const ecoCustomerGroupMembers = pgTable("eco_customer_group_members", {
  groupId: text("group_id").notNull(),
  personId: text("person_id").notNull(),
});

export type EcoCustomerGroup = typeof ecoCustomerGroups.$inferSelect;
export type EcoCustomerGroupMember = typeof ecoCustomerGroupMembers.$inferSelect;
