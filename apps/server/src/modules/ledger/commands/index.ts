import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { ldgAccounts, ldgTransactions, ldgJournalEntries } from '@db/schema/ledger'
import type { LdgAccount, LdgTransaction, LdgJournalEntry } from '@db/schema/ledger'
import { eq, and, isNull } from 'drizzle-orm'
import { LedgerEvents } from '../events'

export function toMinorUnits(value: number | string | undefined): number {
  return Math.round(Number(value ?? 0) * 100)
}

export function fromMinorUnits(value: number): number {
  return value / 100
}

type AccountType = LdgAccount['type']

function mapAccountType(raw: string | undefined): AccountType {
  if (raw === 'income') return 'revenue'
  if (raw === 'asset' || raw === 'liability' || raw === 'revenue' || raw === 'expense' || raw === 'equity') {
    return raw
  }
  return 'asset'
}

export interface CreateAccountPayload {
  code: string
  name: string
  type: string
  currency?: string
  parentId?: string
  description?: string
  meta?: Record<string, unknown>
}

export const createAccountHandler: CommandHandler<CreateAccountPayload, LdgAccount> = async (
  command,
  context,
) => {
  const p = command.payload
  const now = new Date()
  const [row] = await db
    .insert(ldgAccounts)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      code: p.code,
      name: p.name,
      type: mapAccountType(p.type),
      currency: p.currency ?? 'INR',
      parentId: p.parentId ?? null,
      description: p.description ?? null,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: p.meta ?? {},
    })
    .returning()
  await context.publish(LedgerEvents.accountCreated(row!.id, row!.code))
  return row!
}

export interface UpdateAccountPayload {
  id: string
  name?: string
  meta?: Record<string, unknown>
}

export const updateAccountHandler: CommandHandler<UpdateAccountPayload, LdgAccount> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload
  const [row] = await db
    .update(ldgAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(ldgAccounts.id, id), eq(ldgAccounts.organizationId, command.orgId), isNull(ldgAccounts.deletedAt)),
    )
    .returning()
  if (!row) throw new Error('Account not found')
  await context.publish(LedgerEvents.accountUpdated(id))
  return row
}

export interface JournalLineInput {
  accountId?: string
  accountCode?: string
  debit?: number | string
  credit?: number | string
  currency?: string
  partyId?: string
  personId?: string
  costCenter?: string
  description?: string
}

export interface CreateJournalPayload {
  reference?: string
  referenceType?: string
  description?: string
  currency?: string
  lines: JournalLineInput[]
}

async function resolveAccountId(orgId: string, line: JournalLineInput): Promise<string> {
  if (line.accountId) return line.accountId
  if (!line.accountCode) throw new Error('All lines must have accountId')
  const [acc] = await db
    .select()
    .from(ldgAccounts)
    .where(and(eq(ldgAccounts.organizationId, orgId), eq(ldgAccounts.code, line.accountCode), isNull(ldgAccounts.deletedAt)))
    .limit(1)
  if (!acc) throw new Error(`Account not found: ${line.accountCode}`)
  return acc.id
}

export const createJournalHandler: CommandHandler<CreateJournalPayload, LdgTransaction> = async (
  command,
  context,
) => {
  const p = command.payload
  const lines = p.lines ?? []
  const debit = lines.reduce((s, l) => s + toMinorUnits(l.debit), 0)
  const credit = lines.reduce((s, l) => s + toMinorUnits(l.credit), 0)
  if (Math.abs(debit - credit) > 1) throw new Error(`Journal out of balance: Dr ${debit} ≠ Cr ${credit}`)
  if (lines.some((l) => !l.accountId && !l.accountCode)) throw new Error('All lines must have accountId')
  if (lines.some((l) => toMinorUnits(l.debit) < 0 || toMinorUnits(l.credit) < 0)) {
    throw new Error('Amounts must be non-negative')
  }

  const now = new Date()
  const txId = generateId()
  const currency = p.currency ?? 'INR'
  const [row] = await db
    .insert(ldgTransactions)
    .values({
      id: txId,
      organizationId: command.orgId,
      reference: p.reference ?? txId,
      referenceType: p.referenceType ?? 'journal',
      description: p.description ?? '',
      currency,
      amountAmount: debit,
      amountCurrency: currency,
      status: 'pending',
      actorId: command.actorId ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()

  const lineRows = await Promise.all(
    lines.map(async (line) => ({
      id: generateId(),
      organizationId: command.orgId,
      transactionId: txId,
      accountId: await resolveAccountId(command.orgId, line),
      debit: toMinorUnits(line.debit),
      credit: toMinorUnits(line.credit),
      currency: line.currency ?? currency,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {
        partyId: line.partyId,
        personId: line.personId,
        costCenter: line.costCenter,
        description: line.description,
      },
    })),
  )
  if (lineRows.length) await db.insert(ldgJournalEntries).values(lineRows)
  await context.publish(LedgerEvents.journalCreated(txId))
  return row!
}

export const postJournalHandler: CommandHandler<{ id: string }, LdgTransaction> = async (
  command,
  context,
) => {
  const { id } = command.payload
  const [row] = await db
    .update(ldgTransactions)
    .set({ status: 'posted', postedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(ldgTransactions.id, id),
        eq(ldgTransactions.organizationId, command.orgId),
        eq(ldgTransactions.status, 'pending'),
        isNull(ldgTransactions.deletedAt),
      ),
    )
    .returning()
  if (!row) throw new Error('Journal must be in pending status')
  await context.publish(LedgerEvents.journalPosted(id))
  return row
}

export const voidJournalHandler: CommandHandler<{ id: string; reason?: string }, LdgTransaction> =
  async (command, context) => {
    const { id, reason } = command.payload
    const [row] = await db
      .update(ldgTransactions)
      .set({
        status: 'voided',
        voidedAt: new Date(),
        voidReason: reason ?? 'cancelled',
        updatedAt: new Date(),
      })
      .where(
        and(eq(ldgTransactions.id, id), eq(ldgTransactions.organizationId, command.orgId), isNull(ldgTransactions.deletedAt)),
      )
      .returning()
    if (!row) throw new Error('Journal not found')
    await context.publish(LedgerEvents.journalVoided(id))
    return row
  }
