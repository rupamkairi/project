import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { baseColumns, moneyColumns } from "./helpers";

export const accountTypeEnum = pgEnum("ldg_account_type", [
  "asset",
  "liability",
  "revenue",
  "expense",
  "equity",
]);
export const txStatusEnum = pgEnum("ldg_tx_status", [
  "pending",
  "posted",
  "voided",
]);

export const ldgAccounts = pgTable(
  "ldg_accounts",
  {
    ...baseColumns,
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    currency: text("currency").notNull().default("USD"),
    parentId: text("parent_id"),
    isSystem: boolean("is_system").notNull().default(false),
    description: text("description"),
  },
  (table) => [
    uniqueIndex("ldg_accounts_org_code_idx").on(
      table.organizationId,
      table.code,
    ),
    index("ldg_accounts_org_type_idx").on(table.organizationId, table.type),
    index("ldg_accounts_org_parent_idx").on(
      table.organizationId,
      table.parentId,
    ),
  ],
);

export const ldgTransactions = pgTable(
  "ldg_transactions",
  {
    ...baseColumns,
    reference: text("reference").notNull(),
    referenceType: text("reference_type").notNull(),
    description: text("description").notNull(),
    currency: text("currency").notNull(),
    ...moneyColumns("amount"),
    status: txStatusEnum("status").notNull().default("pending"),
    postedAt: timestamp("posted_at"),
    voidedAt: timestamp("voided_at"),
    voidReason: text("void_reason"),
    actorId: text("actor_id"),
  },
  (table) => [
    index("ldg_transactions_org_ref_type_idx").on(
      table.organizationId,
      table.reference,
      table.referenceType,
    ),
    index("ldg_transactions_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("ldg_transactions_org_posted_idx").on(
      table.organizationId,
      table.postedAt,
    ),
  ],
);

export const ldgJournalEntries = pgTable(
  "ldg_journal_entries",
  {
    ...baseColumns,
    transactionId: text("transaction_id").notNull(),
    accountId: text("account_id").notNull(),
    debit: integer("debit").notNull().default(0),
    credit: integer("credit").notNull().default(0),
    currency: text("currency").notNull(),
  },
  (table) => [
    index("ldg_journal_entries_transaction_idx").on(table.transactionId),
    index("ldg_journal_entries_account_idx").on(table.accountId),
    index("ldg_journal_entries_org_account_idx").on(
      table.organizationId,
      table.accountId,
    ),
  ],
);

export type LdgAccount = typeof ldgAccounts.$inferSelect;
export type LdgTransaction = typeof ldgTransactions.$inferSelect;
export type LdgJournalEntry = typeof ldgJournalEntries.$inferSelect;
