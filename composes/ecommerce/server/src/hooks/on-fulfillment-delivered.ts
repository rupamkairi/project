import type { Mediator } from "@core";

export async function onFulfillmentDelivered(
  fulfillmentId: string,
  orderId: string,
  mediator: Mediator
): Promise<void> {
  await mediator.dispatch({
    type: "ecommerce.completeOrder",
    orderId,
    fulfillmentId,
    orgId: "",
    actorId: "system",
    correlationId: crypto.randomUUID(),
  } as any);
}
