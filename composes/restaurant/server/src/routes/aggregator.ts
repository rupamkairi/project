import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstAggregatorOrders } from "../db/schema/restaurant";
import { verifyHmacSignature } from "../lib/utils";
import { rstConfig } from "../config";
import { nextLocationSeq, formatOrderNumber, groupBy } from "../lib/utils";
import { rstKot, rstKotItems } from "../db/schema/restaurant";

interface AggregatorItem {
  externalId: string;
  name: string;
  qty: number;
  unitPrice: number;
  modifiers?: { name: string; option: string; price?: number }[];
}

interface AggregatorOrderInput {
  source: string;
  aggregatorOrderId: string;
  outletId: string;
  organizationId: string;
  customer: { name: string; phone: string; address: string };
  items: AggregatorItem[];
  subtotal: number;
  deliveryAddress: { lat?: number; lng?: number; address?: string };
  specialInstructions?: string;
  estimatedDeliveryTime?: number;
}

function normalizeSwiggyOrder(payload: any, outletId: string, orgId: string): AggregatorOrderInput {
  return {
    source: "swiggy",
    aggregatorOrderId: String(payload.order_id),
    outletId,
    organizationId: orgId,
    customer: {
      name: payload.delivery_address?.name ?? "Guest",
      phone: payload.delivery_address?.mobile ?? "",
      address: `${payload.delivery_address?.address ?? ""} ${payload.delivery_address?.landmark ?? ""}`.trim(),
    },
    items: (payload.order_items ?? []).map((i: any) => ({
      externalId: String(i.item_id),
      name: i.item_name,
      qty: i.quantity,
      unitPrice: (i.item_price ?? 0) / 100,
      modifiers: (i.customizations ?? []).map((c: any) => ({
        name: c.name,
        option: c.option,
        price: (c.price ?? 0) / 100,
      })),
    })),
    subtotal: (payload.order_total ?? 0) / 100,
    deliveryAddress: {
      lat: payload.delivery_address?.lat,
      lng: payload.delivery_address?.lng,
      address: payload.delivery_address?.address,
    },
    specialInstructions: payload.instructions,
    estimatedDeliveryTime: payload.delivery_sla_mins,
  };
}

function normalizeZomatoOrder(payload: any, outletId: string, orgId: string): AggregatorOrderInput {
  return {
    source: "zomato",
    aggregatorOrderId: `${payload.resId}-${payload.orderId}`,
    outletId,
    organizationId: orgId,
    customer: {
      name: payload.customerName ?? "Guest",
      phone: payload.customerPhone ?? "",
      address: payload.deliveryAddress ?? "",
    },
    items: (payload.items ?? []).map((i: any) => ({
      externalId: String(i.externalId),
      name: i.name,
      qty: i.quantity,
      unitPrice: parseFloat(i.price ?? "0"),
      modifiers: (i.addons ?? []).map((a: any) => ({
        name: a.groupName,
        option: a.name,
        price: parseFloat(a.price ?? "0"),
      })),
    })),
    subtotal: parseFloat(payload.totalCost ?? "0"),
    deliveryAddress: { lat: payload.lat, lng: payload.lng, address: payload.deliveryAddress },
    specialInstructions: payload.specialInstructions,
    estimatedDeliveryTime: payload.etaMinutes,
  };
}

async function ingestAggregatorOrder(mediator: Mediator, bus: EventBus, input: AggregatorOrderInput) {
  const orgId = input.organizationId;

  // Idempotency check
  const existing = await db.query.rstAggregatorOrders.findFirst({
    where: and(
      eq(rstAggregatorOrders.source, input.source),
      eq(rstAggregatorOrders.aggregatorOrderId, input.aggregatorOrderId),
    ),
  });
  if (existing) return existing;

  const aggOrder = await db
    .insert(rstAggregatorOrders)
    .values({
      id: generateId(),
      organizationId: orgId,
      source: input.source,
      aggregatorOrderId: input.aggregatorOrderId,
      outletId: input.outletId,
      rawPayload: input,
      status: "received",
      receivedAt: new Date(),
    })
    .returning();

  try {
    // Validate outlet
    const outlet = await mediator.query<any>({
      type: "location.getLocation",
      params: { locationId: input.outletId },
      actorId: "system",
      orgId,
    });

    if (!outlet || outlet.status !== "active") {
      await db
        .update(rstAggregatorOrders)
        .set({ status: "rejected", rejectionReason: "OUTLET_CLOSED", acknowledgedAt: new Date() })
        .where(eq(rstAggregatorOrders.id, aggOrder[0].id));
      return aggOrder[0];
    }

    // Map items
    const resolvedItems: any[] = [];
    const unmapped: string[] = [];

    for (const item of input.items) {
      const menuItem = await mediator.query<any>({
        type: "catalog.findItemByExternalId",
        params: {
          organizationId: orgId,
          type: "menu_item",
          source: input.source,
          externalId: item.externalId,
        },
        actorId: "system",
        orgId,
      }).catch(() => null);

      if (!menuItem) {
        unmapped.push(item.name);
      } else {
        resolvedItems.push({ ...item, menuItemId: menuItem.id, name: menuItem.name, station: menuItem.meta?.station ?? "default" });
      }
    }

    if (unmapped.length > 0) {
      await db
        .update(rstAggregatorOrders)
        .set({ status: "rejected", rejectionReason: `UNMAPPED_ITEMS: ${unmapped.join(", ")}`, acknowledgedAt: new Date() })
        .where(eq(rstAggregatorOrders.id, aggOrder[0].id));
      return aggOrder[0];
    }

    // Create order (transaction)
    const seq = await nextLocationSeq(input.outletId, "lastOrderSeq");
    const orderNumber = formatOrderNumber(outlet.code ?? "AGG", seq);

    const stages = await mediator.query<any>({
      type: "pipeline.listStages",
      params: { organizationId: orgId, entityType: "rst.order" },
      actorId: "system",
      orgId,
    });
    const placedStage = (stages?.items ?? stages ?? []).find((s: any) => s.name === "Placed");

    const order = await mediator.dispatch<any>({
      type: "commerce.createTransaction",
      payload: {
        type: "order",
        organizationId: orgId,
        stageId: placedStage?.id ?? null,
        meta: {
          outletId: input.outletId,
          orderNumber,
          orderType: "delivery",
          source: input.source,
          deliveryAddress: input.deliveryAddress,
          specialInstructions: input.specialInstructions ?? null,
          aggregatorOrderId: aggOrder[0].id,
          subtotal: String(input.subtotal),
          total: String(input.subtotal),
          status: "placed",
        },
      },
      actorId: "system",
      orgId,
      correlationId: generateId(),
    });

    // Add lines
    for (const item of resolvedItems) {
      await mediator.dispatch<any>({
        type: "commerce.addLine",
        payload: {
          transactionId: order?.id,
          itemId: item.menuItemId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          organizationId: orgId,
          meta: { name: item.name, modifiers: item.modifiers ?? [], station: item.station },
        },
        actorId: "system",
        orgId,
        correlationId: generateId(),
      });
    }

    // Create KOTs per station
    const byStation = groupBy(resolvedItems, (i: any) => i.station);
    for (const [station, stationItems] of Object.entries(byStation)) {
      const kotSeq = await nextLocationSeq(input.outletId, "lastKotSeq");
      const kotNumber = `KOT-${outlet.code ?? "AGG"}-${String(kotSeq).padStart(4, "0")}`;

      const kot = await db
        .insert(rstKot)
        .values({
          id: generateId(),
          organizationId: orgId,
          transactionId: order?.id,
          locationId: input.outletId,
          kotNumber,
          station,
          status: "sent",
          sentAt: new Date(),
        })
        .returning();

      await db.insert(rstKotItems).values(
        stationItems.map((item: any) => ({
          id: generateId(),
          organizationId: orgId,
          kotId: kot[0].id,
          transactionLineId: generateId(),
          itemId: item.menuItemId,
          name: item.name,
          qty: item.qty,
          modifiers: item.modifiers ?? [],
          status: "pending",
        })),
      );
    }

    // Link agg record to internal order
    await db
      .update(rstAggregatorOrders)
      .set({ internalOrderId: order?.id, status: "placed", acknowledgedAt: new Date() })
      .where(eq(rstAggregatorOrders.id, aggOrder[0].id));

    await bus.publish(createDomainEvent(
      "rst.order.placed",
      order?.id,
      "rst.order",
      { orderId: order?.id, orgId, outletId: input.outletId, source: input.source },
      orgId,
    ));

  } catch (err) {
    await db
      .update(rstAggregatorOrders)
      .set({ status: "error", rejectionReason: String(err), acknowledgedAt: new Date() })
      .where(eq(rstAggregatorOrders.id, aggOrder[0].id));
  }

  return aggOrder[0];
}

export function aggregatorRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/webhooks" })
    .post("/swiggy/:outletCode", async (ctx) => {
      const { params, request } = ctx as any;
      const rawBody = await request.text();
      const signature = request.headers.get("x-swiggy-signature") ?? "";

      if (rstConfig.swiggyHmacSecret && !verifyHmacSignature(rawBody, signature, rstConfig.swiggyHmacSecret)) {
        (ctx as any).set.status = 401;
        return { error: "Invalid signature" };
      }

      const outlet = await mediator.query<any>({
        type: "location.findLocationByCode",
        params: { code: params.outletCode, type: "outlet" },
        actorId: "system",
        orgId: "system",
      }).catch(() => null);

      if (!outlet) return { status: "ack" };

      const payload = JSON.parse(rawBody);
      const normalized = normalizeSwiggyOrder(payload, outlet.id, outlet.organizationId);

      // Async ingestion — return 200 immediately
      ingestAggregatorOrder(mediator, bus, normalized).catch(console.error);

      return { status: "ack" };
    })

    .post("/zomato/:outletCode", async (ctx) => {
      const { params, request } = ctx as any;
      const rawBody = await request.text();
      const signature = request.headers.get("x-zomato-signature") ?? "";

      if (rstConfig.zomatoHmacSecret && !verifyHmacSignature(rawBody, signature, rstConfig.zomatoHmacSecret)) {
        (ctx as any).set.status = 401;
        return { error: "Invalid signature" };
      }

      const outlet = await mediator.query<any>({
        type: "location.findLocationByCode",
        params: { code: params.outletCode, type: "outlet" },
        actorId: "system",
        orgId: "system",
      }).catch(() => null);

      if (!outlet) return { status: "ack" };

      const payload = JSON.parse(rawBody);
      const normalized = normalizeZomatoOrder(payload, outlet.id, outlet.organizationId);

      ingestAggregatorOrder(mediator, bus, normalized).catch(console.error);

      return { status: "ack" };
    });
}

export function aggregatorAdminRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/aggregator-orders" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const orders = await db.query.rstAggregatorOrders.findMany({
        where: eq(rstAggregatorOrders.organizationId, orgId),
        orderBy: (t, { desc }) => [desc(t.receivedAt)],
        limit: 100,
      });

      return { data: orders };
    })

    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const order = await db.query.rstAggregatorOrders.findFirst({
        where: and(
          eq(rstAggregatorOrders.id, params.id),
          eq(rstAggregatorOrders.organizationId, orgId),
        ),
      });

      return order ?? { error: "not found" };
    });
}
