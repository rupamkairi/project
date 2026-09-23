import type { CommandHandler } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { taxTemplates, taxRates } from '@db/schema/tax'
import { eq, and, isNull } from 'drizzle-orm'
import { validateTaxTemplateInput, validateTaxRateInput } from '../validate'

export const createTemplateHandler: CommandHandler<
  { name: string; provider?: string; jurisdiction?: string | null },
  typeof taxTemplates.$inferSelect
> = async (command) => {
  validateTaxTemplateInput(command.payload)
  const now = new Date()
  const [row] = await db
    .insert(taxTemplates)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      name: command.payload.name,
      provider: command.payload.provider ?? 'manual',
      jurisdiction: command.payload.jurisdiction ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  return row!
}

export const createRateHandler: CommandHandler<
  {
    templateId: string
    name: string
    rateBps: number
    jurisdiction?: string | null
    productType?: string | null
    isDefault?: boolean
    priority?: number
  },
  typeof taxRates.$inferSelect
> = async (command) => {
  validateTaxRateInput(command.payload)
  const p = command.payload
  const [tpl] = await db
    .select({ id: taxTemplates.id })
    .from(taxTemplates)
    .where(
      and(
        eq(taxTemplates.id, p.templateId),
        eq(taxTemplates.organizationId, command.orgId),
        isNull(taxTemplates.deletedAt),
      ),
    )
    .limit(1)
  if (!tpl) throw new Error('Tax template not found')
  const now = new Date()
  const [row] = await db
    .insert(taxRates)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      templateId: p.templateId,
      name: p.name,
      rateBps: p.rateBps,
      jurisdiction: p.jurisdiction ?? null,
      productType: p.productType ?? null,
      isDefault: p.isDefault ?? false,
      priority: p.priority ?? 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning()
  return row!
}

export const updateRateHandler: CommandHandler<
  {
    id: string
    name?: string
    rateBps?: number
    priority?: number
    jurisdiction?: string | null
    productType?: string | null
    isDefault?: boolean
  },
  typeof taxRates.$inferSelect
> = async (command) => {
  const { id, ...patch } = command.payload
  const [existing] = await db
    .select()
    .from(taxRates)
    .where(
      and(
        eq(taxRates.id, id),
        eq(taxRates.organizationId, command.orgId),
        isNull(taxRates.deletedAt),
      ),
    )
    .limit(1)
  if (!existing) throw new Error('Tax rate not found')
  validateTaxRateInput({
    templateId: existing.templateId,
    name: patch.name ?? existing.name,
    rateBps: patch.rateBps ?? existing.rateBps,
  })
  const [row] = await db
    .update(taxRates)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(taxRates.id, id), eq(taxRates.organizationId, command.orgId)))
    .returning()
  return row!
}

export const deleteRateHandler: CommandHandler<{ id: string }, void> = async (command) => {
  await db
    .update(taxRates)
    .set({ deletedAt: new Date() })
    .where(and(eq(taxRates.id, command.payload.id), eq(taxRates.organizationId, command.orgId)))
}
