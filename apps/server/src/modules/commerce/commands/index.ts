import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { transactions, transactionLines } from '@db/schema/commerce'
import type { Transaction, TransactionLine } from '@db/schema/commerce'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { CommerceEvents } from '../events'

type TransactionType = Transaction['type']

export interface LineInput {
  itemId?: string
  description?: string
  qty?: number
  unitPriceAmount?: number
  currency?: string
  taxRate?: number
}

export interface CreateTransactionPayload {
  type: TransactionType
  referenceNo?: string
  personId?: string
  partyId?: string
  stageId?: string
  currency?: string
  taxAmount?: number
  lines?: LineInput[]
}

function buildLine(orgId: string, transactionId: string, line: LineInput, now: Date) {
  const qty = line.qty ?? 1
  const unitPriceAmount = line.unitPriceAmount ?? 0
  const currency = line.currency ?? 'USD'
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
  }
}

export const createTransactionHandler: CommandHandler<
  CreateTransactionPayload,
  Transaction
> = async (command, context) => {
  const p = command.payload
  const now = new Date()
  const transactionId = generateId()
  const currency = p.currency ?? 'USD'
  const lineRows = (p.lines ?? []).map((l) => buildLine(command.orgId, transactionId, l, now))
  const totalAmount = lineRows.reduce((sum, l) => sum + l.lineTotalAmount, 0)

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
    .returning()

  if (lineRows.length) await db.insert(transactionLines).values(lineRows)

  await context.publish(CommerceEvents.created(row!.id, row!.type))
  return row!
}

export interface UpdateTransactionPayload {
  id: string
  referenceNo?: string
  personId?: string
  partyId?: string
  stageId?: string
  taxAmount?: number
  meta?: Record<string, unknown>
}

export const updateTransactionHandler: CommandHandler<
  UpdateTransactionPayload,
  Transaction
> = async (command, context) => {
  const { id, ...patch } = command.payload
  const [row] = await db
    .update(transactions)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, command.orgId),
        isNull(transactions.deletedAt),
      ),
    )
    .returning()

  if (!row) throw new Error('Transaction not found')
  await context.publish(CommerceEvents.updated(id))
  return row
}

export const deleteTransactionHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload
  const now = new Date()
  await db
    .update(transactions)
    .set({ deletedAt: now })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, command.orgId)))
  await db
    .update(transactionLines)
    .set({ deletedAt: now })
    .where(
      and(
        eq(transactionLines.transactionId, id),
        eq(transactionLines.organizationId, command.orgId),
      ),
    )
  await context.publish(CommerceEvents.deleted(id))
}

export interface MoveStagePayload {
  id: string
  stageId: string
}

export const moveStageHandler: CommandHandler<MoveStagePayload, Transaction> = async (
  command,
  context,
) => {
  const { id, stageId } = command.payload
  const [row] = await db
    .update(transactions)
    .set({ stageId, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, command.orgId),
        isNull(transactions.deletedAt),
      ),
    )
    .returning()

  if (!row) throw new Error('Transaction not found')
  await context.publish(CommerceEvents.stageChanged(id, stageId))
  return row
}

export interface AddLinePayload extends LineInput {
  transactionId: string
}

export const addLineHandler: CommandHandler<AddLinePayload, TransactionLine> = async (
  command,
  context,
) => {
  const { transactionId, ...line } = command.payload
  const now = new Date()
  const [row] = await db
    .insert(transactionLines)
    .values(buildLine(command.orgId, transactionId, line, now))
    .returning()
  await context.publish(CommerceEvents.updated(transactionId))
  return row!
}

export const removeLineHandler: CommandHandler<{ id: string }, void> = async (command, context) => {
  const { id } = command.payload
  const [row] = await db
    .update(transactionLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(transactionLines.id, id), eq(transactionLines.organizationId, command.orgId)))
    .returning()
  if (row) await context.publish(CommerceEvents.updated(row.transactionId))
}

export type ReconcileEventState = 'new' | 'in-progress' | 'done'

function reconcileEventsOf(meta: unknown): Record<string, string> {
  const root = (meta ?? {}) as Record<string, unknown>
  const events = root.reconcileEvents
  if (events && typeof events === 'object' && !Array.isArray(events)) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(events as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  }
  return {}
}

export const claimReconcileEventHandler: CommandHandler<
  { id: string; eventId: string },
  { state: ReconcileEventState; first: boolean }
> = async (command, context) => {
  const { id, eventId } = command.payload
  const [existing] = await db
    .select({ id: transactions.id, meta: transactions.meta })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, command.orgId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1)
  if (!existing) throw new Error('Transaction not found')
  const prior = reconcileEventsOf(existing.meta)[eventId]
  if (prior === 'done') return { state: 'done', first: false }

  const [row] = await db
    .update(transactions)
    .set({
      meta: {
        ...((existing.meta ?? {}) as Record<string, unknown>),
        reconcileEvents: { ...reconcileEventsOf(existing.meta), [eventId]: 'in-progress' },
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, command.orgId),
        isNull(transactions.deletedAt),
        sql`COALESCE(${transactions.meta}->'reconcileEvents'->>${eventId}, '') <> 'done'`,
      ),
    )
    .returning({ id: transactions.id })
  if (!row) return { state: 'done', first: false }
  await context.publish(CommerceEvents.updated(id))
  return { state: prior === 'in-progress' ? 'in-progress' : 'new', first: prior === undefined }
}

export const finishReconcileEventHandler: CommandHandler<
  { id: string; eventId: string },
  void
> = async (command, context) => {
  const { id, eventId } = command.payload
  const [existing] = await db
    .select({ meta: transactions.meta })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, command.orgId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1)
  if (!existing) throw new Error('Transaction not found')
  await db
    .update(transactions)
    .set({
      meta: {
        ...((existing.meta ?? {}) as Record<string, unknown>),
        reconcileEvents: { ...reconcileEventsOf(existing.meta), [eventId]: 'done' },
      },
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, command.orgId)))
  await context.publish(CommerceEvents.updated(id))
}
