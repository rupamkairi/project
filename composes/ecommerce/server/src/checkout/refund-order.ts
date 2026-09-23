import type { Mediator, PaymentAdapter } from '@core'
import { generateId } from '@core'

export const ORDER_REFUNDED_STAGE = 'refunded'

export interface RefundOrderInput {
  orderId: string
  orgId: string
  actorId: string
  gatewayRef: string
  amount: number
  currency: string
  idempotencyKey?: string
  receivableAccountCode?: string
  revenueAccountCode?: string
}

export async function refundOrder(
  input: RefundOrderInput,
  deps: { mediator: Mediator; payment: PaymentAdapter },
): Promise<{ orderId: string; refundId: string }> {
  const correlationId = input.idempotencyKey ?? generateId()

  const order = (await deps.mediator.query({
    type: 'commerce.getTransaction',
    params: { id: input.orderId },
    actorId: input.actorId,
    orgId: input.orgId,
  })) as { stageId?: string | null } | null
  if (order?.stageId !== 'confirmed') throw new Error('only confirmed orders can be refunded')

  const refund = await deps.payment.refund(input.gatewayRef, {
    amount: input.amount,
    currency: input.currency,
  })
  if (!refund.success) throw new Error(refund.error ?? 'gateway refund failed')

  // Reversal of the confirm-time receivable: debit revenue, credit receivable.
  const amountMajor = input.amount / 100
  const journal = (await deps.mediator.dispatch({
    type: 'ledger.createJournal',
    payload: {
      reference: input.orderId,
      referenceType: 'transaction',
      description: `Refund ${refund.refundId ?? ''} for order ${input.orderId}`.trim(),
      currency: input.currency,
      lines: [
        { accountCode: input.revenueAccountCode ?? 'REVENUE', debit: amountMajor, credit: 0 },
        { accountCode: input.receivableAccountCode ?? 'RECEIVABLE', debit: 0, credit: amountMajor },
      ],
    },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })) as { id: string }
  await deps.mediator.dispatch({
    type: 'ledger.postJournal',
    payload: { id: journal.id },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
  await deps.mediator.dispatch({
    type: 'commerce.moveStage',
    payload: { id: input.orderId, stageId: ORDER_REFUNDED_STAGE },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
  return { orderId: input.orderId, refundId: refund.refundId ?? '' }
}
