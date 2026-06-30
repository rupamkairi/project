import { Elysia } from "elysia";
import type { Mediator } from "@core";

export function createCartRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/cart" })
    .post("/", async () => {
      return mediator.dispatch({
        type: "commerce.createTransaction",
        payload: { type: "order", stageId: "draft" },
        actorId: "anonymous",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .get("/:id", async ({ params }) => {
      return mediator.query({
        type: "commerce.getTransaction",
        params: { id: params.id },
        actorId: "anonymous",
        orgId: "",
      });
    })
    .post("/:id/items", async ({ params, body }) => {
      return mediator.dispatch({
        type: "commerce.createTransactionLine",
        transactionId: params.id,
        payload: body,
        actorId: "anonymous",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .patch("/:id/items/:itemId", async ({ params, body }) => {
      return mediator.dispatch({
        type: "commerce.updateTransactionLine",
        transactionId: params.id,
        lineId: params.itemId,
        payload: body,
        actorId: "anonymous",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .delete("/:id/items/:itemId", async ({ params }) => {
      return mediator.dispatch({
        type: "commerce.deleteTransactionLine",
        transactionId: params.id,
        lineId: params.itemId,
        actorId: "anonymous",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    });
}
