import type { Mediator, PaymentAdapter } from '@core'
import { generateId } from '@core'

export const ORDER_PLACED_STAGE = 'placed'
export const ORDER_CONFIRMED_STAGE = 'confirmed'
export const ORDER_CANCELLED_STAGE = 'cancelled'

export interface PlaceOrderLine {
  variantId: string
  locationId: string
  qty: number
  productType?: string
}

export interface PlaceOrderInput {
  orderId: string
  orgId: string
  actorId: string
  currency: string
  audience?: Record<string, unknown>
  jurisdiction?: string | null
  productType?: string | null
  lines: PlaceOrderLine[]
  idempotencyKey?: string
}

export interface PlacedLine {
  variantId: string
  qty: number
  unitPriceAmount: number
  unitPriceCurrency: string
  taxBps: number
  lineTotalAmount: number
}

export interface PlaceOrderResult {
  orderId: string
  lines: PlacedLine[]
  grandTotalAmount: number
  grandTotalCurrency: string
  session: { sessionId: string; url: string; expiresAt: number }
}

interface Deps {
  mediator: Mediator
  payment: PaymentAdapter
}

export function applyTaxedTotal(unitPriceAmount: number, qty: number, taxBps: number): number {
  return Math.round((unitPriceAmount * qty * (10000 + taxBps)) / 10000)
}

export async function placeOrder(input: PlaceOrderInput, deps: Deps): Promise<PlaceOrderResult> {
  const { mediator, payment } = deps
  const audience = input.audience ?? {}
  const correlationId = input.idempotencyKey ?? generateId()
  const resolved: PlacedLine[] = []

  for (const line of input.lines) {
    const price = (await mediator.query({
      type: 'catalog.resolvePrice',
      params: { variantId: line.variantId, qty: line.qty, currency: input.currency, audience },
      actorId: input.actorId,
      orgId: input.orgId,
    })) as {
      unitPriceAmount: number
      unitPriceCurrency: string
      priceListId: string
      priceRuleId: string
    } | null
    if (!price) throw new Error(`no price for variant ${line.variantId}`)

    const tax = (await mediator.query({
      type: 'tax.resolveRate',
      params: {
        jurisdiction: input.jurisdiction ?? null,
        productType: line.productType ?? input.productType ?? null,
      },
      actorId: input.actorId,
      orgId: input.orgId,
    })) as { rateBps: number } | null
    const taxBps = tax?.rateBps ?? 0

    resolved.push({
      variantId: line.variantId,
      qty: line.qty,
      unitPriceAmount: price.unitPriceAmount,
      unitPriceCurrency: price.unitPriceCurrency,
      taxBps,
      lineTotalAmount: applyTaxedTotal(price.unitPriceAmount, line.qty, taxBps),
    })
  }

  const grandTotalAmount = resolved.reduce((sum, l) => sum + l.lineTotalAmount, 0)

  for (const line of input.lines) {
    await mediator.dispatch({
      type: 'inventory.reserve',
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

  // Payment failure preserves the reservation so the shopper can retry
  // without rebuilding the cart. Explicit cancellation releases via cancelOrder.
  // TODO: reservation expiry job must release stale holds.
  const session = await payment.createPaymentSession({
    amount: { amount: grandTotalAmount, currency: input.currency },
    currency: input.currency,
    description: `Order ${input.orderId}`,
    metadata: { orderId: input.orderId, orgId: input.orgId, idempotencyKey: correlationId },
  })
  await mediator.dispatch({
    type: 'commerce.moveStage',
    payload: { id: input.orderId, stageId: ORDER_PLACED_STAGE },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
  return {
    orderId: input.orderId,
    lines: resolved,
    grandTotalAmount,
    grandTotalCurrency: input.currency,
    session: { sessionId: session.sessionId, url: session.url, expiresAt: session.expiresAt },
  }
}

export async function cancelOrder(
  input: Pick<PlaceOrderInput, 'orderId' | 'orgId' | 'actorId' | 'lines' | 'idempotencyKey'>,
  deps: Pick<Deps, 'mediator'>,
): Promise<void> {
  const correlationId = input.idempotencyKey ?? generateId()
  for (const line of [...input.lines].reverse()) {
    await deps.mediator.dispatch({
      type: 'inventory.release',
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
  await deps.mediator.dispatch({
    type: 'commerce.moveStage',
    payload: { id: input.orderId, stageId: ORDER_CANCELLED_STAGE },
    actorId: input.actorId,
    orgId: input.orgId,
    correlationId,
  })
}
