import { describe, it, expect } from 'bun:test'
import { validateTaxTemplateInput, validateTaxRateInput } from './validate'

describe('validateTaxTemplateInput', () => {
  it('accepts a minimal template', () => {
    expect(() => validateTaxTemplateInput({ name: 'KA GST' })).not.toThrow()
    expect(() => validateTaxTemplateInput({ name: '' })).toThrow(/name/i)
  })
})

describe('validateTaxRateInput', () => {
  it('accepts a valid rate and rejects negative basis points', () => {
    expect(() =>
      validateTaxRateInput({ templateId: 'tpl-1', name: 'KA general', rateBps: 900 }),
    ).not.toThrow()
    expect(() =>
      validateTaxRateInput({ templateId: 'tpl-1', name: 'bad', rateBps: -1 }),
    ).toThrow(/basis points/i)
    expect(() =>
      validateTaxRateInput({ templateId: '', name: 'bad', rateBps: 100 }),
    ).toThrow(/template/i)
  })
})
