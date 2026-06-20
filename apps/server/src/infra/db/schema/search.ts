import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

const tsvectorType = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export const searchIndex = pgTable(
  "search_index",
  {
    id: text("id").primaryKey(),
    collection: text("collection").notNull(),
    entityId: text("entity_id").notNull(),
    orgId: text("org_id").notNull(),
    content: tsvectorType("content").notNull(),
    raw: jsonb("raw").notNull().$type<Record<string, unknown>>().default({}),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("search_index_content_gin").using("gin", table.content),
    index("search_index_collection_org_idx").on(table.collection, table.orgId),
  ],
);

export type SearchIndexRecord = typeof searchIndex.$inferSelect;
