import { Elysia, t } from 'elysia'
import type { PaymentAdapter } from '@core'
import type { PaymentPluginConfig } from '../types'

function gatewayMeta(
  event: { data: unknown },
  orderIdSource: 'metadata' | 'gateway',
): {
  orderId: string
  gatewayRef: string
  amount: { amount: number; currency: string }
  metadata: Record<string, unknown> | undefined
} {
  const meta = event.data as Record<string, unknown>
  const nested =
    meta.metadata && typeof meta.metadata === 'object'
      ? (meta.metadata as Record<string, unknown>)
      : undefined
  return {
    orderId:
      orderIdSource === 'gateway'
        ? String(meta.payment_intent ?? meta.payment_id ?? '')
        : String(nested?.orderId ?? ''),
    gatewayRef: String(meta.id ?? ''),
    amount: {
      amount: Number(meta.amount ?? 0),
      currency: String(meta.currency ?? 'USD').toUpperCase(),
    },
    metadata: nested,
  }
}

export function createWebhookRoutes(adapter: PaymentAdapter, config: PaymentPluginConfig) {
  return new Elysia().post(
    '/webhook/:provider',
    async ({ body, params, request, set }) => {
      const rawBody = body
      const provider = params.provider

      if (provider !== config.provider) {
        set.status = 400
        return { error: 'Provider mismatch' }
      }

      const signature =
        provider === 'stripe'
          ? (request.headers.get('stripe-signature') ?? '')
          : (request.headers.get('x-razorpay-signature') ?? '')

      let event
      try {
        event = await adapter.handleWebhook(rawBody, signature)
      } catch {
        set.status = 400
        return { error: 'Invalid webhook signature' }
      }

      if (event.type === 'payment.received' && config.onPaymentReceived) {
        const meta = gatewayMeta(event, 'metadata')
        await config
          .onPaymentReceived(meta.orderId, meta.amount, meta.gatewayRef, meta.metadata)
          .catch(console.error)
      }

      if (event.type === 'payment.failed' && config.onPaymentFailed) {
        const meta = gatewayMeta(event, 'metadata')
        await config.onPaymentFailed(meta.orderId, meta.gatewayRef, meta.metadata).catch(console.error)
      }

      if (event.type === 'refund.created' && config.onRefundIssued) {
        const meta = gatewayMeta(event, 'gateway')
        const refundId = String((event.data as Record<string, unknown>).id ?? '')
        await config.onRefundIssued(meta.orderId, refundId, meta.amount, meta.metadata).catch(console.error)
      }

      return { received: true }
    },
    {
      body: t.String(),
      params: t.Object({ provider: t.String() }),
    },
  )
}
