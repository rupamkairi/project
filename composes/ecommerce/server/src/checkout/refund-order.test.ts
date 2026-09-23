import { describe, it, expect } from 'bun:test'
import { refundOrder } from './refund-order'

function fakes(
  stage: string | null,
  mediatorCalls: string[],
  refundCalls: string[],
  claimState: 'new' | 'done' = 'new',
) {
  return {
    mediator: {
      async query(msg: { type: string }) {
        if (msg.type === 'commerce.getTransaction') return { id: 'order-1', stageId: stage }
        throw new Error(`unexpected query ${msg.type}`)
      },
      async dispatch(msg: { type: string }) {
        mediatorCalls.push(msg.type)
        if (msg.type === 'commerce.claimReconcileEvent') return { state: claimState, first: true }
        if (msg.type === 'ledger.createJournal') return { id: 'journal-9' }
        return { ok: true }
      },
    },
    payment: {
      async refund() {
        refundCalls.push('refund')
        return { success: true, refundId: 'ref-1' }
      },
    },
  }
}

const input = {
  orderId: 'order-1',
  orgId: 'org-1',
  actorId: 'a',
  gatewayRef: 'pay-1',
  amount: 2180,
  currency: 'USD',
}

describe('refundOrder', () => {
  it('refuses orders that were never confirmed', async () => {
    const mediatorCalls: string[] = []
    const refundCalls: string[] = []
    await expect(
      refundOrder(input, fakes('placed', mediatorCalls, refundCalls) as never),
    ).rejects.toThrow(/confirmed/i)
    expect(mediatorCalls).toEqual([])
    expect(refundCalls).toEqual([])
  })

  it('refunds at the gateway, posts the reversal, and marks refunded', async () => {
    const mediatorCalls: string[] = []
    const refundCalls: string[] = []
    const out = await refundOrder(input, fakes('confirmed', mediatorCalls, refundCalls) as never)
    expect(out.refundId).toBe('ref-1')
    expect(out.deduped).toBe(false)
    expect(refundCalls).toEqual(['refund'])
    expect(mediatorCalls).toEqual([
      'commerce.claimReconcileEvent',
      'ledger.createJournal',
      'ledger.postJournal',
      'commerce.moveStage',
      'commerce.finishReconcileEvent',
    ])
  })

  it('dedupes an already-refunded order without touching the gateway', async () => {
    const mediatorCalls: string[] = []
    const refundCalls: string[] = []
    const out = await refundOrder(input, fakes('refunded', mediatorCalls, refundCalls, 'done') as never)
    expect(out.deduped).toBe(true)
    expect(refundCalls).toEqual([])
    expect(mediatorCalls).toEqual(['commerce.claimReconcileEvent'])
  })
})
