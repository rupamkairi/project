import type { Mediator } from '@core'
import { cancelOrder } from './place-order'
import type { PlaceOrderLine } from './place-order'

export interface StaleHold {
  orderId: string
  placedAt: number
  lines: PlaceOrderLine[]
}

export function selectStaleHolds(holds: StaleHold[], now: number, ttlMs: number): StaleHold[] {
  return holds.filter((h) => now - h.placedAt >= ttlMs)
}

export async function releaseStaleHolds(
  holds: StaleHold[],
  now: number,
  ttlMs: number,
  ctx: { orgId: string; actorId: string; idempotencyKey?: string },
  deps: { mediator: Mediator },
): Promise<string[]> {
  const released: string[] = []
  for (const hold of selectStaleHolds(holds, now, ttlMs)) {
    await cancelOrder(
      { orderId: hold.orderId, orgId: ctx.orgId, actorId: ctx.actorId, lines: hold.lines },
      deps,
    )
    released.push(hold.orderId)
  }
  return released
}
