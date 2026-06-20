import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { IntegrationError } from "@core";
import type { PaymentAdapter, PaymentOrder, PaymentSession, PaymentResult, RefundResult, PaymentTransaction, WebhookEvent } from "@core";
import type { Money } from "@core";

export function createRazorpayAdapter(
  keyId: string,
  keySecret: string,
  webhookSecret: string,
): PaymentAdapter {
  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

  return {
    async createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
      const rzpOrder = await rzp.orders.create({
        amount: order.amount.amount,
        currency: order.amount.currency,
        notes: (order.metadata ?? {}) as Record<string, string>,
      });

      const checkoutUrl = (order.metadata?.checkoutUrl as string | undefined) ?? "/checkout";

      return {
        sessionId: rzpOrder.id,
        url: `${checkoutUrl}?order_id=${rzpOrder.id}&key_id=${keyId}`,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        metadata: { rzpOrderId: rzpOrder.id },
      };
    },

    async capturePayment(paymentId: string): Promise<PaymentResult> {
      const payment = await rzp.payments.fetch(paymentId);
      if (payment.status === "authorized") {
        await rzp.payments.capture(paymentId, payment.amount, payment.currency);
      }
      const updated = await rzp.payments.fetch(paymentId);
      return {
        success: updated.status === "captured",
        transactionId: updated.id,
      };
    },

    async refund(transactionId: string, amount: Money): Promise<RefundResult> {
      const refund = await rzp.payments.refund(transactionId, {
        amount: amount.amount,
      });
      return {
        success: !!(refund as { id?: string }).id,
        refundId: (refund as { id?: string }).id,
      };
    },

    async getTransaction(id: string): Promise<PaymentTransaction> {
      const payment = await rzp.payments.fetch(id);
      return {
        id: payment.id,
        amount: { amount: payment.amount, currency: payment.currency },
        status: payment.status,
        createdAt: payment.created_at,
        metadata: payment.notes as Record<string, unknown>,
      };
    },

    async handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
      const body = typeof payload === "string" ? payload : JSON.stringify(payload);
      const expected = createHmac("sha256", webhookSecret).update(body).digest("hex");

      if (expected !== signature) {
        throw new IntegrationError("Razorpay webhook signature mismatch", "WEBHOOK_INVALID");
      }

      const event = JSON.parse(body) as { event: string; payload: Record<string, unknown> };

      const typeMap: Record<string, string> = {
        "payment.captured": "payment.received",
        "payment.failed": "payment.failed",
        "refund.created": "refund.created",
      };

      return {
        type: typeMap[event.event] ?? event.event,
        data: event.payload,
        metadata: { rzpEventType: event.event },
      };
    },
  };
}
