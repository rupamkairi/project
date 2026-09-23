import { describe, it, expect } from 'bun:test'
import { toMajorUnits } from './money'

describe('toMajorUnits', () => {
  it('converts minor units once at the ledger boundary', () => {
    expect(toMajorUnits(2180)).toBe(21.8)
    expect(toMajorUnits(1)).toBe(0.01)
  })
})
