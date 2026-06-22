import type { QueryHandler } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import type { Transaction, TransactionLine } from "@db/schema/commerce";
import { eq, and, isNull, desc, count } from "drizzle-orm";

export const getTransactionHandler: QueryHandler<
  { id: string },
  (Transaction & { lines: TransactionLine[] }) | null
> = async (query) => {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, query.params.id), eq(transactions.organizationId, query.orgId), isNull(transactions.deletedAt)))
    .limit(1);
  if (!row) return null;

  const lines = await db
    .select()
    .from(transactionLines)
    .where(and(eq(transactionLines.transactionId, row.id), isNull(transactionLines.deletedAt)));

  return { ...row, lines };
};

interface ListParams {
  type?: string;
  stageId?: string;
  limit?: number;
  offset?: number;
}

export const listTransactionsHandler: QueryHandler<ListParams, { items: Transaction[]; total: number }> = async (query) => {
  const { type, stageId, limit = 50, offset = 0 } = query.params;
  const conditions = [eq(transactions.organizationId, query.orgId), isNull(transactions.deletedAt)];
  if (type) conditions.push(eq(transactions.type, type as Transaction["type"]));
  if (stageId) conditions.push(eq(transactions.stageId, stageId));

  const [items, [c]] = await Promise.all([
    db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(transactions).where(and(...conditions)),
  ]);
  return { items, total: c?.value ?? 0 };
};

export const countTransactionsHandler: QueryHandler<{ type?: string }, number> = async (query) => {
  const conditions = [eq(transactions.organizationId, query.orgId), isNull(transactions.deletedAt)];
  if (query.params.type) conditions.push(eq(transactions.type, query.params.type as Transaction["type"]));
  const [c] = await db.select({ value: count() }).from(transactions).where(and(...conditions));
  return c?.value ?? 0;
};
