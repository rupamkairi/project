import { describe, it, expect } from 'bun:test'
import { toMajorUnits, currencyDecimals } from './money'

describe('toMajorUnits', () => {
  it('converts minor units once at the ledger boundary', () => {
    expect(toMajorUnits(2180, 'USD')).toBe(21.8)
    expect(toMajorUnits(1, 'USD')).toBe(0.01)
  })

  it('respects non-2-decimal currencies', () => {
    expect(currencyDecimals('JPY')).toBe(0)
    expect(toMajorUnits(2180, 'JPY')).toBe(2180)
    expect(currencyDecimals('BHD')).toBe(3)
    expect(toMajorUnits(2180, 'BHD')).toBe(2.18)
    expect(currencyDecimals('USD')).toBe(2)
  })
})
