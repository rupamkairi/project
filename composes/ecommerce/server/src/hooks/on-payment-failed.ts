import type { Mediator } from "@core";

export async function onPaymentFailed(
  orderId: string,
  gatewayRef: string,
  mediator: Mediator
): Promise<void> {
  await mediator.dispatch({
    type: "ecommerce.cancelOrder",
    orderId,
    reason: "payment_failed",
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
  } as any);

  await mediator.dispatch({
    type: "notification.send",
    templateId: "payment-failed",
    recipientId: orderId,
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
    payload: {},
  } as any);
}
