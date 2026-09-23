import { describe, it, expect } from 'bun:test'
import { matchTriggers } from './triggers'

const triggers = [
  {
    eventPattern: 'order.placed',
    templateKey: 'order-placed',
    channel: 'email',
    recipientExpr: {},
    conditions: {},
    isActive: true,
  },
  {
    eventPattern: 'order.*',
    templateKey: 'order-any',
    channel: 'email',
    recipientExpr: {},
    conditions: { currency: 'USD' },
    isActive: true,
  },
  {
    eventPattern: 'order.cancelled',
    templateKey: 'off',
    channel: 'email',
    recipientExpr: {},
    conditions: {},
    isActive: false,
  },
]

describe('matchTriggers', () => {
  it('matches exact and wildcard patterns with condition filtering', () => {
    const out = matchTriggers(triggers, { type: 'order.placed', payload: { currency: 'USD' } })
    expect(out.map((t) => t.templateKey)).toEqual(['order-placed', 'order-any'])
  })

  it('drops inactive triggers and mismatched conditions', () => {
    expect(matchTriggers(triggers, { type: 'order.cancelled', payload: {} })).toEqual([])
    const out = matchTriggers(triggers, { type: 'order.placed', payload: { currency: 'INR' } })
    expect(out.map((t) => t.templateKey)).toEqual(['order-placed'])
  })
})
