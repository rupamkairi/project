import { Elysia } from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { erpWorkOrder, erpStockEntry, erpStockEntryItem } from '../../db/schema/erp'
import { catBomHeaders, catBomLines } from '@db/schema/catalog'
import { hasPermission } from '../../permissions/matrix'
import { nextRefNo } from '../../lib/ref-numbers'

export function createWorkOrderRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/work-orders' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(erpWorkOrder)
        .where(eq(erpWorkOrder.organizationId, actor.orgId))
        .orderBy(desc(erpWorkOrder.createdAt))
      return { workOrders: rows }
    })

    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const orgId = actor.orgId

      const [bom] = await db.select().from(catBomHeaders).where(eq(catBomHeaders.id, body.bomId))
      if (!bom) {
        ;(ctx as any).set.status = 404
        return { error: 'BOM not found' }
      }

      const year = new Date().getFullYear()
      const woNumber = await nextRefNo(db, orgId, 'WO', year, erpWorkOrder, erpWorkOrder.woNumber)

      const [wo] = await db
        .insert(erpWorkOrder)
        .values({
          organizationId: orgId,
          woNumber,
          bomId: body.bomId,
          qty: String(body.quantity),
          targetLocationId: body.locationId,
          status: 'draft',
          scheduledStart: body.plannedStart ? new Date(body.plannedStart) : undefined,
        })
        .returning()

      ;(ctx as any).set.status = 201
      return { workOrder: wo }
    })

    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [wo] = await db
        .select()
        .from(erpWorkOrder)
        .where(and(eq(erpWorkOrder.id, id), eq(erpWorkOrder.organizationId, actor.orgId)))
      if (!wo) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      return { workOrder: wo }
    })

    .post('/:id/start', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [wo] = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.id, id))
      if (!wo || wo.status !== 'submitted') {
        ;(ctx as any).set.status = 400
        return { error: 'Work order must be submitted before starting' }
      }

      const [bom] = await db.select().from(catBomHeaders).where(eq(catBomHeaders.id, wo.bomId))
      const bomItems = await db.select().from(catBomLines).where(eq(catBomLines.bomId, wo.bomId))
      const qty = Number(wo.qty)
      const bomQty = Number(bom?.yieldQty ?? 1)

      await db.transaction(async (tx) => {
        const [entry] = await tx
          .insert(erpStockEntry)
          .values({
            organizationId: wo.organizationId,
            type: 'manufacture',
            date: new Date(),
            reference: id,
            referenceType: 'work_order_issue',
            totalValue: '0',
          })
          .returning()

        for (const item of bomItems) {
          const required =
            Number(item.qty) * (qty / bomQty) * (1 + Number(item.scrapPercent ?? 0) / 100)

          await tx.insert(erpStockEntryItem).values({
            entryId: entry.id,
            itemId: item.componentItemId,
            qty: String(-required),
          })
        }

        await tx
          .update(erpWorkOrder)
          .set({ status: 'in-process', actualStart: new Date() })
          .where(eq(erpWorkOrder.id, id))
      })

      for (const item of bomItems) {
        const required =
          Number(item.qty) * (qty / bomQty) * (1 + Number(item.scrapPercent ?? 0) / 100)
        await mediator.dispatch({
          type: 'inventory.recordMovement',
          payload: {
            variantId: item.componentItemId,
            fromLocationId: wo.targetLocationId,
            quantity: required,
            reason: 'manufacture',
            referenceId: id,
            referenceType: 'work_order_issue',
          },
          actorId: actor.actorId,
          orgId: actor.orgId,
          correlationId: generateId(),
        })
      }

      return { success: true, status: 'in-process' }
    })

    .post('/:id/complete', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const producedQty = Number(body.producedQty)

      const [wo] = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.id, id))
      if (!wo || wo.status !== 'in-process') {
        ;(ctx as any).set.status = 400
        return { error: 'Work order must be in-process' }
      }
      if (producedQty > Number(wo.qty)) {
        ;(ctx as any).set.status = 400
        return { error: 'Produced qty cannot exceed planned qty' }
      }

      const [bom] = await db.select().from(catBomHeaders).where(eq(catBomHeaders.id, wo.bomId))
      const operatingCost = Number((bom?.meta as any)?.operatingCost ?? 0)

      await db.transaction(async (tx) => {
        const [entry] = await tx
          .insert(erpStockEntry)
          .values({
            organizationId: wo.organizationId,
            type: 'manufacture',
            date: new Date(),
            reference: id,
            referenceType: 'work_order_receipt',
            totalValue: String((producedQty * operatingCost).toFixed(2)),
          })
          .returning()

        await tx.insert(erpStockEntryItem).values({
          entryId: entry.id,
          itemId: bom?.parentItemId,
          locationTo: wo.targetLocationId,
          qty: String(producedQty),
          valuationRate: String(operatingCost),
          lineValue: String((producedQty * operatingCost).toFixed(2)),
        })

        await tx
          .update(erpWorkOrder)
          .set({
            status: 'completed',
            producedQty: String(producedQty),
            actualEnd: new Date(),
          })
          .where(eq(erpWorkOrder.id, id))
      })

      if (bom) {
        await mediator.dispatch({
          type: 'inventory.recordMovement',
          payload: {
            variantId: bom.parentItemId,
            toLocationId: wo.targetLocationId,
            quantity: producedQty,
            reason: 'manufacture',
            referenceId: id,
            referenceType: 'work_order_receipt',
          },
          actorId: actor.actorId,
          orgId: actor.orgId,
          correlationId: generateId(),
        })
      }

      return { success: true, status: 'completed', producedQty }
    })

    .post('/:id/cancel', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [wo] = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.id, id))
      if (wo?.status === 'in-process') {
        ;(ctx as any).set.status = 400
        return { error: 'Cannot cancel in-process work order' }
      }
      await db.update(erpWorkOrder).set({ status: 'cancelled' }).where(eq(erpWorkOrder.id, id))
      return { success: true, status: 'cancelled' }
    })
}
