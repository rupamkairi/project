import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { parties } from "@db/schema/party";
import { eq, and, desc } from "drizzle-orm";
import { erpGrn } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createPurchaseOrderRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/purchase-orders" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(transactions).where(
        and(eq(transactions.type, "purchase_order"), eq(transactions.organizationId, actor.orgId))
      ).orderBy(desc(transactions.createdAt));
      return { purchaseOrders: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const [vendor] = await db.select().from(parties).where(
        and(eq(parties.id, body.vendorId), eq(parties.type, "vendor"))
      );
      if (!vendor || (vendor as any).status !== "active") {
        (ctx as any).set.status = 400;
        return { error: "Vendor must be active" };
      }

      let subtotal = 0;
      let taxAmount = 0;
      const lineValues = (body.items ?? []).map((item: any) => {
        const lineTotal = item.qty * item.unitPrice * (1 - (item.discount ?? 0) / 100);
        const lineTax = lineTotal * (item.gstRate ?? 0) / 100;
        subtotal += lineTotal;
        taxAmount += lineTax;
        return { lineTotal, lineTax, item };
      });

      const year = new Date().getFullYear();
      const refNo = `PO-${year}-${Date.now().toString().slice(-4)}`;

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "purchase_order",
          organizationId: orgId,
          refNo,
          partyId: body.vendorId,
          status: "draft",
          subtotal: String(subtotal.toFixed(2)),
          taxAmount: String(taxAmount.toFixed(2)),
          total: String((subtotal + taxAmount).toFixed(2)),
          currency: body.currency ?? "INR",
          meta: {
            prId: body.prId,
            expectedDeliveryDate: body.expectedDeliveryDate,
            paymentTerms: body.paymentTerms,
            deliveryAddress: body.deliveryAddress,
          },
          lines: lineValues.map(({ lineTotal, lineTax, item }: any) => ({
            itemId: item.itemId,
            qty: String(item.qty),
            unitPrice: String(item.unitPrice),
            taxRate: String(item.gstRate ?? 0),
            lineTotal: String(lineTotal.toFixed(2)),
            uom: item.uom,
            meta: { hsn: item.hsn, discount: item.discount },
          })),
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { purchaseOrder: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [po] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.type, "purchase_order"), eq(transactions.organizationId, actor.orgId))
      );
      if (!po) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
      return { purchaseOrder: po, lines };
    })

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(transactions).set({ status: "pending-approval" } as any).where(
        and(eq(transactions.id, id), eq(transactions.type, "purchase_order"))
      );
      return { success: true, status: "pending-approval" };
    })

    .post("/:id/approve", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [po] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.type, "purchase_order"))
      );
      if (!po || po.status !== "pending-approval") {
        (ctx as any).set.status = 400;
        return { error: "PO must be in pending-approval status" };
      }
      await db.update(transactions).set({ status: "approved" } as any).where(eq(transactions.id, id));
      return { success: true, status: "approved" };
    })

    .post("/:id/reject", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      if (!body.reason) {
        (ctx as any).set.status = 400;
        return { error: "Rejection reason required" };
      }
      await db.update(transactions).set({ status: "rejected", meta: { rejectedReason: body.reason } } as any)
        .where(eq(transactions.id, id));
      return { success: true, status: "rejected" };
    })

    .post("/:id/send", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(transactions).set({ status: "sent" } as any).where(eq(transactions.id, id));
      return { success: true, status: "sent" };
    })

    .post("/:id/cancel", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-order:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const grns = await db.select().from(erpGrn).where(eq(erpGrn.transactionId, id));
      if (grns.length > 0) {
        (ctx as any).set.status = 400;
        return { error: "Cannot cancel PO with existing GRNs" };
      }
      await db.update(transactions).set({ status: "cancelled" } as any).where(eq(transactions.id, id));
      return { success: true, status: "cancelled" };
    })

    .get("/:id/grns", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:goods-receipt:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const grns = await db.select().from(erpGrn).where(eq(erpGrn.transactionId, id));
      return { grns };
    });
}
