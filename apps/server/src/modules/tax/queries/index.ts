import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { taxRates } from '@db/schema/tax'
import { eq, and, isNull } from 'drizzle-orm'
import { resolveTaxRate } from '../resolve'

export const resolveRateHandler: QueryHandler<
  { jurisdiction?: string | null; productType?: string | null },
  { taxRateId: string; templateId: string; rateBps: number } | null
> = async (query) => {
  const { jurisdiction = null, productType = null } = query.params
  const rates = await db
    .select()
    .from(taxRates)
    .where(and(eq(taxRates.organizationId, query.orgId), isNull(taxRates.deletedAt)))
  const out = resolveTaxRate(rates, { jurisdiction, productType })
  if (!out) return null
  return { taxRateId: out.id, templateId: out.templateId, rateBps: out.rateBps }
}
