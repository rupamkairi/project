import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { db } from '@db/client'
import { transactions } from '@db/schema/commerce'
import { rstShifts, rstStockMovements, rstBillPayments } from '../db/schema/restaurant.js'
import { and, eq, gte, lte, isNull } from 'drizzle-orm'

export function createAnalyticsRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/analytics' })

    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
      const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)

      const orders = (await mediator
        .query({
          type: 'commerce.listTransactions',
          params: { orgId: session.orgId, type: 'order', limit: 2000 },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        .catch(() => [])) as any[]

      const orderList = orders.filter((o) => {
        const created = o.createdAt ?? o.meta?.createdAt
        if (!created) return true
        const d = new Date(created).toISOString().slice(0, 10)
        return d >= from && d <= to
      })

      const completed = orderList.filter((o) =>
        ['served', 'completed', 'collected', 'handed-off'].includes(o.meta?.status ?? ''),
      )
      const totalRevenue = completed.reduce(
        (s: number, o: any) => s + parseFloat(String(o.total ?? 0)),
        0,
      )
      const totalOrders = orderList.length
      const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0

      const dineIn = orderList.filter((o) => o.meta?.orderType === 'dine-in').length
      const takeaway = orderList.filter((o) => o.meta?.orderType === 'takeaway').length
      const pickup = orderList.filter((o) => o.meta?.orderType === 'pickup').length
      const partnerDelivery = orderList.filter(
        (o) => o.meta?.orderType === 'partner-delivery',
      ).length
      const cancelled = orderList.filter((o) =>
        ['cancelled', 'rejected'].includes(o.meta?.status ?? ''),
      ).length
      const refunded = orderList.filter((o) => o.meta?.status === 'refunded').length

      return {
        data: {
          totalRevenue,
          totalOrders,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          orderBreakdown: { dineIn, takeaway, pickup, partnerDelivery, cancelled, refunded },
          completedOrders: completed.length,
        },
      }
    })

    .get('/billing', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
      const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)

      const rows = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.organizationId, session.orgId),
            eq(transactions.type, 'bill'),
            gte(transactions.createdAt, new Date(from + 'T00:00:00Z')),
            lte(transactions.createdAt, new Date(to + 'T23:59:59Z')),
            isNull(transactions.deletedAt),
          ),
        )

      const bills = await Promise.all(
        rows.map(async (row) => {
          const meta = (row.meta ?? {}) as Record<string, any>
          const payments = await db
            .select()
            .from(rstBillPayments)
            .where(eq(rstBillPayments.transactionId, row.id))
          return {
            id: row.id,
            outletId: meta.outletId,
            status: meta.status ?? 'open',
            grandTotal: meta.grandTotal ?? String((row.totalAmount ?? 0) / 100),
            taxTotal: meta.taxTotal ?? String((row.taxAmount ?? 0) / 100),
            discountTotal: meta.discountTotal ?? '0',
            tipAmount: meta.tipAmount ?? '0',
            payments,
          }
        }),
      )

      const filtered = bills.filter((b) => !outletId || b.outletId === outletId)

      const settled = filtered.filter((b: any) => b.status === 'settled')
      const totalRevenue = settled.reduce(
        (s: number, b: any) => s + parseFloat(String(b.grandTotal)),
        0,
      )
      const totalTax = settled.reduce((s: number, b: any) => s + parseFloat(String(b.taxTotal)), 0)
      const totalDiscounts = settled.reduce(
        (s: number, b: any) => s + parseFloat(String(b.discountTotal)),
        0,
      )
      const totalTips = settled.reduce(
        (s: number, b: any) => s + parseFloat(String(b.tipAmount)),
        0,
      )
      const voided = filtered.filter((b: any) => b.status === 'voided').length
      const refunded = filtered.reduce(
        (s: number, b: any) =>
          s +
          (b.payments as any[])
            .filter((p: any) => p.isRefund)
            .reduce((a: number, p: any) => a + parseFloat(String(p.amount)), 0),
        0,
      )

      const paymentMethodTotals: Record<string, number> = {}
      for (const b of settled) {
        for (const p of b.payments) {
          if (p.isRefund) continue
          paymentMethodTotals[p.method] =
            (paymentMethodTotals[p.method] ?? 0) + parseFloat(String(p.amount))
        }
      }
      const paymentMethods = Object.entries(paymentMethodTotals).map(([method, amount]) => ({
        method,
        amount,
      }))

      return {
        data: {
          totalRevenue,
          totalTax,
          totalDiscounts,
          totalTips,
          voidedBills: voided,
          totalRefunded: refunded,
          paymentMethods,
          billCount: filtered.length,
          settledCount: settled.length,
        },
      }
    })

    .get('/stock', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const items = (await mediator
        .query({
          type: 'catalog.listItems',
          params: { orgId: session.orgId, type: 'stock_item' },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        .catch(() => [])) as any[]

      const stockList = items.map((i) => ({
        id: i.id,
        name: i.name,
        currentStock: parseFloat(String(i.meta?.currentStock ?? 0)),
        reorderLevel: parseFloat(String(i.meta?.reorderLevel ?? 0)),
        costPerUnit: parseFloat(String(i.meta?.costPerUnit ?? 0)),
        stockValue:
          parseFloat(String(i.meta?.currentStock ?? 0)) *
          parseFloat(String(i.meta?.costPerUnit ?? 0)),
        unit: i.meta?.unit ?? 'pcs',
        needsReorder:
          parseFloat(String(i.meta?.currentStock ?? 0)) <=
            parseFloat(String(i.meta?.reorderLevel ?? 0)) &&
          parseFloat(String(i.meta?.reorderLevel ?? 0)) > 0,
      }))

      const totalStockValue = stockList.reduce((s, i) => s + i.stockValue, 0)

      const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      const to = new Date().toISOString().slice(0, 10)
      const wastageMoves = await db.query.rstStockMovements.findMany({
        where: and(
          eq(rstStockMovements.organizationId, session.orgId),
          eq(rstStockMovements.movementType, 'wastage'),
          gte(rstStockMovements.createdAt, new Date(from + 'T00:00:00Z')),
          lte(rstStockMovements.createdAt, new Date(to + 'T23:59:59Z')),
        ),
      })

      return {
        data: {
          totalStockValue: Math.round(totalStockValue * 100) / 100,
          totalItems: stockList.length,
          reorderNeeded: stockList.filter((i) => i.needsReorder).length,
          wastageCount: wastageMoves.length,
          items: stockList,
        },
      }
    })

    .get('/shifts', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 7) + '-01'
      const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)

      const where: any[] = [
        eq(rstShifts.organizationId, session.orgId),
        gte(rstShifts.openedAt, new Date(from + 'T00:00:00Z')),
        lte(rstShifts.openedAt, new Date(to + 'T23:59:59Z')),
      ]
      if (outletId) where.push(eq(rstShifts.locationId, outletId))
      const shifts = await db.query.rstShifts.findMany({ where: and(...where) })

      const closedShifts = shifts.filter((s) => s.status === 'closed')
      const totalVariance = closedShifts.reduce(
        (s, sh) => s + parseFloat(String(sh.variance ?? 0)),
        0,
      )
      const unapprovedVariance = closedShifts.filter(
        (s) => !s.varianceApproved && parseFloat(String(s.variance ?? 0)) !== 0,
      ).length

      return {
        data: {
          totalShifts: shifts.length,
          closedShifts: closedShifts.length,
          openShifts: shifts.filter((s) => s.status === 'open').length,
          totalVariance: Math.round(totalVariance * 100) / 100,
          unapprovedVariance,
        },
      }
    })
}
