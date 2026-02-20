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

export const geoEntities = pgTable(
  "geo_entities",
  {
    ...baseColumns,
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    geometryType: text("geometry_type").notNull(),
    coordinates: jsonb("coordinates").notNull(),
    properties: jsonb("properties").notNull().default("{}"),
  },
  (table) => [
    uniqueIndex("geo_entities_org_entity_idx").on(
      table.organizationId,
      table.entityId,
      table.entityType,
    ),
    index("geo_entities_org_geometry_type_idx").on(
      table.organizationId,
      table.geometryType,
    ),
  ],
);

export const geoTerritories = pgTable(
  "geo_territories",
  {
    ...baseColumns,
    name: text("name").notNull(),
    type: text("type").notNull(),
    polygon: jsonb("polygon").notNull(),
    properties: jsonb("properties").notNull().default("{}"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("geo_territories_org_type_idx").on(table.organizationId, table.type),
    index("geo_territories_org_active_idx").on(
      table.organizationId,
      table.isActive,
    ),
  ],
);

export const geoAddresses = pgTable(
  "geo_addresses",
  {
    ...baseColumns,
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    label: text("label"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state"),
    country: text("country").notNull(),
    postcode: text("postcode"),
    coordinates: jsonb("coordinates"),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    index("geo_addresses_org_entity_idx").on(
      table.organizationId,
      table.entityId,
      table.entityType,
    ),
    index("geo_addresses_org_entity_default_idx").on(
      table.organizationId,
      table.entityId,
      table.entityType,
      table.isDefault,
    ),
  ],
);

export type GeoEntity = typeof geoEntities.$inferSelect;
export type GeoTerritory = typeof geoTerritories.$inferSelect;
export type GeoAddress = typeof geoAddresses.$inferSelect;
