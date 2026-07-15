import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError, ValidationError, ConflictError } from '@core'
import { db } from '../lib/db.js'
import { rstKot, rstKotItems, rstOrderHistory } from '../db/schema/restaurant.js'
import { eq } from 'drizzle-orm'

const ORDER_TRANSITIONS: Record<string, string[]> = {
  draft: ['placed', 'cancelled'],
  placed: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'ready-for-handoff', 'cancelled'],
  ready: ['served', 'collected', 'cancelled'],
  'ready-for-handoff': ['handed-off', 'cancelled'],
  served: ['completed'],
  collected: ['completed'],
  'handed-off': ['completed'],
  completed: [],
  rejected: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
}

function orderNumber(outletCode: string): string {
  return `ORD-${outletCode}-${Date.now().toString(36).toUpperCase()}`
}

function kotNumber(outletCode: string, station: string): string {
  return `KOT-${outletCode}-${station.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`
}

async function recordHistory(
  orderId: string,
  orgId: string,
  fromStatus: string | null,
  toStatus: string,
  actorId: string,
  note?: string,
) {
  await db.insert(rstOrderHistory).values({
    id: generateId(),
    organizationId: orgId,
    orderId,
    fromStatus,
    toStatus,
    actorId,
    note,
  })
}

export function createOrderRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/orders' })
    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') ?? '50')
      const status = url.searchParams.get('status')
      const outletId = url.searchParams.get('outletId')
      const type = url.searchParams.get('type')
      const orders = await mediator.query({
        type: 'commerce.listTransactions',
        params: { orgId: session.orgId, type: 'order', status, limit, outletId },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      return { data: orders }
    })

    .get('/:id', async ({ params, request }) => {
      const session = (request as any).session
      const order = await mediator.query({
        type: 'commerce.getTransaction',
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      if (!order) throw new NotFoundError('Order not found')
      const kots = await db.query.rstKot.findMany({
        where: eq(rstKot.transactionId, params.id),
        with: { items: true },
      })
      const history = await db.query.rstOrderHistory.findMany({
        where: eq(rstOrderHistory.orderId, params.id),
        orderBy: (t, { asc }) => [asc(t.changedAt)],
      })
      return { data: { ...order, kots, history } }
    })

    .post('/', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      const outlet = await mediator.query({
        type: 'location.get',
        params: { locationId: input.outletId },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      if (!outlet) throw new NotFoundError('Outlet not found')

      if (input.tableId) {
        const table = await mediator.query({
          type: 'location.get',
          params: { locationId: input.tableId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!table) throw new NotFoundError('Table not found')
        if ((table as any).status === 'occupied') throw new ConflictError('Table already occupied')
        await mediator.dispatch({
          type: 'location.updateStatus',
          payload: { locationId: input.tableId, status: 'occupied' },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
      }

      const orderMeta: Record<string, any> = {
        orderType: input.type ?? 'dine-in',
        tableId: input.tableId,
        outletId: input.outletId,
        orderNumber: orderNumber((outlet as any).code ?? 'OUT'),
        status: 'draft',
        source: input.source ?? 'pos',
        coverCount: input.coverCount ?? input.partySize ?? 1,
        specialInstructions: input.specialInstructions,
        customerName: input.customer?.name,
        customerPhone: input.customer?.phone,
      }

      if (input.type === 'partner-delivery') {
        orderMeta.partnerId = input.partnerId
        orderMeta.deliveryAddress = input.deliveryAddress
        orderMeta.fulfilmentRef = `HD-${Date.now().toString(36).toUpperCase()}`
      }

      const order = await mediator.dispatch({
        type: 'commerce.createTransaction',
        payload: { type: 'order', meta: orderMeta },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      })

      await recordHistory(
        (order as any).id,
        session.orgId,
        null,
        'draft',
        session.actorId,
        'Order created',
      )
      return { data: order }
    })

    .post('/:id/place', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      if (!input.items?.length) throw new ValidationError('At least one item required')

      const order = await mediator.query({
        type: 'commerce.getTransaction',
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      if (!order) throw new NotFoundError('Order not found')
      const currentStatus = (order as any).meta?.status ?? 'draft'
      if (!ORDER_TRANSITIONS[currentStatus]?.includes('placed')) {
        throw new ConflictError(`Cannot transition from ${currentStatus} to placed`)
      }

      for (const item of input.items) {
        const menuItem = await mediator.query({
          type: 'catalog.getItem',
          params: { itemId: item.menuItemId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!menuItem) throw new NotFoundError(`Menu item not found: ${item.menuItemId}`)
        if ((menuItem as any).meta?.isAvailable === false)
          throw new ConflictError(`${(menuItem as any).name} is unavailable`)

        await mediator.dispatch({
          type: 'commerce.addLine',
          payload: {
            transactionId: params.id,
            itemId: item.menuItemId,
            qty: item.qty,
            unitPrice: (menuItem as any).meta?.basePrice ?? 0,
            meta: {
              name: (menuItem as any).name,
              station: (menuItem as any).meta?.station,
              modifiers: item.modifiers ?? [],
              note: item.note,
              variant: item.variant,
            },
          },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
      }

      await mediator.dispatch({
        type: 'commerce.updateTransaction',
        payload: { transactionId: params.id, meta: { ...(order as any).meta, status: 'placed' } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      })

      const stationMap = new Map<string, typeof input.items>()
      for (const item of input.items) {
        const menuItem = await mediator.query({
          type: 'catalog.getItem',
          params: { itemId: item.menuItemId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        const station = (menuItem as any)?.meta?.station ?? 'general'
        if (!stationMap.has(station)) stationMap.set(station, [])
        stationMap.get(station)!.push({ ...item, name: (menuItem as any)?.name ?? item.menuItemId })
      }

      for (const [station, items] of stationMap) {
        const kotId = generateId()
        await db.insert(rstKot).values({
          id: kotId,
          organizationId: session.orgId,
          transactionId: params.id,
          kotNumber: kotNumber(((order as any).meta?.outletId ?? 'OUT').slice(0, 3), station),
          station,
          course: input.course ?? 'main',
          status: 'new',
        })
        for (const item of items) {
          await db.insert(rstKotItems).values({
            id: generateId(),
            organizationId: session.orgId,
            kotId,
            transactionLineId: generateId(),
            itemId: item.menuItemId,
            name: item.name,
            qty: item.qty,
            notes: item.note,
            modifiers: item.modifiers ?? [],
          })
        }
        await bus.publish(
          createDomainEvent(
            'rst.kds.new-kot',
            kotId,
            'rst.kot',
            {
              kotId,
              station,
              orderId: params.id,
              orgId: session.orgId,
              outletId: (order as any).meta?.outletId,
            },
            session.orgId,
          ),
        )
      }

      await recordHistory(params.id, session.orgId, currentStatus, 'placed', session.actorId)
      await bus.publish(
        createDomainEvent(
          'rst.order.placed',
          params.id,
          'rst.order',
          { orderId: params.id, orgId: session.orgId, outletId: (order as any).meta?.outletId },
          session.orgId,
        ),
      )
      return { data: { orderId: params.id, status: 'placed' } }
    })

    .post('/:id/transition', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const targetStatus = input.status

      const order = await mediator.query({
        type: 'commerce.getTransaction',
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      if (!order) throw new NotFoundError('Order not found')
      const currentStatus = (order as any).meta?.status ?? 'draft'

      if (!ORDER_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
        throw new ConflictError(`Cannot transition from ${currentStatus} to ${targetStatus}`)
      }

      await mediator.dispatch({
        type: 'commerce.updateTransaction',
        payload: {
          transactionId: params.id,
          meta: { ...(order as any).meta, status: targetStatus },
        },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      })

      await recordHistory(
        params.id,
        session.orgId,
        currentStatus,
        targetStatus,
        session.actorId,
        input.note,
      )

      await bus.publish(
        createDomainEvent(
          `rst.order.${targetStatus}`,
          params.id,
          'rst.order',
          { orderId: params.id, orgId: session.orgId, status: targetStatus },
          session.orgId,
        ),
      )
      return { data: { orderId: params.id, status: targetStatus } }
    })

    .post('/:id/accept', async ({ params, body, request }) => {
      const session = (request as any).session
      const order = await mediator.query({
        type: 'commerce.getTransaction',
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      if (!order) throw new NotFoundError('Order not found')
      const currentStatus = (order as any).meta?.status
      if (!ORDER_TRANSITIONS[currentStatus]?.includes('accepted')) {
        throw new ConflictError(`Cannot accept order in ${currentStatus}`)
      }
      await mediator.dispatch({
        type: 'commerce.updateTransaction',
        payload: { transactionId: params.id, meta: { ...(order as any).meta, status: 'accepted' } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      })
      await recordHistory(params.id, session.orgId, currentStatus, 'accepted', session.actorId)
      return { data: { orderId: params.id, status: 'accepted' } }
    })

    .post('/:id/reject', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const order = await mediator.query({
        type: 'commerce.getTransaction',
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      })
      if (!order) throw new NotFoundError('Order not found')
      await mediator.dispatch({
        type: 'commerce.updateTransaction',
        payload: {
          transactionId: params.id,
          meta: { ...(order as any).meta, status: 'rejected', rejectReason: input?.reason },
        },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      })
      await recordHistory(
        params.id,
        session.orgId,
        (order as any).meta?.status,
        'rejected',
        session.actorId,
        input?.reason,
      )
      return { data: { orderId: params.id, status: 'rejected' } }
    })

    .post('/:id/hold', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      await db.update(rstKot).set({ holdFire: 'hold' }).where(eq(rstKot.transactionId, params.id))
      return { data: { orderId: params.id, holdFire: 'hold' } }
    })

    .post('/:id/fire', async ({ params, request }) => {
      await db.update(rstKot).set({ holdFire: 'fire' }).where(eq(rstKot.transactionId, params.id))
      return { data: { orderId: params.id, holdFire: 'fire' } }
    })

    .post('/:id/history', async ({ params, request }) => {
      const history = await db.query.rstOrderHistory.findMany({
        where: eq(rstOrderHistory.orderId, params.id),
        orderBy: (t, { asc }) => [asc(t.changedAt)],
      })
      return { data: history }
    })
}
