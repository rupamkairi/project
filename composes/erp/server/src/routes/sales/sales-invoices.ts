import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions, transactionLines } from "@db/schema/commerce";
import { parties } from "@db/schema/party";
import { eq, and, desc } from "drizzle-orm";
import { hasPermission } from "../../permissions/matrix";
import { computeInvoiceGst } from "../../lib/gst";

export function createSalesInvoiceRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/sales-invoices" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(transactions).where(
        and(eq(transactions.type, "invoice"), eq(transactions.organizationId, actor.orgId))
      ).orderBy(desc(transactions.createdAt));
      const outbound = rows.filter((r: any) => (r.meta as any)?.direction === "outbound");
      return { invoices: outbound };
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
      const refNo = `SI-${year}-${Date.now().toString().slice(-4)}`;

      let subtotal = 0;
      const lineValues = (body.items ?? []).map((item: any) => {
        const lineTotal = item.qty * item.unitPrice * (1 - (item.discount ?? 0) / 100);
        subtotal += lineTotal;
        return { lineTotal, item };
      });

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "invoice",
          organizationId: orgId,
          refNo,
          partyId: body.customerId,
          status: "draft",
          subtotal: String(subtotal.toFixed(2)),
          currency: body.currency ?? "INR",
          meta: {
            direction: "outbound",
            subType: "sales_invoice",
            soId: body.soId,
            dnId: body.dnId,
            invoiceDate: body.date,
            dueDate: body.dueDate,
            paidAmount: "0",
          },
          lines: lineValues.map(({ lineTotal, item }: any) => ({
            itemId: item.itemId,
            qty: String(item.qty),
            unitPrice: String(item.unitPrice),
            taxRate: String(item.gstRate ?? 0),
            lineTotal: String(lineTotal.toFixed(2)),
            uom: item.uom,
            meta: { hsn: item.hsn, gstRate: item.gstRate },
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

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [inv] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.type, "invoice"))
      );
      if (!inv || inv.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Invoice must be in draft status" };
      }

      const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, id));
      const [customer] = await db.select().from(parties).where(eq(parties.id, inv.partyId!));

      // Compute GST using GSTIN
      const orgGstin = "27AABCU9603R1ZN"; // would come from org settings
      const customerGstin = (customer?.meta as any)?.gstin;

      const gst = computeInvoiceGst({
        orgGstin,
        partyGstin: customerGstin,
        lineItems: lines.map((l: any) => ({
          lineTotal: Number(l.lineTotal ?? 0),
          gstRate: Number((l.meta as any)?.gstRate ?? l.taxRate ?? 0),
        })),
      });

      const subtotal = lines.reduce((s: number, l: any) => s + Number(l.lineTotal ?? 0), 0);
      const total = subtotal + gst.cgst + gst.sgst + gst.igst;

      await db.update(transactions).set({
        status: "submitted",
        subtotal: String(subtotal.toFixed(2)),
        taxAmount: String((gst.cgst + gst.sgst + gst.igst).toFixed(2)),
        total: String(total.toFixed(2)),
        meta: {
          ...(inv.meta as any),
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
        },
      } as any).where(eq(transactions.id, id));

      // Update customer outstanding balance
      if (customer) {
        const cMeta = customer.meta as any ?? {};
        const newOutstanding = (Number(cMeta.outstandingBalance ?? 0) + total).toFixed(2);
        await db.update(parties).set({ meta: { ...cMeta, outstandingBalance: Number(newOutstanding) } }).where(eq(parties.id, customer.id));
      }

      return { success: true, status: "submitted", gst };
    })

    .post("/:id/generate-irn", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;

      const irpUrl = process.env.GST_IRP_URL;
      if (!irpUrl) {
        return { error: "GST IRP URL not configured", retry: false };
      }

      const [inv] = await db.select().from(transactions).where(eq(transactions.id, id));
      if (!inv || inv.status !== "submitted") {
        (ctx as any).set.status = 400;
        return { error: "Invoice must be submitted before generating IRN" };
      }

      try {
        const response = await fetch(irpUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "user_name": process.env.GST_USERNAME ?? "",
            "password": process.env.GST_PASSWORD ?? "",
          },
          body: JSON.stringify({ invoiceId: id }),
        });

        if (response.status === 429) {
          return { error: "Rate limited by GST IRP", retry: true, retryAfter: 60 };
        }

        const data = await response.json() as any;
        await db.update(transactions).set({
          meta: {
            ...(inv.meta as any),
            irn: data.Irn,
            signedQr: data.SignedQRCode,
            ackNo: data.AckNo,
            ackDt: data.AckDt,
          },
        } as any).where(eq(transactions.id, id));

        return { success: true, irn: data.Irn };
      } catch (err) {
        return { error: "IRN generation failed", retry: true };
      }
    })

    .post("/:id/cancel", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(transactions).set({ status: "cancelled" } as any).where(eq(transactions.id, id));
      return { success: true, status: "cancelled" };
    });
}
