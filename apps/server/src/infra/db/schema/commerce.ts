import { pgTable, text, integer, index, pgEnum } from "drizzle-orm/pg-core";
import { baseColumns, moneyColumns } from "./helpers";

// Master tables: financial documents shared across composes.
// Orders, invoices, purchase/sales orders, bills, folios, quotes, receipts.
export const transactionTypeEnum = pgEnum("transaction_type", [
  "order",
  "invoice",
  "purchase_order",
  "sales_order",
  "bill",
  "folio",
  "quote",
  "receipt",
]);

export const transactions = pgTable(
  "transactions",
  {
    ...baseColumns,
    type: transactionTypeEnum("type").notNull(),
    referenceNo: text("reference_no"),
    personId: text("person_id"), // → persons (nullable)
    partyId: text("party_id"), // → parties (nullable)
    stageId: text("stage_id"), // → pipeline_stages (fulfillment flow)
    ...moneyColumns("total"),
    ...moneyColumns("tax"),
  },
  (table) => [
    index("transactions_org_type_idx").on(table.organizationId, table.type),
    index("transactions_org_stage_idx").on(table.organizationId, table.stageId),
    index("transactions_org_person_idx").on(table.organizationId, table.personId),
    index("transactions_org_party_idx").on(table.organizationId, table.partyId),
  ],
);

export const transactionLines = pgTable(
  "transaction_lines",
  {
    ...baseColumns,
    transactionId: text("transaction_id").notNull(), // → transactions
    itemId: text("item_id"), // → cat_items
    description: text("description"),
    qty: integer("qty").notNull().default(1),
    ...moneyColumns("unitPrice"),
    taxRate: integer("tax_rate").notNull().default(0),
    ...moneyColumns("lineTotal"),
  },
  (table) => [
    index("transaction_lines_org_transaction_idx").on(
      table.organizationId,
      table.transactionId,
    ),
    index("transaction_lines_org_item_idx").on(table.organizationId, table.itemId),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type TransactionLine = typeof transactionLines.$inferSelect;
