import type { Mediator } from '@core'
import { generateId } from '@core'
import { confirmOrder } from '../checkout/confirm-order'

export interface PaymentReceivedContext {
  orgId: string
  actorId?: string
  currency: string
  lines: Array<{ variantId: string; locationId: string; qty: number }>
  grandTotalAmount: number
  idempotencyKey?: string
}

export async function onPaymentReceived(
  orderId: string,
  amount: { amount: number; currency: string },
  gatewayRef: string,
  mediator: Mediator,
  ctx: PaymentReceivedContext,
): Promise<{ orderId: string; deduped: boolean }> {
  void amount
  return confirmOrder(
    {
      orderId,
      orgId: ctx.orgId,
      actorId: ctx.actorId ?? 'system',
      gatewayRef,
      paymentEventId: ctx.idempotencyKey ?? generateId(),
      currency: ctx.currency,
      ...(ctx.idempotencyKey ? { idempotencyKey: ctx.idempotencyKey } : {}),
      lines: ctx.lines,
      grandTotalAmount: ctx.grandTotalAmount,
    },
    { mediator },
  )
}
