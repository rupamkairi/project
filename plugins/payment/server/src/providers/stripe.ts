import Stripe from "stripe";
import type { PaymentAdapter, PaymentOrder, PaymentSession, PaymentResult, RefundResult, PaymentTransaction, WebhookEvent } from "@core";
import type { Money } from "@core";

export function createStripeAdapter(secretKey: string, webhookSecret: string): PaymentAdapter {
  const stripe = new Stripe(secretKey, { apiVersion: "2025-05-28.basil" });

  return {
    async createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: order.amount.currency.toLowerCase(),
              product_data: { name: order.description ?? "Order" },
              unit_amount: order.amount.amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: (order.metadata?.successUrl as string | undefined) ?? "/",
        cancel_url: (order.metadata?.cancelUrl as string | undefined) ?? "/",
        metadata: order.metadata as Record<string, string> | undefined,
      });

      return {
        sessionId: session.id,
        url: session.url ?? "",
        expiresAt: session.expires_at,
        metadata: { paymentIntentId: session.payment_intent ?? "" },
      };
    },

    async capturePayment(sessionId: string): Promise<PaymentResult> {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paymentIntentId = session.payment_intent as string | null;
      if (!paymentIntentId) {
        return { success: false, error: "No payment intent on session" };
      }
      const intent = await stripe.paymentIntents.capture(paymentIntentId);
      return {
        success: intent.status === "succeeded",
        transactionId: intent.id,
      };
    },

    async refund(transactionId: string, amount: Money): Promise<RefundResult> {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        amount: amount.amount,
      });
      return {
        success: refund.status === "succeeded",
        refundId: refund.id,
      };
    },

    async getTransaction(id: string): Promise<PaymentTransaction> {
      const intent = await stripe.paymentIntents.retrieve(id);
      return {
        id: intent.id,
        amount: { amount: intent.amount, currency: intent.currency.toUpperCase() },
        status: intent.status,
        createdAt: intent.created,
        metadata: intent.metadata as Record<string, unknown>,
      };
    },

    async handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
      const event = stripe.webhooks.constructEvent(
        payload as string | Buffer,
        signature,
        webhookSecret,
      );

      const typeMap: Record<string, string> = {
        "checkout.session.completed": "payment.received",
        "payment_intent.payment_failed": "payment.failed",
        "charge.refunded": "refund.created",
      };

      return {
        type: typeMap[event.type] ?? event.type,
        data: event.data.object as Record<string, unknown>,
        metadata: { stripeEventId: event.id, stripeEventType: event.type },
      };
    },
  };
}
