import { baseColumns, pgTable, text, timestamp, jsonb } from "@db/schema/helpers";

export const ecoGiftCards = pgTable("eco_gift_cards", {
  ...baseColumns,
  code: text("code").notNull(),
  balance: jsonb("balance").$type<{ amount: number; currency: string }>().notNull(),
  originalAmount: jsonb("original_amount").$type<{ amount: number; currency: string }>().notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  personId: text("person_id"),
  transactionId: text("transaction_id"),
  issuedToEmail: text("issued_to_email"),
});

export type EcoGiftCard = typeof ecoGiftCards.$inferSelect;
