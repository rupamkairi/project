import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { parties } from "@db/schema/party";
import { eq, and, desc } from "drizzle-orm";
import { erpDeliveryNote } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createSalesOrderRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/sales-orders" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(transactions).where(
        and(eq(transactions.type, "sales_order"), eq(transactions.organizationId, actor.orgId))
      ).orderBy(desc(transactions.createdAt));
      return { salesOrders: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const year = new Date().getFullYear();
      const refNo = `SO-${year}-${Date.now().toString().slice(-4)}`;

      let subtotal = 0;
      let taxAmount = 0;
      const lineValues = (body.items ?? []).map((item: any) => {
        const lineTotal = item.qty * item.unitPrice * (1 - (item.discount ?? 0) / 100);
        const lineTax = lineTotal * (item.gstRate ?? 0) / 100;
        subtotal += lineTotal;
        taxAmount += lineTax;
        return { lineTotal, lineTax, item };
      });

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "sales_order",
          organizationId: orgId,
          refNo,
          partyId: body.customerId,
          status: "draft",
          subtotal: String(subtotal.toFixed(2)),
          taxAmount: String(taxAmount.toFixed(2)),
          total: String((subtotal + taxAmount).toFixed(2)),
          currency: body.currency ?? "INR",
          meta: {
            quoteId: body.quoteId,
            deliveryDate: body.deliveryDate,
            paymentTerms: body.paymentTerms,
          },
          lines: lineValues.map(({ lineTotal, lineTax, item }: any) => ({
            itemId: item.itemId,
            qty: String(item.qty),
            unitPrice: String(item.unitPrice),
            taxRate: String(item.gstRate ?? 0),
            lineTotal: String(lineTotal.toFixed(2)),
            uom: item.uom,
            meta: { hsn: item.hsn, deliveredQty: "0", invoicedQty: "0" },
          })),
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { salesOrder: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [so] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.type, "sales_order"), eq(transactions.organizationId, actor.orgId))
      );
      if (!so) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
      return { salesOrder: so, lines };
    })

    .post("/:id/confirm", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [so] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.type, "sales_order"))
      );
      if (!so || so.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "SO must be in draft status" };
      }

      // Credit limit check
      const [customer] = await db.select().from(parties).where(eq(parties.id, so.partyId!));
      if (customer) {
        const meta = customer.meta as any;
        const creditLimit = Number(meta?.creditLimit ?? 0);
        const outstanding = Number(meta?.outstandingBalance ?? 0);
        const soTotal = Number(so.total ?? 0);
        if (creditLimit > 0 && outstanding + soTotal > creditLimit) {
          (ctx as any).set.status = 400;
          return { error: `Credit limit exceeded. Outstanding: ${outstanding}, SO: ${soTotal}, Limit: ${creditLimit}` };
        }
      }

      await db.update(transactions).set({ status: "confirmed" } as any).where(eq(transactions.id, id));
      return { success: true, status: "confirmed" };
    })

    .post("/:id/cancel", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const dns = await db.select().from(erpDeliveryNote).where(eq(erpDeliveryNote.transactionId, id));
      if (dns.length > 0) {
        (ctx as any).set.status = 400;
        return { error: "Cannot cancel SO with existing delivery notes" };
      }
      await db.update(transactions).set({ status: "cancelled" } as any).where(eq(transactions.id, id));
      return { success: true, status: "cancelled" };
    })

    .get("/:id/delivery-notes", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const dns = await db.select().from(erpDeliveryNote).where(eq(erpDeliveryNote.transactionId, id));
      return { deliveryNotes: dns };
    });
}
