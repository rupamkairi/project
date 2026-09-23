import { describe, it, expect } from 'bun:test'
import { placeOrder, cancelOrder, applyTaxedTotal } from './place-order'

function fakeMediator(behaviour: { calls: Array<{ type: string; correlationId?: string | undefined }> }) {
  return {
    async query(msg: { type: string }) {
      if (msg.type === 'catalog.resolvePrice')
        return { unitPriceAmount: 1000, unitPriceCurrency: 'USD', priceListId: 'pl', priceRuleId: 'r', minQty: 1 }
      if (msg.type === 'tax.resolveRate') return { taxRateId: 't', templateId: 'tpl', rateBps: 900 }
      throw new Error(`unexpected query ${msg.type}`)
    },
    async dispatch(msg: { type: string; correlationId?: string | undefined }) {
      behaviour.calls.push({ type: msg.type, correlationId: msg.correlationId })
      return { ok: true }
    },
  }
}

const paymentOk = {
  async createPaymentSession() {
    return { sessionId: 'sess-1', url: 'https://pay/sess-1', expiresAt: 999 }
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
  idempotencyKey: 'key-1',
  lines: [{ variantId: 'var-1', locationId: 'loc-1', qty: 2 }],
}

describe('applyTaxedTotal', () => {
  it('applies basis-point tax to the extended price', () => {
    expect(applyTaxedTotal(1000, 2, 900)).toBe(2180)
  })
})

describe('placeOrder saga', () => {
  it('reserves, sessions, and marks placed with totals on success', async () => {
    const calls: Array<{ type: string; correlationId?: string }> = []
    const out = await placeOrder(input, {
      mediator: fakeMediator({ calls }),
      payment: paymentOk,
    } as never)
    expect(out.grandTotalAmount).toBe(2180)
    expect(out.session.sessionId).toBe('sess-1')
    expect(calls.map((c) => c.type)).toEqual(['inventory.reserve', 'commerce.moveStage'])
    expect(new Set(calls.map((c) => c.correlationId)).size).toBe(1)
  })

  it('preserves the reservation when payment fails so the shopper can retry', async () => {
    const calls: Array<{ type: string; correlationId?: string }> = []
    await expect(
      placeOrder(input, { mediator: fakeMediator({ calls }), payment: paymentFail } as never),
    ).rejects.toThrow(/gateway down/)
    expect(calls.map((c) => c.type)).toEqual(['inventory.reserve'])
  })

  it('cancelOrder releases holds and marks cancelled', async () => {
    const calls: Array<{ type: string; correlationId?: string }> = []
    await cancelOrder(input, { mediator: fakeMediator({ calls }) } as never)
    expect(calls.map((c) => c.type)).toEqual(['inventory.release', 'commerce.moveStage'])
  })
})
