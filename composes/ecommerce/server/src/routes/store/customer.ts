import { Elysia } from 'elysia'
import type { Mediator } from '@core'

export function createCustomerRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/account' })
    .get('/orders', async ({ query }) => {
      const { page = 1, limit = 20 } = query
      const out = (await mediator.query({
        type: 'commerce.listTransactions',
        params: {
          type: 'order',
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
        },
        actorId: 'anonymous',
        orgId: '',
      })) as { items: any[]; total: number }
      return {
        data: out.items,
        pagination: { page: Number(page), limit: Number(limit), total: out.total },
      }
    })
    .get('/orders/:id', async ({ params }) => {
      return mediator.query({
        type: 'commerce.getTransaction',
        params: { id: params.id },
        actorId: 'anonymous',
        orgId: '',
      })
    })
    .get('/addresses', async () => {
      return mediator.query({
        type: 'geo.listAddresses',
        params: {},
        actorId: 'anonymous',
        orgId: '',
      })
    })
    .post('/addresses', async ({ body }) => {
      return mediator.dispatch({
        type: 'geo.createAddress',
        payload: body,
        actorId: 'anonymous',
        orgId: '',
        correlationId: crypto.randomUUID(),
      })
    })
    .patch('/addresses/:id', async ({ params, body }) => {
      return mediator.dispatch({
        type: 'geo.updateAddress',
        id: params.id,
        payload: body,
        actorId: 'anonymous',
        orgId: '',
        correlationId: crypto.randomUUID(),
      })
    })
    .delete('/addresses/:id', async ({ params }) => {
      return mediator.dispatch({
        type: 'geo.deleteAddress',
        id: params.id,
        actorId: 'anonymous',
        orgId: '',
        correlationId: crypto.randomUUID(),
      })
    })
}
