import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";

export function createAnalyticsRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/analytics" })
    .get("/", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const period = url.searchParams.get("period") ?? "today";

      const orders = await mediator.query({
        type: "commerce.listTransactions",
        params: { orgId: session.orgId, type: "order", limit: 1000 },
        actorId: session.actorId,
        orgId: session.orgId,
      }).catch(() => []);

      const orderList = orders as any[];
      const completed = orderList.filter((o) => ["served", "completed"].includes(o.meta?.status ?? ""));
      const totalRevenue = completed.reduce((s: number, o: any) => s + parseFloat(String(o.total ?? 0)), 0);
      const totalOrders = orderList.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / completed.length : 0;
      const dineIn = orderList.filter((o) => o.meta?.orderType === "dine-in").length;
      const takeaway = orderList.filter((o) => o.meta?.orderType === "takeaway").length;
      const delivery = orderList.filter((o) => o.meta?.orderType === "delivery").length;
      const aggregator = orderList.filter((o) => o.meta?.source !== "pos" && o.meta?.source !== "qr").length;
      const cancelled = orderList.filter((o) => ["cancelled", "rejected"].includes(o.meta?.status ?? "")).length;

      // Build hourly buckets (stub)
      const hourly: any[] = [];
      const daily: any[] = [];

      return {
        data: {
          totalRevenue,
          totalOrders,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          dineIn,
          takeaway,
          delivery,
          aggregator,
          cancelled,
          covers: dineIn,
          topItems: [],
          hourly,
          daily,
          paymentMethods: [],
        },
      };
    });
}
