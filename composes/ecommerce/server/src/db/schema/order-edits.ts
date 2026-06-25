import { baseColumns, pgTable, text, integer, timestamp, jsonb } from "@db/schema/helpers";

export const ecoOrderEdits = pgTable("eco_order_edits", {
  ...baseColumns,
  transactionId: text("transaction_id").notNull(),
  status: text("status").notNull().default("requested"),
  requestedById: text("requested_by_id"),
  confirmedById: text("confirmed_by_id"),
  note: text("note"),
  totalDifference: jsonb("total_difference").$type<{ amount: number; currency: string }>(),
  paymentSessionId: text("payment_session_id"),
  refundAmount: jsonb("refund_amount").$type<{ amount: number; currency: string }>(),
  confirmedAt: timestamp("confirmed_at"),
});

export const ecoOrderEditItems = pgTable("eco_order_edit_items", {
  orderEditId: text("order_edit_id").notNull(),
  type: text("type").notNull(),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: jsonb("unit_price").$type<{ amount: number; currency: string }>(),
});

export type EcoOrderEdit = typeof ecoOrderEdits.$inferSelect;
export type EcoOrderEditItem = typeof ecoOrderEditItems.$inferSelect;
