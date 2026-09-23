import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { ldgAccounts, ldgTransactions, ldgJournalEntries } from '@db/schema/ledger'
import type { LdgAccount, LdgTransaction, LdgJournalEntry } from '@db/schema/ledger'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { fromMinorUnits } from '../commands'

export const listAccountsHandler: QueryHandler<Record<string, never>, LdgAccount[]> = async (query) => {
  return db
    .select()
    .from(ldgAccounts)
    .where(and(eq(ldgAccounts.organizationId, query.orgId), isNull(ldgAccounts.deletedAt)))
}

export const getAccountHandler: QueryHandler<{ id: string }, LdgAccount | null> = async (query) => {
  const [row] = await db
    .select()
    .from(ldgAccounts)
    .where(
      and(
        eq(ldgAccounts.id, query.params.id),
        eq(ldgAccounts.organizationId, query.orgId),
        isNull(ldgAccounts.deletedAt),
      ),
    )
    .limit(1)
  return row ?? null
}

export const getAccountBalanceHandler: QueryHandler<{ id: string }, number> = async (query) => {
  const lines = await db
    .select()
    .from(ldgJournalEntries)
    .where(
      and(
        eq(ldgJournalEntries.accountId, query.params.id),
        eq(ldgJournalEntries.organizationId, query.orgId),
        isNull(ldgJournalEntries.deletedAt),
      ),
    )
  const posted = await db
    .select()
    .from(ldgTransactions)
    .where(
      and(
        eq(ldgTransactions.organizationId, query.orgId),
        eq(ldgTransactions.status, 'posted'),
        isNull(ldgTransactions.deletedAt),
      ),
    )
  const postedIds = new Set(posted.map((t) => t.id))
  const minor = lines
    .filter((l) => postedIds.has(l.transactionId))
    .reduce((s, l) => s + l.debit - l.credit, 0)
  return fromMinorUnits(minor)
}

export const listJournalsHandler: QueryHandler<
  { limit?: number; offset?: number },
  { items: LdgTransaction[]; total: number }
> = async (query) => {
  const { limit = 50, offset = 0 } = query.params
  const conditions = [eq(ldgTransactions.organizationId, query.orgId), isNull(ldgTransactions.deletedAt)]
  const [items, [c]] = await Promise.all([
    db
      .select()
      .from(ldgTransactions)
      .where(and(...conditions))
      .orderBy(desc(ldgTransactions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(ldgTransactions).where(and(...conditions)),
  ])
  return { items, total: c?.value ?? 0 }
}

export const getJournalHandler: QueryHandler<
  { id: string },
  (LdgTransaction & { lines: LdgJournalEntry[] }) | null
> = async (query) => {
  const [row] = await db
    .select()
    .from(ldgTransactions)
    .where(
      and(
        eq(ldgTransactions.id, query.params.id),
        eq(ldgTransactions.organizationId, query.orgId),
        isNull(ldgTransactions.deletedAt),
      ),
    )
    .limit(1)
  if (!row) return null
  const lines = await db
    .select()
    .from(ldgJournalEntries)
    .where(and(eq(ldgJournalEntries.transactionId, row.id), isNull(ldgJournalEntries.deletedAt)))
  return { ...row, lines }
}

export const getJournalByReferenceHandler: QueryHandler<
  { reference: string; referenceType?: string },
  (LdgTransaction & { lines: LdgJournalEntry[] }) | null
> = async (query) => {
  const conditions = [
    eq(ldgTransactions.organizationId, query.orgId),
    eq(ldgTransactions.reference, query.params.reference),
    isNull(ldgTransactions.deletedAt),
  ]
  if (query.params.referenceType)
    conditions.push(eq(ldgTransactions.referenceType, query.params.referenceType))
  const [row] = await db
    .select()
    .from(ldgTransactions)
    .where(and(...conditions))
    .limit(1)
  if (!row) return null
  const lines = await db
    .select()
    .from(ldgJournalEntries)
    .where(and(eq(ldgJournalEntries.transactionId, row.id), isNull(ldgJournalEntries.deletedAt)))
  return { ...row, lines }
}
