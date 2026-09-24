import { describe, it, expect, afterEach } from 'bun:test'
import {
  resolvePaymentConfig,
  paymentAdapterFor,
  clearPaymentAdapterCache,
  resolveReconcileLines,
} from './payment'

afterEach(() => clearPaymentAdapterCache())

describe('resolvePaymentConfig', () => {
  it('returns null when nothing is configured', () => {
    expect(resolvePaymentConfig('org-1', {})).toBeNull()
    expect(resolvePaymentConfig('org-1', { PAYMENT_PROVIDER: 'stripe' })).toBeNull()
  })

  it('resolves global stripe config', () => {
    expect(
      resolvePaymentConfig('org-1', {
        PAYMENT_PROVIDER: 'stripe',
        STRIPE_SECRET_KEY: 'sk',
        STRIPE_WEBHOOK_SECRET: 'wh',
      }),
    ).toEqual({ provider: 'stripe', stripe: { secretKey: 'sk', webhookSecret: 'wh' } })
  })

  it('prefers per-org overrides over globals', () => {
    const out = resolvePaymentConfig('org-1', {
      PAYMENT_PROVIDER: 'stripe',
      STRIPE_SECRET_KEY: 'sk-global',
      STRIPE_WEBHOOK_SECRET: 'wh-global',
      PAYMENT_ORG_1_PROVIDER: 'razorpay',
      PAYMENT_ORG_1_RAZORPAY_KEY_ID: 'kid',
      PAYMENT_ORG_1_RAZORPAY_KEY_SECRET: 'ksec',
      PAYMENT_ORG_1_RAZORPAY_WEBHOOK_SECRET: 'kwh',
    })
    expect(out?.provider).toBe('razorpay')
  })
})

describe('paymentAdapterFor', () => {
  it('returns null without config and caches per org', () => {
    expect(paymentAdapterFor('org-1', {})).toBeNull()
    const env = {
      PAYMENT_PROVIDER: 'stripe',
      STRIPE_SECRET_KEY: 'sk',
      STRIPE_WEBHOOK_SECRET: 'wh',
    }
    const a = paymentAdapterFor('org-1', env)
    expect(a).not.toBeNull()
    expect(paymentAdapterFor('org-1', {})).toBe(a)
  })
})

describe('resolveReconcileLines', () => {
  it('maps reserve movements to checkout lines', async () => {
    const mediator = {
      async query(msg: { type: string }) {
        if (msg.type === 'inventory.listMovements')
          return [
            { variantId: 'var-1', toLocationId: 'loc-1', quantity: 2 },
            { variantId: 'var-2', toLocationId: null, quantity: 1 },
          ]
        throw new Error(`unexpected ${msg.type}`)
      },
    }
    const lines = await resolveReconcileLines(mediator as never, {
      orderId: 'order-1',
      orgId: 'org-1',
      actorId: 'system',
    })
    expect(lines).toEqual([{ variantId: 'var-1', locationId: 'loc-1', qty: 2 }])
  })
})
