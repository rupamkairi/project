import { baseColumns, pgTable, text, timestamp } from "@db/schema/helpers";

export const ecoCart = pgTable("eco_cart", {
  ...baseColumns,
  transactionId: text("transaction_id").notNull(),
  regionId: text("region_id"),
  couponId: text("coupon_id"),
  abandonedAt: timestamp("abandoned_at"),
});

export type EcoCart = typeof ecoCart.$inferSelect;
