import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError, ConflictError } from "@core";

export function createOutletRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/outlets" })
    .get("/", async ({ request }) => {
      const session = (request as any).session;
      const outlets = await mediator.query({
        type: "location.list",
        params: { orgId: session.orgId, type: "outlet" },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      return { data: outlets };
    })

    .get("/:id", async ({ params, request }) => {
      const session = (request as any).session;
      const outlet = await mediator.query({
        type: "location.get",
        params: { locationId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!outlet) throw new NotFoundError("Outlet not found");
      return { data: outlet };
    })

    .post("/", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const outlet = await mediator.dispatch({
        type: "location.create",
        payload: { type: "outlet", ...input },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: outlet };
    })

    .post("/:id/open", async ({ params, request }) => {
      const session = (request as any).session;
      const outlet = await mediator.query({
        type: "location.get",
        params: { locationId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!outlet) throw new NotFoundError("Outlet not found");
      await mediator.dispatch({
        type: "location.updateStatus",
        payload: { locationId: params.id, status: "active" },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      await bus.publish(createDomainEvent(
        "rst.outlet.opened", params.id, "rst.outlet",
        { outletId: params.id, orgId: session.orgId },
        session.orgId,
      ));
      return { data: { outletId: params.id, status: "active" } };
    })

    .post("/:id/close", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      if (!input?.reason) throw new ConflictError("pauseReason required");
      await mediator.dispatch({
        type: "location.updateStatus",
        payload: { locationId: params.id, status: "inactive" },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      await bus.publish(createDomainEvent(
        "rst.outlet.closed", params.id, "rst.outlet",
        { outletId: params.id, orgId: session.orgId, reason: input.reason },
        session.orgId,
      ));
      return { data: { outletId: params.id, status: "inactive" } };
    })

    .get("/:id/tables", async ({ params, request }) => {
      const session = (request as any).session;
      const tables = await mediator.query({
        type: "location.list",
        params: { orgId: session.orgId, type: "table", parentId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      return { data: tables };
    })

    .post("/:id/tables", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const table = await mediator.dispatch({
        type: "location.create",
        payload: { type: "table", parentId: params.id, ...input },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: table };
    });
}
