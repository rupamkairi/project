import { baseColumns, pgTable, text, integer, timestamp } from "@db/schema/helpers";

export const ecoFulfillments = pgTable("eco_fulfillments", {
  ...baseColumns,
  transactionId: text("transaction_id").notNull(),
  locationId: text("location_id"),
  stageId: text("stage_id"),
  providerId: text("provider_id"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDelivery: timestamp("estimated_delivery"),
});

export const ecoFulfillmentItems = pgTable("eco_fulfillment_items", {
  fulfillmentId: text("fulfillment_id").notNull(),
  transactionLineId: text("transaction_line_id").notNull(),
  quantity: integer("quantity").notNull(),
});

export type EcoFulfillment = typeof ecoFulfillments.$inferSelect;
export type EcoFulfillmentItem = typeof ecoFulfillmentItems.$inferSelect;
