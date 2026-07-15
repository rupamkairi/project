import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, NotFoundError } from '@core'
import { db } from '../lib/db.js'
import { rstEquipment, rstEquipmentLogs } from '../db/schema/restaurant.js'
import { and, eq } from 'drizzle-orm'

export function createEquipmentRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/equipment' })
    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const category = url.searchParams.get('category')
      const status = url.searchParams.get('status')
      const where: any[] = [eq(rstEquipment.organizationId, session.orgId)]
      if (outletId) where.push(eq(rstEquipment.outletId, outletId))
      if (category) where.push(eq(rstEquipment.category, category))
      if (status) where.push(eq(rstEquipment.status, status))
      const items = await db.query.rstEquipment.findMany({
        where: and(...where),
        orderBy: (t, { asc }) => [asc(t.name)],
      })
      return { data: items }
    })

    .get('/:id', async ({ params, request }) => {
      const session = (request as any).session
      const item = await db.query.rstEquipment.findFirst({
        where: and(eq(rstEquipment.id, params.id), eq(rstEquipment.organizationId, session.orgId)),
      })
      if (!item) throw new NotFoundError('Equipment not found')
      const logs = await db.query.rstEquipmentLogs.findMany({
        where: eq(rstEquipmentLogs.equipmentId, params.id),
        orderBy: (t, { desc }) => [desc(t.serviceDate)],
      })
      return { data: { ...item, logs } }
    })

    .post('/', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [item] = await db
        .insert(rstEquipment)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          outletId: input.outletId,
          category: input.category,
          name: input.name,
          serialNumber: input.serialNumber,
          reference: input.reference,
          purchaseDate: input.purchaseDate,
          warrantyExpiry: input.warrantyExpiry,
          purchaseCost: input.purchaseCost,
          notes: input.notes,
          status: 'active',
        })
        .returning()
      return { data: item }
    })

    .patch('/:id', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [updated] = await db
        .update(rstEquipment)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(rstEquipment.id, params.id))
        .returning()
      return { data: updated }
    })

    .post('/:id/out-of-service', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      await db
        .update(rstEquipment)
        .set({ status: 'out-of-service', updatedAt: new Date() })
        .where(eq(rstEquipment.id, params.id))
      await db.insert(rstEquipmentLogs).values({
        id: generateId(),
        organizationId: session.orgId,
        equipmentId: params.id,
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
      await db
        .update(rstEquipment)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(rstEquipment.id, params.id))
      await db.insert(rstEquipmentLogs).values({
        id: generateId(),
        organizationId: session.orgId,
        equipmentId: params.id,
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
          equipmentId: params.id,
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
