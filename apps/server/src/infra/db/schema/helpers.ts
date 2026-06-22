import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

export const baseColumns = {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at").$type<Date | undefined>(),
  version: integer("version").notNull().default(1),
  meta: jsonb("meta").notNull().$type<Record<string, unknown>>().default({}),
};

export type BaseColumns = typeof baseColumns;

export function moneyColumns<T extends string>(prefix: T): MoneyColumns<T> {
  return {
    [`${prefix}Amount`]: integer(`${prefix}_amount`).notNull(),
    [`${prefix}Currency`]: text(`${prefix}_currency`).notNull(),
  } as MoneyColumns<T>;
}

export type MoneyColumns<T extends string> = {
  [K in T as `${K}Amount`]: ReturnType<typeof integer>;
} & {
  [K in T as `${K}Currency`]: ReturnType<typeof text>;
};

export function softDeleteFilter() {
  return { deletedAt: { is: null } };
}

export {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
};
