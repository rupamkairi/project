import { eq } from 'drizzle-orm'
import { db } from '@db/client'
import { ecoRegions } from '@projectx/ecommerce-server/db/schema/index'
import { taxTemplates, taxRates } from '@db/schema/tax'

export interface TaxLine {
  itemId: string
  name: string
  rate: number
  amount: { amount: number; currency: string }
}

export async function calculateTax(
  cartId: string,
  orgId: string,
  regionId: string,
): Promise<{ total: { amount: number; currency: string }; lines: TaxLine[] }> {
  const region = await db.select().from(ecoRegions).where(eq(ecoRegions.id, regionId)).limit(1)

  if (!region.length || !region[0].taxProfileId) {
    return { total: { amount: 0, currency: 'USD' }, lines: [] }
  }

  const profile = await db
    .select()
    .from(taxTemplates)
    .where(eq(taxTemplates.id, region[0].taxProfileId))
    .limit(1)

  if (!profile.length) {
    return { total: { amount: 0, currency: 'USD' }, lines: [] }
  }

  const rates = await db.select().from(taxRates).where(eq(taxRates.templateId, region[0].taxProfileId!))

  const lines: TaxLine[] = []
  let totalAmount = 0

  for (const rate of rates) {
    const percent = rate.rateBps / 100
    const taxAmount = Math.round((0 * percent) / 100)
    totalAmount += taxAmount
    lines.push({
      itemId: rate.id,
      name: rate.name,
      rate: percent,
      amount: { amount: taxAmount, currency: region[0].currency },
    })
  }

  return {
    total: { amount: totalAmount, currency: region[0].currency },
    lines,
  }
}
