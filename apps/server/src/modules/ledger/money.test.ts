import { describe, it, expect } from 'bun:test'
import { toMinorUnits, fromMinorUnits } from './commands'

// The ecommerce sagas hold integer minor units end to end and convert
// once at the ledger boundary (createJournal takes major units).
// This locks the round-trip exactness the plan's money rule depends on.
describe('minor/major round-trip', () => {
  it.each([1, 99, 100, 2180, 9999, 123456789])('round-trips %i exactly', (minor) => {
    expect(toMinorUnits(fromMinorUnits(minor))).toBe(minor)
  })

  it('converts minors to majors', () => {
    expect(fromMinorUnits(2180)).toBe(21.8)
    expect(toMinorUnits(21.8)).toBe(2180)
  })
})
