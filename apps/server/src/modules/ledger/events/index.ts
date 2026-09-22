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
    source: 'ledger',
  }
}

export const LedgerEvents = {
  accountCreated(id: string, code: string) {
    return ev('ledger.account.created', id, 'LdgAccount', { code })
  },
  accountUpdated(id: string) {
    return ev('ledger.account.updated', id, 'LdgAccount', {})
  },
  journalCreated(id: string) {
    return ev('ledger.journal.created', id, 'LdgTransaction', {})
  },
  journalPosted(id: string) {
    return ev('ledger.journal.posted', id, 'LdgTransaction', {})
  },
  journalVoided(id: string) {
    return ev('ledger.journal.voided', id, 'LdgTransaction', {})
  },
}
