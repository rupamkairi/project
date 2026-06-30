import { eq, and } from "drizzle-orm";
import { db } from "@db/client";
import { ecoDraftOrders, ecoDraftOrderItems } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export interface DraftOrderRequest {
  personId: string;
  items: { itemId: string; quantity: number; unitPrice: { amount: number; currency: string } }[];
  shippingOptionId?: string;
  regionId?: string;
  paymentMethod?: string;
  note?: string;
}

export async function createDraftOrder(
  request: DraftOrderRequest,
  orgId: string,
  mediator: Mediator
): Promise<string> {
  const draftOrder = await db
    .insert(ecoDraftOrders)
    .values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      personId: request.personId,
      status: "draft",
      shippingOptionId: request.shippingOptionId,
      regionId: request.regionId,
      paymentMethod: request.paymentMethod,
      note: request.note,
      meta: {},
      version: 1,
    })
    .returning()
    .then((rows) => rows[0]);

  if (!draftOrder) {
    throw new Error("Failed to create draft order");
  }

  for (const item of request.items) {
    await db.insert(ecoDraftOrderItems).values({
      draftOrderId: draftOrder.id,
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
  }

  return draftOrder.id;
}

export async function placeDraftOrder(
  draftOrderId: string,
  orgId: string,
  mediator: Mediator
): Promise<string> {
  const draftOrder = await db
    .select()
    .from(ecoDraftOrders)
    .where(eq(ecoDraftOrders.id, draftOrderId))
    .limit(1);

  if (!draftOrder.length) {
    throw new Error("Draft order not found");
  }

  if (draftOrder[0].status !== "draft") {
    throw new Error("Draft order is not in draft status");
  }

  const items = await db
    .select()
    .from(ecoDraftOrderItems)
    .where(eq(ecoDraftOrderItems.draftOrderId, draftOrderId));

  const transaction = await mediator.dispatch({
    type: "commerce.createTransaction",
    orgId,
    actorId: "system",
    correlationId: crypto.randomUUID(),
    payload: {
      type: "order",
      stageId: "placed",
      personId: draftOrder[0].personId,
    },
  } as any);

  const transactionId = (transaction as any).id;

  for (const item of items) {
    await mediator.dispatch({
      type: "commerce.createTransactionLine",
      transactionId,
      orgId,
      actorId: "system",
      correlationId: crypto.randomUUID(),
      payload: {
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      },
    } as any);
  }

  await db
    .update(ecoDraftOrders)
    .set({
      status: "placed",
      placedTransactionId: transactionId,
      updatedAt: new Date(),
    })
    .where(eq(ecoDraftOrders.id, draftOrderId));

  return transactionId;
}
