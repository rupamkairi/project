import type { Mediator, PaymentAdapter } from '@core'
import { createPaymentPlugin } from '@projectx/plugin-payment-server'
import type { PaymentPluginConfig } from '@projectx/plugin-payment-server/types'
import { onPaymentReceived } from '../hooks/on-payment-received'
import { onPaymentFailed as onFailed } from '../hooks/on-payment-failed'

export type PaymentProvider = 'stripe' | 'razorpay'

export interface ResolvedPaymentConfig {
  provider: PaymentProvider
  stripe?: { secretKey: string; webhookSecret: string }
  razorpay?: { keyId: string; keySecret: string; webhookSecret: string }
}

function sanitizeOrg(orgId: string): string {
  return orgId.toUpperCase().replace(/[^A-Z0-9]/g, '_')
}

function pick(
  env: Record<string, string | undefined>,
  orgKey: string,
  globalKey: string,
): string | undefined {
  return env[orgKey] ?? env[globalKey]
}

/**
 * Resolves gateway credentials for an organization. Per-org overrides
 * (`PAYMENT_<ORG>_PROVIDER`, `..._STRIPE_SECRET_KEY`, …) win over the
 * global defaults; absence means payments are not configured. Credentials
 * belong in a vault-backed store long term — env mapping is the
 * zero-migration bootstrap with the same lookup shape.
 */
export function resolvePaymentConfig(
  orgId: string,
  env: Record<string, string | undefined>,
): ResolvedPaymentConfig | null {
  const tag = sanitizeOrg(orgId)
  const provider = pick(env, `PAYMENT_${tag}_PROVIDER`, 'PAYMENT_PROVIDER') as
    | PaymentProvider
    | undefined
  if (provider !== 'stripe' && provider !== 'razorpay') return null
  if (provider === 'stripe') {
    const secretKey = pick(env, `PAYMENT_${tag}_STRIPE_SECRET_KEY`, 'STRIPE_SECRET_KEY')
    const webhookSecret = pick(env, `PAYMENT_${tag}_STRIPE_WEBHOOK_SECRET`, 'STRIPE_WEBHOOK_SECRET')
    if (!secretKey || !webhookSecret) return null
    return { provider, stripe: { secretKey, webhookSecret } }
  }
  const keyId = pick(env, `PAYMENT_${tag}_RAZORPAY_KEY_ID`, 'RAZORPAY_KEY_ID')
  const keySecret = pick(env, `PAYMENT_${tag}_RAZORPAY_KEY_SECRET`, 'RAZORPAY_KEY_SECRET')
  const webhookSecret = pick(env, `PAYMENT_${tag}_RAZORPAY_WEBHOOK_SECRET`, 'RAZORPAY_WEBHOOK_SECRET')
  if (!keyId || !keySecret || !webhookSecret) return null
  return { provider, razorpay: { keyId, keySecret, webhookSecret } }
}

const adapterCache = new Map<string, PaymentAdapter>()

export function paymentAdapterFor(
  orgId: string,
  env: Record<string, string | undefined>,
): PaymentAdapter | null {
  const cached = adapterCache.get(orgId)
  if (cached) return cached
  const resolved = resolvePaymentConfig(orgId, env)
  if (!resolved) return null
  const { adapter } = createPaymentPlugin(resolved as PaymentPluginConfig)
  adapterCache.set(orgId, adapter)
  return adapter
}

export function clearPaymentAdapterCache(): void {
  adapterCache.clear()
}

export interface ReconcileLine {
  variantId: string
  locationId: string
  qty: number
}

/**
 * Rebuilds checkout lines for webhook reconcile from the reservation
 * movement log (reason 'reserve' under the order reference). Keeps the
 * webhook path off cart state: reservations are the source of truth for
 * what stock the payment covers.
 */
export async function resolveReconcileLines(
  mediator: Mediator,
  ctx: { orderId: string; orgId: string; actorId: string },
): Promise<ReconcileLine[]> {
  const movements = (await mediator.query({
    type: 'inventory.listMovements',
    params: { referenceId: ctx.orderId, reason: 'reserve', limit: 500 },
    actorId: ctx.actorId,
    orgId: ctx.orgId,
  })) as Array<{ variantId: string; toLocationId: string | null; quantity: number }>
  return movements
    .filter((m) => m.toLocationId)
    .map((m) => ({ variantId: m.variantId, locationId: m.toLocationId as string, qty: m.quantity }))
}

export function createEcommercePaymentPlugin(
  mediator: Mediator,
  config: ResolvedPaymentConfig,
) {
  return createPaymentPlugin({
    ...config,
    onPaymentReceived: async (orderId, amount, gatewayRef, metadata) => {
      const orgId = String((metadata as Record<string, unknown> | undefined)?.orgId ?? '')
      if (!orgId) throw new Error('webhook metadata is missing orgId')
      const order = (await mediator.query({
        type: 'commerce.getTransaction',
        params: { id: orderId },
        actorId: 'system',
        orgId,
      })) as { totalAmount: number; totalCurrency: string } | null
      if (!order) throw new Error(`order not found: ${orderId}`)
      const lines = await resolveReconcileLines(mediator, { orderId, orgId, actorId: 'system' })
      await onPaymentReceived(orderId, amount, gatewayRef, mediator, {
        orgId,
        currency: order.totalCurrency,
        lines,
        grandTotalAmount: order.totalAmount,
      })
    },
    onPaymentFailed: async (orderId, gatewayRef, metadata) => {
      const orgId = String((metadata as Record<string, unknown> | undefined)?.orgId ?? '')
      if (!orgId) throw new Error('webhook metadata is missing orgId')
      await onFailed(orderId, gatewayRef, mediator, { orgId })
    },
  })
}
