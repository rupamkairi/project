import { generateId } from '@core'
import type { DomainEvent } from '@core'

function ev<T>(
  type: string,
  aggregateId: string,
  aggregateType: string,
  payload: T,
): Omit<DomainEvent<T>, 'actorId' | 'orgId' | 'correlationId'> {
  return {
    id: generateId(),
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: Date.now(),
    version: 1,
    source: 'catalog',
  }
}

export const CatalogEvents = {
  itemCreated(id: string) {
    return ev('catalog.item.created', id, 'CatItem', {})
  },
  itemUpdated(id: string) {
    return ev('catalog.item.updated', id, 'CatItem', {})
  },
  itemDeleted(id: string) {
    return ev('catalog.item.deleted', id, 'CatItem', {})
  },
  itemStatusChanged(id: string, status: string) {
    return ev('catalog.item.status-changed', id, 'CatItem', { status })
  },
  variantCreated(id: string, itemId: string) {
    return ev('catalog.variant.created', id, 'CatVariant', { itemId })
  },
  variantUpdated(id: string) {
    return ev('catalog.variant.updated', id, 'CatVariant', {})
  },
  variantDeleted(id: string) {
    return ev('catalog.variant.deleted', id, 'CatVariant', {})
  },
  categoryCreated(id: string) {
    return ev('catalog.category.created', id, 'CatCategory', {})
  },
  categoryUpdated(id: string) {
    return ev('catalog.category.updated', id, 'CatCategory', {})
  },
  categoryDeleted(id: string) {
    return ev('catalog.category.deleted', id, 'CatCategory', {})
  },
  priceListCreated(id: string) {
    return ev('catalog.price-list.created', id, 'CatPriceList', {})
  },
  priceListUpdated(id: string) {
    return ev('catalog.price-list.updated', id, 'CatPriceList', {})
  },
  priceRuleCreated(id: string, priceListId: string) {
    return ev('catalog.price-rule.created', id, 'CatPriceRule', { priceListId })
  },
  priceRuleUpdated(id: string) {
    return ev('catalog.price-rule.updated', id, 'CatPriceRule', {})
  },
}
