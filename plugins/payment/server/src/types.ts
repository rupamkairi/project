import type { Elysia } from 'elysia'
import type { PaymentAdapter, Money } from '@core'

export interface StripeConfig {
  secretKey: string
  webhookSecret: string
}

export interface RazorpayConfig {
  keyId: string
  keySecret: string
  webhookSecret: string
}

export interface PaymentPluginConfig {
  provider: 'stripe' | 'razorpay'
  stripe?: StripeConfig
  razorpay?: RazorpayConfig
  onPaymentReceived?: (
    orderId: string,
    amount: Money,
    gatewayRef: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>
  onPaymentFailed?: (orderId: string, gatewayRef: string, metadata?: Record<string, unknown>) => Promise<void>
  onRefundIssued?: (
    orderId: string,
    refundId: string,
    amount: Money,
    metadata?: Record<string, unknown>,
  ) => Promise<void>
}

export interface PaymentPlugin {
  // Permissive Elysia generics: route-level inference differs between
  // provider compositions under exactOptionalPropertyTypes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugin: Elysia<any, any, any, any, any, any, any>
  adapter: PaymentAdapter
}
