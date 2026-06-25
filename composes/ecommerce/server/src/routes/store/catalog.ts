import { Elysia } from "elysia";
import type { Mediator } from "@core";

export function createCatalogRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/products" })
    .get("/", async ({ query }) => {
      const { page = 1, limit = 20, search, categoryId } = query;
      return mediator.query({
        type: "catalog.listItems",
        params: { type: "product", status: "published", page, limit, search, categoryId },
        actorId: "anonymous",
        orgId: "",
      });
    })
    .get("/:id", async ({ params }) => {
      return mediator.query({
        type: "catalog.getItem",
        params: { id: params.id },
        actorId: "anonymous",
        orgId: "",
      });
    });
}
