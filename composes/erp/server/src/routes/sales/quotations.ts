import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { eq, and, desc } from "drizzle-orm";
import { hasPermission } from "../../permissions/matrix";

export function createQuotationRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/quotations" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(transactions).where(
        and(eq(transactions.type, "quote"), eq(transactions.organizationId, actor.orgId))
      ).orderBy(desc(transactions.createdAt));
      return { quotations: rows };
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
      const refNo = `QUO-${year}-${Date.now().toString().slice(-4)}`;

      let subtotal = 0;
      const lineValues = (body.items ?? []).map((item: any) => {
        const lineTotal = item.qty * item.unitPrice;
        subtotal += lineTotal;
        return { lineTotal, item };
      });

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "quote",
          organizationId: orgId,
          refNo,
          partyId: body.customerId,
          status: "draft",
          subtotal: String(subtotal.toFixed(2)),
          total: String(subtotal.toFixed(2)),
          currency: body.currency ?? "INR",
          meta: { validUntil: body.validUntil },
          lines: lineValues.map(({ lineTotal, item }: any) => ({
            itemId: item.itemId,
            qty: String(item.qty),
            unitPrice: String(item.unitPrice),
            lineTotal: String(lineTotal.toFixed(2)),
            uom: item.uom,
          })),
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { quotation: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [quote] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.organizationId, actor.orgId))
      );
      if (!quote) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
      return { quotation: quote, lines };
    })

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(transactions).set({ status: "submitted" } as any).where(eq(transactions.id, id));
      return { success: true, status: "submitted" };
    })

    .post("/:id/convert", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [quote] = await db.select().from(transactions).where(eq(transactions.id, id));
      if (!quote) { (ctx as any).set.status = 404; return { error: "Not found" }; }

      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
      const year = new Date().getFullYear();
      const soRefNo = `SO-${year}-${Date.now().toString().slice(-4)}`;

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "sales_order",
          organizationId: actor.orgId,
          refNo: soRefNo,
          partyId: quote.partyId,
          status: "draft",
          subtotal: quote.subtotal,
          total: quote.total,
          currency: quote.currency ?? "INR",
          meta: { quoteId: id },
          lines: lines.map((l: any) => ({
            itemId: l.itemId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
            uom: (l.meta as any)?.uom ?? "unit",
          })),
        },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      });

      await db.update(transactions).set({ status: "converted" } as any).where(eq(transactions.id, id));

      (ctx as any).set.status = 201;
      return { salesOrderId: (result as any)?.id };
    });
}
