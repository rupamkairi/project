import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, isNull, desc } from "drizzle-orm";
import { erpGlAccount, erpFiscalYear, erpJournalEntry, erpJournalLine } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

function validateJournal(lines: Array<{ debit?: string | number; credit?: string | number }>) {
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal out of balance: Dr ${totalDebit.toFixed(2)} ≠ Cr ${totalCredit.toFixed(2)}`);
  }
  if (lines.some((l) => !((l as any).glAccountId ?? (l as any).accountId))) {
    throw new Error("All lines must have accountId");
  }
  if (lines.some((l) => Number(l.debit ?? 0) < 0 || Number(l.credit ?? 0) < 0)) {
    throw new Error("Amounts must be non-negative");
  }
}

async function getFiscalYearForDate(date: Date, orgId: string) {
  const rows = await db.select().from(erpFiscalYear).where(eq(erpFiscalYear.organizationId, orgId));
  return rows.find((fy) => new Date(fy.startDate) <= date && new Date(fy.endDate) >= date);
}

export function createAccountRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/accounts" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpGlAccount).where(eq(erpGlAccount.organizationId, actor.orgId));
      return { accounts: rows };
    })

    .get("/tree", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const accounts = await db.select().from(erpGlAccount).where(eq(erpGlAccount.organizationId, actor.orgId));

      function buildTree(parentId: string | null | undefined): any[] {
        return accounts
          .filter((a) => a.parentId === parentId)
          .map((a) => ({ ...a, children: buildTree(a.id) }));
      }

      return { tree: buildTree(null) };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [account] = await db.insert(erpGlAccount).values({
        organizationId: actor.orgId,
        code: body.code,
        name: body.name,
        type: body.type,
        subType: body.subType,
        parentId: body.parentId,
        currency: body.currency ?? "INR",
        isGroup: body.isGroup ?? false,
      }).returning();
      (ctx as any).set.status = 201;
      return { account };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [account] = await db.select().from(erpGlAccount).where(
        and(eq(erpGlAccount.id, id), eq(erpGlAccount.organizationId, actor.orgId))
      );
      if (!account) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { account };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      await db.update(erpGlAccount).set({
        name: body.name,
        isFrozen: body.isFrozen,
      }).where(eq(erpGlAccount.id, id));
      return { success: true };
    });
}

export function createJournalRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/journal-entries" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpJournalEntry)
        .where(eq(erpJournalEntry.organizationId, actor.orgId))
        .orderBy(desc(erpJournalEntry.createdAt));
      return { journalEntries: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;
      const date = new Date(body.date);

      // Period close check
      const fy = await getFiscalYearForDate(date, orgId);
      if (fy?.isClosed) {
        (ctx as any).set.status = 403;
        return { error: "Period Closed" };
      }

      validateJournal(body.lines);

      const totalDebit = body.lines.reduce((s: number, l: any) => s + Number(l.debit ?? 0), 0);

      const [je] = await db.insert(erpJournalEntry).values({
        organizationId: orgId,
        date,
        reference: body.reference,
        referenceType: body.referenceType,
        description: body.narration ?? body.description,
        status: "draft",
        totalDebit: String(totalDebit.toFixed(2)),
        totalCredit: String(totalDebit.toFixed(2)),
        fiscalYearId: fy?.id,
      }).returning();

      await db.insert(erpJournalLine).values(
        body.lines.map((line: any) => ({
          journalId: je.id,
          glAccountId: line.accountId,
          debit: String(Number(line.debit ?? 0).toFixed(2)),
          credit: String(Number(line.credit ?? 0).toFixed(2)),
          partyId: line.partyId,
          personId: line.personId,
          costCenter: line.costCenter,
          description: line.description,
        }))
      );

      (ctx as any).set.status = 201;
      return { journalEntry: je };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [je] = await db.select().from(erpJournalEntry).where(
        and(eq(erpJournalEntry.id, id), eq(erpJournalEntry.organizationId, actor.orgId))
      );
      if (!je) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const lines = await db.select().from(erpJournalLine).where(eq(erpJournalLine.journalId, id));
      return { journalEntry: je, lines };
    })

    .post("/:id/post", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [je] = await db.select().from(erpJournalEntry).where(eq(erpJournalEntry.id, id));
      if (!je || je.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Journal must be in draft status" };
      }

      const date = new Date(je.date);
      const fy = await getFiscalYearForDate(date, je.organizationId);
      if (fy?.isClosed) {
        (ctx as any).set.status = 403;
        return { error: "Period Closed" };
      }

      // Update account balances
      const lines = await db.select().from(erpJournalLine).where(eq(erpJournalLine.journalId, id));
      for (const line of lines) {
        const [account] = await db.select().from(erpGlAccount).where(eq(erpGlAccount.id, line.glAccountId));
        if (!account) continue;
        const net = Number(line.debit ?? 0) - Number(line.credit ?? 0);
        const newBalance = Number(account.balance ?? 0) + net;
        await db.update(erpGlAccount).set({ balance: String(newBalance.toFixed(2)) }).where(eq(erpGlAccount.id, account.id));
      }

      await db.update(erpJournalEntry).set({
        status: "posted",
        postedBy: actor.actorId,
        postedAt: new Date(),
      }).where(eq(erpJournalEntry.id, id));

      return { success: true, status: "posted" };
    })

    .post("/:id/cancel", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:ledger:post")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(erpJournalEntry).set({ status: "cancelled" }).where(eq(erpJournalEntry.id, id));
      return { success: true, status: "cancelled" };
    });
}
