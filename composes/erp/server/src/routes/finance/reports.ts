import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  erpGlAccount, erpJournalEntry, erpJournalLine, erpFiscalYear,
  erpBankAccount, erpBankTransaction,
} from "../../db/schema/erp";
import { transactions } from "@db/schema/commerce";
import { parties } from "@db/schema/party";
import { hasPermission } from "../../permissions/matrix";

export function createFinanceReportRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/finance" })
    .get("/trial-balance", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const accounts = await db.select().from(erpGlAccount)
        .where(and(eq(erpGlAccount.organizationId, actor.orgId), eq(erpGlAccount.isGroup, false)));

      return {
        trialBalance: accounts.map((a) => ({
          accountCode: a.code,
          accountName: a.name,
          type: a.type,
          balance: Number(a.balance ?? 0),
          debit: Number(a.balance ?? 0) > 0 ? Number(a.balance ?? 0) : 0,
          credit: Number(a.balance ?? 0) < 0 ? Math.abs(Number(a.balance ?? 0)) : 0,
        })),
      };
    })

    .get("/pnl", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const accounts = await db.select().from(erpGlAccount)
        .where(and(
          eq(erpGlAccount.organizationId, actor.orgId),
          eq(erpGlAccount.isGroup, false),
        ));

      const income = accounts.filter((a) => a.type === "income" || a.type === "revenue");
      const expenses = accounts.filter((a) => a.type === "expense");

      const totalIncome = income.reduce((s, a) => s + Math.abs(Number(a.balance ?? 0)), 0);
      const totalExpenses = expenses.reduce((s, a) => s + Math.abs(Number(a.balance ?? 0)), 0);

      return {
        income,
        expenses,
        grossProfit: totalIncome,
        netProfit: totalIncome - totalExpenses,
      };
    })

    .get("/balance-sheet", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const accounts = await db.select().from(erpGlAccount)
        .where(and(eq(erpGlAccount.organizationId, actor.orgId), eq(erpGlAccount.isGroup, false)));

      return {
        assets: accounts.filter((a) => a.type === "asset"),
        liabilities: accounts.filter((a) => a.type === "liability"),
        equity: accounts.filter((a) => a.type === "equity"),
      };
    })

    .get("/ap-aging", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const now = new Date();
      const vendorInvoices = await db.select().from(transactions).where(
        and(
          eq(transactions.type, "invoice"),
          eq(transactions.organizationId, actor.orgId),
        )
      );

      const inbound = vendorInvoices.filter((i: any) => (i.meta as any)?.direction === "inbound" && i.status !== "paid");

      const aging: Record<string, any> = {};
      for (const inv of inbound) {
        const partyId = inv.partyId ?? "";
        if (!aging[partyId]) {
          aging[partyId] = { vendorId: partyId, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        }
        const invMeta = inv.meta as any;
        const due = invMeta?.dueDate ? new Date(invMeta.dueDate) : new Date(inv.createdAt ?? now);
        const daysOverdue = Math.floor((now.getTime() - due.getTime()) / 86400000);
        const outstanding = Number(inv.total ?? 0) - Number(invMeta?.paidAmount ?? 0);

        aging[partyId].total += outstanding;
        if (daysOverdue <= 0) aging[partyId].current += outstanding;
        else if (daysOverdue <= 30) aging[partyId].days30 += outstanding;
        else if (daysOverdue <= 60) aging[partyId].days60 += outstanding;
        else if (daysOverdue <= 90) aging[partyId].days90 += outstanding;
        else aging[partyId].over90 += outstanding;
      }

      return { aging: Object.values(aging) };
    })

    .get("/ar-aging", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const now = new Date();
      const salesInvoices = await db.select().from(transactions).where(
        and(eq(transactions.type, "invoice"), eq(transactions.organizationId, actor.orgId))
      );

      const outbound = salesInvoices.filter((i: any) => (i.meta as any)?.direction === "outbound" && i.status !== "paid");
      const aging: Record<string, any> = {};

      for (const inv of outbound) {
        const partyId = inv.partyId ?? "";
        if (!aging[partyId]) {
          aging[partyId] = { customerId: partyId, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        }
        const invMeta = inv.meta as any;
        const due = invMeta?.dueDate ? new Date(invMeta.dueDate) : new Date(inv.createdAt ?? now);
        const daysOverdue = Math.floor((now.getTime() - due.getTime()) / 86400000);
        const outstanding = Number(inv.total ?? 0) - Number(invMeta?.paidAmount ?? 0);

        aging[partyId].total += outstanding;
        if (daysOverdue <= 0) aging[partyId].current += outstanding;
        else if (daysOverdue <= 30) aging[partyId].days30 += outstanding;
        else if (daysOverdue <= 60) aging[partyId].days60 += outstanding;
        else if (daysOverdue <= 90) aging[partyId].days90 += outstanding;
        else aging[partyId].over90 += outstanding;
      }

      return { aging: Object.values(aging) };
    })

    .get("/bank-accounts", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpBankAccount).where(eq(erpBankAccount.organizationId, actor.orgId));
      return { bankAccounts: rows };
    })

    .post("/bank-accounts", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [account] = await db.insert(erpBankAccount).values({
        organizationId: actor.orgId,
        accountName: body.accountName,
        accountNo: body.accountNo,
        bankName: body.bankName,
        ifsc: body.ifsc,
        currency: body.currency ?? "INR",
        glAccountId: body.glAccountId,
      }).returning();
      (ctx as any).set.status = 201;
      return { bankAccount: account };
    })

    .get("/bank-accounts/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [account] = await db.select().from(erpBankAccount).where(eq(erpBankAccount.id, id));
      if (!account) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { bankAccount: account };
    })

    .get("/bank-accounts/:id/transactions", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const rows = await db.select().from(erpBankTransaction)
        .where(eq(erpBankTransaction.bankAccountId, id))
        .orderBy(desc(erpBankTransaction.date));
      return { transactions: rows };
    })

    .get("/bank-reconciliation/:bankAccountId", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { bankAccountId } = (ctx as any).params;
      const unmatched = await db.select().from(erpBankTransaction).where(
        and(eq(erpBankTransaction.bankAccountId, bankAccountId), eq(erpBankTransaction.status, "unmatched"))
      );
      return { unmatchedTransactions: unmatched, count: unmatched.length };
    })

    .post("/bank-reconciliation/:bankAccountId/match", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { bankAccountId } = (ctx as any).params;
      const body = (ctx as any).body as any;
      await db.update(erpBankTransaction).set({
        status: "matched",
        matchedTransactionId: body.transactionId,
      }).where(eq(erpBankTransaction.id, body.bankTransactionId));
      return { success: true };
    })

    .post("/fiscal-years", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [fy] = await db.insert(erpFiscalYear).values({
        organizationId: actor.orgId,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      }).returning();
      (ctx as any).set.status = 201;
      return { fiscalYear: fy };
    })

    .get("/fiscal-years", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpFiscalYear).where(eq(erpFiscalYear.organizationId, actor.orgId));
      return { fiscalYears: rows };
    })

    .post("/period-close", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:close-period")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const { fiscalYearId } = body;

      const [fy] = await db.select().from(erpFiscalYear).where(eq(erpFiscalYear.id, fiscalYearId));
      if (!fy) { (ctx as any).set.status = 404; return { error: "Fiscal year not found" }; }
      if (fy.isClosed) {
        (ctx as any).set.status = 400;
        return { error: "Period already closed" };
      }

      // Check: no draft journal entries
      const draftJEs = await db.select().from(erpJournalEntry).where(
        and(
          eq(erpJournalEntry.organizationId, actor.orgId),
          eq(erpJournalEntry.fiscalYearId, fiscalYearId),
          eq(erpJournalEntry.status, "draft"),
        )
      );
      if (draftJEs.length > 0) {
        (ctx as any).set.status = 400;
        return { error: `${draftJEs.length} draft journal entries must be posted or cancelled before period close` };
      }

      await db.update(erpFiscalYear).set({ isClosed: true }).where(eq(erpFiscalYear.id, fiscalYearId));

      return { success: true, fiscalYearId, isClosed: true };
    });
}
