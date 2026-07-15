import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { locations } from '@db/schema/location'
import { geoAddresses } from '@db/schema/geo'
import { eq, and, isNull, desc, count, ilike } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createPropertiesRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/properties' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [
        eq(locations.organizationId, actor.orgId),
        eq(locations.type, 'building'),
        isNull(locations.deletedAt),
      ]
      if (q.search) conds.push(ilike(locations.name, `%${q.search}%`)!)

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(locations)
          .where(and(...conds))
          .orderBy(desc(locations.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(locations)
          .where(and(...conds)),
      ])
      return listResponse(items.map(shapeProperty), c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:read')
      const { id } = (ctx as any).params
      const [property] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.organizationId, actor.orgId),
            eq(locations.type, 'building'),
            isNull(locations.deletedAt),
          ),
        )
        .limit(1)
      if (!property) {
        ;(ctx as any).set.status = 404
        return { error: 'Property not found' }
      }

      const buildings = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, actor.orgId),
            eq(locations.parentId, id),
            eq(locations.type, 'building'),
            isNull(locations.deletedAt),
          ),
        )
      const rooms = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, actor.orgId),
            eq(locations.type, 'room'),
            isNull(locations.deletedAt),
            eq(locations.parentId, id),
          ),
        )

      return {
        ...shapeProperty(property),
        buildings: buildings.map(shapeProperty),
        roomCount: rooms.length,
      }
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const propId = generateId()

      const [prop] = await db
        .insert(locations)
        .values({
          id: propId,
          organizationId: actor.orgId,
          type: 'building',
          name: body.name,
          code: body.code ?? null,
          capacity: body.capacity ?? null,
          meta: {
            propertyType: body.propertyType,
            description: body.description,
            starRating: body.starRating,
            checkInTime: body.checkInTime ?? '14:00',
            checkOutTime: body.checkOutTime ?? '11:00',
            taxSettings: body.taxSettings,
            serviceCharge: body.serviceCharge,
            currencies: body.currencies ?? ['USD'],
            phone: body.phone,
            email: body.email,
            website: body.website,
          },
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning()

      if (body.address) {
        await db.insert(geoAddresses).values({
          id: generateId(),
          organizationId: actor.orgId,
          entityId: propId,
          entityType: 'location',
          line1: body.address.line1,
          line2: body.address.line2 ?? null,
          city: body.address.city,
          state: body.address.state ?? null,
          country: body.address.country,
          postcode: body.address.postcode ?? null,
          coordinates: body.address.coordinates ?? null,
          isDefault: true,
          label: 'main',
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
      }

      ;(ctx as any).set.status = 201
      return shapeProperty(prop!)
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:update')
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
        return { error: 'Property not found' }
      }

      const meta = { ...(existing.meta ?? {}), ...body.meta }
      if (body.name != null) existing.name = body.name
      const [updated] = await db
        .update(locations)
        .set({
          name: body.name ?? existing.name,
          code: body.code ?? existing.code,
          capacity: body.capacity ?? existing.capacity,
          meta,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, id))
        .returning()

      return shapeProperty(updated!)
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:delete')
      const { id } = (ctx as any).params
      await db.update(locations).set({ deletedAt: new Date() }).where(eq(locations.id, id))
      return { success: true }
    })
    .get('/:id/buildings', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:read')
      const { id } = (ctx as any).params
      const items = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, actor.orgId),
            eq(locations.parentId, id),
            eq(locations.type, 'building'),
            isNull(locations.deletedAt),
          ),
        )
      return listResponse(items.map(shapeProperty), items.length, 1, 100)
    })
    .post('/:id/buildings', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'property:create')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [bldg] = await db
        .insert(locations)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          type: 'building',
          name: body.name,
          code: body.code ?? null,
          parentId: id,
          capacity: body.capacity ?? null,
          meta: { floors: body.floors ?? 1, description: body.description },
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return shapeProperty(bldg!)
    })
}

function shapeProperty(loc: any) {
  const meta = loc.meta ?? {}
  return {
    id: loc.id,
    name: loc.name,
    code: loc.code,
    type: loc.type,
    parentId: loc.parentId,
    capacity: loc.capacity,
    propertyType: meta.propertyType,
    description: meta.description,
    starRating: meta.starRating,
    checkInTime: meta.checkInTime,
    checkOutTime: meta.checkOutTime,
    taxSettings: meta.taxSettings,
    serviceCharge: meta.serviceCharge,
    currencies: meta.currencies,
    phone: meta.phone,
    email: meta.email,
    website: meta.website,
    floors: meta.floors,
    status: meta.status ?? 'active',
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt,
  }
}
