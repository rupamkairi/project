import { describe, it, expect } from 'bun:test'
import {
  slugify,
  normalizeTags,
  toItemRow,
  validateVariantInput,
  toCategoryRow,
  validateCategoryInput,
} from './items'

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('Winter Jacket 2026!')).toBe('winter-jacket-2026')
    expect(slugify('  Spaced  Out  ')).toBe('spaced-out')
  })
})

describe('normalizeTags', () => {
  it('accepts arrays and comma strings and drops blanks', () => {
    expect(normalizeTags(['a', ' b ', ''])).toEqual(['a', 'b'])
    expect(normalizeTags('a, b,,c')).toEqual(['a', 'b', 'c'])
    expect(normalizeTags(undefined)).toEqual([])
  })
})

describe('toItemRow', () => {
  it('derives slug and defaults from the name', () => {
    const row = toItemRow({ name: 'Winter Jacket' }) as { slug: string; status: string; type: string }
    expect(row.slug).toBe('winter-jacket')
    expect(row.status).toBe('draft')
    expect(row.type).toBe('product')
  })

  it('rejects blank names and unknown statuses', () => {
    expect(() => toItemRow({ name: '  ' })).toThrow(/name/i)
    expect(() => toItemRow({ name: 'Ok', status: 'live' as never })).toThrow(/status/i)
  })
})

describe('variants and categories', () => {
  it('requires itemId and sku', () => {
    expect(() => validateVariantInput({ itemId: '', sku: 's' })).toThrow(/itemId/i)
    expect(() => validateVariantInput({ itemId: 'i', sku: '  ' })).toThrow(/sku/i)
  })

  it('derives category slug and rejects blank names', () => {
    const row = toCategoryRow({ name: 'Outerwear' }) as { slug: string; status: string }
    expect(row.slug).toBe('outerwear')
    expect(row.status).toBe('active')
    expect(() => validateCategoryInput({ name: '' })).toThrow(/name/i)
  })
})
