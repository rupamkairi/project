import { describe, it, expect } from 'bun:test'
import { confirmOrder } from './confirm-order'

function fakeMediator(behaviour: {
  claimState?: 'new' | 'in-progress' | 'done'
  stage?: string | null
  movements?: Array<{ variantId: string }>
  journal?: { id: string } | null
  calls: Array<{ type: string; payload?: Record<string, unknown> | undefined }>
}) {
  return {
    async query(msg: { type: string }) {
      if (msg.type === 'commerce.getTransaction') return { id: 'order-1', stageId: behaviour.stage ?? 'placed' }
      if (msg.type === 'inventory.listMovements') return behaviour.movements ?? []
      if (msg.type === 'ledger.getJournalByReference') return behaviour.journal ?? null
      throw new Error(`unexpected query ${msg.type}`)
    },
    async dispatch(msg: { type: string; payload?: Record<string, unknown> | undefined }) {
      behaviour.calls.push({ type: msg.type, payload: msg.payload })
      if (msg.type === 'commerce.claimReconcileEvent')
        return { state: behaviour.claimState ?? 'new', first: true }
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

const TYPES = (calls: Array<{ type: string }>) => calls.map((c) => c.type)

describe('confirmOrder', () => {
  it('claims, deducts, posts the receivable journal, and confirms on first reconcile', async () => {
    const calls: Array<{ type: string; payload?: Record<string, unknown> }> = []
    const out = await confirmOrder(input, { mediator: fakeMediator({ calls }) } as never)
    expect(out.deduped).toBe(false)
    expect(TYPES(calls)).toEqual([
      'commerce.claimReconcileEvent',
      'inventory.deduct',
      'ledger.createJournal',
      'ledger.postJournal',
      'commerce.updateTransaction',
      'commerce.moveStage',
      'commerce.finishReconcileEvent',
    ])
    const journal = calls.find((c) => c.type === 'ledger.createJournal')?.payload as {
      lines: Array<{ accountCode: string; debit: number; credit: number }>
    }
    expect(journal.lines[0]!).toEqual({ accountCode: 'RECEIVABLE', debit: 21.8, credit: 0 })
  })

  it('dedupes a claimed event without touching stock or ledger', async () => {
    const calls: Array<{ type: string; payload?: Record<string, unknown> }> = []
    const out = await confirmOrder(input, {
      mediator: fakeMediator({ claimState: 'done', calls }),
    } as never)
    expect(out.deduped).toBe(true)
    expect(TYPES(calls)).toEqual(['commerce.claimReconcileEvent'])
  })

  it('resumes a crashed reconcile by skipping completed steps', async () => {
    const calls: Array<{ type: string; payload?: Record<string, unknown> }> = []
    const out = await confirmOrder(input, {
      mediator: fakeMediator({
        claimState: 'in-progress',
        movements: [{ variantId: 'var-1' }],
        journal: { id: 'journal-1' },
        calls,
      }),
    } as never)
    expect(out.deduped).toBe(false)
    expect(TYPES(calls)).toEqual([
      'commerce.claimReconcileEvent',
      'commerce.updateTransaction',
      'commerce.moveStage',
      'commerce.finishReconcileEvent',
    ])
  })
})
