import { describe, it, expect } from 'bun:test'
import { resolveTaxRate } from './resolve'
import type { TaxRate } from '@db/schema/tax'

function rate(over: Partial<TaxRate> & { id: string }): TaxRate {
  return {
    organizationId: 'org-1',
    templateId: 'tpl-1',
    name: 'rate',
    rateBps: 0,
    jurisdiction: null,
    productType: null,
    isDefault: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    version: 1,
    meta: {},
    ...over,
  } as TaxRate
}

describe('resolveTaxRate', () => {
  it('prefers exact jurisdiction plus product-type over jurisdiction default', () => {
    const rates = [
      rate({ id: 'r-default', rateBps: 500, isDefault: true }),
      rate({ id: 'r-ka', jurisdiction: 'KA', rateBps: 900 }),
      rate({ id: 'r-ka-food', jurisdiction: 'KA', productType: 'food', rateBps: 0 }),
    ]
    const out = resolveTaxRate(rates, { jurisdiction: 'KA', productType: 'food' })
    expect(out?.id).toBe('r-ka-food')
    expect(out?.rateBps).toBe(0)
  })

  it('falls back to jurisdiction default then global default, null when empty', () => {
    const rates = [
      rate({ id: 'r-default', rateBps: 500, isDefault: true }),
      rate({ id: 'r-ka', jurisdiction: 'KA', rateBps: 900 }),
    ]
    expect(resolveTaxRate(rates, { jurisdiction: 'KA' })?.id).toBe('r-ka')
    expect(resolveTaxRate(rates, { jurisdiction: 'MH' })?.id).toBe('r-default')
    expect(resolveTaxRate([], { jurisdiction: 'MH' })).toBeNull()
  })
})
