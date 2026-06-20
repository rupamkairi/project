import { Elysia } from "elysia";
import { IntegrationError } from "@core";
import { createStripeAdapter } from "./providers/stripe";
import { createRazorpayAdapter } from "./providers/razorpay";
import { createWebhookRoutes } from "./routes/webhook";
import { createStatusRoutes } from "./routes/status";
import type { PaymentPluginConfig, PaymentPlugin } from "./types";

export function createPaymentPlugin(config: PaymentPluginConfig): PaymentPlugin {
  let adapter;

  if (config.provider === "stripe") {
    if (!config.stripe) {
      throw new IntegrationError("Stripe config required when provider is 'stripe'", "CONFIG_MISSING");
    }
    adapter = createStripeAdapter(config.stripe.secretKey, config.stripe.webhookSecret);
  } else if (config.provider === "razorpay") {
    if (!config.razorpay) {
      throw new IntegrationError("Razorpay config required when provider is 'razorpay'", "CONFIG_MISSING");
    }
    adapter = createRazorpayAdapter(
      config.razorpay.keyId,
      config.razorpay.keySecret,
      config.razorpay.webhookSecret,
    );
  } else {
    throw new IntegrationError(`Unknown payment provider: ${config.provider}`, "CONFIG_INVALID");
  }

  const plugin = new Elysia({ prefix: "/payment" })
    .use(createWebhookRoutes(adapter, config))
    .use(createStatusRoutes(adapter));

  return { plugin, adapter };
}

export type { PaymentPluginConfig, PaymentPlugin } from "./types";
