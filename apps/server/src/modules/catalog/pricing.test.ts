import { describe, it, expect } from 'bun:test'
import { resolvePriceRule } from './pricing'
import type { CatPriceList, CatPriceRule } from '@db/schema/catalog'

function list(over: Partial<CatPriceList> & { id: string }): CatPriceList {
  return {
    organizationId: 'org-1',
    name: 'list',
    currency: 'USD',
    audience: {},
    validFrom: null,
    validTo: null,
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    version: 1,
    meta: {},
    ...over,
  } as CatPriceList
}

function rule(over: Partial<CatPriceRule> & { id: string }): CatPriceRule {
  return {
    organizationId: 'org-1',
    priceListId: 'pl-base',
    variantId: 'var-1',
    priceAmount: 1000,
    priceCurrency: 'USD',
    minQty: 1,
    conditions: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: undefined,
    version: 1,
    meta: {},
    ...over,
  } as CatPriceRule
}

const NOW = new Date('2026-06-01T00:00:00Z')

describe('resolvePriceRule', () => {
  it('picks the base price when only one rule matches', () => {
    const lists = [list({ id: 'pl-base' })]
    const rules = [rule({ id: 'r-base', priceListId: 'pl-base', priceAmount: 1000 })]
    const out = resolvePriceRule(lists, rules, {
      variantId: 'var-1',
      qty: 1,
      currency: 'USD',
      audience: {},
      now: NOW,
    })
    expect(out?.rule.id).toBe('r-base')
    expect(out?.unitPriceAmount).toBe(1000)
  })

  it('prefers the higher minQty tier the buyer qualifies for', () => {
    const lists = [list({ id: 'pl-base' })]
    const rules = [
      rule({ id: 'r-tier1', priceListId: 'pl-base', minQty: 1, priceAmount: 1000 }),
      rule({ id: 'r-tier10', priceListId: 'pl-base', minQty: 10, priceAmount: 800 }),
    ]
    const out = resolvePriceRule(lists, rules, {
      variantId: 'var-1',
      qty: 12,
      currency: 'USD',
      audience: {},
      now: NOW,
    })
    expect(out?.rule.id).toBe('r-tier10')
    expect(out?.unitPriceAmount).toBe(800)
  })

  it('ignores tiers above the quantity and lists outside their validity window', () => {
    const lists = [
      list({ id: 'pl-base' }),
      list({
        id: 'pl-expired',
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-12-31'),
      }),
    ]
    const rules = [
      rule({ id: 'r-tier1', priceListId: 'pl-base', minQty: 1, priceAmount: 1000 }),
      rule({ id: 'r-tier10', priceListId: 'pl-base', minQty: 10, priceAmount: 800 }),
      rule({ id: 'r-old', priceListId: 'pl-expired', minQty: 1, priceAmount: 100 }),
    ]
    const out = resolvePriceRule(lists, rules, {
      variantId: 'var-1',
      qty: 2,
      currency: 'USD',
      audience: {},
      now: NOW,
    })
    expect(out?.rule.id).toBe('r-tier1')
  })

  it('prefers the more specific audience and returns null when nothing matches', () => {
    const lists = [
      list({ id: 'pl-base' }),
      list({ id: 'pl-b2b', audience: { customerGroup: 'b2b' } }),
    ]
    const rules = [
      rule({ id: 'r-base', priceListId: 'pl-base', priceAmount: 1000 }),
      rule({ id: 'r-b2b', priceListId: 'pl-b2b', priceAmount: 700 }),
    ]
    const b2b = resolvePriceRule(lists, rules, {
      variantId: 'var-1',
      qty: 1,
      currency: 'USD',
      audience: { customerGroup: 'b2b' },
      now: NOW,
    })
    expect(b2b?.rule.id).toBe('r-b2b')

    const none = resolvePriceRule([], [], {
      variantId: 'var-1',
      qty: 1,
      currency: 'USD',
      audience: {},
      now: NOW,
    })
    expect(none).toBeNull()
  })

  it('prefers higher list priority over deeper tiers', () => {
    const lists = [
      list({ id: 'pl-base', priority: 10 } as Partial<CatPriceList> & { id: string }),
      list({ id: 'pl-promo', priority: 1 } as Partial<CatPriceList> & { id: string }),
    ]
    const rules = [
      rule({ id: 'r-base', priceListId: 'pl-base', minQty: 1, priceAmount: 1000 }),
      rule({ id: 'r-promo-tier', priceListId: 'pl-promo', minQty: 10, priceAmount: 100 }),
    ]
    const out = resolvePriceRule(lists, rules, {
      variantId: 'var-1',
      qty: 12,
      currency: 'USD',
      audience: {},
      now: NOW,
    })
    expect(out?.rule.id).toBe('r-base')
  })

  it('skips rules whose conditions do not match the context', () => {
    const lists = [list({ id: 'pl-base' })]
    const rules = [
      rule({ id: 'r-base', priceListId: 'pl-base', priceAmount: 1000 }),
      rule({
        id: 'r-vip',
        priceListId: 'pl-base',
        priceAmount: 100,
        conditions: { customerGroup: 'vip' },
      }),
    ]
    const out = resolvePriceRule(lists, rules, {
      variantId: 'var-1',
      qty: 1,
      currency: 'USD',
      audience: {},
      now: NOW,
    })
    expect(out?.rule.id).toBe('r-base')
  })
})
