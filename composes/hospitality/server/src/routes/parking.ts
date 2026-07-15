import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspParking } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createParkingRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/parking' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'parking:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [eq(hspParking.organizationId, actor.orgId), isNull(hspParking.deletedAt)]
      if (q.propertyId) conds.push(eq(hspParking.propertyId, String(q.propertyId)))
      if (q.status) conds.push(eq(hspParking.status, String(q.status)))
      if (q.reservationId) conds.push(eq(hspParking.reservationId, String(q.reservationId)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspParking)
          .where(and(...conds))
          .orderBy(desc(hspParking.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspParking)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'parking:read')
      const { id } = (ctx as any).params
      const [item] = await db
        .select()
        .from(hspParking)
        .where(
          and(
            eq(hspParking.id, id),
            eq(hspParking.organizationId, actor.orgId),
            isNull(hspParking.deletedAt),
          ),
        )
        .limit(1)
      if (!item) {
        ;(ctx as any).set.status = 404
        return { error: 'Parking record not found' }
      }
      return item
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'parking:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [item] = await db
        .insert(hspParking)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          ...body,
          checkIn: body.checkIn ? new Date(body.checkIn) : now,
          status: body.status ?? 'active',
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
      requirePermission(actor, 'parking:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db.select().from(hspParking).where(eq(hspParking.id, id)).limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Parking not found' }
      }
      const [updated] = await db
        .update(hspParking)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(hspParking.id, id))
        .returning()
      return updated
    })
    .post('/:id/checkout', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'parking:checkout')
      const { id } = (ctx as any).params
      const now = new Date()
      const [updated] = await db
        .update(hspParking)
        .set({ status: 'completed', checkOut: now, updatedAt: now })
        .where(eq(hspParking.id, id))
        .returning()
      return updated
    })
}
