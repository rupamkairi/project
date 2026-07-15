import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspReservation } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createFoliosRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/folios' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      // Folios are transactions with type = "folio"
      const result = await mediator.query({
        type: 'commerce.listTransactions',
        params: {
          orgId: actor.orgId,
          type: 'folio',
          status: q.status ?? null,
          limit,
          offset,
        },
        actorId: '',
        orgId: actor.orgId,
      })
      const data = result?.data ?? []
      return listResponse(data, data.length, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:read')
      const { id } = (ctx as any).params
      const result = await mediator.query({
        type: 'commerce.getTransaction',
        params: { transactionId: id, orgId: actor.orgId },
        actorId: '',
        orgId: actor.orgId,
      })
      if (!result?.data) {
        ;(ctx as any).set.status = 404
        return { error: 'Folio not found' }
      }
      return result.data
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:create')
      const body = (ctx as any).body ?? {}

      const result = await mediator.dispatch({
        type: 'commerce.createTransaction',
        payload: {
          type: 'folio',
          referenceNo: body.referenceNo ?? null,
          personId: body.guestId,
          partyId: body.partyId ?? null,
          meta: {
            reservationId: body.reservationId,
            propertyId: body.propertyId,
            status: body.status ?? 'open',
            notes: body.notes,
          },
        },
        actorId: actor.id,
        orgId: actor.orgId,
        correlationId: crypto.randomUUID(),
      })
      return result
    })
    .post('/:id/lines', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:create')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const result = await mediator.dispatch({
        type: 'commerce.addLine',
        payload: {
          transactionId: id,
          itemId: body.itemId ?? null,
          description: body.description ?? 'Charge',
          qty: body.qty ?? 1,
          unitPrice: body.unitPrice,
          taxRate: body.taxRate ?? 0,
          meta: {
            category: body.category,
            chargeDate: body.chargeDate ?? new Date().toISOString(),
            reservationId: body.reservationId,
          },
        },
        actorId: actor.id,
        orgId: actor.orgId,
        correlationId: crypto.randomUUID(),
      })
      return result
    })
    .post('/:id/finalize', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:finalize')
      const { id } = (ctx as any).params
      // Reuse the commerce transaction update to finalize
      const result = await mediator.dispatch({
        type: 'commerce.updateTransaction',
        payload: {
          transactionId: id,
          meta: {
            status: 'finalized',
            finalizedAt: new Date().toISOString(),
            finalizedByActorId: actor.id,
          },
        },
        actorId: actor.id,
        orgId: actor.orgId,
        correlationId: crypto.randomUUID(),
      })
      return result
    })
    .post('/:id/refund', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:refund')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const result = await mediator.dispatch({
        type: 'commerce.updateTransaction',
        payload: {
          transactionId: id,
          meta: {
            refundAmount: body.amount,
            refundReason: body.reason,
            refundedAt: new Date().toISOString(),
            refundedByActorId: actor.id,
          },
        },
        actorId: actor.id,
        orgId: actor.orgId,
        correlationId: crypto.randomUUID(),
      })
      return result
    })
    .get('/reservation/:reservationId', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'folio:read')
      const { reservationId } = (ctx as any).params
      const result = await mediator.query({
        type: 'commerce.listTransactions',
        params: {
          orgId: actor.orgId,
          type: 'folio',
          limit: 100,
          offset: 0,
        },
        actorId: '',
        orgId: actor.orgId,
      })
      const data = (result?.data ?? []).filter((t: any) => t?.meta?.reservationId === reservationId)
      return listResponse(data, data.length, 1, 100)
    })
}
