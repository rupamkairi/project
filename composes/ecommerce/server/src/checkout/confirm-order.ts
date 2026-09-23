import type { Mediator } from '@core'
import { generateId } from '@core'
import { ORDER_CONFIRMED_STAGE } from './place-order'

export interface ConfirmOrderLine {
  variantId: string
  locationId: string
  qty: number
}

export interface ConfirmOrderInput {
  orderId: string
  orgId: string
  actorId: string
  gatewayRef: string
  paymentEventId: string
  currency: string
  idempotencyKey?: string
  lines: ConfirmOrderLine[]
  grandTotalAmount: number
  receivableAccountCode?: string
  revenueAccountCode?: string
}

export async function confirmOrder(
  input: ConfirmOrderInput,
  deps: { mediator: Mediator },
): Promise<{ orderId: string; deduped: boolean }> {
  const correlationId = input.idempotencyKey ?? input.paymentEventId ?? generateId()

  const order = (await deps.mediator.query({
    type: 'commerce.getTransaction',
    params: { id: input.orderId },
    actorId: input.actorId,
    orgId: input.orgId,
  })) as { stageId?: string | null } | null
  if (order?.stageId === ORDER_CONFIRMED_STAGE) return { orderId: input.orderId, deduped: true }

  for (const line of input.lines) {
    await deps.mediator.dispatch({
      type: 'inventory.deduct',
      payload: {
        variantId: line.variantId,
        locationId: line.locationId,
        quantity: line.qty,
        referenceId: input.orderId,
        referenceType: 'transaction',
      },
      actorId: input.actorId,
      orgId: input.orgId,
      correlationId,
    })
  }

  const amountMajor = input.grandTotalAmount / 100
  const journal = (await deps.mediator.dispatch({
    type: 'ledger.createJournal',
    payload: {
      reference: input.orderId,
      referenceType: 'transaction',
      description: `Receivable for order ${input.orderId} (${input.gatewayRef})`,
      currency: input.currency,
      lines: [
        { accountCode: input.receivableAccountCode ?? 'RECEIVABLE', debit: amountMajor, credit: 0 },
        { accountCode: input.revenueAccountCode ?? 'REVENUE', debit: 0, credit: amountMajor },
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
    type: 'commerce.updateTransaction',
    payload: { id: input.orderId, referenceNo: input.gatewayRef },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
  await deps.mediator.dispatch({
    type: 'commerce.moveStage',
    payload: { id: input.orderId, stageId: ORDER_CONFIRMED_STAGE },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
  return { orderId: input.orderId, deduped: false }
}
