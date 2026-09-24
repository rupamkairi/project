import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { routeScope as scope } from './scope'

const toProduct = (row: any, opts?: { variants?: any[]; category?: any }) => ({
  id: row.id,
  title: row.name,
  handle: row.slug,
  description: row.description,
  categoryId: row.categoryId,
  category: opts?.category?.name ?? null,
  status: row.status,
  tags: row.tags,
  media: row.media,
  attributes: row.attributes,
  variants: (opts?.variants ?? []).map((v: any) => ({
    ...v,
    options: v.attributes ?? {},
  })),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  version: row.version,
})

const fromProductBody = (body: any) => ({
  name: body.title,
  slug: body.handle,
  description: body.description,
  categoryId: body.categoryId || null,
  status: body.status,
  tags: body.tags,
  type: 'product' as const,
  media: body.media,
})

export function createProductsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/products' })
    .get('/', async (ctx: any) => {
      const { page = 1, limit = 20, search, status, categoryId } = ctx.query
      const s = scope(ctx)
      const out = (await mediator.query({
        type: 'catalog.listItems',
        params: {
          type: 'product',
          status,
          categoryId,
          search,
          page: Number(page),
          limit: Number(limit),
        },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as { data: any[]; page: number; limit: number; total: number }
      return { data: out.data.map((r) => toProduct(r)), pagination: { page: out.page, limit: out.limit, total: out.total } }
    })
    .post('/', async (ctx: any) => {
      const s = scope(ctx)
      const row = (await mediator.dispatch({
        type: 'catalog.createItem',
        payload: fromProductBody(ctx.body),
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })) as any
      return toProduct(row)
    })
    .get('/:id', async (ctx: any) => {
      const s = scope(ctx)
      const out = (await mediator.query({
        type: 'catalog.getItem',
        params: { id: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as { item: any; variants: any[]; category: any } | null
      if (!out) return null
      return toProduct(out.item, { variants: out.variants, category: out.category })
    })
    .get('/:id/variants', async (ctx: any) => {
      const s = scope(ctx)
      const data = (await mediator.query({
        type: 'catalog.listVariants',
        params: { itemId: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as any[]
      return { data: data.map((v: any) => ({ ...v, options: v.attributes ?? {} })) }
    })
    .post('/:id/variants', async (ctx: any) => {
      const s = scope(ctx)
      const body = ctx.body as any
      return mediator.dispatch({
        type: 'catalog.createVariant',
        payload: {
          itemId: ctx.params.id,
          sku: body.sku,
          attributes: typeof body.options === 'string' ? JSON.parse(body.options) : (body.options ?? {}),
          status: body.status,
          stockTracked: body.stockTracked,
        },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .get('/:id/variants/:variantId', async (ctx: any) => {
      const s = scope(ctx)
      const data = (await mediator.query({
        type: 'catalog.listVariants',
        params: { itemId: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as any[]
      const row = data.find((v: any) => v.id === ctx.params.variantId)
      if (!row) return null
      return { ...row, options: row.attributes ?? {} }
    })
    .patch('/:id/variants/:variantId', async (ctx: any) => {
      const s = scope(ctx)
      const body = ctx.body as any
      return mediator.dispatch({
        type: 'catalog.updateVariant',
        payload: {
          id: ctx.params.variantId,
          sku: body.sku,
          attributes:
            body.options !== undefined
              ? typeof body.options === 'string'
                ? JSON.parse(body.options)
                : body.options
              : undefined,
          status: body.status,
          stockTracked: body.stockTracked,
        },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
    })
    .delete('/:id/variants/:variantId', async (ctx: any) => {
      const s = scope(ctx)
      await mediator.dispatch({
        type: 'catalog.deleteVariant',
        payload: { id: ctx.params.variantId },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
      return { success: true }
    })
    .patch('/:id', async (ctx: any) => {
      const s = scope(ctx)
      const body = ctx.body as any
      const patch: Record<string, unknown> = { id: ctx.params.id }
      if (body.title !== undefined) patch.name = body.title
      if (body.handle !== undefined) patch.slug = body.handle
      if (body.description !== undefined) patch.description = body.description
      if (body.categoryId !== undefined) patch.categoryId = body.categoryId || null
      if (body.status !== undefined) patch.status = body.status
      if (body.tags !== undefined) patch.tags = body.tags
      if (body.media !== undefined) patch.media = body.media
      const row = (await mediator.dispatch({
        type: 'catalog.updateItem',
        payload: patch,
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })) as any
      return toProduct(row)
    })
    .delete('/:id', async (ctx: any) => {
      const s = scope(ctx)
      await mediator.dispatch({
        type: 'catalog.deleteItem',
        payload: { id: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })
      return { success: true }
    })
    .post('/:id/publish', async (ctx: any) => {
      const s = scope(ctx)
      const row = (await mediator.dispatch({
        type: 'catalog.setItemStatus',
        payload: { id: ctx.params.id, status: 'active' },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })) as any
      return toProduct(row)
    })
    .post('/:id/unpublish', async (ctx: any) => {
      const s = scope(ctx)
      const row = (await mediator.dispatch({
        type: 'catalog.setItemStatus',
        payload: { id: ctx.params.id, status: 'draft' },
        actorId: s.actorId,
        orgId: s.orgId,
        correlationId: s.correlationId,
      })) as any
      return toProduct(row)
    })
}
