import { baseColumns, pgTable, text, integer, jsonb } from "@db/schema/helpers";

export const ecoDraftOrders = pgTable("eco_draft_orders", {
  ...baseColumns,
  personId: text("person_id"),
  status: text("status").notNull().default("draft"),
  billingAddressId: text("billing_address_id"),
  shippingAddressId: text("shipping_address_id"),
  shippingOptionId: text("shipping_option_id"),
  regionId: text("region_id"),
  paymentMethod: text("payment_method"),
  discount: jsonb("discount").$type<{ amount: number; currency: string }>(),
  note: text("note"),
  placedTransactionId: text("placed_transaction_id"),
});

export const ecoDraftOrderItems = pgTable("eco_draft_order_items", {
  draftOrderId: text("draft_order_id").notNull(),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: jsonb("unit_price").$type<{ amount: number; currency: string }>(),
});

export type EcoDraftOrder = typeof ecoDraftOrders.$inferSelect;
export type EcoDraftOrderItem = typeof ecoDraftOrderItems.$inferSelect;
