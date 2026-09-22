import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq } from 'drizzle-orm'
import { erpWorkOrder } from '../../db/schema/erp'
import { catBomHeaders, catBomLines } from '@db/schema/catalog'
import { invStockUnits } from '@db/schema/inventory'
import { hasPermission } from '../../permissions/matrix'

export function createManufacturingDashboardRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/manufacturing' }).get('/dashboard', async (ctx) => {
    const actor = (ctx as any).actor
    if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
      ;(ctx as any).set.status = 403
      return { error: 'Forbidden' }
    }
    const orgId = actor.orgId
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const allWOs = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.organizationId, orgId))

    const openWorkOrders = allWOs.filter((w) => w.status === 'submitted').length
    const inProcessWorkOrders = allWOs.filter((w) => w.status === 'in-process').length
    const completedThisMonth = allWOs.filter(
      (w) => w.status === 'completed' && w.actualEnd && new Date(w.actualEnd) >= monthStart,
    ).length
    const overdueWorkOrders = allWOs.filter(
      (w) =>
        ['submitted', 'draft'].includes(w.status) &&
        w.scheduledStart &&
        new Date(w.scheduledStart) < now,
    ).length

    const inProcessWOs = allWOs.filter((w) => w.status === 'in-process')
    const shortages: any[] = []

    for (const wo of inProcessWOs) {
      const [bom] = await db.select().from(catBomHeaders).where(eq(catBomHeaders.id, wo.bomId))
      const bomItems = await db.select().from(catBomLines).where(eq(catBomLines.bomId, wo.bomId))

      for (const item of bomItems) {
        const required = (Number(item.qty) * Number(wo.qty)) / Number(bom?.yieldQty ?? 1)
        const [stock] = await db
          .select()
          .from(invStockUnits)
          .where(eq(invStockUnits.variantId, item.componentItemId))
          .limit(1)
        const available = Number(stock?.onHand ?? 0)
        if (available < required) {
          shortages.push({
            itemId: item.componentItemId,
            required,
            available,
            shortage: required - available,
          })
        }
      }
    }

    return {
      openWorkOrders,
      inProcessWorkOrders,
      completedThisMonth,
      overdueWorkOrders,
      materialShortages: shortages,
    }
  })
}