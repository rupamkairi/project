import { Elysia } from 'elysia'
import type { Mediator } from '@core'

function scope(ctx: unknown) {
  const actor = (ctx as { actor?: { id?: string; orgId?: string } }).actor
  return {
    actorId: actor?.id ?? 'system',
    orgId: actor?.orgId ?? '',
    correlationId: crypto.randomUUID(),
  }
}

export function createTaxRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/tax' })
    .get('/profiles', async (ctx) => {
      const s = scope(ctx)
      const data = await mediator.query({
        type: 'tax.listTemplates',
        params: {},
        actorId: s.actorId,
        orgId: s.orgId,
      })
      return { data }
    })
    .post('/profiles', async (ctx) => {
      const { body } = ctx as { body: Record<string, unknown> }
      const s = scope(ctx)
      return mediator.dispatch({
        type: 'tax.createTemplate',
        payload: body,
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .get('/profiles/:id/rates', async (ctx) => {
      const { params } = ctx as { params: { id: string } }
      const s = scope(ctx)
      const data = await mediator.query({
        type: 'tax.listRates',
        params: { templateId: params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })
      return { data }
    })
    .post('/profiles/:id/rates', async (ctx) => {
      const { params, body } = ctx as { params: { id: string }; body: Record<string, unknown> }
      const s = scope(ctx)
      const input = body as { rate?: number; rateBps?: number } & Record<string, unknown>
      return mediator.dispatch({
        type: 'tax.createRate',
        payload: {
          ...input,
          templateId: params.id,
          rateBps:
            input.rateBps ?? (input.rate !== undefined ? Math.round(Number(input.rate) * 100) : undefined),
        },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .patch('/rates/:rateId', async (ctx) => {
      const { params, body } = ctx as { params: { rateId: string }; body: Record<string, unknown> }
      const s = scope(ctx)
      return mediator.dispatch({
        type: 'tax.updateRate',
        payload: { ...(body as object), id: params.rateId },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .delete('/rates/:rateId', async (ctx) => {
      const { params } = ctx as { params: { rateId: string } }
      const s = scope(ctx)
      await mediator.dispatch({
        type: 'tax.deleteRate',
        payload: { id: params.rateId },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
      return { success: true }
    })
}
