// Ecommerce Admin Routes
// StoreAdmin endpoints for internal management

import Elysia, { t } from "elysia";
import { commands, queries } from "../index";
import { CoreError, NotFoundError } from "../../../core/errors";

// ============================================
// Validation Schemas
// ============================================

// Order filter query params
const OrderListQuery = t.Object({
  status: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  paymentStatus: t.Optional(t.String()),
  fulfillmentStatus: t.Optional(t.String()),
  fromDate: t.Optional(t.String()),
  toDate: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
});

// Order ID param
const OrderIdParam = t.Object({
  id: t.String(),
});

// Update order body
const UpdateOrderBody = t.Object({
  shippingAddressId: t.Optional(t.String()),
  billingAddressId: t.Optional(t.String()),
  customerNote: t.Optional(t.String()),
  internalNote: t.Optional(t.String()),
});

// Cancel order body
const CancelOrderBody = t.Object({
  reason: t.String({ minLength: 1 }),
});

// Confirm payment body
const ConfirmPaymentBody = t.Object({
  gatewayRef: t.Optional(t.String()),
});

// Fail payment body
const FailPaymentBody = t.Object({
  reason: t.String({ minLength: 1 }),
});

// Refund body
const RefundBody = t.Object({
  amount: t.Optional(t.Numeric({ minimum: 0 })),
  reason: t.String({ minLength: 1 }),
});

// Coupon list query
const CouponListQuery = t.Object({
  isActive: t.Optional(t.Boolean()),
  type: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
});

// Coupon ID param
const CouponIdParam = t.Object({
  id: t.String(),
});

// Create coupon body
const CreateCouponBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 50 }),
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String()),
  type: t.Union([
    t.Literal("percentage"),
    t.Literal("fixed"),
    t.Literal("shipping"),
  ]),
  scope: t.Union([
    t.Literal("cart"),
    t.Literal("product"),
    t.Literal("category"),
    t.Literal("shipping"),
  ]),
  value: t.Numeric({ minimum: 0 }),
  currency: t.Optional(t.String({ default: "INR" })),
  minOrderAmount: t.Optional(t.Numeric({ minimum: 0 })),
  maxDiscountAmount: t.Optional(t.Numeric({ minimum: 0 })),
  usageLimit: t.Optional(t.Numeric({ minimum: 1 })),
  perCustomerLimit: t.Optional(t.Numeric({ minimum: 1 })),
  targetVariantIds: t.Optional(t.Array(t.String())),
  targetCategoryIds: t.Optional(t.Array(t.String())),
  validFrom: t.Optional(t.String()),
  validTo: t.Optional(t.String()),
});

// Update coupon body
const UpdateCouponBody = t.Partial(
  t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    description: t.Optional(t.String()),
    value: t.Numeric({ minimum: 0 }),
    minOrderAmount: t.Optional(t.Numeric({ minimum: 0 })),
    maxDiscountAmount: t.Optional(t.Numeric({ minimum: 0 })),
    usageLimit: t.Optional(t.Numeric({ minimum: 1 })),
    perCustomerLimit: t.Optional(t.Numeric({ minimum: 1 })),
    targetVariantIds: t.Optional(t.Array(t.String())),
    targetCategoryIds: t.Optional(t.Array(t.String())),
    validFrom: t.Optional(t.String()),
    validTo: t.Optional(t.String()),
    isActive: t.Optional(t.Boolean()),
  }),
);

// Address ID param
const AddressIdParam = t.Object({
  id: t.String(),
});

// Customer ID param
const CustomerIdParam = t.Object({
  customerId: t.String(),
});

// Create address body
const CreateAddressBody = t.Object({
  type: t.Union([t.Literal("shipping"), t.Literal("billing")]),
  firstName: t.String({ minLength: 1 }),
  lastName: t.String({ minLength: 1 }),
  company: t.Optional(t.String()),
  addressLine1: t.String({ minLength: 1 }),
  addressLine2: t.Optional(t.String()),
  city: t.String({ minLength: 1 }),
  state: t.String({ minLength: 1 }),
  postalCode: t.String({ minLength: 1 }),
  country: t.Optional(t.String({ default: "IN" })),
  phone: t.Optional(t.String()),
});

// Update address body
const UpdateAddressBody = t.Partial(
  t.Object({
    firstName: t.String({ minLength: 1 }),
    lastName: t.String({ minLength: 1 }),
    company: t.Optional(t.String()),
    addressLine1: t.String({ minLength: 1 }),
    addressLine2: t.Optional(t.String()),
    city: t.String({ minLength: 1 }),
    state: t.String({ minLength: 1 }),
    postalCode: t.String({ minLength: 1 }),
    country: t.Optional(t.String()),
    phone: t.Optional(t.String()),
  }),
);

// Set default address body
const SetDefaultAddressBody = t.Object({
  type: t.Union([t.Literal("shipping"), t.Literal("billing")]),
});

// ============================================
// Helper Functions
// ============================================

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new CoreError("INVALID_DATE", "Invalid date format");
  }
  return date;
}

// ============================================
// Admin Routes
// ============================================

export const adminRoutes = new Elysia({ prefix: "/admin/ecom" })
  .group("/orders", (app) =>
    app
      // GET /admin/ecom/orders - List all orders
      .get(
        "/",
        async ({ query }) => {
          const params = {
            status: query.status,
            customerId: query.customerId,
            paymentStatus: query.paymentStatus,
            fulfillmentStatus: query.fulfillmentStatus,
            fromDate: parseDate(query.fromDate),
            toDate: parseDate(query.toDate),
            limit: query.limit ? Number(query.limit) : undefined,
            offset: query.offset ? Number(query.offset) : undefined,
          };
          const result = await queries.listOrders(params);
          return result;
        },
        {
          query: OrderListQuery,
        },
      )

      // GET /admin/ecom/orders/:id - Get order details
      .get(
        "/:id",
        async ({ params }) => {
          const result = await queries.getOrder({ orderId: params.id });
          if (!result) {
            throw new NotFoundError("Order not found");
          }
          return result;
        },
        {
          params: OrderIdParam,
        },
      )

      // PATCH /admin/ecom/orders/:id - Update order
      .patch(
        "/:id",
        async ({ params, body }) => {
          const result = await commands.updateOrder({
            orderId: params.id,
            shippingAddressId: body.shippingAddressId,
            billingAddressId: body.billingAddressId,
            customerNote: body.customerNote,
            internalNote: body.internalNote,
          });
          return result;
        },
        {
          params: OrderIdParam,
          body: UpdateOrderBody,
        },
      )

      // POST /admin/ecom/orders/:id/cancel - Cancel order
      .post(
        "/:id/cancel",
        async ({ params, body }) => {
          const result = await commands.cancelOrder({
            orderId: params.id,
            reason: body.reason,
          });
          return result;
        },
        {
          params: OrderIdParam,
          body: CancelOrderBody,
        },
      )

      // POST /admin/ecom/orders/:id/confirm-payment - Confirm payment
      .post(
        "/:id/confirm-payment",
        async ({ params, body }) => {
          const result = await commands.confirmPayment({
            orderId: params.id,
            gatewayRef: body.gatewayRef,
          });
          return result;
        },
        {
          params: OrderIdParam,
          body: ConfirmPaymentBody,
        },
      )

      // POST /admin/ecom/orders/:id/fail-payment - Mark payment failed
      .post(
        "/:id/fail-payment",
        async ({ params, body }) => {
          const result = await commands.failPayment({
            orderId: params.id,
            reason: body.reason,
          });
          return result;
        },
        {
          params: OrderIdParam,
          body: FailPaymentBody,
        },
      )

      // POST /admin/ecom/orders/:id/refund - Process refund
      .post(
        "/:id/refund",
        async ({ params, body }) => {
          const result = await commands.requestRefund({
            orderId: params.id,
            amount: body.amount ? Number(body.amount) : undefined,
            reason: body.reason,
          });
          return result;
        },
        {
          params: OrderIdParam,
          body: RefundBody,
        },
      ),
  )

  .group("/coupons", (app) =>
    app
      // GET /admin/ecom/coupons - List all coupons
      .get(
        "/",
        async ({ query }) => {
          const params = {
            isActive: query.isActive,
            type: query.type,
            limit: query.limit ? Number(query.limit) : undefined,
            offset: query.offset ? Number(query.offset) : undefined,
          };
          // TODO: Implement listCoupons query
          return { data: [], total: 0 };
        },
        {
          query: CouponListQuery,
        },
      )

      // POST /admin/ecom/coupons - Create coupon
      .post(
        "/",
        async ({ body }) => {
          const result = await commands.createCoupon({
            code: body.code,
            name: body.name,
            description: body.description,
            type: body.type,
            scope: body.scope,
            value: Number(body.value),
            currency: body.currency,
            minOrderAmount: body.minOrderAmount
              ? Number(body.minOrderAmount)
              : undefined,
            maxDiscountAmount: body.maxDiscountAmount
              ? Number(body.maxDiscountAmount)
              : undefined,
            usageLimit: body.usageLimit ? Number(body.usageLimit) : undefined,
            perCustomerLimit: body.perCustomerLimit
              ? Number(body.perCustomerLimit)
              : undefined,
            targetVariantIds: body.targetVariantIds,
            targetCategoryIds: body.targetCategoryIds,
            validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
            validTo: body.validTo ? new Date(body.validTo) : undefined,
          });
          return result;
        },
        {
          body: CreateCouponBody,
        },
      )

      // GET /admin/ecom/coupons/:id - Get coupon details
      .get(
        "/:id",
        async ({ params }) => {
          // TODO: Implement getCoupon query
          throw new NotFoundError("Coupon not found");
        },
        {
          params: CouponIdParam,
        },
      )

      // PATCH /admin/ecom/coupons/:id - Update coupon
      .patch(
        "/:id",
        async ({ params, body }) => {
          const updateData: Record<string, unknown> = {};

          if (body.name !== undefined) updateData.name = body.name;
          if (body.description !== undefined)
            updateData.description = body.description;
          if (body.value !== undefined) updateData.value = Number(body.value);
          if (body.minOrderAmount !== undefined)
            updateData.minOrderAmount = Number(body.minOrderAmount);
          if (body.maxDiscountAmount !== undefined)
            updateData.maxDiscountAmount = Number(body.maxDiscountAmount);
          if (body.usageLimit !== undefined)
            updateData.usageLimit = Number(body.usageLimit);
          if (body.perCustomerLimit !== undefined)
            updateData.perCustomerLimit = Number(body.perCustomerLimit);
          if (body.targetVariantIds !== undefined)
            updateData.targetVariantIds = body.targetVariantIds;
          if (body.targetCategoryIds !== undefined)
            updateData.targetCategoryIds = body.targetCategoryIds;
          if (body.validFrom !== undefined)
            updateData.validFrom = new Date(body.validFrom);
          if (body.validTo !== undefined)
            updateData.validTo = new Date(body.validTo);
          if (body.isActive !== undefined) updateData.isActive = body.isActive;

          const result = await commands.updateCoupon({
            couponId: params.id,
            ...updateData,
          });
          return result;
        },
        {
          params: CouponIdParam,
          body: UpdateCouponBody,
        },
      )

      // DELETE /admin/ecom/coupons/:id - Delete coupon
      .delete(
        "/:id",
        async ({ params }) => {
          const result = await commands.deleteCoupon({
            couponId: params.id,
          });
          return result;
        },
        {
          params: CouponIdParam,
        },
      ),
  )

  .group("/customers", (app) =>
    app
      // GET /admin/ecom/customers/:customerId/addresses - List customer addresses
      .get(
        "/:customerId/addresses",
        async ({ params }) => {
          const result = await queries.getAddresses({
            actorId: params.customerId,
          });
          return result;
        },
        {
          params: CustomerIdParam,
        },
      )

      // POST /admin/ecom/customers/:customerId/addresses - Create address for customer
      .post(
        "/:customerId/addresses",
        async ({ params, body }) => {
          const result = await commands.createAddress({
            actorId: params.customerId,
            type: body.type,
            firstName: body.firstName,
            lastName: body.lastName,
            company: body.company,
            addressLine1: body.addressLine1,
            addressLine2: body.addressLine2,
            city: body.city,
            state: body.state,
            postalCode: body.postalCode,
            country: body.country,
            phone: body.phone,
          });
          return result;
        },
        {
          params: CustomerIdParam,
          body: CreateAddressBody,
        },
      ),
  )

  .group("/addresses", (app) =>
    app
      // PATCH /admin/ecom/addresses/:id - Update address
      .patch(
        "/:id",
        async ({ params, body }) => {
          const result = await commands.updateAddress({
            addressId: params.id,
            firstName: body.firstName,
            lastName: body.lastName,
            company: body.company,
            addressLine1: body.addressLine1,
            addressLine2: body.addressLine2,
            city: body.city,
            state: body.state,
            postalCode: body.postalCode,
            country: body.country,
            phone: body.phone,
          });
          return result;
        },
        {
          params: AddressIdParam,
          body: UpdateAddressBody,
        },
      )

      // DELETE /admin/ecom/addresses/:id - Delete address
      .delete(
        "/:id",
        async ({ params }) => {
          const result = await commands.deleteAddress({
            addressId: params.id,
          });
          return result;
        },
        {
          params: AddressIdParam,
        },
      ),
  );

export default adminRoutes;
