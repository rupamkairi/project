import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { routeScope as scope } from './scope'

export function createPricingRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/pricing' })
    .get('/price-lists', async (ctx) => {
      const { query } = ctx as { query?: Record<string, string> }
      return mediator.query({
        type: 'catalog.listPriceLists',
        params: { status: query?.status, currency: query?.currency },
        actorId: scope(ctx).actorId,
        orgId: scope(ctx).orgId,
      })
    })
    .post('/price-lists', async (ctx) => {
      const { body } = ctx as { body: Record<string, unknown> }
      const s = scope(ctx)
      return mediator.dispatch({
        type: 'catalog.createPriceList',
        payload: body,
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .patch('/price-lists/:id', async (ctx) => {
      const { params, body } = ctx as { params: { id: string }; body: Record<string, unknown> }
      const s = scope(ctx)
      return mediator.dispatch({
        type: 'catalog.updatePriceList',
        payload: { ...body, id: params.id },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .get('/price-lists/:id/rules', async (ctx) => {
      const { params } = ctx as { params: { id: string } }
      const s = scope(ctx)
      return mediator.query({
        type: 'catalog.listPriceRules',
        params: { priceListId: params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })
    })
    .post('/price-lists/:id/rules', async (ctx) => {
      const { params, body } = ctx as { params: { id: string }; body: Record<string, unknown> }
      const s = scope(ctx)
      return mediator.dispatch({
        type: 'catalog.createPriceRule',
        payload: { ...(body as object), priceListId: params.id },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .patch('/price-rules/:ruleId', async (ctx) => {
      const { params, body } = ctx as { params: { ruleId: string }; body: Record<string, unknown> }
      const s = scope(ctx)
      return mediator.dispatch({
        type: 'catalog.updatePriceRule',
        payload: { ...(body as object), id: params.ruleId },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
}
