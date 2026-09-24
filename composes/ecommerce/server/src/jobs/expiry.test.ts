import { describe, it, expect } from 'bun:test'
import { releaseExpiredHolds } from './index'

describe('releaseExpiredHolds', () => {
  it('releases only placed orders older than the TTL', async () => {
    const calls: string[] = []
    const mediator = {
      async query(msg: { type: string }) {
        if (msg.type === 'commerce.listTransactions')
          return {
            items: [
              { id: 'stale', createdAt: new Date(1000) },
              { id: 'fresh', createdAt: new Date(9000) },
            ],
          }
        if (msg.type === 'inventory.listMovements')
          return [{ variantId: 'var-1', toLocationId: 'loc-1', quantity: 1 }]
        throw new Error(`unexpected query ${msg.type}`)
      },
      async dispatch(msg: { type: string }) {
        calls.push(msg.type)
        return { ok: true }
      },
    }
    const released = await releaseExpiredHolds(mediator as never, {
      orgId: 'org-1',
      actorId: 'system',
      now: 10000,
      ttlMs: 5000,
    })
    expect(released).toEqual(['stale'])
    expect(calls).toEqual(['inventory.release', 'commerce.moveStage'])
  })
})
