import { describe, it, expect } from 'bun:test'
import { availableQty, applyReserve, applyRelease, applyDeduct } from './reservation'

describe('reservation math', () => {
  it('computes available as on-hand minus reserved', () => {
    expect(availableQty({ onHand: 10, reserved: 3 })).toBe(7)
  })

  it('reserves when stock covers the quantity', () => {
    const out = applyReserve({ onHand: 10, reserved: 3 }, 4)
    expect(out).toEqual({ onHand: 10, reserved: 7 })
  })

  it('rejects reservation beyond available stock', () => {
    expect(() => applyReserve({ onHand: 10, reserved: 3 }, 8)).toThrow(/insufficient/i)
  })

  it('releases reservations without touching on-hand and deducts both on confirm', () => {
    expect(applyRelease({ onHand: 10, reserved: 7 }, 4)).toEqual({ onHand: 10, reserved: 3 })
    expect(() => applyRelease({ onHand: 10, reserved: 1 }, 4)).toThrow(/insufficient/i)
    expect(applyDeduct({ onHand: 10, reserved: 7 }, 4)).toEqual({ onHand: 6, reserved: 3 })
    expect(() => applyDeduct({ onHand: 2, reserved: 7 }, 4)).toThrow(/insufficient/i)
  })
})
