import { Elysia } from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, desc } from 'drizzle-orm'
import { erpStockEntry, erpStockEntryItem } from '../../db/schema/erp'
import { hasPermission } from '../../permissions/matrix'

export function createStockRoutes(mediator: Mediator) {
  return new Elysia()
    .get('/stock-entries', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(erpStockEntry)
        .where(eq(erpStockEntry.organizationId, actor.orgId))
        .orderBy(desc(erpStockEntry.createdAt))
      return { stockEntries: rows }
    })

    .post('/stock-entries', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const orgId = actor.orgId

      if (!['transfer', 'adjustment'].includes(body.type)) {
        ;(ctx as any).set.status = 400
        return { error: 'Manual entries can only be type: transfer or adjustment' }
      }

      await db.transaction(async (tx) => {
        const [entry] = await tx
          .insert(erpStockEntry)
          .values({
            organizationId: orgId,
            type: body.type,
            date: new Date(body.date ?? new Date()),
            reference: body.reference,
            referenceType: body.type,
            totalValue: '0',
          })
          .returning()

        for (const item of body.items ?? []) {
          const qty = Number(item.qty)
          const valuationRate = Number(item.valuationRate ?? 0)
          await tx.insert(erpStockEntryItem).values({
            entryId: entry.id,
            itemId: item.itemId,
            locationFrom: item.locationFrom,
            locationTo: item.locationTo,
            qty: String(qty),
            valuationRate: String(valuationRate),
            lineValue: String((qty * valuationRate).toFixed(2)),
            batchNo: item.batchNo,
          })
        }
      })

      const [latest] = await db
        .select()
        .from(erpStockEntry)
        .where(eq(erpStockEntry.organizationId, orgId))
        .orderBy(desc(erpStockEntry.createdAt))
        .limit(1)

      for (const item of body.items ?? []) {
        await mediator.dispatch({
          type: 'inventory.recordMovement',
          payload: {
            variantId: item.itemId,
            fromLocationId: item.locationFrom ?? null,
            toLocationId: item.locationTo ?? null,
            quantity: Number(item.qty),
            reason: body.type,
            referenceId: latest?.id,
            referenceType: 'erp_stock_entry',
          },
          actorId: actor.actorId,
          orgId,
          correlationId: generateId(),
        })
      }

      return { success: true }
    })

    .get('/stock-entries/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [entry] = await db.select().from(erpStockEntry).where(eq(erpStockEntry.id, id))
      if (!entry) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const items = await db
        .select()
        .from(erpStockEntryItem)
        .where(eq(erpStockEntryItem.entryId, id))
      return { stockEntry: entry, items }
    })

    .get('/inventory/stock-summary', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const query = (ctx as any).query ?? {}
      const units = (await mediator.query({
        type: 'inventory.listStockUnits',
        params: {
          variantId: query.itemId,
          locationId: query.warehouseId,
        },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })) as Array<{ variantId: string; locationId: string; onHand: number }>

      let result = units.map((u) => ({
        itemId: u.variantId,
        locationId: u.locationId,
        balance: u.onHand,
        valuationRate: 0,
        stockValue: 0,
      }))
      if (query.belowReorder === 'true') result = result.filter((r) => r.balance <= 0)
      return { summary: result, total: result.length }
    })

    .get('/inventory/movements', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const query = (ctx as any).query ?? {}
      const rows = await mediator.query({
        type: 'inventory.listMovements',
        params: { variantId: query.itemId, locationId: query.warehouseId },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })
      return { movements: rows }
    })
}