import { describe, it, expect } from 'bun:test'
import { onPaymentReceived } from './on-payment-received'

const ctx = {
  orgId: 'org-1',
  currency: 'USD',
  lines: [{ variantId: 'var-1', locationId: 'loc-1', qty: 2 }],
  grandTotalAmount: 2180,
}

function mediatorFor(stage: string | null) {
  const calls: string[] = []
  return {
    calls,
    async query(msg: { type: string }) {
      if (msg.type === 'commerce.getTransaction') return { id: 'order-1', stageId: stage, meta: {} }
      if (msg.type === 'inventory.listMovements') return []
      if (msg.type === 'ledger.getJournalByReference') return null
      throw new Error(`unexpected query ${msg.type}`)
    },
    async dispatch(msg: { type: string }) {
      calls.push(msg.type)
      if (msg.type === 'commerce.claimReconcileEvent') return { state: 'new', first: true }
      if (msg.type === 'ledger.createJournal') return { id: 'journal-1' }
      return { ok: true }
    },
  }
}

describe('onPaymentReceived', () => {
  it('rejects webhooks whose amount disagrees with the order total', async () => {
    const mediator = mediatorFor('placed')
    await expect(
      onPaymentReceived('order-1', { amount: 100, currency: 'USD' }, 'pay-1', mediator as never, ctx),
    ).rejects.toThrow(/does not match order total/)
    expect(mediator.calls).toEqual([])
  })

  it('confirms when the amounts agree', async () => {
    const mediator = mediatorFor('placed')
    const out = await onPaymentReceived(
      'order-1',
      { amount: 2180, currency: 'USD' },
      'pay-1',
      mediator as never,
      ctx,
    )
    expect(out.deduped).toBe(false)
    expect(mediator.calls).toContain('commerce.moveStage')
  })
})
