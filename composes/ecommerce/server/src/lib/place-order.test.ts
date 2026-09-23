import { describe, it, expect } from 'bun:test'
import { placeOrder } from './place-order'

function fakeMediator(behaviour: { failPayment?: boolean; calls: string[] }) {
  return {
    async query(msg: { type: string; params?: Record<string, unknown> }) {
      if (msg.type === 'catalog.resolvePrice')
        return { unitPriceAmount: 1000, unitPriceCurrency: 'USD', priceListId: 'pl', priceRuleId: 'r', minQty: 1 }
      if (msg.type === 'tax.resolveRate') return { taxRateId: 't', templateId: 'tpl', rateBps: 900 }
      if (msg.type === 'inventory.getAvailability')
        return [{ available: 10, onHand: 10, reserved: 0 }]
      throw new Error(`unexpected query ${msg.type}`)
    },
    async dispatch(msg: { type: string }) {
      behaviour.calls.push(msg.type)
      return { ok: true }
    },
  }
}

const paymentOk = {
  async createPaymentSession() {
    return { sessionId: 'sess-1', url: 'https://pay/sess-1', expiresAt: Date.now() + 1000 }
  },
}
const paymentFail = {
  async createPaymentSession() {
    throw new Error('gateway down')
  },
}

const input = {
  orderId: 'order-1',
  orgId: 'org-1',
  actorId: 'actor-1',
  currency: 'USD',
  audience: {},
  jurisdiction: 'KA',
  lines: [{ variantId: 'var-1', locationId: 'loc-1', qty: 2 }],
}

describe('placeOrder saga', () => {
  it('reserves, sessions, and marks placed with totals on success', async () => {
    const calls: string[] = []
    const out = await placeOrder(input, {
      mediator: fakeMediator({ calls }),
      payment: paymentOk,
    } as never)
    expect(out.grandTotalAmount).toBe(2180)
    expect(out.session.sessionId).toBe('sess-1')
    expect(calls).toEqual(['inventory.reserve', 'commerce.moveStage'])
  })

  it('releases reservations when payment fails', async () => {
    const calls: string[] = []
    await expect(
      placeOrder(input, { mediator: fakeMediator({ calls }), payment: paymentFail } as never),
    ).rejects.toThrow(/gateway down/)
    expect(calls).toEqual(['inventory.reserve', 'inventory.release'])
  })
})
