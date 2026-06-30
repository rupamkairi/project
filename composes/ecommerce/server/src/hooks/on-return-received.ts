import type { Mediator } from "@core";

export async function onReturnReceived(
  returnId: string,
  orderId: string,
  mediator: Mediator
): Promise<void> {
  await mediator.dispatch({
    type: "ecommerce.processReturnRefund",
    returnId,
    orderId,
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
  } as any);
}
