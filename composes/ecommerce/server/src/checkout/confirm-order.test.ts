import { describe, it, expect } from 'bun:test'
import { confirmOrder } from './confirm-order'

function fakeMediator(behaviour: {
  stage: string | null
  meta?: Record<string, unknown>
  calls: Array<{ type: string; payload?: Record<string, unknown> }>
}) {
  return {
    async query(msg: { type: string }) {
      if (msg.type === 'commerce.getTransaction')
        return { id: 'order-1', stageId: behaviour.stage, meta: behaviour.meta ?? {} }
      throw new Error(`unexpected query ${msg.type}`)
    },
    async dispatch(msg: { type: string; payload?: Record<string, unknown> }) {
      behaviour.calls.push({ type: msg.type, payload: msg.payload })
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
    const calls: Array<{ type: string; payload?: Record<string, unknown> }> = []
    const out = await confirmOrder(input, { mediator: fakeMediator({ stage: 'placed', calls }) } as never)
    expect(out.deduped).toBe(false)
    expect(calls.map((c) => c.type)).toEqual([
      'inventory.deduct',
      'ledger.createJournal',
      'ledger.postJournal',
      'commerce.updateTransaction',
      'commerce.moveStage',
    ])
    const journal = calls.find((c) => c.type === 'ledger.createJournal')?.payload as {
      lines: Array<{ debit: number; credit: number }>
    }
    expect(journal.lines[0]).toEqual({ accountCode: 'RECEIVABLE', debit: 21.8, credit: 0 })
    const update = calls.find((c) => c.type === 'commerce.updateTransaction')?.payload as {
      meta: Record<string, unknown>
    }
    expect(update.meta.processedPaymentEvents).toEqual(['evt-1'])
  })

  it('is a no-op when the order is already confirmed', async () => {
    const calls: Array<{ type: string; payload?: Record<string, unknown> }> = []
    const out = await confirmOrder(input, { mediator: fakeMediator({ stage: 'confirmed', calls }) } as never)
    expect(out.deduped).toBe(true)
    expect(calls).toEqual([])
  })

  it('dedupes a retried event via the recorded event id even while still placed', async () => {
    const calls: Array<{ type: string; payload?: Record<string, unknown> }> = []
    const out = await confirmOrder(input, {
      mediator: fakeMediator({ stage: 'placed', meta: { processedPaymentEvents: ['evt-1'] }, calls }),
    } as never)
    expect(out.deduped).toBe(true)
    expect(calls).toEqual([])
  })
})
