import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError, ConflictError, ValidationError } from '@core'
import { db } from '@db/client'
import { transactions } from '@db/schema/commerce'
import {
  rstBillPayments,
  rstBillSplits,
  rstDiscounts,
  rstShifts,
} from '../db/schema/restaurant.js'
import { and, eq, desc, asc, isNull } from 'drizzle-orm'

function billNumber(outletCode: string): string {
  return `BILL-${outletCode}-${Date.now().toString(36).toUpperCase()}`
}

function mapTransactionToBill(row: typeof transactions.$inferSelect) {
  const meta = (row.meta ?? {}) as Record<string, any>
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: meta.orderId,
    outletId: meta.outletId,
    billNumber: meta.billNumber ?? row.referenceNo,
    subtotal: meta.subtotal ?? '0',
    discountTotal: meta.discountTotal ?? '0',
    taxTotal: meta.taxTotal ?? String((row.taxAmount ?? 0) / 100),
    serviceCharge: meta.serviceCharge ?? '0',
    tipAmount: meta.tipAmount ?? '0',
    roundOff: meta.roundOff ?? '0',
    grandTotal: meta.grandTotal ?? String((row.totalAmount ?? 0) / 100),
    status: meta.status ?? 'open',
    tableId: meta.tableId,
    coverCount: meta.coverCount,
    cashierId: meta.cashierId,
    shiftId: meta.shiftId,
    receiptNumber: meta.receiptNumber,
    createdAt: row.createdAt,
    settledAt: meta.settledAt ? new Date(meta.settledAt) : null,
    voidedAt: meta.voidedAt ? new Date(meta.voidedAt) : null,
    voidReason: meta.voidReason,
  }
}

async function findBill(id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.type, 'bill'), isNull(transactions.deletedAt)))
    .limit(1)
  return row
}

export function createBillingRoutes(mediator: Mediator, bus: EventBus) {
  return (
    new Elysia({ prefix: '/billing' })
      // ── Bills ──
      .post('/bills', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const order = await mediator.query({
          type: 'commerce.getTransaction',
          params: { id: input.orderId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!order) throw new NotFoundError('Order not found')
        const orderData = order as any
        const outletCode = (orderData.meta?.outletId ?? 'OUT').slice(0, 3)
        const subtotal = input.subtotal ?? orderData.total ?? '0'
        const discountTotal = input.discountTotal ?? '0'
        const taxTotal = input.taxTotal ?? '0'
        const serviceCharge = input.serviceCharge ?? '0'
        const tipAmount = input.tipAmount ?? '0'
        const roundOff = input.roundOff ?? '0'
        const grandTotal = input.grandTotal ?? subtotal
        const billNo = billNumber(outletCode)

        const grandTotalNum = parseFloat(String(grandTotal))
        const taxTotalNum = parseFloat(String(taxTotal))

        const [bill] = await db
          .insert(transactions)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            type: 'bill',
            referenceNo: billNo,
            totalAmount: Math.round(grandTotalNum * 100),
            totalCurrency: 'USD',
            taxAmount: Math.round(taxTotalNum * 100),
            taxCurrency: 'USD',
            meta: {
              orderId: input.orderId,
              outletId: orderData.meta?.outletId,
              billNumber: billNo,
              subtotal,
              discountTotal,
              taxTotal,
              serviceCharge,
              tipAmount,
              roundOff,
              grandTotal,
              status: 'open',
              tableId: orderData.meta?.tableId,
              coverCount: orderData.meta?.coverCount,
              cashierId: session.actorId,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          })
          .returning()
        return { data: mapTransactionToBill(bill!) }
      })

      .get('/bills', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const outletId = url.searchParams.get('outletId')
        const status = url.searchParams.get('status')

        const rows = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.organizationId, session.orgId),
              eq(transactions.type, 'bill'),
              isNull(transactions.deletedAt),
            ),
          )
          .orderBy(desc(transactions.createdAt))
          .limit(50)

        const filtered = rows.map(mapTransactionToBill).filter((b) => {
          if (outletId && b.outletId !== outletId) return false
          if (status && b.status !== status) return false
          return true
        })

        const bills = await Promise.all(
          filtered.map(async (b) => {
            const payments = await db
              .select()
              .from(rstBillPayments)
              .where(eq(rstBillPayments.transactionId, b.id))
            const splits = await db
              .select()
              .from(rstBillSplits)
              .where(eq(rstBillSplits.transactionId, b.id))
            return { ...b, payments, splits }
          }),
        )
        return { data: bills }
      })

      .get('/bills/:id', async ({ params, request }) => {
        const row = await findBill(params.id)
        if (!row) throw new NotFoundError('Bill not found')
        const bill = mapTransactionToBill(row)
        const payments = await db
          .select()
          .from(rstBillPayments)
          .where(eq(rstBillPayments.transactionId, params.id))
        const splits = await db
          .select()
          .from(rstBillSplits)
          .where(eq(rstBillSplits.transactionId, params.id))
        return { data: { ...bill, payments, splits } }
      })

      .post('/bills/:id/settle', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const row = await findBill(params.id)
        if (!row) throw new NotFoundError('Bill not found')
        const bill = mapTransactionToBill(row)

        const billGrandTotal = parseFloat(String(bill.grandTotal))
        const totalPaid = (input.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0)

        if (input.partial) {
          if (totalPaid <= 0) throw new ValidationError('Payment amount required')
        } else {
          if (Math.abs(totalPaid - billGrandTotal) > 0.01) {
            throw new ConflictError(
              `Payments total ${totalPaid} does not match bill ${billGrandTotal}`,
            )
          }
        }

        for (const pmt of input.payments) {
          await db.insert(rstBillPayments).values({
            id: generateId(),
            organizationId: session.orgId,
            transactionId: params.id,
            method: pmt.method,
            amount: String(pmt.amount),
            referenceNumber: pmt.referenceNumber,
            cardLastFour: pmt.cardLastFour,
          })
        }

        const newStatus = input.partial ? 'partial' : 'settled'
        const meta = (row.meta ?? {}) as Record<string, any>

        const [updated] = await db
          .update(transactions)
          .set({
            meta: {
              ...meta,
              status: newStatus,
              settledAt: newStatus === 'settled' ? new Date().toISOString() : null,
            },
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, params.id))
          .returning()

        if (newStatus === 'settled') {
          await bus.publish(
            createDomainEvent(
              'rst.order.settled',
              params.id,
              'rst.bill',
              { billId: params.id, orderId: bill.orderId, orgId: session.orgId },
              session.orgId,
            ),
          )
        }
        return { data: mapTransactionToBill(updated!) }
      })

      .post('/bills/:id/void', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        if (!input?.reason) throw new ValidationError('Void reason required')
        const row = await findBill(params.id)
        if (!row) throw new NotFoundError('Bill not found')
        const bill = mapTransactionToBill(row)
        if (bill.status === 'voided') throw new ConflictError('Bill already voided')

        const meta = (row.meta ?? {}) as Record<string, any>
        await db
          .update(transactions)
          .set({
            meta: {
              ...meta,
              status: 'voided',
              voidedAt: new Date().toISOString(),
              voidReason: input.reason,
            },
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, params.id))

        if (input.refundPayments) {
          for (const r of input.refundPayments) {
            await db.insert(rstBillPayments).values({
              id: generateId(),
              organizationId: session.orgId,
              transactionId: params.id,
              method: r.method,
              amount: String(r.amount),
              isRefund: true,
              refundReason: input.reason,
              referenceNumber: r.referenceNumber,
            })
          }
        }
        return { data: { billId: params.id, status: 'voided' } }
      })

      // ── Split Bills ──
      .post('/bills/:id/split', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const row = await findBill(params.id)
        if (!row) throw new NotFoundError('Bill not found')
        const [split] = await db
          .insert(rstBillSplits)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            transactionId: params.id,
            guestLabel: input.guestLabel,
            itemIds: input.itemIds ?? [],
            subtotal: input.subtotal ?? '0',
          })
          .returning()
        return { data: split }
      })

      // ── Discounts ──
      .get('/discounts', async ({ request }) => {
        const session = (request as any).session
        const discounts = await db.query.rstDiscounts.findMany({
          where: and(
            eq(rstDiscounts.organizationId, session.orgId),
            eq(rstDiscounts.isActive, true),
          ),
          orderBy: (t, { asc }) => [asc(t.name)],
        })
        return { data: discounts }
      })

      .post('/discounts', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [discount] = await db
          .insert(rstDiscounts)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            name: input.name,
            discountType: input.discountType,
            value: String(input.value),
            isPercentage: input.isPercentage ?? true,
            appliesTo: input.appliesTo ?? 'order',
            requiresApproval: input.requiresApproval ?? false,
            outletId: input.outletId,
          })
          .returning()
        return { data: discount }
      })

      // ── Shifts ──
      .get('/shifts', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const outletId = url.searchParams.get('outletId')
        const shifts = await db.query.rstShifts.findMany({
          where: and(
            eq(rstShifts.organizationId, session.orgId),
            outletId ? eq(rstShifts.locationId, outletId) : undefined,
          ),
          orderBy: (t, { desc }) => [desc(t.openedAt)],
          limit: 10,
        })
        return { data: shifts }
      })

      .post('/shifts', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [shift] = await db
          .insert(rstShifts)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            locationId: input.outletId,
            date: new Date().toISOString().slice(0, 10),
            startTime: new Date().toTimeString().slice(0, 5),
            openedBy: session.actorId,
            openingBalance: input.openingBalance ?? '0',
          })
          .returning()
        return { data: shift }
      })

      .get('/shifts/open', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const outletId = url.searchParams.get('outletId')
        const shift = await db.query.rstShifts.findFirst({
          where: and(
            eq(rstShifts.organizationId, session.orgId),
            eq(rstShifts.status, 'open'),
            outletId ? eq(rstShifts.locationId, outletId) : undefined,
          ),
        })
        return { data: shift ?? null }
      })

      .post('/shifts/:id/close', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const shift = await db.query.rstShifts.findFirst({ where: eq(rstShifts.id, params.id) })
        if (!shift) throw new NotFoundError('Shift not found')
        if (shift.status !== 'open') throw new ConflictError('Shift is not open')

        const closingBalance = input.closingBalance
        const openingBalance = parseFloat(String(shift.openingBalance))
        const variance = parseFloat(String(closingBalance ?? 0)) - openingBalance

        const [closed] = await db
          .update(rstShifts)
          .set({
            status: 'closed',
            closedBy: session.actorId,
            closingBalance: String(closingBalance ?? 0),
            expectedBalance: input.expectedBalance,
            variance: String(Math.round(variance * 100) / 100),
            notes: input.notes,
            closedAt: new Date(),
          })
          .where(eq(rstShifts.id, params.id))
          .returning()
        return { data: closed }
      })

      .post('/shifts/:id/approve-variance', async ({ params, request }) => {
        const session = (request as any).session
        const [updated] = await db
          .update(rstShifts)
          .set({ varianceApproved: true, approvedBy: session.actorId })
          .where(eq(rstShifts.id, params.id))
          .returning()
        return { data: updated }
      })
  )
}
