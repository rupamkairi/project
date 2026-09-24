import type { QueryHandler } from '@core'
import { db } from '@db/client'
import {
  catBomHeaders,
  catBomLines,
  catPriceLists,
  catPriceRules,
  catItems,
  catVariants,
  catCategories,
} from '@db/schema/catalog'
import type { CatBomHeader, CatBomLine } from '@db/schema/catalog'
import { eq, and, isNull, like, desc, count } from 'drizzle-orm'
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

export const listPriceListsHandler: QueryHandler<
  { status?: string; currency?: string },
  typeof catPriceLists.$inferSelect[]
> = async (query) => {
  const conditions = [
    eq(catPriceLists.organizationId, query.orgId),
    isNull(catPriceLists.deletedAt),
  ]
  if (query.params.status) conditions.push(eq(catPriceLists.status, query.params.status as never))
  if (query.params.currency) conditions.push(eq(catPriceLists.currency, query.params.currency))
  return db.select().from(catPriceLists).where(and(...conditions))
}

export const listPriceRulesHandler: QueryHandler<
  { priceListId?: string; variantId?: string },
  typeof catPriceRules.$inferSelect[]
> = async (query) => {
  const conditions = [
    eq(catPriceRules.organizationId, query.orgId),
    isNull(catPriceRules.deletedAt),
  ]
  if (query.params.priceListId) conditions.push(eq(catPriceRules.priceListId, query.params.priceListId))
  if (query.params.variantId) conditions.push(eq(catPriceRules.variantId, query.params.variantId))
  return db.select().from(catPriceRules).where(and(...conditions))
}

export interface ListItemsParams {
  type?: string
  status?: string
  categoryId?: string
  search?: string
  page?: number
  limit?: number
}

export const listItemsHandler: QueryHandler<
  ListItemsParams,
  { data: typeof catItems.$inferSelect[]; page: number; limit: number; total: number }
> = async (query) => {
  const { type, status, categoryId, search, page = 1, limit = 20 } = query.params
  const conditions = [eq(catItems.organizationId, query.orgId), isNull(catItems.deletedAt)]
  if (type) conditions.push(eq(catItems.type, type as never))
  if (status) conditions.push(eq(catItems.status, status as never))
  if (categoryId) conditions.push(eq(catItems.categoryId, categoryId))
  if (search) conditions.push(like(catItems.name, `%${search}%`))
  const where = and(...conditions)
  const [rows, [c]] = await Promise.all([
    db
      .select()
      .from(catItems)
      .where(where)
      .orderBy(desc(catItems.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ value: count() }).from(catItems).where(where),
  ])
  return { data: rows, page, limit, total: c?.value ?? 0 }
}

export const getItemHandler: QueryHandler<
  { id: string },
  {
    item: typeof catItems.$inferSelect
    variants: typeof catVariants.$inferSelect[]
    category: typeof catCategories.$inferSelect | null
  } | null
> = async (query) => {
  const [item] = await db
    .select()
    .from(catItems)
    .where(
      and(
        eq(catItems.id, query.params.id),
        eq(catItems.organizationId, query.orgId),
        isNull(catItems.deletedAt),
      ),
    )
    .limit(1)
  if (!item) return null
  const variants = await db
    .select()
    .from(catVariants)
    .where(
      and(
        eq(catVariants.itemId, item.id),
        eq(catVariants.organizationId, query.orgId),
        isNull(catVariants.deletedAt),
      ),
    )
  let category: typeof catCategories.$inferSelect | null = null
  if (item.categoryId) {
    const [cat] = await db
      .select()
      .from(catCategories)
      .where(
        and(
          eq(catCategories.id, item.categoryId),
          eq(catCategories.organizationId, query.orgId),
          isNull(catCategories.deletedAt),
        ),
      )
      .limit(1)
    category = cat ?? null
  }
  return { item, variants, category }
}

export const listVariantsHandler: QueryHandler<
  { itemId: string },
  typeof catVariants.$inferSelect[]
> = async (query) => {
  return db
    .select()
    .from(catVariants)
    .where(
      and(
        eq(catVariants.itemId, query.params.itemId),
        eq(catVariants.organizationId, query.orgId),
        isNull(catVariants.deletedAt),
      ),
    )
}

export const listCategoriesHandler: QueryHandler<
  { status?: string; parentId?: string | null },
  typeof catCategories.$inferSelect[]
> = async (query) => {
  const conditions = [
    eq(catCategories.organizationId, query.orgId),
    isNull(catCategories.deletedAt),
  ]
  if (query.params.status) conditions.push(eq(catCategories.status, query.params.status))
  if (query.params.parentId !== undefined) {
    if (query.params.parentId === null) conditions.push(isNull(catCategories.parentId))
    else conditions.push(eq(catCategories.parentId, query.params.parentId))
  }
  return db.select().from(catCategories).where(and(...conditions))
}

export const getCategoryHandler: QueryHandler<
  { id: string },
  typeof catCategories.$inferSelect | null
> = async (query) => {
  const [row] = await db
    .select()
    .from(catCategories)
    .where(
      and(
        eq(catCategories.id, query.params.id),
        eq(catCategories.organizationId, query.orgId),
        isNull(catCategories.deletedAt),
      ),
    )
    .limit(1)
  return row ?? null
}
