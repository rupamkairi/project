import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { catBomHeaders, catBomLines, catPriceLists, catPriceRules } from '@db/schema/catalog'
import type {
  CatBomHeader,
  CatBomLine,
  CatPriceList,
  CatPriceRule,
} from '@db/schema/catalog'
import { eq, and, isNull } from 'drizzle-orm'
import { validatePriceListInput, validatePriceRuleInput } from '../price-lists'

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

export type { CatBomHeader, CatBomLine, CatPriceList, CatPriceRule }

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
      .where(eq(catPriceLists.id, id))
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
      .where(eq(catPriceRules.id, id))
      .returning()
    return row!
  }
