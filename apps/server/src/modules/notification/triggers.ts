export interface TriggerRule {
  eventPattern: string
  templateKey: string
  channel: string
  recipientExpr: unknown
  conditions: Record<string, unknown>
  isActive: boolean
}

export interface DomainEventLike {
  type: string
  payload?: Record<string, unknown>
}

function patternMatches(pattern: string, type: string): boolean {
  if (pattern === type) return true
  if (pattern.endsWith('*')) return type.startsWith(pattern.slice(0, -1))
  return false
}

function conditionsMatch(
  conditions: Record<string, unknown>,
  payload: Record<string, unknown>,
): boolean {
  for (const k of Object.keys(conditions ?? {})) {
    if (payload[k] !== (conditions as Record<string, unknown>)[k]) return false
  }
  return true
}

export function matchTriggers(triggers: TriggerRule[], event: DomainEventLike): TriggerRule[] {
  return triggers.filter(
    (t) =>
      t.isActive &&
      patternMatches(t.eventPattern, event.type) &&
      conditionsMatch(t.conditions ?? {}, event.payload ?? {}),
  )
}
