import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspVenue, hspVenueReservation } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count, gte, lte } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createVenuesRoutes(_mediator: Mediator) {
  return (
    new Elysia({ prefix: '/venues' })
      .get('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:read')
        const q = (ctx as any).query ?? {}
        const { page, limit, offset } = parsePagination(q)
        const conds = [eq(hspVenue.organizationId, actor.orgId), isNull(hspVenue.deletedAt)]
        if (q.propertyId) conds.push(eq(hspVenue.propertyId, String(q.propertyId)))

        const [items, [c]] = await Promise.all([
          db
            .select()
            .from(hspVenue)
            .where(and(...conds))
            .orderBy(desc(hspVenue.name))
            .limit(limit)
            .offset(offset),
          db
            .select({ value: count() })
            .from(hspVenue)
            .where(and(...conds)),
        ])
        return listResponse(items, c?.value ?? 0, page, limit)
      })
      .get('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:read')
        const { id } = (ctx as any).params
        const [item] = await db
          .select()
          .from(hspVenue)
          .where(
            and(
              eq(hspVenue.id, id),
              eq(hspVenue.organizationId, actor.orgId),
              isNull(hspVenue.deletedAt),
            ),
          )
          .limit(1)
        if (!item) {
          ;(ctx as any).set.status = 404
          return { error: 'Venue not found' }
        }
        return item
      })
      .post('/', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:create')
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [item] = await db
          .insert(hspVenue)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            ...body,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return item
      })
      .patch('/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:update')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const [existing] = await db.select().from(hspVenue).where(eq(hspVenue.id, id)).limit(1)
        if (!existing) {
          ;(ctx as any).set.status = 404
          return { error: 'Venue not found' }
        }
        const [updated] = await db
          .update(hspVenue)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(hspVenue.id, id))
          .returning()
        return updated
      })

      // Venue Reservations
      .get('/reservations', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:read')
        const q = (ctx as any).query ?? {}
        const { page, limit, offset } = parsePagination(q)
        const conds = [
          eq(hspVenueReservation.organizationId, actor.orgId),
          isNull(hspVenueReservation.deletedAt),
        ]
        if (q.venueId) conds.push(eq(hspVenueReservation.venueId, String(q.venueId)))
        if (q.propertyId) conds.push(eq(hspVenueReservation.propertyId, String(q.propertyId)))
        if (q.status) conds.push(eq(hspVenueReservation.status, String(q.status)))
        if (q.fromDate && q.toDate)
          conds.push(
            gte(hspVenueReservation.startAt, new Date(q.fromDate)),
            lte(hspVenueReservation.endAt, new Date(q.toDate)),
          )

        const [items, [c]] = await Promise.all([
          db
            .select()
            .from(hspVenueReservation)
            .where(and(...conds))
            .orderBy(desc(hspVenueReservation.startAt))
            .limit(limit)
            .offset(offset),
          db
            .select({ value: count() })
            .from(hspVenueReservation)
            .where(and(...conds)),
        ])
        return listResponse(items, c?.value ?? 0, page, limit)
      })
      .get('/reservations/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:read')
        const { id } = (ctx as any).params
        const [item] = await db
          .select()
          .from(hspVenueReservation)
          .where(
            and(
              eq(hspVenueReservation.id, id),
              eq(hspVenueReservation.organizationId, actor.orgId),
              isNull(hspVenueReservation.deletedAt),
            ),
          )
          .limit(1)
        if (!item) {
          ;(ctx as any).set.status = 404
          return { error: 'Reservation not found' }
        }
        return item
      })
      .post('/reservations', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:reserve')
        const body = (ctx as any).body ?? {}
        const now = new Date()

        // Check availability
        if (body.startAt && body.endAt && body.venueId) {
          const overlapping = await db
            .select()
            .from(hspVenueReservation)
            .where(
              and(
                eq(hspVenueReservation.venueId, body.venueId),
                eq(hspVenueReservation.organizationId, actor.orgId),
                isNull(hspVenueReservation.deletedAt),
                gte(hspVenueReservation.startAt, new Date(body.startAt)),
                lt(hspVenueReservation.startAt, new Date(body.endAt)),
              ),
            )
          if (overlapping.length > 0) {
            ;(ctx as any).set.status = 409
            return { error: 'Venue not available for the selected time' }
          }
        }

        const [item] = await db
          .insert(hspVenueReservation)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            ...body,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return item
      })
      .patch('/reservations/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:reserve')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const [existing] = await db
          .select()
          .from(hspVenueReservation)
          .where(eq(hspVenueReservation.id, id))
          .limit(1)
        if (!existing) {
          ;(ctx as any).set.status = 404
          return { error: 'Reservation not found' }
        }
        const [updated] = await db
          .update(hspVenueReservation)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(hspVenueReservation.id, id))
          .returning()
        return updated
      })
      .post('/reservations/:id/cancel', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'venue:cancel')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [updated] = await db
          .update(hspVenueReservation)
          .set({
            status: 'cancelled',
            cancelledAt: now,
            cancellationReason: body.reason ?? null,
            updatedAt: now,
          })
          .where(eq(hspVenueReservation.id, id))
          .returning()
        return updated
      })
  )
}
