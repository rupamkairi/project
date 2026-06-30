import { baseColumns, pgTable, text, jsonb } from "@db/schema/helpers";

export const ecoClaims = pgTable("eco_claims", {
  ...baseColumns,
  transactionId: text("transaction_id").notNull(),
  type: text("type").notNull(),
  resolution: text("resolution"),
  status: text("status").notNull().default("open"),
  description: text("description"),
  refundAmount: jsonb("refund_amount").$type<{ amount: number; currency: string }>(),
  replacementTransactionId: text("replacement_transaction_id"),
});

export type EcoClaim = typeof ecoClaims.$inferSelect;
