import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { catBomHeaders, catBomLines, catPriceLists, catPriceRules } from '@db/schema/catalog'
import type { CatBomHeader, CatBomLine } from '@db/schema/catalog'
import { eq, and, isNull } from 'drizzle-orm'
import { resolvePriceRule } from '../pricing'

export const listBomsHandler: QueryHandler<{ parentItemId?: string }, CatBomHeader[]> = async (
  query,
) => {
  const conditions = [eq(catBomHeaders.organizationId, query.orgId), isNull(catBomHeaders.deletedAt)]
  if (query.params.parentItemId)
    conditions.push(eq(catBomHeaders.parentItemId, query.params.parentItemId))
  return db.select().from(catBomHeaders).where(and(...conditions))
}

export const getBomHandler: QueryHandler<
  { id: string },
  (CatBomHeader & { lines: CatBomLine[] }) | null
> = async (query) => {
  const [row] = await db
    .select()
    .from(catBomHeaders)
    .where(
      and(
        eq(catBomHeaders.id, query.params.id),
        eq(catBomHeaders.organizationId, query.orgId),
        isNull(catBomHeaders.deletedAt),
      ),
    )
    .limit(1)
  if (!row) return null
  const lines = await db
    .select()
    .from(catBomLines)
    .where(and(eq(catBomLines.bomId, row.id), isNull(catBomLines.deletedAt)))
  return { ...row, lines }
}

export interface ResolvePriceParams {
  variantId: string
  qty?: number
  currency?: string
  audience?: Record<string, unknown>
}

export const resolvePriceHandler: QueryHandler<
  ResolvePriceParams,
  {
    unitPriceAmount: number
    unitPriceCurrency: string
    priceListId: string
    priceRuleId: string
    minQty: number
  } | null
> = async (query) => {
  const { variantId, qty = 1, currency = 'USD', audience = {} } = query.params
  const lists = await db
    .select()
    .from(catPriceLists)
    .where(
      and(eq(catPriceLists.organizationId, query.orgId), isNull(catPriceLists.deletedAt)),
    )
  const rules = await db
    .select()
    .from(catPriceRules)
    .where(
      and(
        eq(catPriceRules.organizationId, query.orgId),
        eq(catPriceRules.variantId, variantId),
        isNull(catPriceRules.deletedAt),
      ),
    )
  const out = resolvePriceRule(lists, rules, { variantId, qty, currency, audience, now: new Date() })
  if (!out) return null
  return {
    unitPriceAmount: out.unitPriceAmount,
    unitPriceCurrency: out.unitPriceCurrency,
    priceListId: out.list.id,
    priceRuleId: out.rule.id,
    minQty: out.rule.minQty ?? 1,
  }
}
