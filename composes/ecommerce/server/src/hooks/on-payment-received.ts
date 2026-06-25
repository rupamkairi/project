import type { Mediator } from "@core";

export async function onPaymentReceived(
  orderId: string,
  amount: { amount: number; currency: string },
  gatewayRef: string,
  mediator: Mediator
): Promise<void> {
  await mediator.dispatch({
    type: "ledger.recordPayment",
    orderId,
    amount,
    gatewayRef,
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
  } as any);

  await mediator.dispatch({
    type: "ecommerce.markOrderPaid",
    orderId,
    gatewayRef,
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
  } as any);

  await mediator.dispatch({
    type: "workflow.startProcess",
    templateId: "ORDER_FULFILLMENT",
    contextId: orderId,
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
  } as any);
}
