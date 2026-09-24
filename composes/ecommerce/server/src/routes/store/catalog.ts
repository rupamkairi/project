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
      const { page = 1, limit = 20, search, categoryId, tag } = ctx.query
      const s = scope(ctx)
      const out = (await mediator.query({
        type: 'catalog.listItems',
        params: { type: 'product', status: 'active', search, categoryId, tag, page: Number(page), limit: Number(limit) },
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
      const {
        currency = 'USD',
        audience: audienceParam,
        qty = 1,
        jurisdiction = null,
        productType = null,
      } = ctx.query
      const audience =
        typeof audienceParam === 'string'
          ? (JSON.parse(audienceParam) as Record<string, unknown>)
          : ((audienceParam ?? {}) as Record<string, unknown>)
      const out = (await mediator.query({
        type: 'catalog.getItem',
        params: { id: ctx.params.id },
        actorId: s.actorId,
        orgId: s.orgId,
      })) as { item: any; variants: any[]; category: any } | null
      if (!out || out.item.type !== 'product') return null
      const variants = await Promise.all(
        out.variants.map(async (v: any) => {
          const [price, tax, availability] = await Promise.all([
            mediator.query({
              type: 'catalog.resolvePrice',
              params: {
                variantId: v.id,
                qty: Number(qty),
                currency,
                audience,
              },
              actorId: s.actorId,
              orgId: s.orgId,
            }) as Promise<{
              unitPriceAmount: number
              unitPriceCurrency: string
              priceListId: string
              priceRuleId: string
            } | null>,
            mediator.query({
              type: 'tax.resolveRate',
              params: { jurisdiction, productType: v.productType ?? productType },
              actorId: s.actorId,
              orgId: s.orgId,
            }) as Promise<{ taxRateId: string; rateBps: number } | null>,
            mediator.query({
              type: 'inventory.getAvailability',
              params: { variantId: v.id },
              actorId: s.actorId,
              orgId: s.orgId,
            }) as Promise<Array<{ locationId: string; available: number }>>,
          ])
          return {
            ...v,
            price: price?.unitPriceAmount ?? null,
            currency: price?.unitPriceCurrency ?? null,
            priceListId: price?.priceListId ?? null,
            priceRuleId: price?.priceRuleId ?? null,
            taxBps: tax?.rateBps ?? 0,
            availability,
            available: availability.reduce((sum, a) => sum + a.available, 0),
          }
        }),
      )
      return toProduct(out.item, { variants, category: out.category })
    })
}
