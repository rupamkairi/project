import { describe, it, expect } from 'bun:test'
import { confirmOrder } from './confirm-order'

function fakeMediator(behaviour: {
  stage: string | null
  calls: string[]
}) {
  return {
    async query(msg: { type: string }) {
      if (msg.type === 'commerce.getTransaction') return { id: 'order-1', stageId: behaviour.stage }
      throw new Error(`unexpected query ${msg.type}`)
    },
    async dispatch(msg: { type: string }) {
      behaviour.calls.push(msg.type)
      if (msg.type === 'ledger.createJournal') return { id: 'journal-1' }
      return { ok: true }
    },
  }
}

const input = {
  orderId: 'order-1',
  orgId: 'org-1',
  actorId: 'system',
  gatewayRef: 'pay-123',
  paymentEventId: 'evt-1',
  currency: 'USD',
  idempotencyKey: 'evt-1',
  lines: [{ variantId: 'var-1', locationId: 'loc-1', qty: 2 }],
  grandTotalAmount: 2180,
}

describe('confirmOrder', () => {
  it('deducts, posts the receivable journal, and confirms on first reconcile', async () => {
    const calls: string[] = []
    const out = await confirmOrder(input, { mediator: fakeMediator({ stage: 'placed', calls }) } as never)
    expect(out.deduped).toBe(false)
    expect(calls).toEqual([
      'inventory.deduct',
      'ledger.createJournal',
      'ledger.postJournal',
      'commerce.updateTransaction',
      'commerce.moveStage',
    ])
  })

  it('is a no-op when the order is already confirmed', async () => {
    const calls: string[] = []
    const out = await confirmOrder(input, { mediator: fakeMediator({ stage: 'confirmed', calls }) } as never)
    expect(out.deduped).toBe(true)
    expect(calls).toEqual([])
  })
})
