import { describe, it, expect } from 'bun:test'
import { refundOrder } from './refund-order'

function fakes(
  stage: string | null,
  mediatorCalls: string[],
  refundCalls: string[],
  claimState: 'new' | 'in-progress' | 'done' = 'new',
  meta: Record<string, unknown> = {},
) {
  return {
    mediator: {
      async query(msg: { type: string }) {
        if (msg.type === 'commerce.getTransaction') return { id: 'order-1', stageId: stage, meta }
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
  idempotencyKey: 'refund-attempt-1',
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
      'commerce.updateTransaction',
      'commerce.finishReconcileEvent',
    ])
  })

  it('dedupes an already-refunded order and returns the recorded refund id', async () => {
    const mediatorCalls: string[] = []
    const refundCalls: string[] = []
    const out = await refundOrder(input, {
      mediator: fakes('refunded', mediatorCalls, refundCalls, 'done', { refunds: ['ref-1'] })
        .mediator as never,
      payment: fakes('refunded', mediatorCalls, refundCalls, 'done').payment as never,
    })
    expect(out).toEqual({ orderId: 'order-1', refundId: 'ref-1', deduped: true })
    expect(refundCalls).toEqual([])
    expect(mediatorCalls).toEqual(['commerce.claimReconcileEvent'])
  })

  it('backs off when a refund for the same key is already in progress', async () => {
    const mediatorCalls: string[] = []
    const refundCalls: string[] = []
    await expect(
      refundOrder(input, fakes('confirmed', mediatorCalls, refundCalls, 'in-progress') as never),
    ).rejects.toThrow(/already in progress/)
    expect(refundCalls).toEqual([])
    expect(mediatorCalls).toEqual(['commerce.claimReconcileEvent'])
  })
})
