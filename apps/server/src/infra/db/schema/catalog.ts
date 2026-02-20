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
import { baseColumns, moneyColumns } from "./helpers";

export const itemStatusEnum = pgEnum("cat_item_status", [
  "draft",
  "active",
  "archived",
]);

export const catCategories = pgTable(
  "cat_categories",
  {
    ...baseColumns,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: text("parent_id"),
    attributeSet: jsonb("attribute_set").notNull().default("[]"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("cat_categories_org_slug_idx").on(
      table.organizationId,
      table.slug,
    ),
    index("cat_categories_org_parent_idx").on(
      table.organizationId,
      table.parentId,
    ),
    index("cat_categories_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const catItems = pgTable(
  "cat_items",
  {
    ...baseColumns,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    categoryId: text("category_id"),
    description: text("description"),
    attributes: jsonb("attributes").notNull().default("{}"),
    status: itemStatusEnum("status").notNull().default("draft"),
    tags: jsonb("tags").notNull().default("[]"),
    media: jsonb("media").notNull().default("[]"),
  },
  (table) => [
    uniqueIndex("cat_items_org_slug_idx").on(table.organizationId, table.slug),
    index("cat_items_org_status_idx").on(table.organizationId, table.status),
    index("cat_items_org_category_idx").on(
      table.organizationId,
      table.categoryId,
    ),
  ],
);

export const catVariants = pgTable(
  "cat_variants",
  {
    ...baseColumns,
    itemId: text("item_id").notNull(),
    sku: text("sku").notNull(),
    attributes: jsonb("attributes").notNull().default("{}"),
    stockTracked: boolean("stock_tracked").notNull().default(true),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("cat_variants_org_sku_idx").on(table.organizationId, table.sku),
    index("cat_variants_org_item_idx").on(table.organizationId, table.itemId),
  ],
);

export const priceListStatusEnum = pgEnum("cat_price_list_status", [
  "draft",
  "active",
  "archived",
]);

export const catPriceLists = pgTable(
  "cat_price_lists",
  {
    ...baseColumns,
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    audience: jsonb("audience").notNull().default("{}"),
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),
    status: priceListStatusEnum("status").notNull().default("draft"),
  },
  (table) => [
    index("cat_price_lists_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("cat_price_lists_org_valid_dates_idx").on(
      table.organizationId,
      table.validFrom,
      table.validTo,
    ),
  ],
);

export const catPriceRules = pgTable(
  "cat_price_rules",
  {
    ...baseColumns,
    priceListId: text("price_list_id").notNull(),
    variantId: text("variant_id").notNull(),
    ...moneyColumns("price"),
    minQty: integer("min_qty").notNull().default(1),
    conditions: jsonb("conditions").notNull().default("{}"),
  },
  (table) => [
    index("cat_price_rules_org_list_variant_idx").on(
      table.organizationId,
      table.priceListId,
      table.variantId,
    ),
    index("cat_price_rules_org_variant_idx").on(
      table.organizationId,
      table.variantId,
    ),
  ],
);

export type CatCategory = typeof catCategories.$inferSelect;
export type CatItem = typeof catItems.$inferSelect;
export type CatVariant = typeof catVariants.$inferSelect;
export type CatPriceList = typeof catPriceLists.$inferSelect;
export type CatPriceRule = typeof catPriceRules.$inferSelect;
