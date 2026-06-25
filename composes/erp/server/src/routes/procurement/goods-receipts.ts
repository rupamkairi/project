import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { eq, and, desc } from "drizzle-orm";
import {
  erpGrn, erpGrnItem, erpStockEntry, erpStockEntryItem, erpStockLedger,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";
import { nextRefNo } from "../../lib/ref-numbers";

async function postStockLedger(
  tx: any,
  itemId: string,
  locationId: string,
  qty: number,
  valuationRate: number,
  entryId: string,
) {
  const prev = await tx.select({ balance: erpStockLedger.balance })
    .from(erpStockLedger)
    .where(and(eq(erpStockLedger.itemId, itemId), eq(erpStockLedger.locationId, locationId)))
    .orderBy(desc(erpStockLedger.date))
    .limit(1);

  const prevBalance = Number(prev[0]?.balance ?? 0);
  const newBalance = prevBalance + qty;

  if (newBalance < 0) {
    throw new Error(`Insufficient stock for item ${itemId} in warehouse ${locationId}`);
  }

  await tx.insert(erpStockLedger).values({
    itemId,
    locationId,
    date: new Date(),
    qty: String(qty),
    valuationRate: String(valuationRate),
    stockValue: String((qty * valuationRate).toFixed(2)),
    balance: String(newBalance),
    entryId,
  });
}

export function createGoodsReceiptRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/goods-receipts" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpGrn)
        .where(eq(erpGrn.organizationId, actor.orgId))
        .orderBy(desc(erpGrn.receivedAt));
      return { goodsReceipts: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      // Validate PO exists
      const [po] = await db.select().from(transactions).where(
        and(eq(transactions.id, body.transactionId), eq(transactions.type, "purchase_order"))
      );
      if (!po) {
        (ctx as any).set.status = 404;
        return { error: "Purchase order not found" };
      }

      // Validate no over-receipt per item
      const poLines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, body.transactionId));
      for (const grnItem of body.items) {
        const poLine = poLines.find((l: any) => l.itemId === grnItem.itemId);
        if (!poLine) {
          (ctx as any).set.status = 400;
          return { error: `Item ${grnItem.itemId} not in PO` };
        }
        const existingGrns = await db.select().from(erpGrnItem)
          .where(eq(erpGrnItem.itemId, grnItem.itemId));
        const alreadyReceived = existingGrns.reduce((s: number, g: any) => s + Number(g.qtyReceived), 0);
        const remaining = Number(poLine.qty) - alreadyReceived;
        if (grnItem.receivedQty > remaining) {
          (ctx as any).set.status = 400;
          return { error: `Cannot receive more than ordered for item ${grnItem.itemId}. Remaining: ${remaining}` };
        }
      }

      const year = new Date().getFullYear();
      const grnNumber = await nextRefNo(db, orgId, "GRN", year, erpGrn, erpGrn.grnNumber);

      const [grn] = await db.insert(erpGrn).values({
        organizationId: orgId,
        grnNumber,
        transactionId: body.transactionId,
        locationId: body.locationId,
        receivedById: actor.actorId,
        status: "draft",
      }).returning();

      await db.insert(erpGrnItem).values(
        body.items.map((item: any) => ({
          grnId: grn.id,
          itemId: item.itemId,
          qtyOrdered: String(item.qtyOrdered ?? item.receivedQty),
          qtyReceived: String(item.receivedQty),
          qtyAccepted: String(item.acceptedQty ?? item.receivedQty),
          qtyRejected: String(item.rejectedQty ?? 0),
          condition: item.condition ?? "good",
          rejectionReason: item.rejectionReason,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        }))
      );

      (ctx as any).set.status = 201;
      return { goodsReceipt: grn };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [grn] = await db.select().from(erpGrn).where(
        and(eq(erpGrn.id, id), eq(erpGrn.organizationId, actor.orgId))
      );
      if (!grn) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const items = await db.select().from(erpGrnItem).where(eq(erpGrnItem.grnId, id));
      return { goodsReceipt: grn, items };
    })

    .post("/:id/confirm", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [grn] = await db.select().from(erpGrn).where(eq(erpGrn.id, id));
      if (!grn || grn.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "GRN must be in draft status" };
      }
      const grnItems = await db.select().from(erpGrnItem).where(eq(erpGrnItem.grnId, id));

      await db.transaction(async (tx) => {
        // Create stock entry
        const totalValue = grnItems.reduce((s: number, i: any) => s + Number(i.qtyAccepted) * Number(i.valuationRate ?? 0), 0);
        const [stockEntry] = await tx.insert(erpStockEntry).values({
          organizationId: grn.organizationId,
          type: "receipt",
          date: new Date(),
          reference: grn.id,
          referenceType: "grn",
          totalValue: String(totalValue.toFixed(2)),
        }).returning();

        for (const item of grnItems) {
          if (Number(item.qtyAccepted) <= 0) continue;
          const valuationRate = Number(item.valuationRate ?? 0);
          const qty = Number(item.qtyAccepted);

          await tx.insert(erpStockEntryItem).values({
            entryId: stockEntry.id,
            itemId: item.itemId,
            locationTo: grn.locationId,
            qty: String(qty),
            valuationRate: String(valuationRate),
            lineValue: String((qty * valuationRate).toFixed(2)),
            batchNo: item.batchNo,
          });

          // Post stock ledger (atomic, inside transaction)
          await postStockLedger(tx, item.itemId, grn.locationId, qty, valuationRate, stockEntry.id);
        }

        await tx.update(erpGrn).set({ status: "confirmed" }).where(eq(erpGrn.id, id));
      });

      return { success: true, status: "confirmed" };
    })

    .post("/:id/quality", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      if (!body.passed && !body.notes) {
        (ctx as any).set.status = 400;
        return { error: "Quality notes required when failing" };
      }
      const status = body.passed ? "quality-passed" : "quality-failed";
      await db.update(erpGrn).set({ status, qualityNotes: body.notes }).where(eq(erpGrn.id, id));
      return { success: true, status };
    });
}
