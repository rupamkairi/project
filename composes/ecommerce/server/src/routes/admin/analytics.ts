import { Elysia } from "elysia";
import type { Mediator } from "@core";

export function createAnalyticsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/analytics" })
    .get("/overview", async ({ query }) => {
      const { period = "30d" } = query;
      return mediator.query({
        type: "analytics.getOverview",
        params: { compose: "ecommerce", period },
        actorId: "system",
        orgId: "",
      });
    })
    .get("/revenue", async ({ query }) => {
      const { period = "30d", breakdown = "daily" } = query;
      return mediator.query({
        type: "analytics.getRevenue",
        params: { compose: "ecommerce", period, breakdown },
        actorId: "system",
        orgId: "",
      });
    })
    .get("/products", async ({ query }) => {
      const { period = "30d", limit = 10 } = query;
      return mediator.query({
        type: "analytics.getTopProducts",
        params: { compose: "ecommerce", period, limit },
        actorId: "system",
        orgId: "",
      });
    });
}
