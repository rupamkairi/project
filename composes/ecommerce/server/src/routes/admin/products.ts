import { Elysia } from "elysia";
import type { Mediator } from "@core";

export function createProductsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/products" })
    .get("/", async ({ query }) => {
      const { page = 1, limit = 20, search, status, categoryId } = query;
      return mediator.query({
        type: "catalog.listItems",
        params: { type: "product", page, limit, search, status, categoryId },
        actorId: "system",
        orgId: "",
      });
    })
    .post("/", async ({ body }) => {
      return mediator.dispatch({
        type: "catalog.createItem",
        payload: { ...body, type: "product" },
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .get("/:id", async ({ params }) => {
      return mediator.query({
        type: "catalog.getItem",
        params: { id: params.id },
        actorId: "system",
        orgId: "",
      });
    })
    .patch("/:id", async ({ params, body }) => {
      return mediator.dispatch({
        type: "catalog.updateItem",
        id: params.id,
        payload: body,
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .delete("/:id", async ({ params }) => {
      return mediator.dispatch({
        type: "catalog.deleteItem",
        id: params.id,
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .post("/:id/publish", async ({ params }) => {
      return mediator.dispatch({
        type: "catalog.updateItem",
        id: params.id,
        payload: { status: "published" },
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    })
    .post("/:id/unpublish", async ({ params }) => {
      return mediator.dispatch({
        type: "catalog.updateItem",
        id: params.id,
        payload: { status: "draft" },
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    });
}
