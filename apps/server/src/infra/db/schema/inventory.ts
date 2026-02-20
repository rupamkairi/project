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

export const locationTypeEnum = pgEnum("inv_location_type", [
  "warehouse",
  "store",
  "shelf",
  "virtual",
]);

export const invLocations = pgTable(
  "inv_locations",
  {
    ...baseColumns,
    name: text("name").notNull(),
    type: locationTypeEnum("type").notNull().default("warehouse"),
    address: jsonb("address"),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    index("inv_locations_org_default_idx").on(
      table.organizationId,
      table.isDefault,
    ),
    index("inv_locations_org_type_idx").on(table.organizationId, table.type),
  ],
);

export const invStockUnits = pgTable(
  "inv_stock_units",
  {
    ...baseColumns,
    variantId: text("variant_id").notNull(),
    locationId: text("location_id").notNull(),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
  },
  (table) => [
    uniqueIndex("inv_stock_units_org_variant_location_idx").on(
      table.organizationId,
      table.variantId,
      table.locationId,
    ),
    index("inv_stock_units_org_location_idx").on(
      table.organizationId,
      table.locationId,
    ),
    index("inv_stock_units_org_variant_idx").on(
      table.organizationId,
      table.variantId,
    ),
  ],
);

export const invMovements = pgTable(
  "inv_movements",
  {
    ...baseColumns,
    variantId: text("variant_id").notNull(),
    fromLocationId: text("from_location_id"),
    toLocationId: text("to_location_id"),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    referenceId: text("reference_id"),
    referenceType: text("reference_type"),
    actorId: text("actor_id"),
  },
  (table) => [
    index("inv_movements_org_variant_idx").on(
      table.organizationId,
      table.variantId,
    ),
    index("inv_movements_org_reference_idx").on(
      table.organizationId,
      table.referenceId,
      table.referenceType,
    ),
    index("inv_movements_org_reason_idx").on(
      table.organizationId,
      table.reason,
    ),
    index("inv_movements_created_at_idx").on(table.createdAt),
  ],
);

export type InvLocation = typeof invLocations.$inferSelect;
export type InvStockUnit = typeof invStockUnits.$inferSelect;
export type InvMovement = typeof invMovements.$inferSelect;
