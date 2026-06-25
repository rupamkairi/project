import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { eq, and, desc } from "drizzle-orm";
import { erpGrn, erpGrnItem } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

const INVOICE_TOLERANCE_PCT = 0.05;

export function createVendorInvoiceRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/vendor-invoices" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(transactions).where(
        and(
          eq(transactions.type, "invoice"),
          eq(transactions.organizationId, actor.orgId)
        )
      ).orderBy(desc(transactions.createdAt));
      // Filter inbound invoices in app layer (meta.direction = "inbound")
      const vendorInvoices = rows.filter((r: any) => (r.meta as any)?.direction === "inbound" || (r.meta as any)?.subType === "vendor_invoice");
      return { invoices: vendorInvoices };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const year = new Date().getFullYear();
      const refNo = `VINV-${year}-${Date.now().toString().slice(-4)}`;

      let subtotal = 0;
      const lines = (body.items ?? []).map((item: any) => {
        const lineTotal = item.qty * item.unitPrice;
        subtotal += lineTotal;
        return { lineTotal, item };
      });

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "invoice",
          organizationId: orgId,
          refNo,
          partyId: body.vendorId,
          status: "received",
          subtotal: String(subtotal.toFixed(2)),
          total: String(subtotal.toFixed(2)),
          currency: body.currency ?? "INR",
          meta: {
            direction: "inbound",
            subType: "vendor_invoice",
            poTransactionId: body.poId,
            grnId: body.grnId,
            invoiceDate: body.invoiceDate,
            dueDate: body.dueDate,
            paidAmount: "0",
          },
          lines: lines.map(({ lineTotal, item }: any) => ({
            itemId: item.itemId,
            qty: String(item.qty),
            unitPrice: String(item.unitPrice),
            lineTotal: String(lineTotal.toFixed(2)),
            taxRate: String(item.gstRate ?? 0),
            meta: { hsn: item.hsn },
          })),
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { invoice: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [inv] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.organizationId, actor.orgId))
      );
      if (!inv) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
      return { invoice: inv, lines };
    })

    .post("/:id/approve", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [inv] = await db.select().from(transactions).where(eq(transactions.id, id));
      if (!inv || inv.status !== "3way-matched") {
        (ctx as any).set.status = 400;
        return { error: "Invoice must be 3-way matched before approval" };
      }
      await db.update(transactions).set({ status: "approved" } as any).where(eq(transactions.id, id));
      return { success: true, status: "approved" };
    })

    .post("/:id/dispute", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      await db.update(transactions).set({ status: "disputed", meta: { disputeReason: body.reason } } as any)
        .where(eq(transactions.id, id));
      return { success: true, status: "disputed" };
    })

    .post("/:id/match", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [invoice] = await db.select().from(transactions).where(eq(transactions.id, id));
      if (!invoice) { (ctx as any).set.status = 404; return { error: "Invoice not found" }; }

      const invoiceMeta = invoice.meta as any;
      const poId = invoiceMeta?.poTransactionId;
      const grnId = invoiceMeta?.grnId;

      const checks: any = { priceMatch: false, qtyMatch: false, vendorMatch: true };

      if (poId) {
        const [po] = await db.select().from(transactions).where(eq(transactions.id, poId));
        if (po) {
          const invoiceTotal = Number(invoice.total ?? 0);
          const poTotal = Number(po.total ?? 0);
          checks.priceMatch = poTotal === 0 || Math.abs(invoiceTotal - poTotal) / poTotal <= INVOICE_TOLERANCE_PCT;
          checks.vendorMatch = invoice.partyId === po.partyId;
        }
      }

      if (grnId) {
        const grnItems = await db.select().from(erpGrnItem).where(eq(erpGrnItem.grnId, grnId));
        const invoiceLines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
        checks.qtyMatch = invoiceLines.every((il: any) => {
          const grnItem = grnItems.find((g: any) => g.itemId === il.itemId);
          return grnItem && Number(grnItem.qtyAccepted) >= Number(il.qty);
        });
      } else {
        checks.qtyMatch = true;
      }

      const allPassed = Object.values(checks).every(Boolean);
      if (allPassed) {
        await db.update(transactions).set({ status: "3way-matched" } as any).where(eq(transactions.id, id));
      }

      return { checks, matched: allPassed };
    });
}
