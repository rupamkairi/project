import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { ConflictError, NotFoundError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstDeliveries } from "../db/schema/restaurant";
import { haversineKm } from "../lib/utils";

const DELIVERY_TRANSITIONS: Record<string, string[]> = {
  "pending-assignment": ["assigned"],
  assigned: ["rider-heading-to-outlet", "pending-assignment"],
  "rider-heading-to-outlet": ["reached-outlet"],
  "reached-outlet": ["picked-up"],
  "picked-up": ["out-for-delivery"],
  "out-for-delivery": ["delivered", "failed"],
  failed: ["returned"],
  delivered: [],
  returned: [],
};

function assertDeliveryTransition(current: string, next: string) {
  if (!DELIVERY_TRANSITIONS[current]?.includes(next)) {
    throw new ConflictError(`Delivery cannot transition from ${current} to ${next}`);
  }
}

async function findNearestRider(
  mediator: Mediator,
  orgId: string,
  outletId: string,
): Promise<any | null> {
  const riders = await mediator.query<any>({
    type: "identity.listPersons",
    params: { organizationId: orgId, type: "rider", limit: 100 },
    actorId: "system",
    orgId,
  });

  const available = (riders?.items ?? riders ?? []).filter(
    (r: any) => r.meta?.status === "available",
  );

  if (available.length === 0) return null;

  const outlet = await mediator.query<any>({
    type: "location.getLocation",
    params: { locationId: outletId },
    actorId: "system",
    orgId,
  });

  const outletCoords = outlet?.meta?.location;
  if (!outletCoords) return available[0];

  let nearest: any = null;
  let minDist = Infinity;

  for (const rider of available) {
    const riderCoords = rider.meta?.currentLocation;
    if (!riderCoords) continue;
    const dist = haversineKm(outletCoords, riderCoords);
    if (dist < minDist) {
      minDist = dist;
      nearest = rider;
    }
  }

  return nearest ?? available[0];
}

const locationDebounce = new Map<string, ReturnType<typeof setTimeout>>();

export function deliveryRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/deliveries" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const all = await db.query.rstDeliveries.findMany({
        where: eq(rstDeliveries.organizationId, orgId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });

      return {
        data: all,
        pendingAssignment: all.filter((d) => d.status === "pending-assignment"),
        inProgress: all.filter((d) =>
          ["assigned", "rider-heading-to-outlet", "reached-outlet", "picked-up", "out-for-delivery"].includes(
            d.status,
          ),
        ),
        completed: all.filter((d) => d.status === "delivered"),
        failed: all.filter((d) => ["failed", "returned"].includes(d.status)),
      };
    })

    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const delivery = await db.query.rstDeliveries.findFirst({
        where: and(eq(rstDeliveries.id, params.id), eq(rstDeliveries.organizationId, orgId)),
      });

      if (!delivery) throw new NotFoundError("Delivery not found");
      return delivery;
    })

    .post("/:id/assign", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const delivery = await db.query.rstDeliveries.findFirst({
        where: and(eq(rstDeliveries.id, params.id), eq(rstDeliveries.organizationId, orgId)),
      });

      if (!delivery) throw new NotFoundError("Delivery not found");
      assertDeliveryTransition(delivery.status, "assigned");

      let riderId = (body as any)?.riderId;

      if (!riderId) {
        const order = await mediator.query<any>({
          type: "commerce.getTransaction",
          params: { transactionId: delivery.transactionId, organizationId: orgId },
          actorId: actor?.id ?? "system",
          orgId,
        });
        const outletId = order?.meta?.outletId;
        const rider = await findNearestRider(mediator, orgId, outletId);
        if (!rider) throw new ConflictError("No available riders");
        riderId = rider.id;
      }

      await db
        .update(rstDeliveries)
        .set({ personId: riderId, status: "assigned", updatedAt: new Date() })
        .where(eq(rstDeliveries.id, params.id));

      await mediator.dispatch<any>({
        type: "identity.updatePersonMeta",
        payload: {
          personId: riderId,
          meta: { status: "busy", activeDeliveryId: params.id },
          organizationId: orgId,
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.delivery.assigned",
        params.id,
        "rst.delivery",
        { deliveryId: params.id, riderId, orgId },
        orgId,
      ));
      return { status: "assigned", riderId };
    })

    .post("/:id/unassign", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const delivery = await db.query.rstDeliveries.findFirst({
        where: and(eq(rstDeliveries.id, params.id), eq(rstDeliveries.organizationId, orgId)),
      });

      if (!delivery) throw new NotFoundError("Delivery not found");
      if (delivery.status !== "assigned") {
        throw new ConflictError("Can only unassign when status is assigned");
      }

      const riderId = delivery.personId;

      await db
        .update(rstDeliveries)
        .set({ personId: null, status: "pending-assignment", notes: (body as any)?.reason, updatedAt: new Date() })
        .where(eq(rstDeliveries.id, params.id));

      if (riderId) {
        await mediator.dispatch<any>({
          type: "identity.updatePersonMeta",
          payload: {
            personId: riderId,
            meta: { status: "available", activeDeliveryId: null },
            organizationId: orgId,
          },
          actorId: actor?.id ?? "system",
          orgId,
          correlationId: generateId(),
        });
      }

      return { status: "unassigned" };
    })

    .post("/:id/status", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const nextStatus = (body as any).status;

      const delivery = await db.query.rstDeliveries.findFirst({
        where: and(eq(rstDeliveries.id, params.id), eq(rstDeliveries.organizationId, orgId)),
      });

      if (!delivery) throw new NotFoundError("Delivery not found");
      assertDeliveryTransition(delivery.status, nextStatus);

      const patch: Record<string, unknown> = { status: nextStatus, updatedAt: new Date() };

      if (nextStatus === "picked-up") patch.pickupAt = new Date();
      if (nextStatus === "delivered") patch.deliveredAt = new Date();
      if (nextStatus === "failed") patch.failureReason = (body as any).reason ?? null;

      await db.update(rstDeliveries).set(patch).where(eq(rstDeliveries.id, params.id));

      if (nextStatus === "delivered" || nextStatus === "failed") {
        if (delivery.personId) {
          await mediator.dispatch<any>({
            type: "identity.updatePersonMeta",
            payload: {
              personId: delivery.personId,
              meta: { status: "available", activeDeliveryId: null },
              organizationId: orgId,
            },
            actorId: actor?.id ?? "system",
            orgId,
            correlationId: generateId(),
          });
        }
        if (nextStatus === "delivered") {
          await bus.publish(createDomainEvent(
            "rst.delivery.delivered",
            params.id,
            "rst.delivery",
            { deliveryId: params.id, riderId: delivery.personId, orderId: delivery.transactionId, orgId },
            orgId,
          ));
        } else {
          await bus.publish(createDomainEvent(
            "rst.delivery.failed",
            params.id,
            "rst.delivery",
            { deliveryId: params.id, riderId: delivery.personId, orgId },
            orgId,
          ));
        }
      }

      await bus.publish(createDomainEvent(
        "rst.delivery.status-update",
        params.id,
        "rst.delivery",
        { deliveryId: params.id, status: nextStatus, orgId },
        orgId,
      ));
      return { status: nextStatus };
    })

    .post("/:id/pod", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await db
        .update(rstDeliveries)
        .set({ proofOfDelivery: (body as any).documentId, updatedAt: new Date() })
        .where(and(eq(rstDeliveries.id, params.id), eq(rstDeliveries.organizationId, orgId)));

      return { status: "pod_captured" };
    });
}

export function riderRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/riders" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const riders = await mediator.query<any>({
        type: "identity.listPersons",
        params: { organizationId: orgId, type: "rider", limit: 100 },
        actorId: actor?.id ?? "system",
        orgId,
      });

      return { data: riders?.items ?? riders ?? [] };
    })

    .patch("/:id/location", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const { lat, lng } = body as any;

      // Debounce DB write — max 1 write per 5s per rider
      const key = `${params.id}:${orgId}`;
      if (locationDebounce.has(key)) clearTimeout(locationDebounce.get(key)!);
      locationDebounce.set(
        key,
        setTimeout(async () => {
          await mediator.dispatch<any>({
            type: "identity.updatePersonMeta",
            payload: {
              personId: params.id,
              meta: { currentLocation: { lat, lng } },
              organizationId: orgId,
            },
            actorId: "system",
            orgId,
            correlationId: generateId(),
          });
          locationDebounce.delete(key);
        }, 5_000),
      );

      const delivery = await db.query.rstDeliveries.findFirst({
        where: and(
          eq(rstDeliveries.personId, params.id),
          eq(rstDeliveries.organizationId, orgId),
        ),
      });

      if (delivery && !["delivered", "failed", "returned"].includes(delivery.status)) {
        await db
          .update(rstDeliveries)
          .set({
            riderLocation: { lat, lng, updatedAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(rstDeliveries.id, delivery.id));

        await bus.publish(createDomainEvent(
          "rst.delivery.rider-location",
          delivery.id,
          "rst.delivery",
          { deliveryId: delivery.id, lat, lng, orgId },
          orgId,
        ));
      }

      return { status: "ok" };
    })

    .patch("/:id/status", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "identity.updatePersonMeta",
        payload: {
          personId: params.id,
          meta: { status: (body as any).status },
          organizationId: orgId,
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "updated" };
    });
}
