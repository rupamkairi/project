import type { Mediator, PaymentAdapter } from '@core'
import { generateId } from '@core'
import { toMajorUnits } from './money'

export const ORDER_REFUNDED_STAGE = 'refunded'

export interface RefundOrderInput {
  orderId: string
  orgId: string
  actorId: string
  gatewayRef: string
  amount: number
  currency: string
  /** Required: each refund attempt (including partials) carries its own key. */
  idempotencyKey: string
  receivableAccountCode?: string
  revenueAccountCode?: string
}

interface OrderState {
  stageId?: string | null
  meta?: Record<string, unknown>
}

function recordedRefundIds(meta: Record<string, unknown> | undefined): string[] {
  const list = meta?.refunds
  return Array.isArray(list) ? list.filter((e): e is string => typeof e === 'string') : []
}

export async function refundOrder(
  input: RefundOrderInput,
  deps: { mediator: Mediator; payment: PaymentAdapter },
): Promise<{ orderId: string; refundId: string; deduped: boolean }> {
  const correlationId = input.idempotencyKey ?? generateId()
  const eventId = input.idempotencyKey

  const order = (await deps.mediator.query({
    type: 'commerce.getTransaction',
    params: { id: input.orderId },
    actorId: input.actorId,
    orgId: input.orgId,
  })) as OrderState | null
  if (order?.stageId !== 'confirmed' && order?.stageId !== ORDER_REFUNDED_STAGE)
    throw new Error('only confirmed orders can be refunded')

  const claim = (await deps.mediator.dispatch({
    type: 'commerce.claimReconcileEvent',
    payload: { id: input.orderId, eventId },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })) as { state: 'new' | 'in-progress' | 'done' }
  if (claim.state === 'done' || order?.stageId === ORDER_REFUNDED_STAGE) {
    if (claim.state !== 'done') await finish(input, eventId, deps.mediator, correlationId)
    const ids = recordedRefundIds(order?.meta)
    return { orderId: input.orderId, refundId: ids[ids.length - 1] ?? '', deduped: true }
  }
  if (claim.state === 'in-progress')
    throw new Error(`refund ${eventId} already in progress for order ${input.orderId}; retry`)

  const refund = await deps.payment.refund(input.gatewayRef, {
    amount: input.amount,
    currency: input.currency,
  })
  if (!refund.success) throw new Error(refund.error ?? 'gateway refund failed')

  // Reversal of the confirm-time receivable: debit revenue, credit receivable.
  // Reference stays the order id (recorded against the original document);
  // the refund journal carries referenceType 'refund' so lookups stay unique.
  const amountMajor = toMajorUnits(input.amount, input.currency)
  const journal = (await deps.mediator.dispatch({
    type: 'ledger.createJournal',
    payload: {
      reference: input.orderId,
      referenceType: 'refund',
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
  await deps.mediator.dispatch({
    type: 'commerce.updateTransaction',
    payload: {
      id: input.orderId,
      meta: {
        ...((order?.meta ?? {}) as Record<string, unknown>),
        refunds: [...recordedRefundIds(order?.meta), refund.refundId ?? ''],
      },
    },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
  await finish(input, eventId, deps.mediator, correlationId)
  return { orderId: input.orderId, refundId: refund.refundId ?? '', deduped: false }
}

async function finish(
  input: RefundOrderInput,
  eventId: string,
  mediator: Mediator,
  correlationId: string,
): Promise<void> {
  await mediator.dispatch({
    type: 'commerce.finishReconcileEvent',
    payload: { id: input.orderId, eventId },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
}
