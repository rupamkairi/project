import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, desc } from "drizzle-orm";
import { erpGstTemplate, erpGstReturn } from "../../db/schema/erp";
import { transactions, transactionLines } from "@db/schema/commerce";
import { hasPermission } from "../../permissions/matrix";
import { validateGstin, computeInvoiceGst } from "../../lib/gst";

export function createGstRoutes(mediator: Mediator) {
  return new Elysia()
    .get("/gst-templates", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpGstTemplate).where(eq(erpGstTemplate.organizationId, actor.orgId));
      return { gstTemplates: rows };
    })

    .post("/gst-templates", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [template] = await db.insert(erpGstTemplate).values({
        organizationId: actor.orgId,
        name: body.name,
        type: body.type,
        cgstRate: String(body.cgstRate ?? 0),
        sgstRate: String(body.sgstRate ?? 0),
        igstRate: String(body.igstRate ?? 0),
        cessRate: String(body.cessRate ?? 0),
      }).returning();
      (ctx as any).set.status = 201;
      return { gstTemplate: template };
    })

    .get("/gst-templates/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [template] = await db.select().from(erpGstTemplate).where(eq(erpGstTemplate.id, id));
      if (!template) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { gstTemplate: template };
    })

    .patch("/gst-templates/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      await db.update(erpGstTemplate).set({
        name: body.name,
        cgstRate: body.cgstRate ? String(body.cgstRate) : undefined,
        sgstRate: body.sgstRate ? String(body.sgstRate) : undefined,
        igstRate: body.igstRate ? String(body.igstRate) : undefined,
      }).where(eq(erpGstTemplate.id, id));
      return { success: true };
    })

    .get("/gst-returns/gstr1/preview", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const query = (ctx as any).query ?? {};
      const period = query.period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const [year, month] = period.split("-").map(Number);
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59);

      const invoices = await db.select().from(transactions).where(
        and(eq(transactions.type, "invoice"), eq(transactions.organizationId, actor.orgId))
      );

      const outbound = invoices.filter((i: any) => {
        const meta = i.meta as any;
        return meta?.direction === "outbound" && i.status === "submitted";
      });

      const b2b: any[] = [];
      const b2c: any[] = [];

      for (const inv of outbound) {
        const invMeta = inv.meta as any;
        const lines = await db.select().from(transactionLines).where(eq(transactionLines.transactionId, inv.id));
        const gst = { cgst: Number(invMeta?.cgst ?? 0), sgst: Number(invMeta?.sgst ?? 0), igst: Number(invMeta?.igst ?? 0) };

        if (invMeta?.customerGstin) {
          b2b.push({
            ctin: invMeta.customerGstin,
            inv: [{
              inum: inv.refNo,
              idt: inv.createdAt,
              val: Number(inv.total ?? 0),
              pos: invMeta.customerGstin?.substring(0, 2) ?? "",
              rchrg: "N",
            }],
          });
        } else {
          b2c.push({
            typ: "OE",
            txval: Number(inv.subtotal ?? 0),
            igst: gst.igst,
            cgst: gst.cgst,
            sgst: gst.sgst,
          });
        }
      }

      return {
        period,
        b2b,
        b2c,
        invoiceCount: outbound.length,
      };
    })

    .post("/gst-returns/gstr1", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [ret] = await db.insert(erpGstReturn).values({
        organizationId: actor.orgId,
        type: "GSTR1",
        period: body.period,
        status: "draft",
        data: { generated: new Date().toISOString() },
      }).returning();
      (ctx as any).set.status = 201;
      return { gstReturn: ret };
    })

    .get("/gst-returns/gstr3b/preview", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const query = (ctx as any).query ?? {};
      const period = query.period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      const invoices = await db.select().from(transactions).where(
        and(eq(transactions.type, "invoice"), eq(transactions.organizationId, actor.orgId))
      );

      const outbound = invoices.filter((i: any) => (i.meta as any)?.direction === "outbound" && i.status === "submitted");
      const inbound = invoices.filter((i: any) => (i.meta as any)?.direction === "inbound" && i.status !== "draft");

      const outwardCgst = outbound.reduce((s, i) => s + Number((i.meta as any)?.cgst ?? 0), 0);
      const outwardSgst = outbound.reduce((s, i) => s + Number((i.meta as any)?.sgst ?? 0), 0);
      const outwardIgst = outbound.reduce((s, i) => s + Number((i.meta as any)?.igst ?? 0), 0);
      const outwardTaxable = outbound.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);

      const inwardCgst = inbound.reduce((s, i) => s + Number((i.meta as any)?.cgst ?? 0), 0);
      const inwardSgst = inbound.reduce((s, i) => s + Number((i.meta as any)?.sgst ?? 0), 0);
      const inwardIgst = inbound.reduce((s, i) => s + Number((i.meta as any)?.igst ?? 0), 0);

      return {
        period,
        outward_taxable_supplies: {
          taxable_value: outwardTaxable,
          igst: outwardIgst,
          cgst: outwardCgst,
          sgst: outwardSgst,
          cess: 0,
        },
        input_tax_credit: {
          igst: inwardIgst,
          cgst: inwardCgst,
          sgst: inwardSgst,
          cess: 0,
        },
        tax_payable: {
          igst: Math.max(0, outwardIgst - inwardIgst),
          cgst: Math.max(0, outwardCgst - inwardCgst),
          sgst: Math.max(0, outwardSgst - inwardSgst),
          cess: 0,
        },
      };
    })

    .post("/gst-returns/gstr3b", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [ret] = await db.insert(erpGstReturn).values({
        organizationId: actor.orgId,
        type: "GSTR3B",
        period: body.period,
        status: "draft",
        data: {},
      }).returning();
      (ctx as any).set.status = 201;
      return { gstReturn: ret };
    })

    .get("/gstin/validate", async (ctx) => {
      const query = (ctx as any).query ?? {};
      const { gstin } = query;
      if (!gstin) { (ctx as any).set.status = 400; return { error: "GSTIN required" }; }
      return { validation: validateGstin(gstin) };
    });
}
