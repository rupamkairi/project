import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { locations } from '@db/schema/location'
import { geoAddresses } from '@db/schema/geo'
import { hspRoomStatusHistory } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count, inArray } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createRoomsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/rooms' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'room:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [
        eq(locations.organizationId, actor.orgId),
        eq(locations.type, 'room'),
        isNull(locations.deletedAt),
      ]
      if (q.propertyId) conds.push(inArray(locations.parentId, [String(q.propertyId)]))
      if (q.status) conds.push(eq(locations.status, String(q.status)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(locations)
          .where(and(...conds))
          .orderBy(desc(locations.code))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(locations)
          .where(and(...conds)),
      ])
      return listResponse(items.map(shapeRoom), c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'room:read')
      const { id } = (ctx as any).params
      const [room] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.organizationId, actor.orgId),
            eq(locations.type, 'room'),
            isNull(locations.deletedAt),
          ),
        )
        .limit(1)
      if (!room) {
        ;(ctx as any).set.status = 404
        return { error: 'Room not found' }
      }

      const history = await db
        .select()
        .from(hspRoomStatusHistory)
        .where(
          and(
            eq(hspRoomStatusHistory.roomLocationId, id),
            eq(hspRoomStatusHistory.organizationId, actor.orgId),
            isNull(hspRoomStatusHistory.deletedAt),
          ),
        )
        .orderBy(desc(hspRoomStatusHistory.createdAt))
        .limit(20)
      return { ...shapeRoom(room), statusHistory: history }
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'room:update')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [room] = await db
        .insert(locations)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: 'room',
          name: body.name,
          code: body.code ?? null,
          capacity: body.capacity ?? 2,
          parentId: body.parentId ?? null,
          meta: {
            floor: body.floor,
            roomTypeItemId: body.roomTypeItemId,
            amenities: body.amenities ?? [],
            facilities: body.facilities ?? [],
            status: body.status ?? 'available',
            sqft: body.sqft,
            bedType: body.bedType,
            view: body.view,
            notes: body.notes,
          },
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning()

      await db.insert(hspRoomStatusHistory).values({
        id: generateId(),
        organizationId: actor.orgId,
        roomLocationId: room!.id,
        status: body.status ?? 'available',
        changedByActorId: actor.id,
        reason: 'Room created',
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })
      ;(ctx as any).set.status = 201
      return shapeRoom(room!)
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'room:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.organizationId, actor.orgId),
            isNull(locations.deletedAt),
          ),
        )
        .limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Room not found' }
      }

      const meta = { ...(existing.meta ?? {}) }
      const metaKeys = [
        'floor',
        'roomTypeItemId',
        'amenities',
        'facilities',
        'sqft',
        'bedType',
        'view',
        'notes',
      ]
      for (const k of metaKeys) if (body[k] !== undefined) meta[k] = body[k]

      const [updated] = await db
        .update(locations)
        .set({
          name: body.name ?? existing.name,
          code: body.code ?? existing.code,
          capacity: body.capacity ?? existing.capacity,
          parentId: body.parentId ?? existing.parentId,
          meta,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, id))
        .returning()
      return shapeRoom(updated!)
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'room:update')
      const { id } = (ctx as any).params
      await db.update(locations).set({ deletedAt: new Date() }).where(eq(locations.id, id))
      return { success: true }
    })
    .patch('/:id/status', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'room:status')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.organizationId, actor.orgId),
            isNull(locations.deletedAt),
          ),
        )
        .limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Room not found' }
      }

      const previousStatus = (existing.meta as any)?.status ?? existing.status
      const meta = { ...(existing.meta ?? {}), status: body.status }
      const now = new Date()

      await db
        .update(locations)
        .set({ meta, status: body.status, updatedAt: now })
        .where(eq(locations.id, id))
      await db.insert(hspRoomStatusHistory).values({
        id: generateId(),
        organizationId: actor.orgId,
        roomLocationId: id,
        status: body.status,
        previousStatus,
        changedByActorId: actor.id,
        reason: body.reason ?? null,
        reservationId: body.reservationId ?? null,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })

      return { id, status: body.status, previousStatus }
    })
}

function shapeRoom(loc: any) {
  const meta = loc.meta ?? {}
  return {
    id: loc.id,
    name: loc.name,
    code: loc.code,
    capacity: loc.capacity,
    parentId: loc.parentId,
    status: meta.status ?? 'available',
    floor: meta.floor,
    roomTypeItemId: meta.roomTypeItemId,
    amenities: meta.amenities ?? [],
    facilities: meta.facilities ?? [],
    sqft: meta.sqft,
    bedType: meta.bedType,
    view: meta.view,
    notes: meta.notes,
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt,
  }
}
