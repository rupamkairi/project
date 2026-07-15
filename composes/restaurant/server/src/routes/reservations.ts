import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, NotFoundError, ConflictError } from '@core'
import { db } from '../lib/db.js'
import { rstReservations, rstWaitlist } from '../db/schema/restaurant.js'
import { and, eq, gte, lte } from 'drizzle-orm'

export function createReservationRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/reservations' })
    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const date = url.searchParams.get('date')
      const status = url.searchParams.get('status')
      const where: any[] = [eq(rstReservations.organizationId, session.orgId)]
      if (outletId) where.push(eq(rstReservations.locationId, outletId))
      if (status) where.push(eq(rstReservations.status, status))
      if (date) {
        where.push(gte(rstReservations.reservedAt, new Date(date + 'T00:00:00Z')))
        where.push(lte(rstReservations.reservedAt, new Date(date + 'T23:59:59Z')))
      }
      const reservations = await db.query.rstReservations.findMany({
        where: and(...where),
        orderBy: (t, { asc }) => [asc(t.reservedAt)],
      })
      return { data: reservations }
    })

    .get('/:id', async ({ params, request }) => {
      const session = (request as any).session
      const reservation = await db.query.rstReservations.findFirst({
        where: and(
          eq(rstReservations.id, params.id),
          eq(rstReservations.organizationId, session.orgId),
        ),
      })
      if (!reservation) throw new NotFoundError('Reservation not found')
      return { data: reservation }
    })

    .post('/', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      if (input.tableId) {
        const conflicts = await db.query.rstReservations.findMany({
          where: and(
            eq(rstReservations.organizationId, session.orgId),
            eq(rstReservations.tableId, input.tableId),
            eq(rstReservations.status, 'confirmed'),
            lte(rstReservations.reservedAt, new Date(input.reservedAt)),
            gte(
              rstReservations.reservedAt,
              new Date(
                new Date(input.reservedAt).getTime() - (input.durationMinutes ?? 90) * 60000,
              ),
            ),
          ),
        })
        if (conflicts.length > 0)
          throw new ConflictError('Table already reserved for this time slot')
      }
      const [reservation] = await db
        .insert(rstReservations)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          locationId: input.outletId,
          tableId: input.tableId,
          personId: input.personId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
          partySize: input.partySize,
          reservedAt: new Date(input.reservedAt),
          durationMinutes: input.durationMinutes ?? 90,
          occasion: input.occasion,
          source: input.source ?? 'phone',
          depositAmount: input.depositAmount ?? '0',
          notes: input.notes,
          status: 'pending',
        })
        .returning()
      return { data: reservation }
    })

    .post('/:id/confirm', async ({ params, request }) => {
      const [updated] = await db
        .update(rstReservations)
        .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(rstReservations.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/:id/seat', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const reservation = await db.query.rstReservations.findFirst({
        where: eq(rstReservations.id, params.id),
      })
      if (!reservation) throw new NotFoundError('Reservation not found')
      if (input.tableId && input.tableId !== reservation.tableId) {
        const conflicts = await db.query.rstReservations.findMany({
          where: and(
            eq(rstReservations.organizationId, session.orgId),
            eq(rstReservations.tableId, input.tableId),
            eq(rstReservations.status, 'seated'),
          ),
        })
        if (conflicts.length > 0) throw new ConflictError('Table already occupied')
        await db
          .update(rstReservations)
          .set({ tableId: input.tableId })
          .where(eq(rstReservations.id, params.id))
      }
      const [updated] = await db
        .update(rstReservations)
        .set({ status: 'seated', seatedAt: new Date(), updatedAt: new Date() })
        .where(eq(rstReservations.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/:id/complete', async ({ params, request }) => {
      const [updated] = await db
        .update(rstReservations)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(rstReservations.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/:id/cancel', async ({ params, body, request }) => {
      const input = body as any
      const [updated] = await db
        .update(rstReservations)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: input?.reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(rstReservations.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/:id/no-show', async ({ params, request }) => {
      const [updated] = await db
        .update(rstReservations)
        .set({ status: 'no-show', noShowAt: new Date(), updatedAt: new Date() })
        .where(eq(rstReservations.id, params.id))
        .returning()
      return { data: updated }
    })

    .get('/waitlist', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const where: any[] = [
        eq(rstWaitlist.organizationId, session.orgId),
        eq(rstWaitlist.status, 'waiting'),
      ]
      if (outletId) where.push(eq(rstWaitlist.locationId, outletId))
      const entries = await db.query.rstWaitlist.findMany({
        where: and(...where),
        orderBy: (t, { asc }) => [asc(t.joinedAt)],
      })
      return { data: entries }
    })

    .post('/waitlist', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [entry] = await db
        .insert(rstWaitlist)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          locationId: input.outletId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          partySize: input.partySize,
          quotedMinutes: input.quotedMinutes,
          notes: input.notes,
          status: 'waiting',
        })
        .returning()
      return { data: entry }
    })

    .post('/waitlist/:id/notify', async ({ params, request }) => {
      const [updated] = await db
        .update(rstWaitlist)
        .set({ status: 'notified', notifiedAt: new Date() })
        .where(eq(rstWaitlist.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/waitlist/:id/seat', async ({ params, request }) => {
      const [updated] = await db
        .update(rstWaitlist)
        .set({ status: 'seated', seatedAt: new Date() })
        .where(eq(rstWaitlist.id, params.id))
        .returning()
      return { data: updated }
    })
}
