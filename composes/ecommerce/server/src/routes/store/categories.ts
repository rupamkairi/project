import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { routeScope as scope } from '../admin/scope'

export function createStoreCategoriesRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/categories' })
    .get('/', async (ctx: any) => {
      const s = scope(ctx)
      const data = (await mediator.query({
        type: 'catalog.listCategories',
        params: { status: 'active' },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as any[]
      return { data }
    })
    .get('/:id', async (ctx: any) => {
      const s = scope(ctx)
      return mediator.query({
        type: 'catalog.getCategory',
        params: { id: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })
    })
}
