import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { eq } from 'drizzle-orm'
import { db } from '@db/client'
import { transactionLines } from '@db/schema/commerce'

export function createCartRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/cart' })
    .post('/', async () => {
      return mediator.dispatch({
        type: 'commerce.createTransaction',
        payload: { type: 'order', stageId: 'draft' },
        actorId: 'anonymous',
        orgId: '',
        correlationId: crypto.randomUUID(),
      })
    })
    .get('/:id', async ({ params }) => {
      return mediator.query({
        type: 'commerce.getTransaction',
        params: { id: params.id },
        actorId: 'anonymous',
        orgId: '',
      })
    })
    .post('/:id/items', async ({ params, body }) => {
      const b = body as {
        itemId?: string
        variantId?: string
        description?: string
        qty?: number
        quantity?: number
        unitPriceAmount?: number
        unitPrice?: number
        currency?: string
      }
      const qty = b.qty ?? b.quantity ?? 1
      const unitPriceAmount = b.unitPriceAmount ?? b.unitPrice ?? 0
      return mediator.dispatch({
        type: 'commerce.addLine',
        payload: {
          transactionId: params.id,
          itemId: b.itemId ?? b.variantId ?? null,
          description: b.description ?? null,
          qty,
          unitPriceAmount,
          currency: b.currency ?? 'USD',
        },
        actorId: 'anonymous',
        orgId: '',
        correlationId: crypto.randomUUID(),
      })
    })
    .patch('/:id/items/:itemId', async ({ params, body }) => {
      const b = body as { qty?: number; quantity?: number; unitPriceAmount?: number }
      const qty = b.qty ?? b.quantity
      const patch: Record<string, unknown> = { updatedAt: new Date() }
      if (qty !== undefined) {
        patch.qty = qty
        const line = await db
          .select()
          .from(transactionLines)
          .where(eq(transactionLines.id, params.itemId))
          .limit(1)
        const unit = b.unitPriceAmount ?? line[0]?.unitPriceAmount ?? 0
        patch.lineTotalAmount = Number(unit) * Number(qty)
      }
      if (b.unitPriceAmount !== undefined) patch.unitPriceAmount = b.unitPriceAmount
      const [row] = await db
        .update(transactionLines)
        .set(patch as any)
        .where(eq(transactionLines.id, params.itemId))
        .returning()
      return row ?? null
    })
    .delete('/:id/items/:itemId', async ({ params }) => {
      return mediator.dispatch({
        type: 'commerce.removeLine',
        payload: { id: params.itemId },
        actorId: 'anonymous',
        orgId: '',
        correlationId: crypto.randomUUID(),
      })
    })
}
