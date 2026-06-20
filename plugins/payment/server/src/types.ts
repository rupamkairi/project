import type { Elysia } from "elysia";
import type { PaymentAdapter, Money } from "@core";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export interface PaymentPluginConfig {
  provider: "stripe" | "razorpay";
  stripe?: StripeConfig;
  razorpay?: RazorpayConfig;
  onPaymentReceived?: (orderId: string, amount: Money, gatewayRef: string) => Promise<void>;
  onPaymentFailed?: (orderId: string, gatewayRef: string) => Promise<void>;
  onRefundIssued?: (orderId: string, refundId: string, amount: Money) => Promise<void>;
}

export interface PaymentPlugin {
  plugin: Elysia;
  adapter: PaymentAdapter;
}
