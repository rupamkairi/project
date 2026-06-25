import { Elysia } from "elysia";
import type { Mediator } from "@core";

export function createOrdersRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/orders" })
    .get("/", async ({ query }) => {
      const { page = 1, limit = 20, stageId, personId, dateFrom, dateTo } = query;
      return mediator.query({
        type: "commerce.listTransactions",
        params: { type: "order", page, limit, stageId, personId, dateFrom, dateTo },
        actorId: "system",
        orgId: "",
      });
    })
    .get("/:id", async ({ params }) => {
      return mediator.query({
        type: "commerce.getTransaction",
        params: { id: params.id },
        actorId: "system",
        orgId: "",
      });
    })
    .patch("/:id", async ({ params, body }) => {
      return mediator.dispatch({
        type: "commerce.updateTransaction",
        id: params.id,
        payload: body,
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .post("/:id/cancel", async ({ params }) => {
      return mediator.dispatch({
        type: "ecommerce.cancelOrder",
        orderId: params.id,
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    });
}
