import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { routeScope as scope } from './scope'

export function createCategoriesRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/categories' })
    .get('/', async (ctx: any) => {
      const s = scope(ctx)
      const data = (await mediator.query({
        type: 'catalog.listCategories',
        params: {},
        actorId: s.actorId,
        orgId: s.orgId,
      })) as any[]
      return { data, pagination: { page: 1, limit: data.length } }
    })
    .post('/', async (ctx: any) => {
      const s = scope(ctx)
      const body = ctx.body as any
      return mediator.dispatch({
        type: 'catalog.createCategory',
        payload: {
          name: body.name,
          slug: body.slug,
          parentId: body.parentId && body.parentId !== 'None' ? body.parentId : null,
        },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
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
    .patch('/:id', async (ctx: any) => {
      const s = scope(ctx)
      const body = ctx.body as any
      const patch: Record<string, unknown> = { id: ctx.params.id }
      if (body.name !== undefined) patch.name = body.name
      if (body.slug !== undefined) patch.slug = body.slug
      if (body.parentId !== undefined)
        patch.parentId = body.parentId && body.parentId !== 'None' ? body.parentId : null
      if (body.status !== undefined) patch.status = body.status
      return mediator.dispatch({
        type: 'catalog.updateCategory',
        payload: patch,
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .delete('/:id', async (ctx: any) => {
      const s = scope(ctx)
      await mediator.dispatch({
        type: 'catalog.deleteCategory',
        payload: { id: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
      return { success: true }
    })
}
