import { Elysia } from "elysia";
import { eq, count } from "drizzle-orm";
import { db } from "@db/client";
import { catItems } from "@projectx/ecommerce-server/db/schema/index";
import { ecoFulfillments } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

const summary = {
  totalRevenue: 0,
  totalOrders: 0,
  totalCustomers: 0,
  totalProducts: 0,
  revenue: 0,
  orders: 0,
  customers: 0,
  products: 0,
};

export function createAnalyticsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/analytics" })
    .get("/overview", async () => {
      const [productCount] = await db.select({ value: count() }).from(catItems).where(eq(catItems.type, "product"));
      const [fulfillmentCount] = await db.select({ value: count() }).from(ecoFulfillments);
      return {
        ...summary,
        totalProducts: Number(productCount?.value ?? 0),
        products: Number(productCount?.value ?? 0),
        totalOrders: Number(fulfillmentCount?.value ?? 0),
        orders: Number(fulfillmentCount?.value ?? 0),
      };
    })
    .get("/revenue", async ({ query }: any) => {
      const { period = "30d", breakdown = "daily" } = query;
      return { data: [], period, breakdown };
    })
    .get("/products", async ({ query }: any) => {
      const { period = "30d", limit = 10 } = query;
      return { data: [], period, limit };
    });
}
