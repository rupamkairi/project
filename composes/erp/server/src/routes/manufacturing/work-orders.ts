import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, desc } from "drizzle-orm";
import {
  erpWorkOrder, erpBom, erpBomItem,
  erpStockEntry, erpStockEntryItem, erpStockLedger,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";
import { nextRefNo } from "../../lib/ref-numbers";

export function createWorkOrderRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/work-orders" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpWorkOrder)
        .where(eq(erpWorkOrder.organizationId, actor.orgId))
        .orderBy(desc(erpWorkOrder.createdAt));
      return { workOrders: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const [bom] = await db.select().from(erpBom).where(eq(erpBom.id, body.bomId));
      if (!bom) { (ctx as any).set.status = 404; return { error: "BOM not found" }; }

      const year = new Date().getFullYear();
      const woNumber = await nextRefNo(db, orgId, "WO", year, erpWorkOrder, erpWorkOrder.woNumber);

      const [wo] = await db.insert(erpWorkOrder).values({
        organizationId: orgId,
        woNumber,
        bomId: body.bomId,
        qty: String(body.quantity),
        targetLocationId: body.locationId,
        status: "draft",
        scheduledStart: body.plannedStart ? new Date(body.plannedStart) : undefined,
      }).returning();

      (ctx as any).set.status = 201;
      return { workOrder: wo };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [wo] = await db.select().from(erpWorkOrder).where(
        and(eq(erpWorkOrder.id, id), eq(erpWorkOrder.organizationId, actor.orgId))
      );
      if (!wo) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { workOrder: wo };
    })

    .post("/:id/start", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [wo] = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.id, id));
      if (!wo || wo.status !== "submitted") {
        (ctx as any).set.status = 400;
        return { error: "Work order must be submitted before starting" };
      }

      const [bom] = await db.select().from(erpBom).where(eq(erpBom.id, wo.bomId));
      const bomItems = await db.select().from(erpBomItem).where(eq(erpBomItem.bomId, wo.bomId));
      const qty = Number(wo.qty);
      const bomQty = Number(bom.quantity ?? 1);

      await db.transaction(async (tx) => {
        const [entry] = await tx.insert(erpStockEntry).values({
          organizationId: wo.organizationId,
          type: "manufacture",
          date: new Date(),
          reference: id,
          referenceType: "work_order_issue",
          totalValue: "0",
        }).returning();

        for (const item of bomItems) {
          const required = Number(item.qty) * (qty / bomQty) * (1 + Number(item.scrapPercent ?? 0) / 100);

          // Check stock in source location
          const prev = await tx.select({ balance: erpStockLedger.balance })
            .from(erpStockLedger)
            .where(eq(erpStockLedger.itemId, item.componentItemId))
            .orderBy(desc(erpStockLedger.date))
            .limit(1);

          const available = Number(prev[0]?.balance ?? 0);
          if (available < required) {
            throw new Error(`Insufficient stock for item ${item.componentItemId}. Required: ${required}, Available: ${available}`);
          }

          await tx.insert(erpStockEntryItem).values({
            entryId: entry.id,
            itemId: item.componentItemId,
            qty: String(-required),
          });

          await tx.insert(erpStockLedger).values({
            itemId: item.componentItemId,
            locationId: wo.targetLocationId,
            date: new Date(),
            qty: String(-required),
            balance: String(available - required),
            entryId: entry.id,
          });
        }

        await tx.update(erpWorkOrder).set({ status: "in-process", actualStart: new Date() }).where(eq(erpWorkOrder.id, id));
      });

      return { success: true, status: "in-process" };
    })

    .post("/:id/complete", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const producedQty = Number(body.producedQty);

      const [wo] = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.id, id));
      if (!wo || wo.status !== "in-process") {
        (ctx as any).set.status = 400;
        return { error: "Work order must be in-process" };
      }
      if (producedQty > Number(wo.qty)) {
        (ctx as any).set.status = 400;
        return { error: "Produced qty cannot exceed planned qty" };
      }

      const [bom] = await db.select().from(erpBom).where(eq(erpBom.id, wo.bomId));

      await db.transaction(async (tx) => {
        const [entry] = await tx.insert(erpStockEntry).values({
          organizationId: wo.organizationId,
          type: "manufacture",
          date: new Date(),
          reference: id,
          referenceType: "work_order_receipt",
          totalValue: String((producedQty * Number(bom.operatingCost ?? 0)).toFixed(2)),
        }).returning();

        await tx.insert(erpStockEntryItem).values({
          entryId: entry.id,
          itemId: bom.itemId,
          locationTo: wo.targetLocationId,
          qty: String(producedQty),
          valuationRate: String(Number(bom.operatingCost ?? 0)),
          lineValue: String((producedQty * Number(bom.operatingCost ?? 0)).toFixed(2)),
        });

        const prev = await tx.select({ balance: erpStockLedger.balance })
          .from(erpStockLedger)
          .where(and(eq(erpStockLedger.itemId, bom.itemId), eq(erpStockLedger.locationId, wo.targetLocationId)))
          .orderBy(desc(erpStockLedger.date))
          .limit(1);

        await tx.insert(erpStockLedger).values({
          itemId: bom.itemId,
          locationId: wo.targetLocationId,
          date: new Date(),
          qty: String(producedQty),
          valuationRate: String(Number(bom.operatingCost ?? 0)),
          balance: String(Number(prev[0]?.balance ?? 0) + producedQty),
          entryId: entry.id,
        });

        await tx.update(erpWorkOrder).set({
          status: "completed",
          producedQty: String(producedQty),
          actualEnd: new Date(),
        }).where(eq(erpWorkOrder.id, id));
      });

      return { success: true, status: "completed", producedQty };
    })

    .post("/:id/cancel", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [wo] = await db.select().from(erpWorkOrder).where(eq(erpWorkOrder.id, id));
      if (wo?.status === "in-process") {
        (ctx as any).set.status = 400;
        return { error: "Cannot cancel in-process work order" };
      }
      await db.update(erpWorkOrder).set({ status: "cancelled" }).where(eq(erpWorkOrder.id, id));
      return { success: true, status: "cancelled" };
    });
}
