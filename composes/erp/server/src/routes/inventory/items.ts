import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { catItems } from "@db/schema/catalog";
import { locations } from "@db/schema/location";
import { eq, and, inArray, desc } from "drizzle-orm";
import { erpStockLedger } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createItemRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/items" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(catItems).where(
        and(
          eq(catItems.organizationId, actor.orgId),
          inArray(catItems.type, ["product", "stock_item", "asset"])
        )
      );
      return { items: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const typeMap: Record<string, string> = { stock: "stock_item", service: "service", asset: "asset" };
      const result = await mediator.dispatch({
        type: "catalog.createItem",
        payload: {
          organizationId: orgId,
          sku: body.code,
          name: body.name,
          description: body.description,
          type: typeMap[body.type] ?? "stock_item",
          unit: body.uom ?? "unit",
          price: "0",
          meta: {
            valuationMethod: body.valuationMethod ?? "moving-average",
            hsn: body.hsn,
            gstRate: body.gstRate,
            reorderQty: body.reorderQty ?? 0,
            leadTimeDays: body.leadTimeDays ?? 0,
          },
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { item: result };
    })

    .get("/reorder", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const items = await db.select().from(catItems).where(
        and(eq(catItems.organizationId, actor.orgId), inArray(catItems.type, ["stock_item", "product"]))
      );
      const result = [];
      for (const item of items) {
        const reorderQty = Number((item.meta as any)?.reorderQty ?? 0);
        if (reorderQty === 0) continue;
        const ledger = await db.select({ balance: erpStockLedger.balance })
          .from(erpStockLedger).where(eq(erpStockLedger.itemId, item.id))
          .orderBy(desc(erpStockLedger.date)).limit(1);
        const balance = Number(ledger[0]?.balance ?? 0);
        if (balance < reorderQty) {
          result.push({ item, balance, reorderQty, shortage: reorderQty - balance });
        }
      }
      return { items: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [item] = await db.select().from(catItems).where(
        and(eq(catItems.id, id), eq(catItems.organizationId, actor.orgId))
      );
      if (!item) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { item };
    })

    .get("/:id/stock", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const ledgerRows = await db.select().from(erpStockLedger)
        .where(eq(erpStockLedger.itemId, id))
        .orderBy(desc(erpStockLedger.date));

      const byWarehouse: Record<string, any> = {};
      for (const row of ledgerRows) {
        if (!byWarehouse[row.locationId]) {
          byWarehouse[row.locationId] = {
            locationId: row.locationId,
            balance: Number(row.balance ?? 0),
            valuationRate: Number(row.valuationRate ?? 0),
          };
        }
      }

      const warehouseIds = Object.keys(byWarehouse);
      const warehouses = warehouseIds.length
        ? await db.select().from(locations).where(inArray(locations.id, warehouseIds))
        : [];

      return {
        stock: Object.values(byWarehouse).map((s: any) => ({
          ...s,
          warehouse: warehouses.find((w) => w.id === s.locationId),
        })),
      };
    });
}
