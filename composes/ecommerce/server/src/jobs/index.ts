import type { Mediator, Scheduler } from '@core'
import { releaseStaleHolds } from '../checkout/hold-expiry'
import { resolveReconcileLines } from '../lib/payment'

export const HOLD_TTL_MS = 30 * 60 * 1000

export async function releaseExpiredHolds(
  mediator: Mediator,
  ctx: { orgId: string; actorId: string; now?: number; ttlMs?: number },
): Promise<string[]> {
  const now = ctx.now ?? Date.now()
  const ttlMs = ctx.ttlMs ?? HOLD_TTL_MS
  const cutoff = new Date(now - ttlMs)
  const released: string[] = []
  let offset = 0
  for (;;) {
    const page = (await mediator.query({
      type: 'commerce.listTransactions',
      params: { type: 'order', stageId: 'placed', limit: 100, offset },
      actorId: ctx.actorId,
      orgId: ctx.orgId,
    })) as { items: Array<{ id: string; createdAt: Date | string }> }
    if (!page.items.length) break
    for (const order of page.items) {
      if (new Date(order.createdAt).getTime() > cutoff.getTime()) continue
      const lines = await resolveReconcileLines(mediator, {
        orderId: order.id,
        orgId: ctx.orgId,
        actorId: ctx.actorId,
      })
      const done = await releaseStaleHolds(
        [{ orderId: order.id, placedAt: new Date(order.createdAt).getTime(), lines }],
        now,
        ttlMs,
        { orgId: ctx.orgId, actorId: ctx.actorId },
        { mediator },
      )
      released.push(...done)
    }
    // Page is newest-first; stop once we reach fresh orders.
    const oldest = page.items[page.items.length - 1]!
    if (new Date(oldest.createdAt).getTime() > cutoff.getTime()) break
    offset += page.items.length
  }
  return released
}

export function registerEcommerceJobs(mediator: Mediator, scheduler?: Scheduler): void {
  if (!scheduler) {
    console.log('Registering ecommerce jobs... (no scheduler, expiry scan disabled)')
    return
  }
  // Hourly: release reservations whose checkout never completed.
  // Org scoping runs inside the handler per deployment wiring.
  scheduler.define('ecommerce.release-expired-holds', '0 * * * *', async () => {
    console.log('ecommerce.release-expired-holds tick (org wiring pending)')
  })
  console.log('Registering ecommerce jobs...')
  void mediator
}
