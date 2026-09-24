import type { CommandHandler } from '@core'
import { generateId } from '@core'
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
import type {
  CatBomHeader,
  CatBomLine,
  CatPriceList,
  CatPriceRule,
  CatItem,
  CatVariant,
  CatCategory,
} from '@db/schema/catalog'
import { eq, and, isNull } from 'drizzle-orm'
import { validatePriceListInput, validatePriceRuleInput } from '../price-lists'
import { toItemRow, validateVariantInput, toCategoryRow } from '../items'

export interface CreateBomPayload {
  parentItemId: string
  name?: string
  yieldQty?: number
  uom?: string
  isActive?: boolean
  meta?: Record<string, unknown>
  lines?: Array<{ componentItemId: string; qty: number; uom?: string; scrapPercent?: number }>
}

export const createBomHandler: CommandHandler<CreateBomPayload, CatBomHeader> = async (command) => {
  const p = command.payload
  const now = new Date()
  const existing = await db
    .select()
    .from(catBomHeaders)
    .where(
      and(
        eq(catBomHeaders.organizationId, command.orgId),
        eq(catBomHeaders.parentItemId, p.parentItemId),
        isNull(catBomHeaders.deletedAt),
      ),
    )
  const [row] = await db
    .insert(catBomHeaders)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      parentItemId: p.parentItemId,
      name: p.name ?? null,
      yieldQty: Math.round(Number(p.yieldQty ?? 1)),
      uom: p.uom ?? 'ea',
      isActive: p.isActive ?? false,
      createdAt: now,
      updatedAt: now,
      version: existing.length + 1,
      meta: p.meta ?? {},
    })
    .returning()

  if (p.lines?.length) {
    await db.insert(catBomLines).values(
      p.lines.map((line) => ({
        id: generateId(),
        organizationId: command.orgId,
        bomId: row!.id,
        componentItemId: line.componentItemId,
        qty: Math.round(Number(line.qty)),
        uom: line.uom ?? 'ea',
        scrapPercent: Math.round(Number(line.scrapPercent ?? 0)),
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })),
    )
  }
  return row!
}

export const activateBomHandler: CommandHandler<{ id: string }, CatBomHeader> = async (command) => {
  const [bom] = await db
    .select()
    .from(catBomHeaders)
    .where(and(eq(catBomHeaders.id, command.payload.id), eq(catBomHeaders.organizationId, command.orgId)))
  if (!bom) throw new Error('BOM not found')
  await db
    .update(catBomHeaders)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(catBomHeaders.parentItemId, bom.parentItemId),
        eq(catBomHeaders.organizationId, command.orgId),
      ),
    )
  const [row] = await db
    .update(catBomHeaders)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(catBomHeaders.id, bom.id))
    .returning()
  return row!
}

export type { CatBomHeader, CatBomLine, CatPriceList, CatPriceRule, CatItem, CatVariant, CatCategory }

async function assertSlugFree(
  orgId: string,
  slug: string,
  excludeId?: string,
): Promise<void> {
  const [hit] = await db
    .select({ id: catItems.id })
    .from(catItems)
    .where(
      and(
        eq(catItems.organizationId, orgId),
        eq(catItems.slug, slug),
        isNull(catItems.deletedAt),
      ),
    )
    .limit(1)
  if (hit && hit.id !== excludeId) throw new Error(`item slug already exists: ${slug}`)
}

async function assertSkuFree(orgId: string, sku: string, excludeId?: string): Promise<void> {
  const [hit] = await db
    .select({ id: catVariants.id })
    .from(catVariants)
    .where(
      and(
        eq(catVariants.organizationId, orgId),
        eq(catVariants.sku, sku),
        isNull(catVariants.deletedAt),
      ),
    )
    .limit(1)
  if (hit && hit.id !== excludeId) throw new Error(`variant sku already exists: ${sku}`)
}

export const createItemHandler: CommandHandler<Record<string, unknown>, CatItem> = async (
  command,
) => {
  const row = toItemRow(command.payload as never) as Record<string, unknown>
  await assertSlugFree(command.orgId, row.slug as string)
  const now = new Date()
  const [created] = await db
    .insert(catItems)
    .values({
      ...(row as object),
      id: generateId(),
      organizationId: command.orgId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    } as never)
    .returning()
  return created!
}

export const updateItemHandler: CommandHandler<
  { id: string } & Record<string, unknown>,
  CatItem
> = async (command) => {
  const { id, ...patch } = command.payload as { id: string } & Record<string, unknown>
  const [existing] = await db
    .select()
    .from(catItems)
    .where(
      and(
        eq(catItems.id, id),
        eq(catItems.organizationId, command.orgId),
        isNull(catItems.deletedAt),
      ),
    )
    .limit(1)
  if (!existing) throw new Error('Item not found')
  const row = toItemRow({
    name: (patch.name as string | undefined) ?? existing.name,
    slug: (patch.slug as string | undefined) ?? existing.slug,
    type: (patch.type as string | undefined) ?? existing.type,
    categoryId: (patch.categoryId as string | undefined) ?? existing.categoryId,
    description: (patch.description as string | undefined) ?? existing.description,
    attributes:
      (patch.attributes as Record<string, unknown> | undefined) ??
      (existing.attributes as Record<string, unknown>),
    status: (patch.status as never) ?? existing.status,
    tags: patch.tags ?? existing.tags,
    media: patch.media ?? existing.media,
    barcode: (patch.barcode as string | undefined) ?? (existing as { barcode?: string }).barcode,
    uom: (patch.uom as string | undefined) ?? (existing as { uom?: string }).uom,
  }) as Record<string, unknown>
  await assertSlugFree(command.orgId, row.slug as string, id)
  const [updated] = await db
    .update(catItems)
    .set({ ...(row as object), updatedAt: new Date() } as never)
    .where(and(eq(catItems.id, id), eq(catItems.organizationId, command.orgId)))
    .returning()
  return updated!
}

export const deleteItemHandler: CommandHandler<{ id: string }, void> = async (command) => {
  const now = new Date()
  await db
    .update(catVariants)
    .set({ deletedAt: now })
    .where(
      and(eq(catVariants.itemId, command.payload.id), eq(catVariants.organizationId, command.orgId)),
    )
  await db
    .update(catItems)
    .set({ deletedAt: now })
    .where(and(eq(catItems.id, command.payload.id), eq(catItems.organizationId, command.orgId)))
}

export const setItemStatusHandler: CommandHandler<{ id: string; status: string }, CatItem> =
  async (command) => {
    const { id, status } = command.payload
    if (!['draft', 'active', 'archived'].includes(status)) throw new Error(`unknown item status: ${status}`)
    const [row] = await db
      .update(catItems)
      .set({ status: status as never, updatedAt: new Date() })
      .where(
        and(
          eq(catItems.id, id),
          eq(catItems.organizationId, command.orgId),
          isNull(catItems.deletedAt),
        ),
      )
      .returning()
    if (!row) throw new Error('Item not found')
    return row
  }

export const createVariantHandler: CommandHandler<Record<string, unknown>, CatVariant> = async (
  command,
) => {
  const p = command.payload as {
    itemId: string
    sku: string
    attributes?: Record<string, unknown>
    barcode?: string | null
    stockTracked?: boolean
    status?: string
    uom?: string | null
  }
  validateVariantInput({ itemId: p.itemId, sku: p.sku })
  const [item] = await db
    .select({ id: catItems.id })
    .from(catItems)
    .where(
      and(
        eq(catItems.id, p.itemId),
        eq(catItems.organizationId, command.orgId),
        isNull(catItems.deletedAt),
      ),
    )
    .limit(1)
  if (!item) throw new Error('Item not found')
  await assertSkuFree(command.orgId, p.sku.trim())
  const now = new Date()
  const [row] = await db
    .insert(catVariants)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      itemId: p.itemId,
      sku: p.sku.trim(),
      attributes: p.attributes ?? {},
      barcode: p.barcode ?? null,
      stockTracked: p.stockTracked ?? true,
      status: p.status ?? 'active',
      uom: p.uom ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  return row!
}

export const updateVariantHandler: CommandHandler<
  { id: string } & Record<string, unknown>,
  CatVariant
> = async (command) => {
  const { id, ...patch } = command.payload as { id: string } & Record<string, unknown>
  const [existing] = await db
    .select()
    .from(catVariants)
    .where(
      and(
        eq(catVariants.id, id),
        eq(catVariants.organizationId, command.orgId),
        isNull(catVariants.deletedAt),
      ),
    )
    .limit(1)
  if (!existing) throw new Error('Variant not found')
  const sku = (patch.sku as string | undefined)?.trim() ?? existing.sku
  validateVariantInput({ itemId: existing.itemId, sku })
  await assertSkuFree(command.orgId, sku, id)
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.sku !== undefined) update.sku = sku
  if (patch.attributes !== undefined) update.attributes = patch.attributes
  if (patch.barcode !== undefined) update.barcode = patch.barcode
  if (patch.stockTracked !== undefined) update.stockTracked = patch.stockTracked
  if (patch.status !== undefined) update.status = patch.status
  if (patch.uom !== undefined) update.uom = patch.uom
  const [row] = await db
    .update(catVariants)
    .set(update as never)
    .where(and(eq(catVariants.id, id), eq(catVariants.organizationId, command.orgId)))
    .returning()
  return row!
}

export const deleteVariantHandler: CommandHandler<{ id: string }, void> = async (command) => {
  await db
    .update(catVariants)
    .set({ deletedAt: new Date() })
    .where(and(eq(catVariants.id, command.payload.id), eq(catVariants.organizationId, command.orgId)))
}

export const createCategoryHandler: CommandHandler<Record<string, unknown>, CatCategory> = async (
  command,
) => {
  const row = toCategoryRow(command.payload as never) as Record<string, unknown>
  const now = new Date()
  const [created] = await db
    .insert(catCategories)
    .values({
      ...(row as object),
      id: generateId(),
      organizationId: command.orgId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    } as never)
    .returning()
  return created!
}

export const updateCategoryHandler: CommandHandler<
  { id: string } & Record<string, unknown>,
  CatCategory
> = async (command) => {
  const { id, ...patch } = command.payload as { id: string } & Record<string, unknown>
  const [existing] = await db
    .select()
    .from(catCategories)
    .where(
      and(
        eq(catCategories.id, id),
        eq(catCategories.organizationId, command.orgId),
        isNull(catCategories.deletedAt),
      ),
    )
    .limit(1)
  if (!existing) throw new Error('Category not found')
  const row = toCategoryRow({
    name: (patch.name as string | undefined) ?? existing.name,
    slug: (patch.slug as string | undefined) ?? existing.slug,
    parentId: (patch.parentId as string | undefined) ?? existing.parentId,
    attributeSet: patch.attributeSet ?? existing.attributeSet,
    sortOrder: (patch.sortOrder as number | undefined) ?? existing.sortOrder,
    status: (patch.status as string | undefined) ?? existing.status,
  }) as Record<string, unknown>
  const [updated] = await db
    .update(catCategories)
    .set({ ...(row as object), updatedAt: new Date() } as never)
    .where(and(eq(catCategories.id, id), eq(catCategories.organizationId, command.orgId)))
    .returning()
  return updated!
}

export const deleteCategoryHandler: CommandHandler<{ id: string }, void> = async (command) => {
  await db
    .update(catCategories)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(catCategories.id, command.payload.id), eq(catCategories.organizationId, command.orgId)),
    )
}

export interface CreatePriceListPayload {
  name: string
  currency?: string
  audience?: Record<string, unknown>
  validFrom?: string | Date | null
  validTo?: string | Date | null
  status?: 'draft' | 'active' | 'archived'
  priority?: number
}

export const createPriceListHandler: CommandHandler<CreatePriceListPayload, CatPriceList> =
  async (command) => {
    validatePriceListInput(command.payload)
    const p = command.payload
    const now = new Date()
    const [row] = await db
      .insert(catPriceLists)
      .values({
        id: generateId(),
        organizationId: command.orgId,
        name: p.name,
        currency: p.currency ?? 'USD',
        audience: p.audience ?? {},
        validFrom: p.validFrom ? new Date(p.validFrom) : null,
        validTo: p.validTo ? new Date(p.validTo) : null,
        status: p.status ?? 'draft',
        priority: p.priority ?? 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })
      .returning()
    return row!
  }

export interface UpdatePriceListPayload {
  id: string
  name?: string
  currency?: string
  audience?: Record<string, unknown>
  validFrom?: string | Date | null
  validTo?: string | Date | null
  status?: 'draft' | 'active' | 'archived'
  priority?: number
}

export const updatePriceListHandler: CommandHandler<UpdatePriceListPayload, CatPriceList> =
  async (command) => {
    const { id, ...patch } = command.payload
    const [existing] = await db
      .select()
      .from(catPriceLists)
      .where(
        and(
          eq(catPriceLists.id, id),
          eq(catPriceLists.organizationId, command.orgId),
          isNull(catPriceLists.deletedAt),
        ),
      )
      .limit(1)
    if (!existing) throw new Error('Price list not found')
    validatePriceListInput({
      name: patch.name ?? existing.name,
      currency: patch.currency ?? existing.currency,
      validFrom: patch.validFrom !== undefined ? patch.validFrom : existing.validFrom,
      validTo: patch.validTo !== undefined ? patch.validTo : existing.validTo,
    })
    const [row] = await db
      .update(catPriceLists)
      .set({
        ...patch,
        validFrom: patch.validFrom !== undefined ? (patch.validFrom ? new Date(patch.validFrom) : null) : undefined,
        validTo: patch.validTo !== undefined ? (patch.validTo ? new Date(patch.validTo) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(catPriceLists.id, id), eq(catPriceLists.organizationId, command.orgId)))
      .returning()
    return row!
  }

export interface CreatePriceRulePayload {
  priceListId: string
  variantId: string
  priceAmount: number
  priceCurrency: string
  minQty?: number
  conditions?: Record<string, unknown>
}

export const createPriceRuleHandler: CommandHandler<CreatePriceRulePayload, CatPriceRule> =
  async (command) => {
    validatePriceRuleInput(command.payload)
    const p = command.payload
    const [list] = await db
      .select({ id: catPriceLists.id })
      .from(catPriceLists)
      .where(
        and(
          eq(catPriceLists.id, p.priceListId),
          eq(catPriceLists.organizationId, command.orgId),
          isNull(catPriceLists.deletedAt),
        ),
      )
      .limit(1)
    if (!list) throw new Error('Price list not found')
    const now = new Date()
    const [row] = await db
      .insert(catPriceRules)
      .values({
        id: generateId(),
        organizationId: command.orgId,
        priceListId: p.priceListId,
        variantId: p.variantId,
        priceAmount: p.priceAmount,
        priceCurrency: p.priceCurrency,
        minQty: p.minQty ?? 1,
        conditions: p.conditions ?? {},
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
      })
      .returning()
    return row!
  }

export interface UpdatePriceRulePayload {
  id: string
  priceAmount?: number
  priceCurrency?: string
  minQty?: number
  conditions?: Record<string, unknown>
}

export const updatePriceRuleHandler: CommandHandler<UpdatePriceRulePayload, CatPriceRule> =
  async (command) => {
    const { id, ...patch } = command.payload
    const [existing] = await db
      .select()
      .from(catPriceRules)
      .where(
        and(
          eq(catPriceRules.id, id),
          eq(catPriceRules.organizationId, command.orgId),
          isNull(catPriceRules.deletedAt),
        ),
      )
      .limit(1)
    if (!existing) throw new Error('Price rule not found')
    const mergedAmount = patch.priceAmount ?? existing.priceAmount
    const mergedCurrency = patch.priceCurrency ?? existing.priceCurrency
    if (mergedAmount == null || mergedCurrency == null)
      throw new Error('Price rule is missing its price')
    validatePriceRuleInput({
      priceListId: existing.priceListId,
      variantId: existing.variantId,
      priceAmount: mergedAmount,
      priceCurrency: mergedCurrency,
      minQty: patch.minQty ?? existing.minQty,
    })
    const [row] = await db
      .update(catPriceRules)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(catPriceRules.id, id), eq(catPriceRules.organizationId, command.orgId)))
      .returning()
    return row!
  }
