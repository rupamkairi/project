import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, desc } from "drizzle-orm";
import { erpSalarySlip } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createSalarySlipRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/salary-slips" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpSalarySlip)
        .orderBy(desc(erpSalarySlip.status)).limit(100);
      return { salarySlips: rows };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor) { (ctx as any).set.status = 403; return { error: "Forbidden" }; }
      const { id } = (ctx as any).params;
      const [slip] = await db.select().from(erpSalarySlip).where(eq(erpSalarySlip.id, id));
      if (!slip) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      // Employee self-service: can only view own slip
      const canView = hasPermission(actor, "erp:hr:read") || slip.personId === actor.actorId;
      if (!canView) { (ctx as any).set.status = 403; return { error: "Forbidden" }; }
      return { salarySlip: slip };
    })

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:payroll:run")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [slip] = await db.select().from(erpSalarySlip).where(eq(erpSalarySlip.id, id));
      if (!slip || slip.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Slip must be in draft status" };
      }
      await db.update(erpSalarySlip).set({ status: "submitted" }).where(eq(erpSalarySlip.id, id));
      return { success: true, status: "submitted" };
    });
}
