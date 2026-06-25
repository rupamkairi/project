import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { catItems } from "@db/schema/catalog";
import { locations } from "@db/schema/location";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  erpStockEntry, erpStockEntryItem, erpStockLedger,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createStockRoutes(mediator: Mediator) {
  return new Elysia()
    .get("/stock-entries", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpStockEntry)
        .where(eq(erpStockEntry.organizationId, actor.orgId))
        .orderBy(desc(erpStockEntry.createdAt));
      return { stockEntries: rows };
    })

    .post("/stock-entries", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      if (!["transfer", "adjustment"].includes(body.type)) {
        (ctx as any).set.status = 400;
        return { error: "Manual entries can only be type: transfer or adjustment" };
      }

      await db.transaction(async (tx) => {
        const [entry] = await tx.insert(erpStockEntry).values({
          organizationId: orgId,
          type: body.type,
          date: new Date(body.date ?? new Date()),
          reference: body.reference,
          referenceType: body.type,
          totalValue: "0",
        }).returning();

        for (const item of (body.items ?? [])) {
          const qty = Number(item.qty);
          const valuationRate = Number(item.valuationRate ?? 0);

          await tx.insert(erpStockEntryItem).values({
            entryId: entry.id,
            itemId: item.itemId,
            locationFrom: item.locationFrom,
            locationTo: item.locationTo,
            qty: String(qty),
            valuationRate: String(valuationRate),
            lineValue: String((qty * valuationRate).toFixed(2)),
            batchNo: item.batchNo,
          });

          // Post ledger entries
          if (item.locationFrom && body.type === "transfer") {
            const prev = await tx.select({ balance: erpStockLedger.balance })
              .from(erpStockLedger)
              .where(and(eq(erpStockLedger.itemId, item.itemId), eq(erpStockLedger.locationId, item.locationFrom)))
              .orderBy(desc(erpStockLedger.date)).limit(1);
            const newBalance = Number(prev[0]?.balance ?? 0) - qty;
            if (newBalance < 0) throw new Error(`Insufficient stock for item ${item.itemId} in ${item.locationFrom}`);
            await tx.insert(erpStockLedger).values({
              itemId: item.itemId,
              locationId: item.locationFrom,
              date: new Date(),
              qty: String(-qty),
              valuationRate: String(valuationRate),
              balance: String(newBalance),
              entryId: entry.id,
            });
          }

          if (item.locationTo) {
            const prev = await tx.select({ balance: erpStockLedger.balance })
              .from(erpStockLedger)
              .where(and(eq(erpStockLedger.itemId, item.itemId), eq(erpStockLedger.locationId, item.locationTo)))
              .orderBy(desc(erpStockLedger.date)).limit(1);
            const newBalance = Number(prev[0]?.balance ?? 0) + qty;
            await tx.insert(erpStockLedger).values({
              itemId: item.itemId,
              locationId: item.locationTo,
              date: new Date(),
              qty: String(qty),
              valuationRate: String(valuationRate),
              balance: String(newBalance),
              entryId: entry.id,
            });
          }
        }
      });

      return { success: true };
    })

    .get("/stock-entries/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [entry] = await db.select().from(erpStockEntry).where(eq(erpStockEntry.id, id));
      if (!entry) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const items = await db.select().from(erpStockEntryItem).where(eq(erpStockEntryItem.entryId, id));
      return { stockEntry: entry, items };
    })

    .get("/inventory/stock-summary", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const query = (ctx as any).query ?? {};

      const ledgerRows = await db.select().from(erpStockLedger)
        .orderBy(desc(erpStockLedger.date));

      // Aggregate to latest balance per (item, location)
      const summary: Record<string, any> = {};
      for (const row of ledgerRows) {
        const key = `${row.itemId}:${row.locationId}`;
        if (!summary[key]) {
          summary[key] = {
            itemId: row.itemId,
            locationId: row.locationId,
            balance: Number(row.balance ?? 0),
            valuationRate: Number(row.valuationRate ?? 0),
            stockValue: Number(row.balance ?? 0) * Number(row.valuationRate ?? 0),
          };
        }
      }

      let result = Object.values(summary);

      if (query.warehouseId) result = result.filter((r: any) => r.locationId === query.warehouseId);
      if (query.itemId) result = result.filter((r: any) => r.itemId === query.itemId);
      if (query.belowReorder === "true") {
        // Would need to join with item reorderQty
        result = result.filter((r: any) => r.balance <= 0);
      }

      return { summary: result, total: result.length };
    })

    .get("/inventory/movements", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const query = (ctx as any).query ?? {};

      const conditions = [];
      if (query.itemId) conditions.push(eq(erpStockLedger.itemId, query.itemId));
      if (query.warehouseId) conditions.push(eq(erpStockLedger.locationId, query.warehouseId));

      const rows = await db.select().from(erpStockLedger)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(erpStockLedger.date))
        .limit(200);

      return { movements: rows };
    });
}
