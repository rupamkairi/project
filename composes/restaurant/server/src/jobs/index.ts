import type { Mediator, EventBus, Scheduler } from '@core'

export function registerRestaurantJobs(
  scheduler: Scheduler,
  mediator: Mediator,
  bus: EventBus,
): void {
  // Stock reorder alerts — runs every 15 min
  scheduler.define('rst.inventory.reorder-check', '*/15 * * * *', async () => {
    try {
      const items = (await mediator
        .query({
          type: 'catalog.listItems',
          params: { type: 'stock_item', limit: 1000 },
          actorId: 'system',
          orgId: '*',
        })
        .catch(() => [])) as any[]
      for (const item of items) {
        const currentStock = parseFloat(String(item.meta?.currentStock ?? 0))
        const reorderLevel = parseFloat(String(item.meta?.reorderLevel ?? 0))
        if (currentStock <= reorderLevel && reorderLevel > 0) {
          try {
            await mediator.dispatch({
              type: 'notification.send',
              payload: {
                channel: 'in-app',
                title: 'Low Stock Alert',
                body: `${item.name} is at ${currentStock} (reorder at ${reorderLevel})`,
                orgId: item.organizationId,
              },
              actorId: 'system',
              orgId: item.organizationId,
              correlationId: item.id,
            })
          } catch {
            /* skip failed notifications */
          }
        }
      }
    } catch {
      /* skip */
    }
  })
}
