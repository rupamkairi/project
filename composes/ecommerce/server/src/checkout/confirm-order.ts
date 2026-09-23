import type { Mediator } from '@core'
import { generateId } from '@core'
import { ORDER_CONFIRMED_STAGE } from './place-order'
import { toMajorUnits } from './money'

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

  const claim = (await deps.mediator.dispatch({
    type: 'commerce.claimReconcileEvent',
    payload: { id: input.orderId, eventId: input.paymentEventId },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })) as { state: 'new' | 'in-progress' | 'done' }
  if (claim.state === 'done') return { orderId: input.orderId, deduped: true }

  const order = (await deps.mediator.query({
    type: 'commerce.getTransaction',
    params: { id: input.orderId },
    actorId: input.actorId,
    orgId: input.orgId,
  })) as { stageId?: string | null } | null
  if (order?.stageId === ORDER_CONFIRMED_STAGE) {
    await finish(input, deps.mediator, correlationId)
    return { orderId: input.orderId, deduped: true }
  }

  const movements = (await deps.mediator.query({
    type: 'inventory.listMovements',
    params: { referenceId: input.orderId, reason: 'sale', limit: 500 },
    actorId: input.actorId,
    orgId: input.orgId,
  })) as Array<{ variantId: string }>
  const deducted = new Set(movements.map((m) => m.variantId))
  for (const line of input.lines) {
    if (deducted.has(line.variantId)) continue
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

  const journal = await deps.mediator.query({
    type: 'ledger.getJournalByReference',
    params: { reference: input.orderId, referenceType: 'transaction' },
    actorId: input.actorId,
    orgId: input.orgId,
  })
  if (!journal) {
    // Ledger boundary requires major units; the saga holds minor units
    // end to end and converts once here (see money.ts).
    const amountMajor = toMajorUnits(input.grandTotalAmount, input.currency)
    const created = (await deps.mediator.dispatch({
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
      payload: { id: created.id },
      actorId: input.actorId,
      orgId: input.orgId,
      correlationId,
    })
  }

  await deps.mediator.dispatch({
    type: 'commerce.updateTransaction',
    payload: { id: input.orderId, externalRef: input.gatewayRef },
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
  await finish(input, deps.mediator, correlationId)
  return { orderId: input.orderId, deduped: false }
}

async function finish(
  input: ConfirmOrderInput,
  mediator: Mediator,
  correlationId: string,
): Promise<void> {
  await mediator.dispatch({
    type: 'commerce.finishReconcileEvent',
    payload: { id: input.orderId, eventId: input.paymentEventId },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
}
