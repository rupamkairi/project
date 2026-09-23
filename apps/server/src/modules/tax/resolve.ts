import type { TaxRate } from '@db/schema/tax'

export interface TaxResolveContext {
  jurisdiction?: string | null
  productType?: string | null
}

export function resolveTaxRate(rates: TaxRate[], ctx: TaxResolveContext): TaxRate | null {
  if (!rates.length) return null
  const scored = rates.map((r) => {
    const jMatch = ctx.jurisdiction != null && r.jurisdiction === ctx.jurisdiction
    const pMatch = ctx.productType != null && r.productType === ctx.productType
    const jGeneric = r.jurisdiction == null
    const pGeneric = r.productType == null
    let score = -1
    if (jMatch && pMatch) score = 3
    else if (jMatch && pGeneric) score = 2
    else if (jGeneric && pMatch) score = 1.5
    else if (jGeneric && pGeneric && r.isDefault) score = 1
    else if (jGeneric && pGeneric) score = 0
    return { r, score }
  }).filter((s) => s.score >= 0)
  if (!scored.length) return null
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ap = (a.r as { priority?: number }).priority ?? 0
    const bp = (b.r as { priority?: number }).priority ?? 0
    if (bp !== ap) return bp - ap
    return a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0
  })
  return scored[0]!.r
}
