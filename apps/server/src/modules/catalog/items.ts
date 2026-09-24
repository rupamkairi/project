export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeTags(tags: unknown): string[] {
  if (tags === undefined || tags === null) return []
  const list = typeof tags === 'string' ? tags.split(',') : Array.isArray(tags) ? tags : []
  return (list as unknown[])
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

export type ItemStatus = 'draft' | 'active' | 'archived'

export interface ItemInput {
  name: string
  slug?: string | undefined
  type?: string | undefined
  categoryId?: string | null | undefined
  description?: string | null | undefined
  attributes?: Record<string, unknown> | undefined
  status?: ItemStatus | undefined
  tags?: unknown
  media?: unknown
  barcode?: string | null | undefined
  uom?: string | null | undefined
}

export function validateItemInput(p: ItemInput): void {
  if (!p.name?.trim()) throw new Error('item name is required')
  if (p.status !== undefined && !['draft', 'active', 'archived'].includes(p.status))
    throw new Error(`unknown item status: ${p.status}`)
}

export function toItemRow(p: ItemInput): Record<string, unknown> {
  validateItemInput(p)
  return {
    name: p.name.trim(),
    slug: p.slug?.trim() || slugify(p.name),
    type: p.type ?? 'product',
    categoryId: p.categoryId ?? null,
    description: p.description ?? null,
    attributes: p.attributes ?? {},
    status: p.status ?? 'draft',
    tags: normalizeTags(p.tags),
    media: p.media ?? [],
    barcode: p.barcode ?? null,
    uom: p.uom ?? null,
  }
}

export interface VariantInput {
  itemId: string
  sku: string
  attributes?: Record<string, unknown>
  barcode?: string | null
  stockTracked?: boolean
  status?: string
  uom?: string | null
}

export function validateVariantInput(p: VariantInput): void {
  if (!p.itemId) throw new Error('itemId is required')
  if (!p.sku?.trim()) throw new Error('variant sku is required')
}

export interface CategoryInput {
  name: string
  slug?: string
  parentId?: string | null
  attributeSet?: unknown
  sortOrder?: number
  status?: string
}

export function validateCategoryInput(p: CategoryInput): void {
  if (!p.name?.trim()) throw new Error('category name is required')
}

export function toCategoryRow(p: CategoryInput): Record<string, unknown> {
  validateCategoryInput(p)
  return {
    name: p.name.trim(),
    slug: p.slug?.trim() || slugify(p.name),
    parentId: p.parentId ?? null,
    attributeSet: p.attributeSet ?? [],
    sortOrder: p.sortOrder ?? 0,
    status: p.status ?? 'active',
  }
}
