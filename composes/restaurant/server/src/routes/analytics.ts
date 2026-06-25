import Elysia from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { rstKot, rstDeliveries, rstShifts } from "../db/schema/restaurant";

export function analyticsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/analytics" })
    .get("/overview", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const orders = await mediator.query<any>({
        type: "commerce.listTransactions",
        params: { type: "order", organizationId: orgId, limit: 1000 },
        actorId: actor?.id ?? "system",
        orgId,
      }).catch(() => ({ items: [] }));

      const allOrders = orders?.items ?? orders ?? [];
      const completed = allOrders.filter((o: any) =>
        ["served", "completed", "settled"].includes(o.meta?.status ?? ""),
      );
      const rejected = allOrders.filter((o: any) =>
        ["rejected", "cancelled"].includes(o.meta?.status ?? ""),
      );

      const dineIn = completed.filter((o: any) => o.meta?.orderType === "dine-in");
      const delivery = completed.filter((o: any) => o.meta?.orderType === "delivery");
      const takeaway = completed.filter((o: any) => o.meta?.orderType === "takeaway");

      const toRevenue = (arr: any[]) =>
        arr.reduce((s: number, o: any) => s + parseFloat(o.meta?.total ?? o.totalAmount ?? 0), 0);

      return {
        revenue: {
          total: toRevenue(completed),
          dineIn: toRevenue(dineIn),
          delivery: toRevenue(delivery),
          takeaway: toRevenue(takeaway),
        },
        orders: {
          total: allOrders.length,
          completed: completed.length,
          rejected: rejected.length,
          avgOrderValue: completed.length > 0 ? toRevenue(completed) / completed.length : 0,
        },
      };
    })

    .get("/kitchen", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kots = await db.query.rstKot.findMany({
        where: and(
          eq(rstKot.organizationId, orgId),
          q.station ? eq(rstKot.station, q.station) : undefined,
        ),
      });

      const completed = kots.filter((k) => k.readyAt && k.sentAt);

      const tats = completed.map((k) => {
        const sentMs = k.sentAt ? new Date(k.sentAt).getTime() : 0;
        const readyMs = k.readyAt ? new Date(k.readyAt).getTime() : 0;
        return (readyMs - sentMs) / 60_000;
      });

      const avg = tats.length > 0 ? tats.reduce((s, v) => s + v, 0) / tats.length : 0;

      const byStation: Record<string, number[]> = {};
      for (const k of completed) {
        if (!k.readyAt || !k.sentAt) continue;
        const tat = (new Date(k.readyAt).getTime() - new Date(k.sentAt).getTime()) / 60_000;
        if (!byStation[k.station]) byStation[k.station] = [];
        byStation[k.station].push(tat);
      }

      const stationStats = Object.entries(byStation).map(([station, vals]) => {
        const sorted = [...vals].sort((a, b) => a - b);
        return {
          station,
          avgTat: vals.reduce((s, v) => s + v, 0) / vals.length,
          p50Tat: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
          p90Tat: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
          kotsProcessed: vals.length,
        };
      });

      return {
        avgKitchenTatMinutes: avg,
        avgKitchenTatByStation: stationStats,
        kotsTotal: kots.length,
        kotsCompleted: completed.length,
      };
    })

    .get("/delivery", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const deliveries = await db.query.rstDeliveries.findMany({
        where: eq(rstDeliveries.organizationId, orgId),
      });

      const delivered = deliveries.filter((d) => d.status === "delivered");
      const failed = deliveries.filter((d) => d.status === "failed");
      const returned = deliveries.filter((d) => d.status === "returned");

      const avgDeliveryTime =
        delivered.length > 0
          ? delivered
              .filter((d) => d.deliveredAt && d.createdAt)
              .reduce(
                (s, d) =>
                  s +
                  (new Date(d.deliveredAt!).getTime() - new Date(d.createdAt!).getTime()) /
                    60_000,
                0,
              ) / delivered.length
          : 0;

      return {
        totalDeliveries: deliveries.length,
        delivered: delivered.length,
        failed: failed.length,
        returned: returned.length,
        failureRate: deliveries.length > 0 ? failed.length / deliveries.length : 0,
        avgDeliveryTimeMinutes: avgDeliveryTime,
      };
    })

    .get("/menu", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const orders = await mediator.query<any>({
        type: "commerce.listTransactions",
        params: { type: "order", organizationId: orgId, limit: 1000 },
        actorId: actor?.id ?? "system",
        orgId,
      }).catch(() => ({ items: [] }));

      return { data: orders?.items ?? orders ?? [], note: "Full menu analytics require line aggregation" };
    })

    .get("/inventory", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const items = await mediator.query<any>({
        type: "catalog.listItems",
        params: { type: "stock_item", organizationId: orgId, limit: 500 },
        actorId: actor?.id ?? "system",
        orgId,
      }).catch(() => ({ items: [] }));

      const stockItems = items?.items ?? items ?? [];
      const lowStock = stockItems.filter(
        (i: any) =>
          parseFloat(i.meta?.currentStock ?? "999") <= parseFloat(i.meta?.reorderLevel ?? "0"),
      );

      return {
        lowStock: lowStock.map((i: any) => ({
          ingredientId: i.id,
          name: i.name,
          currentStock: parseFloat(i.meta?.currentStock ?? "0"),
          reorderLevel: parseFloat(i.meta?.reorderLevel ?? "0"),
          unit: i.meta?.unit,
        })),
        totalItems: stockItems.length,
      };
    })

    .get("/sales", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const orders = await mediator.query<any>({
        type: "commerce.listTransactions",
        params: { type: "order", organizationId: orgId, limit: 1000 },
        actorId: actor?.id ?? "system",
        orgId,
      }).catch(() => ({ items: [] }));

      return { data: orders?.items ?? orders ?? [] };
    });
}
