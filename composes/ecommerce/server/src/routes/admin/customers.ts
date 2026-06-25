import { Elysia } from "elysia";
import type { Mediator } from "@core";

export function createCustomersRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/customers" })
    .get("/", async ({ query }) => {
      const { page = 1, limit = 20, search, groupId } = query;
      return mediator.query({
        type: "party.listPersons",
        params: { type: "customer", page, limit, search, groupId },
        actorId: "system",
        orgId: "",
      });
    })
    .get("/:id", async ({ params }) => {
      return mediator.query({
        type: "party.getPerson",
        params: { id: params.id },
        actorId: "system",
        orgId: "",
      });
    })
    .patch("/:id", async ({ params, body }) => {
      return mediator.dispatch({
        type: "party.updatePerson",
        id: params.id,
        payload: body,
        actorId: "system",
        orgId: "",
        correlationId: crypto.randomUUID(),
      });
    });
}
