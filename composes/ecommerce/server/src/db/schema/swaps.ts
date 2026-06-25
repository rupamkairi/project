import { baseColumns, pgTable, text, integer, jsonb } from "@db/schema/helpers";

export const ecoSwaps = pgTable("eco_swaps", {
  ...baseColumns,
  transactionId: text("transaction_id").notNull(),
  stageId: text("stage_id"),
  difference: jsonb("difference").$type<{ amount: number; currency: string }>(),
  paymentSessionId: text("payment_session_id"),
  returnId: text("return_id"),
});

export const ecoSwapItems = pgTable("eco_swap_items", {
  swapId: text("swap_id").notNull(),
  transactionLineId: text("transaction_line_id").notNull(),
  quantity: integer("quantity").notNull(),
});

export const ecoSwapNewItems = pgTable("eco_swap_new_items", {
  swapId: text("swap_id").notNull(),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: jsonb("unit_price").$type<{ amount: number; currency: string }>(),
});

export type EcoSwap = typeof ecoSwaps.$inferSelect;
export type EcoSwapItem = typeof ecoSwapItems.$inferSelect;
export type EcoSwapNewItem = typeof ecoSwapNewItems.$inferSelect;
