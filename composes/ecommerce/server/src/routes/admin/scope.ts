export function routeScope(ctx: unknown): {
  actorId: string
  orgId: string
  correlationId: string
} {
  const actor = (ctx as { actor?: { id?: string; orgId?: string } }).actor
  return {
    actorId: actor?.id ?? 'system',
    orgId: actor?.orgId ?? '',
    correlationId: crypto.randomUUID(),
  }
}
