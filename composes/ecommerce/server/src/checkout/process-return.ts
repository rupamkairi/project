import { eq, and } from "drizzle-orm";
import { db } from "@db/client";
import { ecoReturns, ecoReturnItems } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator, AdapterRegistry } from "@core";
import type { PaymentAdapter } from "@core";

export interface ReturnRequest {
  transactionId: string;
  reason: string;
  reasonNote?: string;
  items: { transactionLineId: string; quantity: number; condition: string }[];
}

export async function processReturn(
  returnId: string,
  orgId: string,
  mediator: Mediator,
  adapters: AdapterRegistry
): Promise<void> {
  const returnRecord = await db
    .select()
    .from(ecoReturns)
    .where(eq(ecoReturns.id, returnId))
    .limit(1);

  if (!returnRecord.length) {
    throw new Error("Return not found");
  }

  if (returnRecord[0].status !== "received") {
    throw new Error("Return not in received status");
  }

  const refundAmount = returnRecord[0].refundAmount as { amount: number; currency: string } | null;
  if (!refundAmount) {
    throw new Error("No refund amount calculated");
  }

  const paymentAdapter = adapters.has("payment")
    ? adapters.get<PaymentAdapter>("payment")
    : null;

  if (paymentAdapter) {
    await paymentAdapter.refund({
      transactionId: returnRecord[0].transactionId,
      amount: refundAmount.amount,
      currency: refundAmount.currency,
    });
  }

  await mediator.dispatch({
    type: "ecommerce.processReturn",
    returnId,
    orgId,
    actorId: "system",
    correlationId: crypto.randomUUID(),
    payload: { status: "refunded" },
  } as any);
}
