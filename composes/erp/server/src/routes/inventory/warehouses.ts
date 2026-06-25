import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { locations } from "@db/schema/location";
import { catItems } from "@db/schema/catalog";
import { eq, and, desc, inArray } from "drizzle-orm";
import { erpStockLedger } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createWarehouseRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/warehouses" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(locations).where(
        and(eq(locations.type, "warehouse"), eq(locations.organizationId, actor.orgId))
      );
      return { warehouses: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const result = await mediator.dispatch({
        type: "location.createLocation",
        payload: {
          organizationId: orgId,
          type: "warehouse",
          name: body.name,
          code: body.code,
          parentId: body.parentId,
          meta: { locationType: body.locationType ?? "store", address: body.address },
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { warehouse: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [warehouse] = await db.select().from(locations).where(
        and(eq(locations.id, id), eq(locations.type, "warehouse"))
      );
      if (!warehouse) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { warehouse };
    })

    .get("/:id/stock", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;

      const ledgerRows = await db.select().from(erpStockLedger)
        .where(eq(erpStockLedger.locationId, id))
        .orderBy(desc(erpStockLedger.date));

      const byItem: Record<string, any> = {};
      for (const row of ledgerRows) {
        if (!byItem[row.itemId]) {
          byItem[row.itemId] = {
            itemId: row.itemId,
            balance: Number(row.balance ?? 0),
            valuationRate: Number(row.valuationRate ?? 0),
            stockValue: Number(row.balance ?? 0) * Number(row.valuationRate ?? 0),
          };
        }
      }

      const itemIds = Object.keys(byItem);
      const items = itemIds.length ? await db.select().from(catItems).where(inArray(catItems.id, itemIds)) : [];

      return {
        stock: Object.values(byItem).map((s: any) => ({
          ...s,
          item: items.find((i) => i.id === s.itemId),
        })),
      };
    });
}
