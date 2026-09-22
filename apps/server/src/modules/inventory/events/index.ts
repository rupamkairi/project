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
    source: 'inventory',
  }
}

export const InventoryEvents = {
  moved(id: string, reason: string) {
    return ev('inventory.moved', id, 'InvMovement', { reason })
  },
}
