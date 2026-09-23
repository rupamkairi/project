import type { Mediator, PaymentAdapter } from '@core'

export interface PlaceOrderLine {
  variantId: string
  locationId: string
  qty: number
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
}

export interface PlaceOrderResult {
  orderId: string
  lines: Array<{
    variantId: string
    qty: number
    unitPriceAmount: number
    unitPriceCurrency: string
    taxBps: number
    lineTotalAmount: number
  }>
  grandTotalAmount: number
  grandTotalCurrency: string
  session: { sessionId: string; url: string; expiresAt: number }
}

interface Deps {
  mediator: Mediator
  payment: PaymentAdapter
}

function cid(): string {
  return crypto.randomUUID()
}

export async function placeOrder(input: PlaceOrderInput, deps: Deps): Promise<PlaceOrderResult> {
  const { mediator, payment } = deps
  const audience = input.audience ?? {}
  const resolved: PlaceOrderResult['lines'] = []

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
      params: { jurisdiction: input.jurisdiction ?? null, productType: input.productType ?? null },
      actorId: input.actorId,
      orgId: input.orgId,
    })) as { rateBps: number } | null
    const taxBps = tax?.rateBps ?? 0

    const availability = (await mediator.query({
      type: 'inventory.getAvailability',
      params: { variantId: line.variantId, locationId: line.locationId },
      actorId: input.actorId,
      orgId: input.orgId,
    })) as Array<{ available: number }>
    const available = availability[0]?.available ?? 0
    if (available < line.qty) throw new Error(`insufficient stock for variant ${line.variantId}`)

    const lineTotalAmount = Math.round((price.unitPriceAmount * line.qty * (10000 + taxBps)) / 10000)
    resolved.push({
      variantId: line.variantId,
      qty: line.qty,
      unitPriceAmount: price.unitPriceAmount,
      unitPriceCurrency: price.unitPriceCurrency,
      taxBps,
      lineTotalAmount,
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
        referenceType: 'order',
      },
      actorId: input.actorId,
      orgId: input.orgId,
      correlationId: cid(),
    })
  }

  try {
    const session = await payment.createPaymentSession({
      amount: { amount: grandTotalAmount, currency: input.currency },
      currency: input.currency,
      description: `Order ${input.orderId}`,
      metadata: { orderId: input.orderId, orgId: input.orgId },
    })
    await mediator.dispatch({
      type: 'commerce.moveStage',
      payload: { id: input.orderId, stageId: 'placed' },
      actorId: input.actorId,
      orgId: input.orgId,
      correlationId: cid(),
    })
    return {
      orderId: input.orderId,
      lines: resolved,
      grandTotalAmount,
      grandTotalCurrency: input.currency,
      session: { sessionId: session.sessionId, url: session.url, expiresAt: session.expiresAt },
    }
  } catch (err) {
    for (const line of [...input.lines].reverse()) {
      await mediator.dispatch({
        type: 'inventory.release',
        payload: {
          variantId: line.variantId,
          locationId: line.locationId,
          quantity: line.qty,
          referenceId: input.orderId,
          referenceType: 'order',
        },
        actorId: input.actorId,
        orgId: input.orgId,
        correlationId: cid(),
      })
    }
    throw err
  }
}
