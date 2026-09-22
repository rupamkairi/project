import { Elysia } from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq } from 'drizzle-orm'
import { erpFiscalYear } from '../../db/schema/erp'
import { hasPermission } from '../../permissions/matrix'

async function getFiscalYearForDate(date: Date, orgId: string) {
  const rows = await db.select().from(erpFiscalYear).where(eq(erpFiscalYear.organizationId, orgId))
  return rows.find((fy) => new Date(fy.startDate) <= date && new Date(fy.endDate) >= date)
}

function presentAccount(row: any, balance = 0) {
  const meta = (row.meta ?? {}) as Record<string, unknown>
  return {
    ...row,
    subType: meta.subType ?? null,
    isGroup: Boolean(meta.isGroup),
    isFrozen: Boolean(meta.isFrozen),
    balance: String(balance),
  }
}

export function createAccountRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/accounts' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = (await mediator.query({
        type: 'ledger.listAccounts',
        params: {},
        actorId: actor.actorId,
        orgId: actor.orgId,
      })) as any[]
      return { accounts: rows.map((r) => presentAccount(r)) }
    })

    .get('/tree', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const accounts = ((await mediator.query({
        type: 'ledger.listAccounts',
        params: {},
        actorId: actor.actorId,
        orgId: actor.orgId,
      })) as any[]).map((r) => presentAccount(r))

      function buildTree(parentId: string | null | undefined): any[] {
        return accounts
          .filter((a) => a.parentId === parentId)
          .map((a) => ({ ...a, children: buildTree(a.id) }))
      }

      return { tree: buildTree(null) }
    })

    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:post')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const account = await mediator.dispatch({
        type: 'ledger.createAccount',
        payload: {
          code: body.code,
          name: body.name,
          type: body.type,
          currency: body.currency ?? 'INR',
          parentId: body.parentId,
          meta: { subType: body.subType, isGroup: body.isGroup ?? false },
        },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      })
      ;(ctx as any).set.status = 201
      return { account: presentAccount(account) }
    })

    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const account = await mediator.query({
        type: 'ledger.getAccount',
        params: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })
      if (!account) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const balance = (await mediator.query({
        type: 'ledger.getAccountBalance',
        params: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })) as number
      return { account: presentAccount(account, balance) }
    })

    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:post')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await mediator.dispatch({
        type: 'ledger.updateAccount',
        payload: {
          id,
          name: body.name,
          meta: { isFrozen: body.isFrozen },
        },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      })
      return { success: true }
    })
}

export function createJournalRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/journal-entries' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const result = (await mediator.query({
        type: 'ledger.listJournals',
        params: {},
        actorId: actor.actorId,
        orgId: actor.orgId,
      })) as { items: any[] }
      return { journalEntries: result.items }
    })

    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:post')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const date = new Date(body.date ?? Date.now())
      const fy = await getFiscalYearForDate(date, actor.orgId)
      if (fy?.isClosed) {
        ;(ctx as any).set.status = 403
        return { error: 'Period Closed' }
      }
      try {
        const je = await mediator.dispatch({
          type: 'ledger.createJournal',
          payload: {
            reference: body.reference,
            referenceType: body.referenceType,
            description: body.narration ?? body.description,
            currency: body.currency ?? 'INR',
            lines: body.lines,
          },
          actorId: actor.actorId,
          orgId: actor.orgId,
          correlationId: generateId(),
        })
        ;(ctx as any).set.status = 201
        return { journalEntry: je }
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Invalid journal' }
      }
    })

    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const je = await mediator.query({
        type: 'ledger.getJournal',
        params: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })
      if (!je) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      return { journalEntry: je, lines: (je as any).lines }
    })

    .post('/:id/post', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:post')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const je = (await mediator.query({
        type: 'ledger.getJournal',
        params: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })) as { createdAt?: Date } | null
      if (!je) {
        ;(ctx as any).set.status = 400
        return { error: 'Journal must be in draft status' }
      }
      const fy = await getFiscalYearForDate(new Date(je.createdAt ?? Date.now()), actor.orgId)
      if (fy?.isClosed) {
        ;(ctx as any).set.status = 403
        return { error: 'Period Closed' }
      }
      try {
        await mediator.dispatch({
          type: 'ledger.postJournal',
          payload: { id },
          actorId: actor.actorId,
          orgId: actor.orgId,
          correlationId: generateId(),
        })
      } catch (err) {
        ;(ctx as any).set.status = 400
        return { error: err instanceof Error ? err.message : 'Cannot post' }
      }
      return { success: true, status: 'posted' }
    })

    .post('/:id/cancel', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:ledger:post')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await mediator.dispatch({
        type: 'ledger.voidJournal',
        payload: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      })
      return { success: true, status: 'cancelled' }
    })
}