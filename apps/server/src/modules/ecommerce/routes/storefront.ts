// Ecommerce Storefront Routes
// Customer-facing endpoints

import Elysia, { t } from "elysia";
import { commands, queries } from "../index";
import { NotFoundError } from "../../../core/errors";

// ============================================
// Validation Schemas
// ============================================

// Order ID param
const OrderIdParam = t.Object({
  id: t.String(),
});

// Address ID param
const AddressIdParam = t.Object({
  id: t.String(),
});

// Item ID param
const ItemIdParam = t.Object({
  itemId: t.String(),
});

// Add to cart body
const AddToCartBody = t.Object({
  variantId: t.String(),
  quantity: t.Numeric({ minimum: 1 }),
});

// Update cart item body
const UpdateCartItemBody = t.Object({
  quantity: t.Numeric({ minimum: 0 }),
});

// Apply coupon body
const ApplyCouponBody = t.Object({
  couponCode: t.String(),
});

// Checkout body
const CheckoutBody = t.Object({
  shippingAddressId: t.String(),
  billingAddressId: t.Optional(t.String()),
  customerNote: t.Optional(t.String()),
});

// Customer order list query
const CustomerOrderQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
});

// Cancel order body
const CancelOrderBody = t.Object({
  reason: t.String({ minLength: 1 }),
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

/**
 * Extract customer ID from request headers
 * In production, this would be set by authentication middleware
 */
function getCustomerId(
  headers: Record<string, string | undefined>,
): string | undefined {
  return headers["x-customer-id"];
}

/**
 * Extract session ID from request headers/cookies
 * In production, this would be set by session middleware
 */
function getSessionId(
  headers: Record<string, string | undefined>,
): string | undefined {
  return (
    headers["x-session-id"] ||
    headers["cookie"]?.split("sessionId=")[1]?.split(";")[0]
  );
}

// ============================================
// Storefront Routes
// ============================================

export const storefrontRoutes = new Elysia({ prefix: "/store/ecom" })
  .group("/cart", (app) =>
    app
      // GET /store/ecom/cart - Get active cart
      .get("/", async ({ headers }) => {
        const customerId = getCustomerId(headers);
        const sessionId = getSessionId(headers);

        if (!customerId && !sessionId) {
          // No cart for unauthenticated users without session
          return { data: null };
        }

        const result = await queries.getActiveCart({
          customerId,
          sessionId,
        });
        return { data: result };
      })

      // POST /store/ecom/cart - Create new cart
      .post("/", async ({ headers }) => {
        const customerId = getCustomerId(headers);
        const sessionId = getSessionId(headers);

        const result = await commands.createCart({
          customerId,
          sessionId,
        });
        return result;
      })

      // POST /store/ecom/cart/items - Add item to cart
      .post(
        "/items",
        async ({ headers, body }) => {
          const customerId = getCustomerId(headers);
          const sessionId = getSessionId(headers);

          // First get or create the active cart
          let cart = await queries.getActiveCart({
            customerId,
            sessionId,
          });

          let cartId: string;

          if (!cart) {
            // Create a new cart if none exists
            const newCart = await commands.createCart({
              customerId,
              sessionId,
            });
            cartId = newCart.id as string;
          } else {
            cartId = (cart as { id: string }).id;
          }

          // Add item to cart
          const result = await commands.addToCart({
            cartId,
            variantId: (body as { variantId: string }).variantId,
            quantity: Number((body as { quantity: number }).quantity),
          });

          return result;
        },
        {
          body: AddToCartBody,
        },
      )

      // PATCH /store/ecom/cart/items/:itemId - Update cart item
      .patch(
        "/items/:itemId",
        async ({ params, headers, body }) => {
          const customerId = getCustomerId(headers);
          const sessionId = getSessionId(headers);

          const cart = await queries.getActiveCart({
            customerId,
            sessionId,
          });

          if (!cart) {
            throw new NotFoundError("Cart not found");
          }

          const result = await commands.updateCartItem({
            cartId: (cart as { id: string }).id,
            itemId: params.itemId,
            quantity: Number((body as { quantity: number }).quantity),
          });
          return result;
        },
        {
          params: ItemIdParam,
          body: UpdateCartItemBody,
        },
      )

      // DELETE /store/ecom/cart/items/:itemId - Remove item from cart
      .delete(
        "/items/:itemId",
        async ({ params, headers }) => {
          const customerId = getCustomerId(headers);
          const sessionId = getSessionId(headers);

          const cart = await queries.getActiveCart({
            customerId,
            sessionId,
          });

          if (!cart) {
            throw new NotFoundError("Cart not found");
          }

          const result = await commands.removeFromCart({
            cartId: (cart as { id: string }).id,
            itemId: params.itemId,
          });
          return result;
        },
        {
          params: ItemIdParam,
        },
      )

      // POST /store/ecom/cart/apply-coupon - Apply coupon
      .post(
        "/apply-coupon",
        async ({ headers, body }) => {
          const customerId = getCustomerId(headers);
          const sessionId = getSessionId(headers);

          const cart = await queries.getActiveCart({
            customerId,
            sessionId,
          });

          if (!cart) {
            throw new NotFoundError("Cart not found");
          }

          const couponCode = (body as { couponCode: string }).couponCode;

          // First validate the coupon
          const validation = await queries.validateCoupon({
            couponCode,
            cartId: (cart as { id: string }).id,
          });

          if (!validation || !(validation as { valid: boolean }).valid) {
            return {
              valid: false,
              message:
                (validation as { message?: string })?.message ||
                "Invalid coupon",
            };
          }

          // Apply the coupon
          const result = await commands.applyCoupon({
            cartId: (cart as { id: string }).id,
            couponCode,
          });

          return result;
        },
        {
          body: ApplyCouponBody,
        },
      )

      // DELETE /store/ecom/cart/coupon - Remove coupon
      .delete("/coupon", async ({ headers }) => {
        const customerId = getCustomerId(headers);
        const sessionId = getSessionId(headers);

        const cart = await queries.getActiveCart({
          customerId,
          sessionId,
        });

        if (!cart) {
          throw new NotFoundError("Cart not found");
        }

        const result = await commands.removeCoupon({
          cartId: (cart as { id: string }).id,
        });
        return result;
      })

      // POST /store/ecom/cart/checkout - Convert cart to order
      .post(
        "/checkout",
        async ({ headers, body }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required for checkout");
          }

          const sessionId = getSessionId(headers);

          const cart = await queries.getActiveCart({
            customerId,
            sessionId,
          });

          if (!cart) {
            throw new NotFoundError("Cart not found");
          }

          const checkoutBody = body as {
            shippingAddressId: string;
            billingAddressId?: string;
            customerNote?: string;
          };

          const result = await commands.convertCart({
            cartId: (cart as { id: string }).id,
            shippingAddressId: checkoutBody.shippingAddressId,
            billingAddressId: checkoutBody.billingAddressId,
            customerNote: checkoutBody.customerNote,
          });

          return result;
        },
        {
          body: CheckoutBody,
        },
      ),
  )

  .group("/orders", (app) =>
    app
      // GET /store/ecom/orders - List my orders
      .get(
        "/",
        async ({ query, headers }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            return { data: [], total: 0 };
          }

          const result = await queries.getOrderByCustomer({
            customerId,
            limit: query.limit ? Number(query.limit) : undefined,
            offset: query.offset ? Number(query.offset) : undefined,
          });
          return result;
        },
        {
          query: CustomerOrderQuery,
        },
      )

      // GET /store/ecom/orders/:id - Get order details
      .get(
        "/:id",
        async ({ params, headers }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required");
          }

          const result = await queries.getOrder({ orderId: params.id });

          if (!result) {
            throw new NotFoundError("Order not found");
          }

          // Verify the order belongs to the customer
          const order = result as { customerId: string };
          if (order.customerId !== customerId) {
            throw new Error("Access denied");
          }

          return result;
        },
        {
          params: OrderIdParam,
        },
      )

      // POST /store/ecom/orders/:id/cancel - Cancel my order
      .post(
        "/:id/cancel",
        async ({ params, headers, body }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required");
          }

          const cancelBody = body as { reason: string };

          const result = await commands.cancelOrder({
            orderId: params.id,
            reason: cancelBody.reason,
          });
          return result;
        },
        {
          params: OrderIdParam,
          body: CancelOrderBody,
        },
      ),
  )

  .group("/addresses", (app) =>
    app
      // GET /store/ecom/addresses - List my addresses
      .get("/", async ({ headers }) => {
        const customerId = getCustomerId(headers);

        if (!customerId) {
          return { data: [] };
        }

        const result = await queries.getAddresses({
          actorId: customerId,
        });
        return result;
      })

      // POST /store/ecom/addresses - Create address
      .post(
        "/",
        async ({ headers, body }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required");
          }

          const addressBody = body as {
            type: "shipping" | "billing";
            firstName: string;
            lastName: string;
            company?: string;
            addressLine1: string;
            addressLine2?: string;
            city: string;
            state: string;
            postalCode: string;
            country?: string;
            phone?: string;
          };

          const result = await commands.createAddress({
            actorId: customerId,
            type: addressBody.type,
            firstName: addressBody.firstName,
            lastName: addressBody.lastName,
            company: addressBody.company,
            addressLine1: addressBody.addressLine1,
            addressLine2: addressBody.addressLine2,
            city: addressBody.city,
            state: addressBody.state,
            postalCode: addressBody.postalCode,
            country: addressBody.country,
            phone: addressBody.phone,
          });
          return result;
        },
        {
          body: CreateAddressBody,
        },
      )

      // PATCH /store/ecom/addresses/:id - Update address
      .patch(
        "/:id",
        async ({ params, headers, body }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required");
          }

          const addressBody = body as {
            firstName?: string;
            lastName?: string;
            company?: string;
            addressLine1?: string;
            addressLine2?: string;
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
            phone?: string;
          };

          const result = await commands.updateAddress({
            addressId: params.id,
            firstName: addressBody.firstName,
            lastName: addressBody.lastName,
            company: addressBody.company,
            addressLine1: addressBody.addressLine1,
            addressLine2: addressBody.addressLine2,
            city: addressBody.city,
            state: addressBody.state,
            postalCode: addressBody.postalCode,
            country: addressBody.country,
            phone: addressBody.phone,
          });
          return result;
        },
        {
          params: AddressIdParam,
          body: UpdateAddressBody,
        },
      )

      // DELETE /store/ecom/addresses/:id - Delete address
      .delete(
        "/:id",
        async ({ params, headers }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required");
          }

          const result = await commands.deleteAddress({
            addressId: params.id,
          });
          return result;
        },
        {
          params: AddressIdParam,
        },
      )

      // POST /store/ecom/addresses/:id/default - Set default address
      .post(
        "/:id/default",
        async ({ params, headers, body }) => {
          const customerId = getCustomerId(headers);

          if (!customerId) {
            throw new Error("Authentication required");
          }

          const defaultBody = body as { type: "shipping" | "billing" };

          const result = await commands.setDefaultAddress({
            addressId: params.id,
            type: defaultBody.type,
          });
          return result;
        },
        {
          params: AddressIdParam,
          body: SetDefaultAddressBody,
        },
      ),
  );

export default storefrontRoutes;
