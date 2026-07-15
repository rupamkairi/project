import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent } from '@core'
import { db } from '../lib/db.js'
import { rstKot } from '../db/schema/restaurant.js'
import { eq } from 'drizzle-orm'

export function registerRestaurantHooks(bus: EventBus, mediator: Mediator): void {
  bus.subscribe('rst.kot.ready', async (event) => {
    const { kotId, orderId, orgId } = event.payload as any
    const kots = await db.query.rstKot.findMany({ where: eq(rstKot.transactionId, orderId) })
    const allReady = kots.every((k) => k.status === 'ready' || k.status === 'bumped')
    if (!allReady) return

    const order = (await mediator
      .query({
        type: 'commerce.getTransaction',
        params: { transactionId: orderId },
        actorId: 'system',
        orgId,
      })
      .catch(() => null)) as any
    if (!order) return

    const orderMeta = order.meta ?? {}
    const nextStatus = orderMeta.orderType === 'partner-delivery' ? 'ready-for-handoff' : 'ready'

    await mediator.dispatch({
      type: 'commerce.updateTransaction',
      payload: { transactionId: orderId, meta: { ...orderMeta, status: nextStatus } },
      actorId: 'system',
      orgId,
      correlationId: generateId(),
    })

    await bus.publish(
      createDomainEvent(
        'rst.order.ready',
        orderId,
        'rst.order',
        { orderId, orgId, nextStatus },
        orgId,
      ),
    )

    if (orderMeta.orderType === 'partner-delivery') {
      await bus.publish(
        createDomainEvent(
          'rst.logistics.handoff-ready',
          orderId,
          'rst.logistics',
          {
            orderId,
            orgId,
            outletId: orderMeta.outletId,
            customerRef: orderMeta.customerRef,
            fulfilmentRef: orderMeta.fulfilmentRef,
            partnerId: orderMeta.partnerId,
          },
          orgId,
        ),
      )
    }
  })

  bus.subscribe('rst.order.settled', async (event) => {
    const { billId, orderId, orgId } = event.payload as any
    if (!orderId) return
    const order = (await mediator
      .query({
        type: 'commerce.getTransaction',
        params: { transactionId: orderId },
        actorId: 'system',
        orgId,
      })
      .catch(() => null)) as any
    if (!order) return

    const orderMeta = order.meta ?? {}

    await mediator
      .dispatch({
        type: 'commerce.updateTransaction',
        payload: { transactionId: orderId, meta: { ...orderMeta, status: 'completed' } },
        actorId: 'system',
        orgId,
        correlationId: generateId(),
      })
      .catch(() => {})

    if (orderMeta.tableId && orderMeta.orderType === 'dine-in') {
      await mediator
        .dispatch({
          type: 'location.updateStatus',
          payload: { locationId: orderMeta.tableId, status: 'active' },
          actorId: 'system',
          orgId,
          correlationId: generateId(),
        })
        .catch(() => {})
    }
  })

  bus.subscribe('rst.menu.item-86d', async (event) => {
    const { menuItemId, outletId, available, orgId } = event.payload as any
    await bus.publish(
      createDomainEvent(
        'rst.pos.broadcast',
        menuItemId,
        'rst.menu-item',
        {
          outletId,
          event: 'menu-update',
          data: { menuItemId, isAvailable: available },
          orgId,
        },
        orgId,
      ),
    )
  })
}
