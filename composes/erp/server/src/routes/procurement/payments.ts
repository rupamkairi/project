import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { transactions } from "@db/schema/commerce";
import { eq, and, desc } from "drizzle-orm";
import { erpJournalEntry, erpJournalLine } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

function validateJournal(lines: Array<{ debit?: number; credit?: number }>) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal out of balance: Dr ${totalDebit} ≠ Cr ${totalCredit}`);
  }
}

export function createPaymentRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/payment-vouchers" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(transactions).where(
        and(
          eq(transactions.organizationId, actor.orgId)
        )
      ).orderBy(desc(transactions.createdAt));
      const payments = rows.filter((r: any) => r.type === "payment" || r.type === "receipt");
      return { payments };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:pay")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;
      const isVendorPayment = body.type === "pay";

      const year = new Date().getFullYear();
      const refNo = `${isVendorPayment ? "PV" : "RV"}-${year}-${Date.now().toString().slice(-4)}`;

      const txType = isVendorPayment ? "payment" : "receipt";
      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: txType,
          organizationId: orgId,
          refNo,
          partyId: body.partyId,
          status: "confirmed",
          total: String(Number(body.amount).toFixed(2)),
          currency: body.currency ?? "INR",
          meta: {
            invoiceId: body.invoiceId,
            mode: body.mode,
            reference: body.reference,
            bankAccountId: body.bankAccountId,
            paymentDate: body.date,
          },
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      // Post journal entry
      const amount = Number(body.amount);
      const journalLines = isVendorPayment
        ? [
            { accountCode: "2110", debit: amount, credit: 0, description: "Accounts Payable" }, // Dr: AP
            { accountCode: "1112", debit: 0, credit: amount, description: "Bank Account" },     // Cr: Bank
          ]
        : [
            { accountCode: "1112", debit: amount, credit: 0, description: "Bank Account" },     // Dr: Bank
            { accountCode: "1120", debit: 0, credit: amount, description: "Accounts Receivable" }, // Cr: AR
          ];

      validateJournal(journalLines.map((l) => ({ debit: l.debit, credit: l.credit })));

      // Update invoice paid amount
      if (body.invoiceId) {
        const [inv] = await db.select().from(transactions).where(eq(transactions.id, body.invoiceId));
        if (inv) {
          const invMeta = inv.meta as any ?? {};
          const newPaid = (Number(invMeta.paidAmount ?? 0) + amount).toFixed(2);
          const isFullyPaid = Number(newPaid) >= Number(inv.total ?? 0) - 0.01;
          await db.update(transactions).set({
            status: isFullyPaid ? "paid" : "partially-paid",
            meta: { ...invMeta, paidAmount: newPaid },
          } as any).where(eq(transactions.id, body.invoiceId));
        }
      }

      (ctx as any).set.status = 201;
      return { payment: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [payment] = await db.select().from(transactions).where(
        and(eq(transactions.id, id), eq(transactions.organizationId, actor.orgId))
      );
      if (!payment) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { payment };
    });
}
