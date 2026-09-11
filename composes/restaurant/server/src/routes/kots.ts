import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError, ConflictError } from '@core'
import { db } from '@db/client'
import { rstKot, rstKotItems } from '../db/schema/restaurant.js'
import { eq, and } from 'drizzle-orm'

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['bumped'],
  cancelled: [],
  bumped: [],
}

export function createKotsRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/kds' })
    .get('/kots', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const station = url.searchParams.get('station')
      const status = url.searchParams.get('status')
      const where: any[] = [eq(rstKot.organizationId, session.orgId)]
      if (station) where.push(eq(rstKot.station, station))
      if (status) where.push(eq(rstKot.status, status))
      const kots = await db.query.rstKot.findMany({
        where: and(...where),
        with: { items: true },
        orderBy: (t, { asc }) => [asc(t.sentAt)],
      })
      return { data: kots }
    })

    .get('/kots/:id', async ({ params, request }) => {
      const kot = await db.query.rstKot.findFirst({
        where: eq(rstKot.id, params.id),
        with: { items: true },
      })
      if (!kot) throw new NotFoundError('KOT not found')
      return { data: kot }
    })

    .post('/kots/:id/accept', async ({ params, request }) => {
      const session = (request as any).session
      const kot = await db.query.rstKot.findFirst({ where: eq(rstKot.id, params.id) })
      if (!kot) throw new NotFoundError('KOT not found')
      if (!VALID_TRANSITIONS[kot.status]?.includes('accepted')) {
        throw new ConflictError(`KOT cannot transition from ${kot.status} to accepted`)
      }
      await db
        .update(rstKot)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(rstKot.id, params.id))
      await bus.publish(
        createDomainEvent(
          'rst.kds.kot-update',
          params.id,
          'rst.kot',
          { kotId: params.id, status: 'accepted', orgId: session.orgId, station: kot.station },
          session.orgId,
        ),
      )
      return { data: { kotId: params.id, status: 'accepted' } }
    })

    .post('/kots/:id/preparing', async ({ params, request }) => {
      const session = (request as any).session
      const kot = await db.query.rstKot.findFirst({ where: eq(rstKot.id, params.id) })
      if (!kot) throw new NotFoundError('KOT not found')
      if (!VALID_TRANSITIONS[kot.status]?.includes('preparing')) {
        throw new ConflictError(`KOT cannot transition from ${kot.status} to preparing`)
      }
      await db
        .update(rstKot)
        .set({ status: 'preparing', prepStartAt: new Date() })
        .where(eq(rstKot.id, params.id))
      return { data: { kotId: params.id, status: 'preparing' } }
    })

    .post('/kots/:id/ready', async ({ params, request }) => {
      const session = (request as any).session
      const kot = await db.query.rstKot.findFirst({ where: eq(rstKot.id, params.id) })
      if (!kot) throw new NotFoundError('KOT not found')
      const validFrom = ['new', 'accepted', 'preparing']
      if (!validFrom.includes(kot.status)) {
        throw new ConflictError(`KOT cannot transition from ${kot.status} to ready`)
      }
      await db
        .update(rstKot)
        .set({ status: 'ready', readyAt: new Date() })
        .where(eq(rstKot.id, params.id))
      await bus.publish(
        createDomainEvent(
          'rst.kot.ready',
          params.id,
          'rst.kot',
          { kotId: params.id, orderId: kot.transactionId, orgId: session.orgId },
          session.orgId,
        ),
      )
      return { data: { kotId: params.id, status: 'ready' } }
    })

    .post('/kots/:id/bump', async ({ params, request }) => {
      await db
        .update(rstKot)
        .set({ status: 'bumped', bumpedAt: new Date() })
        .where(eq(rstKot.id, params.id))
      return { data: { kotId: params.id, status: 'bumped' } }
    })

    .post('/kots/:id/cancel', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const kot = await db.query.rstKot.findFirst({ where: eq(rstKot.id, params.id) })
      if (!kot) throw new NotFoundError('KOT not found')
      if (!VALID_TRANSITIONS[kot.status]?.includes('cancelled')) {
        throw new ConflictError(`KOT cannot transition from ${kot.status} to cancelled`)
      }
      await db
        .update(rstKot)
        .set({
          status: 'cancelled',
          notes: kot.notes ? `${kot.notes}; ${input.reason ?? ''}` : (input.reason ?? null),
        })
        .where(eq(rstKot.id, params.id))
      return { data: { kotId: params.id, status: 'cancelled' } }
    })

    .post('/kots/:id/item/:itemId/status', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      await db
        .update(rstKotItems)
        .set({ status: input.status })
        .where(and(eq(rstKotItems.id, params.itemId), eq(rstKotItems.kotId, params.id)))
      return { data: { itemId: params.itemId, status: input.status } }
    })

    .ws('/ws/kds/:outletId/:station', {
      open(ws) {
        const { outletId, station } = ws.data.params as any
        ws.subscribe(`kds:${outletId}:${station}`)
        ws.subscribe(`kds:${outletId}:all`)
      },
      close(ws) {
        const { outletId, station } = ws.data.params as any
        ws.unsubscribe(`kds:${outletId}:${station}`)
        ws.unsubscribe(`kds:${outletId}:all`)
      },
      message(ws, message) {},
    })
}
