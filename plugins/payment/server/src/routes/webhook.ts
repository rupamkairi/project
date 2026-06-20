import { Elysia } from "elysia";
import type { PaymentAdapter } from "@core";
import type { PaymentPluginConfig } from "../types";

export function createWebhookRoutes(adapter: PaymentAdapter, config: PaymentPluginConfig) {
  return new Elysia().post(
    "/webhook/:provider",
    async ({ body, params, request, set }) => {
      const rawBody = body as string;
      const provider = params.provider;

      if (provider !== config.provider) {
        set.status = 400;
        return { error: "Provider mismatch" };
      }

      const signature =
        provider === "stripe"
          ? (request.headers.get("stripe-signature") ?? "")
          : (request.headers.get("x-razorpay-signature") ?? "");

      let event;
      try {
        event = await adapter.handleWebhook(rawBody, signature);
      } catch {
        set.status = 400;
        return { error: "Invalid webhook signature" };
      }

      const meta = event.data as Record<string, unknown>;

      if (event.type === "payment.received" && config.onPaymentReceived) {
        const orderId = String(
          meta.metadata && typeof meta.metadata === "object"
            ? (meta.metadata as Record<string, unknown>).orderId ?? ""
            : "",
        );
        const amount = {
          amount: Number(meta.amount ?? 0),
          currency: String(meta.currency ?? "USD").toUpperCase(),
        };
        const gatewayRef = String(meta.id ?? "");
        await config.onPaymentReceived(orderId, amount, gatewayRef).catch(console.error);
      }

      if (event.type === "payment.failed" && config.onPaymentFailed) {
        const orderId = String(
          meta.metadata && typeof meta.metadata === "object"
            ? (meta.metadata as Record<string, unknown>).orderId ?? ""
            : "",
        );
        const gatewayRef = String(meta.id ?? "");
        await config.onPaymentFailed(orderId, gatewayRef).catch(console.error);
      }

      if (event.type === "refund.created" && config.onRefundIssued) {
        const orderId = String(meta.payment_intent ?? meta.payment_id ?? "");
        const refundId = String(meta.id ?? "");
        const amount = {
          amount: Number(meta.amount ?? 0),
          currency: String(meta.currency ?? "USD").toUpperCase(),
        };
        await config.onRefundIssued(orderId, refundId, amount).catch(console.error);
      }

      return { received: true };
    },
    { type: "text" },
  );
}
