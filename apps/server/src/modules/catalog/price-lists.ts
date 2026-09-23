export interface PriceListInput {
  name: string
  currency?: string
  audience?: Record<string, unknown>
  validFrom?: string | Date | null
  validTo?: string | Date | null
  status?: 'draft' | 'active' | 'archived'
  priority?: number
}

export interface PriceRuleInput {
  priceListId: string
  variantId: string
  priceAmount: number
  priceCurrency: string
  minQty?: number
  conditions?: Record<string, unknown>
}

export function validatePriceListInput(p: PriceListInput): void {
  if (!p.name?.trim()) throw new Error('price list name is required')
  if (p.currency !== undefined && !/^[A-Z]{3}$/.test(p.currency))
    throw new Error('currency must be a 3-letter ISO code')
  const from = p.validFrom ? new Date(p.validFrom) : null
  const to = p.validTo ? new Date(p.validTo) : null
  if (from && Number.isNaN(from.getTime())) throw new Error('validFrom is not a valid date')
  if (to && Number.isNaN(to.getTime())) throw new Error('validTo is not a valid date')
  if (from && to && from > to) throw new Error('validity window is inverted: validFrom is after validTo')
  if (p.priority !== undefined && (!Number.isInteger(p.priority) || p.priority < 0))
    throw new Error('priority must be a non-negative integer')
}

export function validatePriceRuleInput(p: PriceRuleInput): void {
  if (!p.priceListId) throw new Error('priceListId is required')
  if (!p.variantId) throw new Error('variantId is required')
  if (!Number.isInteger(p.priceAmount) || p.priceAmount < 0)
    throw new Error('priceAmount must be a non-negative integer in minor units')
  if (!/^[A-Z]{3}$/.test(p.priceCurrency)) throw new Error('priceCurrency must be a 3-letter ISO code')
  const minQty = p.minQty ?? 1
  if (!Number.isInteger(minQty) || minQty < 1) throw new Error('minQty must be a positive integer quantity')
}
