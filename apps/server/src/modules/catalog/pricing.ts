import type { CatPriceList, CatPriceRule } from '@db/schema/catalog'

export interface PriceResolveContext {
  variantId: string
  qty: number
  currency: string
  audience: Record<string, unknown>
  now: Date
}

export interface ResolvedPrice {
  rule: CatPriceRule
  list: CatPriceList
  unitPriceAmount: number
  unitPriceCurrency: string
}

function audienceMatches(listAudience: unknown, ctx: Record<string, unknown>): number | null {
  const want = (listAudience ?? {}) as Record<string, unknown>
  const keys = Object.keys(want)
  for (const k of keys) {
    if (ctx[k] !== want[k]) return null
  }
  return keys.length
}

function listUsable(l: CatPriceList, ctx: PriceResolveContext): number | null {
  if (l.status !== 'active') return null
  if (l.currency !== ctx.currency) return null
  if (l.validFrom && ctx.now < new Date(l.validFrom)) return null
  if (l.validTo && ctx.now > new Date(l.validTo)) return null
  return audienceMatches(l.audience, ctx.audience)
}

export function resolvePriceRule(
  lists: CatPriceList[],
  rules: CatPriceRule[],
  ctx: PriceResolveContext,
): ResolvedPrice | null {
  const usable = new Map<string, { list: CatPriceList; specificity: number }>()
  for (const l of lists) {
    const specificity = listUsable(l, ctx)
    if (specificity !== null) usable.set(l.id, { list: l, specificity })
  }

  const qty = Math.max(1, Math.round(ctx.qty))
  const candidates: Array<{ rule: CatPriceRule; list: CatPriceList; specificity: number }> = []
  for (const r of rules) {
    if (r.variantId !== ctx.variantId) continue
    if ((r.minQty ?? 1) > qty) continue
    const hit = usable.get(r.priceListId)
    if (!hit) continue
    candidates.push({ rule: r, list: hit.list, specificity: hit.specificity })
  }
  if (!candidates.length) return null

  candidates.sort((a, b) => {
    if ((b.rule.minQty ?? 1) !== (a.rule.minQty ?? 1)) return (b.rule.minQty ?? 1) - (a.rule.minQty ?? 1)
    if (b.specificity !== a.specificity) return b.specificity - a.specificity
    return a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0
  })

  const winner = candidates[0]!
  const unitPriceAmount = winner.rule.priceAmount
  const unitPriceCurrency = winner.rule.priceCurrency
  if (unitPriceAmount == null || unitPriceCurrency == null) throw new Error('price rule missing price')
  return {
    rule: winner.rule,
    list: winner.list,
    unitPriceAmount,
    unitPriceCurrency,
  }
}
