export interface TaxTemplateInput {
  name: string
  provider?: string
  jurisdiction?: string | null
}

export interface TaxRateInput {
  templateId: string
  name: string
  rateBps: number
  jurisdiction?: string | null
  productType?: string | null
  isDefault?: boolean
  priority?: number
}

export function validateTaxTemplateInput(p: TaxTemplateInput): void {
  if (!p.name?.trim()) throw new Error('tax template name is required')
}

export function validateTaxRateInput(p: TaxRateInput): void {
  if (!p.templateId) throw new Error('templateId is required')
  if (!p.name?.trim()) throw new Error('tax rate name is required')
  if (!Number.isInteger(p.rateBps) || p.rateBps < 0 || p.rateBps > 10000)
    throw new Error('rateBps must be an integer in basis points between 0 and 10000')
  if (p.priority !== undefined && (!Number.isInteger(p.priority) || p.priority < 0))
    throw new Error('priority must be a non-negative integer')
}
