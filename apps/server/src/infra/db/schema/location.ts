import { pgTable, text, integer, index, pgEnum } from "drizzle-orm/pg-core";
import { baseColumns } from "./helpers";

// Master table: physical/virtual places a tenant manages, cross-domain.
// Restaurant outlets/tables, hotel rooms, warehouses, hospital wards/beds, buildings, floors.
// inv_locations stays inventory-specific; this is the shared, hierarchical place model.
export const locationTypeEnum = pgEnum("location_type", [
  "outlet",
  "table",
  "room",
  "warehouse",
  "ward",
  "bed",
  "virtual",
  "building",
  "floor",
]);

export const locations = pgTable(
  "locations",
  {
    ...baseColumns,
    type: locationTypeEnum("type").notNull(),
    name: text("name").notNull(),
    code: text("code"),
    capacity: integer("capacity"),
    parentId: text("parent_id"), // → locations (hierarchy: bed → ward → building)
    addressId: text("address_id"), // → geo_addresses (nullable)
    status: text("status").notNull().default("active"),
  },
  (table) => [
    index("locations_org_type_idx").on(table.organizationId, table.type),
    index("locations_org_parent_idx").on(table.organizationId, table.parentId),
    index("locations_org_code_idx").on(table.organizationId, table.code),
  ],
);

export type Location = typeof locations.$inferSelect;
