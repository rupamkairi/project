import type { Mediator } from '@core'

// Payment failure preserves the cart and its stock reservation so the
// shopper can retry without rebuilding. Releasing happens only through
// explicit cancellation (see cancelOrder). Notification fan-out stays
// pending until the notification plugin is instantiated in the shell.

export async function onPaymentFailed(
  orderId: string,
  gatewayRef: string,
  mediator: Mediator,
  ctx: { orgId: string; actorId?: string },
): Promise<{ orderId: string; retryable: boolean }> {
  const order = (await mediator.query({
    type: 'commerce.getTransaction',
    params: { id: orderId },
    actorId: ctx.actorId ?? 'system',
    orgId: ctx.orgId,
  })) as { stageId?: string | null } | null
  void gatewayRef
  return { orderId, retryable: order?.stageId === 'placed' }
}
