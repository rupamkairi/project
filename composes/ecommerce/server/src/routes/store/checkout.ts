import { Elysia } from "elysia";
import type { Mediator, AdapterRegistry } from "@core";
import { resolveShippingOptions } from "../../checkout/resolve-shipping";
import { calculateTax } from "../../checkout/calculate-tax";
import { createPaymentSession } from "../../checkout/create-payment-session";

export function createCheckoutRoutes(mediator: Mediator, adapters: AdapterRegistry) {
  return new Elysia({ prefix: "/checkout" })
    .post("/:id/shipping-address", async ({ params, body }) => {
      return mediator.dispatch({
        type: "commerce.updateTransaction",
        id: params.id,
        payload: { shippingAddress: body },
        actorId: "anonymous",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .get("/:id/shipping-options", async ({ params }) => {
      return resolveShippingOptions(params.id, "", "");
    })
    .post("/:id/shipping-option", async ({ params, body }) => {
      return mediator.dispatch({
        type: "commerce.updateTransaction",
        id: params.id,
        payload: { shippingOptionId: body.shippingOptionId },
        actorId: "anonymous",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .get("/:id/tax", async ({ params }) => {
      return calculateTax(params.id, "", "");
    })
    .post("/:id/payment-session", async ({ params }) => {
      return createPaymentSession(params.id, "", mediator, adapters);
    });
}
