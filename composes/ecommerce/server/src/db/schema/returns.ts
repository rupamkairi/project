import { baseColumns, pgTable, text, integer, timestamp, jsonb } from "@db/schema/helpers";

export const ecoReturns = pgTable("eco_returns", {
  ...baseColumns,
  transactionId: text("transaction_id").notNull(),
  stageId: text("stage_id"),
  reason: text("reason").notNull(),
  reasonNote: text("reason_note"),
  shippingOptionId: text("shipping_option_id"),
  trackingNumber: text("tracking_number"),
  refundAmount: jsonb("refund_amount").$type<{ amount: number; currency: string }>(),
  requestedAt: timestamp("requested_at"),
  approvedAt: timestamp("approved_at"),
  receivedAt: timestamp("received_at"),
  refundedAt: timestamp("refunded_at"),
});

export const ecoReturnItems = pgTable("eco_return_items", {
  returnId: text("return_id").notNull(),
  transactionLineId: text("transaction_line_id").notNull(),
  quantity: integer("quantity").notNull(),
  condition: text("condition").notNull().default("new"),
});

export type EcoReturn = typeof ecoReturns.$inferSelect;
export type EcoReturnItem = typeof ecoReturnItems.$inferSelect;
