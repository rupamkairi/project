import type { Mediator, AdapterRegistry } from "@core";
import type { PaymentAdapter } from "@core";
import { validateCart } from "./validate-cart";
import { calculateTax } from "./calculate-tax";

export interface PaymentSessionResult {
  sessionId: string;
  url: string | null;
  expiresAt: Date;
  orderId: string;
}

export async function createPaymentSession(
  cartId: string,
  orgId: string,
  mediator: Mediator,
  adapters: AdapterRegistry
): Promise<PaymentSessionResult> {
  const validation = await validateCart(cartId, orgId);
  if (!validation.valid) {
    throw new Error(`Cart validation failed: ${validation.errors.join(", ")}`);
  }

  const tax = await calculateTax(cartId, orgId, "");

  const paymentAdapter = adapters.has("payment")
    ? adapters.get<PaymentAdapter>("payment")
    : null;

  if (!paymentAdapter) {
    throw new Error("Payment adapter not configured");
  }

  const session = await paymentAdapter.createPaymentSession({
    amount: tax.total.amount,
    currency: tax.total.currency,
    metadata: { transactionId: cartId, orgId },
  });

  await mediator.dispatch({
    type: "commerce.transitionStage",
    transactionId: cartId,
    orgId,
    actorId: "system",
    correlationId: crypto.randomUUID(),
    payload: { toStage: "placed" },
  } as any);

  return {
    sessionId: session.id,
    url: session.url ?? null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    orderId: cartId,
  };
}
