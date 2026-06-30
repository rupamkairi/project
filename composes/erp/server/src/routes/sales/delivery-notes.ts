import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { eq, and, desc } from "drizzle-orm";
import {
  erpDeliveryNote, erpDnItem, erpStockEntry, erpStockEntryItem, erpStockLedger,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";
import { nextRefNo } from "../../lib/ref-numbers";

export function createDeliveryNoteRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/delivery-notes" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpDeliveryNote)
        .where(eq(erpDeliveryNote.organizationId, actor.orgId))
        .orderBy(desc(erpDeliveryNote.createdAt));
      return { deliveryNotes: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const year = new Date().getFullYear();
      const dnNumber = await nextRefNo(db, orgId, "DN", year, erpDeliveryNote, erpDeliveryNote.dnNumber);

      const [dn] = await db.insert(erpDeliveryNote).values({
        organizationId: orgId,
        dnNumber,
        transactionId: body.soId,
        locationId: body.locationId,
        date: new Date(body.date),
        status: "draft",
        shippingAddress: body.shippingAddress,
      }).returning();

      const soLines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, body.soId));

      await db.insert(erpDnItem).values(
        body.items.map((item: any) => {
          const soLine = soLines.find((l: any) => l.id === item.soItemId || l.itemId === item.itemId);
          return {
            dnId: dn.id,
            transactionLineId: item.soItemId ?? soLine?.id ?? item.itemId,
            itemId: item.itemId,
            qty: String(item.qty),
            uom: item.uom,
            batchNo: item.batchNo,
          };
        })
      );

      (ctx as any).set.status = 201;
      return { deliveryNote: dn };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [dn] = await db.select().from(erpDeliveryNote).where(
        and(eq(erpDeliveryNote.id, id), eq(erpDeliveryNote.organizationId, actor.orgId))
      );
      if (!dn) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const items = await db.select().from(erpDnItem).where(eq(erpDnItem.dnId, id));
      return { deliveryNote: dn, items };
    })

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [dn] = await db.select().from(erpDeliveryNote).where(eq(erpDeliveryNote.id, id));
      if (!dn || dn.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "DN must be in draft status" };
      }

      const dnItems = await db.select().from(erpDnItem).where(eq(erpDnItem.dnId, id));

      await db.transaction(async (tx) => {
        const [stockEntry] = await tx.insert(erpStockEntry).values({
          organizationId: dn.organizationId,
          type: "issue",
          date: new Date(),
          reference: id,
          referenceType: "delivery_note",
          totalValue: "0",
        }).returning();

        for (const item of dnItems) {
          const qty = Number(item.qty);
          await tx.insert(erpStockEntryItem).values({
            entryId: stockEntry.id,
            itemId: item.itemId,
            locationFrom: dn.locationId,
            qty: String(qty),
            batchNo: item.batchNo,
          });

          // Deduct from stock ledger
          const prev = await tx.select({ balance: erpStockLedger.balance })
            .from(erpStockLedger)
            .where(and(eq(erpStockLedger.itemId, item.itemId), eq(erpStockLedger.locationId, dn.locationId)))
            .orderBy(desc(erpStockLedger.date))
            .limit(1);

          const prevBalance = Number(prev[0]?.balance ?? 0);
          const newBalance = prevBalance - qty;

          if (newBalance < 0) {
            throw new Error(`Insufficient stock for item ${item.itemId}`);
          }

          await tx.insert(erpStockLedger).values({
            itemId: item.itemId,
            locationId: dn.locationId,
            date: new Date(),
            qty: String(-qty),
            balance: String(newBalance),
            entryId: stockEntry.id,
          });
        }

        await tx.update(erpDeliveryNote).set({ status: "submitted" }).where(eq(erpDeliveryNote.id, id));
      });

      return { success: true, status: "submitted" };
    })

    .post("/:id/cancel", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(erpDeliveryNote).set({ status: "cancelled" }).where(eq(erpDeliveryNote.id, id));
      return { success: true, status: "cancelled" };
    });
}
