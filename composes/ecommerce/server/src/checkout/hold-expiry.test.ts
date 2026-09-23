import { describe, it, expect } from 'bun:test'
import { selectStaleHolds, releaseStaleHolds } from './hold-expiry'

const holds = [
  { orderId: 'old', placedAt: 1000, lines: [{ variantId: 'v', locationId: 'l', qty: 1 }] },
  { orderId: 'fresh', placedAt: 9000, lines: [{ variantId: 'v', locationId: 'l', qty: 1 }] },
]

describe('selectStaleHolds', () => {
  it('returns holds older than the TTL', () => {
    expect(selectStaleHolds(holds, 10000, 5000).map((h) => h.orderId)).toEqual(['old'])
    expect(selectStaleHolds(holds, 10000, 60000)).toEqual([])
  })
})

describe('releaseStaleHolds', () => {
  it('cancels only stale holds', async () => {
    const calls: string[] = []
    const mediator = {
      async dispatch(msg: { type: string }) {
        calls.push(msg.type)
        return { ok: true }
      },
    }
    const released = await releaseStaleHolds(
      holds,
      10000,
      5000,
      { orgId: 'org-1', actorId: 'system' },
      { mediator: mediator as never },
    )
    expect(released).toEqual(['old'])
    expect(calls).toEqual(['inventory.release', 'commerce.moveStage'])
  })
})
