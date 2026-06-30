import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError, ConflictError } from "@core";
import { db } from "../lib/db.js";
import { rstDeliveries } from "../db/schema/restaurant.js";
import { and, eq } from "drizzle-orm";

export function createDeliveryRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/delivery" })
    .get("/deliveries", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const status = url.searchParams.get("status");

      const deliveries = await db.query.rstDeliveries.findMany({
        where: and(
          eq(rstDeliveries.organizationId, session.orgId),
          outletId ? undefined : undefined, // filtered via join in production
        ),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 50,
      });

      // Enrich with rider and order info
      const enriched = await Promise.all(deliveries.map(async (d) => {
        let riderName: string | null = null;
        if (d.personId) {
          const rider = await mediator.query({
            type: "identity.getPerson",
            params: { personId: d.personId },
            actorId: session.actorId,
            orgId: session.orgId,
          }).catch(() => null);
          riderName = rider ? `${rider.firstName} ${rider.lastName}` : null;
        }
        const order = await mediator.query({
          type: "commerce.getTransaction",
          params: { transactionId: d.transactionId },
          actorId: session.actorId,
          orgId: session.orgId,
        }).catch(() => null);
        return {
          ...d,
          meta: {
            riderName,
            riderId: d.personId,
            address: d.deliveryAddress,
            orderNumber: order?.meta?.orderNumber,
            customerName: order?.meta?.customerName,
            distance: d.distanceKm,
          },
        };
      }));

      return { data: enriched };
    })

    .post("/deliveries/:id/assign", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;

      let riderId = input?.riderId;
      if (!riderId) {
        // Auto-assign: find available rider
        const riders = await mediator.query({
          type: "identity.listPersons",
          params: { orgId: session.orgId, type: "rider", available: true },
          actorId: session.actorId,
          orgId: session.orgId,
        }).catch(() => []);
        const available = (riders as any[]).find((r) => r.meta?.status === "available");
        if (!available) throw new ConflictError("No available riders");
        riderId = available.id;
      }

      const delivery = await db.query.rstDeliveries.findFirst({
        where: eq(rstDeliveries.id, params.id),
      });
      if (!delivery) throw new NotFoundError("Delivery not found");

      await db.update(rstDeliveries)
        .set({ personId: riderId, status: "assigned" })
        .where(eq(rstDeliveries.id, params.id));

      await bus.publish(createDomainEvent(
        "rst.delivery.assigned", params.id, "rst.delivery",
        { deliveryId: params.id, riderId, orgId: session.orgId },
        session.orgId,
      ));
      return { data: { deliveryId: params.id, riderId, status: "assigned" } };
    })

    .post("/deliveries/:id/status", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const delivery = await db.query.rstDeliveries.findFirst({ where: eq(rstDeliveries.id, params.id) });
      if (!delivery) throw new NotFoundError("Delivery not found");

      const updates: any = { status: input.status };
      if (input.status === "picked_up") updates.pickupAt = new Date();
      if (input.status === "delivered") updates.deliveredAt = new Date();

      await db.update(rstDeliveries).set(updates).where(eq(rstDeliveries.id, params.id));

      await bus.publish(createDomainEvent(
        `rst.delivery.${input.status}`, params.id, "rst.delivery",
        { deliveryId: params.id, status: input.status, orgId: session.orgId },
        session.orgId,
      ));
      return { data: { deliveryId: params.id, status: input.status } };
    })

    .post("/deliveries/:id/location", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      await db.update(rstDeliveries)
        .set({ riderLocation: { lat: input.lat, lng: input.lng, updatedAt: new Date().toISOString() } })
        .where(eq(rstDeliveries.id, params.id));
      await bus.publish(createDomainEvent(
        "rst.delivery.rider-location", params.id, "rst.delivery",
        { deliveryId: params.id, lat: input.lat, lng: input.lng, orgId: session.orgId },
        session.orgId,
      ));
      return { data: { ok: true } };
    })

    .get("/riders", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const available = url.searchParams.get("available");
      const riders = await mediator.query({
        type: "identity.listPersons",
        params: { orgId: session.orgId, type: "rider" },
        actorId: session.actorId,
        orgId: session.orgId,
      }).catch(() => []);
      const filtered = available === "true"
        ? (riders as any[]).filter((r) => r.meta?.status === "available")
        : riders;
      return { data: filtered };
    });
}
