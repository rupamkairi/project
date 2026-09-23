import type { Mediator } from '@core'
import { generateId } from '@core'
import { ORDER_CONFIRMED_STAGE } from './place-order'

const PROCESSED_EVENTS_KEY = 'processedPaymentEvents'

function metaPaymentEvents(meta: Record<string, unknown> | undefined): string[] {
  const list = meta?.[PROCESSED_EVENTS_KEY]
  return Array.isArray(list) ? list.filter((e): e is string => typeof e === 'string') : []
}

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
  })) as { stageId?: string | null; meta?: Record<string, unknown> } | null
  const processed = metaPaymentEvents(order?.meta)
  if (order?.stageId === ORDER_CONFIRMED_STAGE || processed.includes(input.paymentEventId))
    return { orderId: input.orderId, deduped: true }

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

  // Ledger boundary requires major units; the saga holds minor units
  // end to end and converts once here. Division is exact for 2-decimal
  // currencies; toMinorUnits rounds on the way back in.
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
    payload: {
      id: input.orderId,
      referenceNo: input.gatewayRef,
      meta: {
        ...(order?.meta ?? {}),
        processedPaymentEvents: [...processed, input.paymentEventId],
      },
    },
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
