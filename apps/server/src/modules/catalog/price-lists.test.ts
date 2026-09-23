import { describe, it, expect } from 'bun:test'
import { validatePriceListInput, validatePriceRuleInput } from './price-lists'

describe('validatePriceListInput', () => {
  it('accepts a minimal list and rejects an inverted validity window', () => {
    expect(() =>
      validatePriceListInput({ name: 'Seasonal', currency: 'USD', status: 'active', priority: 0 }),
    ).not.toThrow()
    expect(() =>
      validatePriceListInput({
        name: 'Bad',
        validFrom: '2026-12-31',
        validTo: '2026-01-01',
      }),
    ).toThrow(/validity/i)
  })
})

describe('validatePriceRuleInput', () => {
  it('accepts a valid rule and rejects negative prices and zero quantities', () => {
    expect(() =>
      validatePriceRuleInput({
        priceListId: 'pl-1',
        variantId: 'var-1',
        priceAmount: 1000,
        priceCurrency: 'USD',
        minQty: 1,
      }),
    ).not.toThrow()
    expect(() =>
      validatePriceRuleInput({
        priceListId: 'pl-1',
        variantId: 'var-1',
        priceAmount: -5,
        priceCurrency: 'USD',
        minQty: 1,
      }),
    ).toThrow(/price/i)
    expect(() =>
      validatePriceRuleInput({
        priceListId: 'pl-1',
        variantId: 'var-1',
        priceAmount: 100,
        priceCurrency: 'USD',
        minQty: 0,
      }),
    ).toThrow(/quantity/i)
  })
})
