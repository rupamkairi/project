import type { CommandHandler } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import type { Transaction, TransactionLine } from "@db/schema/commerce";
import { eq, and, isNull } from "drizzle-orm";
import { CommerceEvents } from "../events";

type TransactionType = Transaction["type"];

export interface LineInput {
  itemId?: string;
  description?: string;
  qty?: number;
  unitPriceAmount?: number;
  currency?: string;
  taxRate?: number;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  referenceNo?: string;
  personId?: string;
  partyId?: string;
  stageId?: string;
  currency?: string;
  taxAmount?: number;
  lines?: LineInput[];
}

function buildLine(orgId: string, transactionId: string, line: LineInput, now: Date) {
  const qty = line.qty ?? 1;
  const unitPriceAmount = line.unitPriceAmount ?? 0;
  const currency = line.currency ?? "USD";
  return {
    id: generateId(),
    organizationId: orgId,
    transactionId,
    itemId: line.itemId ?? null,
    description: line.description ?? null,
    qty,
    unitPriceAmount,
    unitPriceCurrency: currency,
    taxRate: line.taxRate ?? 0,
    lineTotalAmount: unitPriceAmount * qty,
    lineTotalCurrency: currency,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: {},
  };
}

export const createTransactionHandler: CommandHandler<CreateTransactionPayload, Transaction> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const transactionId = generateId();
  const currency = p.currency ?? "USD";
  const lineRows = (p.lines ?? []).map((l) => buildLine(command.orgId, transactionId, l, now));
  const totalAmount = lineRows.reduce((sum, l) => sum + l.lineTotalAmount, 0);

  const [row] = await db
    .insert(transactions)
    .values({
      id: transactionId,
      organizationId: command.orgId,
      type: p.type,
      referenceNo: p.referenceNo ?? null,
      personId: p.personId ?? null,
      partyId: p.partyId ?? null,
      stageId: p.stageId ?? null,
      totalAmount,
      totalCurrency: currency,
      taxAmount: p.taxAmount ?? 0,
      taxCurrency: currency,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning();

  if (lineRows.length) await db.insert(transactionLines).values(lineRows);

  await context.publish(CommerceEvents.created(row!.id, row!.type));
  return row!;
};

export interface UpdateTransactionPayload {
  id: string;
  referenceNo?: string;
  personId?: string;
  partyId?: string;
  stageId?: string;
  taxAmount?: number;
}

export const updateTransactionHandler: CommandHandler<UpdateTransactionPayload, Transaction> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(transactions)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, command.orgId), isNull(transactions.deletedAt)))
    .returning();

  if (!row) throw new Error("Transaction not found");
  await context.publish(CommerceEvents.updated(id));
  return row;
};

export const deleteTransactionHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  const now = new Date();
  await db
    .update(transactions)
    .set({ deletedAt: now })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, command.orgId)));
  await db
    .update(transactionLines)
    .set({ deletedAt: now })
    .where(and(eq(transactionLines.transactionId, id), eq(transactionLines.organizationId, command.orgId)));
  await context.publish(CommerceEvents.deleted(id));
};

export interface MoveStagePayload {
  id: string;
  stageId: string;
}

export const moveStageHandler: CommandHandler<MoveStagePayload, Transaction> = async (
  command,
  context,
) => {
  const { id, stageId } = command.payload;
  const [row] = await db
    .update(transactions)
    .set({ stageId, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, command.orgId), isNull(transactions.deletedAt)))
    .returning();

  if (!row) throw new Error("Transaction not found");
  await context.publish(CommerceEvents.stageChanged(id, stageId));
  return row;
};

export interface AddLinePayload extends LineInput {
  transactionId: string;
}

export const addLineHandler: CommandHandler<AddLinePayload, TransactionLine> = async (
  command,
  context,
) => {
  const { transactionId, ...line } = command.payload;
  const now = new Date();
  const [row] = await db
    .insert(transactionLines)
    .values(buildLine(command.orgId, transactionId, line, now))
    .returning();
  await context.publish(CommerceEvents.updated(transactionId));
  return row!;
};

export const removeLineHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  const [row] = await db
    .update(transactionLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(transactionLines.id, id), eq(transactionLines.organizationId, command.orgId)))
    .returning();
  if (row) await context.publish(CommerceEvents.updated(row.transactionId));
};
