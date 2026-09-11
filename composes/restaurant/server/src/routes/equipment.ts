import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, NotFoundError } from '@core'
import { db } from '@db/client'
import { catItems } from '@db/schema/catalog'
import { rstEquipmentLogs } from '../db/schema/restaurant.js'
import { and, eq, asc, isNull } from 'drizzle-orm'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapEquipment(item: typeof catItems.$inferSelect) {
  const meta = (item.meta ?? {}) as Record<string, any>
  return {
    id: item.id,
    organizationId: item.organizationId,
    outletId: meta.outletId,
    category: meta.category,
    name: item.name,
    serialNumber: meta.serialNumber,
    reference: meta.reference,
    purchaseDate: meta.purchaseDate,
    warrantyExpiry: meta.warrantyExpiry,
    purchaseCost: meta.purchaseCost,
    status: meta.equipmentStatus ?? 'active',
    notes: meta.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function createEquipmentRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/equipment' })
    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const category = url.searchParams.get('category')
      const status = url.searchParams.get('status')

      const rows = await db
        .select()
        .from(catItems)
        .where(
          and(
            eq(catItems.organizationId, session.orgId),
            eq(catItems.type, 'asset'),
            isNull(catItems.deletedAt),
          ),
        )
        .orderBy(asc(catItems.name))

      const items = rows.map(mapEquipment).filter((e) => {
        if (outletId && e.outletId !== outletId) return false
        if (category && e.category !== category) return false
        if (status && e.status !== status) return false
        return true
      })
      return { data: items }
    })

    .get('/:id', async ({ params, request }) => {
      const session = (request as any).session
      const [row] = await db
        .select()
        .from(catItems)
        .where(
          and(
            eq(catItems.id, params.id),
            eq(catItems.organizationId, session.orgId),
            eq(catItems.type, 'asset'),
          ),
        )
        .limit(1)
      if (!row) throw new NotFoundError('Equipment not found')
      const logs = await db.query.rstEquipmentLogs.findMany({
        where: eq(rstEquipmentLogs.itemId, params.id),
        orderBy: (t, { desc }) => [desc(t.serviceDate)],
      })
      return { data: { ...mapEquipment(row), logs } }
    })

    .post('/', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      const itemId = generateId()
      const [item] = await db
        .insert(catItems)
        .values({
          id: itemId,
          organizationId: session.orgId,
          name: input.name,
          slug: slugify(input.name) + '-' + itemId.slice(-6),
          type: 'asset',
          status: 'active',
          meta: {
            outletId: input.outletId,
            category: input.category,
            serialNumber: input.serialNumber,
            reference: input.reference,
            purchaseDate: input.purchaseDate,
            warrantyExpiry: input.warrantyExpiry,
            purchaseCost: input.purchaseCost,
            notes: input.notes,
            equipmentStatus: 'active',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        })
        .returning()
      return { data: mapEquipment(item!) }
    })

    .patch('/:id', async ({ params, body, request }) => {
      const input = body as any
      const [row] = await db.select().from(catItems).where(eq(catItems.id, params.id)).limit(1)
      if (!row) throw new NotFoundError('Equipment not found')
      const meta = (row.meta ?? {}) as Record<string, any>
      const nextMeta = {
        ...meta,
        outletId: input.outletId ?? meta.outletId,
        category: input.category ?? meta.category,
        serialNumber: input.serialNumber ?? meta.serialNumber,
        reference: input.reference ?? meta.reference,
        purchaseDate: input.purchaseDate ?? meta.purchaseDate,
        warrantyExpiry: input.warrantyExpiry ?? meta.warrantyExpiry,
        purchaseCost: input.purchaseCost ?? meta.purchaseCost,
        notes: input.notes ?? meta.notes,
        equipmentStatus: input.status ?? meta.equipmentStatus ?? 'active',
      }
      const [updated] = await db
        .update(catItems)
        .set({
          name: input.name ?? row.name,
          slug: input.name ? slugify(input.name) + '-' + row.id.slice(-6) : row.slug,
          meta: nextMeta,
          updatedAt: new Date(),
        })
        .where(eq(catItems.id, params.id))
        .returning()
      return { data: mapEquipment(updated!) }
    })

    .post('/:id/out-of-service', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [row] = await db.select().from(catItems).where(eq(catItems.id, params.id)).limit(1)
      if (!row) throw new NotFoundError('Equipment not found')
      const meta = (row.meta ?? {}) as Record<string, any>
      await db
        .update(catItems)
        .set({ meta: { ...meta, equipmentStatus: 'out-of-service' }, updatedAt: new Date() })
        .where(eq(catItems.id, params.id))
      await db.insert(rstEquipmentLogs).values({
        id: generateId(),
        organizationId: session.orgId,
        itemId: params.id,
        logType: 'issue',
        description: input.description,
        serviceDate: new Date().toISOString().slice(0, 10),
        notes: input.notes,
        performedBy: session.actorId,
      })
      return { data: { equipmentId: params.id, status: 'out-of-service' } }
    })

    .post('/:id/resolve', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [row] = await db.select().from(catItems).where(eq(catItems.id, params.id)).limit(1)
      if (!row) throw new NotFoundError('Equipment not found')
      const meta = (row.meta ?? {}) as Record<string, any>
      await db
        .update(catItems)
        .set({ meta: { ...meta, equipmentStatus: 'active' }, updatedAt: new Date() })
        .where(eq(catItems.id, params.id))
      await db.insert(rstEquipmentLogs).values({
        id: generateId(),
        organizationId: session.orgId,
        itemId: params.id,
        logType: 'maintenance',
        description: input.description ?? 'Issue resolved',
        serviceDate: new Date().toISOString().slice(0, 10),
        serviceCost: input.serviceCost,
        performedBy: input.performedBy ?? session.actorId,
        notes: input.notes,
        resolvedAt: new Date(),
      })
      return { data: { equipmentId: params.id, status: 'active' } }
    })

    .post('/:id/log', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [log] = await db
        .insert(rstEquipmentLogs)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          itemId: params.id,
          logType: input.logType,
          description: input.description,
          serviceDate: input.serviceDate ?? new Date().toISOString().slice(0, 10),
          serviceCost: input.serviceCost,
          performedBy: input.performedBy ?? session.actorId,
          notes: input.notes,
        })
        .returning()
      return { data: log }
    })
}
