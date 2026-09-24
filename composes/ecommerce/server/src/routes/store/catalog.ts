import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { routeScope as scope } from '../admin/scope'

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
  variants: opts?.variants ?? [],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  price: 0,
  compareAtPrice: null,
  imageUrl: null,
})

export function createCatalogRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/products' })
    .get('/', async (ctx: any) => {
      const { page = 1, limit = 20, search, categoryId } = ctx.query
      const s = scope(ctx)
      const out = (await mediator.query({
        type: 'catalog.listItems',
        params: { type: 'product', status: 'active', search, categoryId, page: Number(page), limit: Number(limit) },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as { data: any[]; page: number; limit: number; total: number }
      return {
        data: out.data.map((r) => toProduct(r)),
        pagination: { page: out.page, limit: out.limit, total: out.total },
      }
    })
    .get('/:id', async (ctx: any) => {
      const s = scope(ctx)
      const out = (await mediator.query({
        type: 'catalog.getItem',
        params: { id: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as { item: any; variants: any[]; category: any } | null
      if (!out || out.item.type !== 'product') return null
      return toProduct(out.item, { variants: out.variants, category: out.category })
    })
}
