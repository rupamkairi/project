import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { eq, and, desc } from "drizzle-orm";
import {
  erpPayrollRun, erpSalarySlip, erpSalaryStructure,
  erpAttendance, erpJournalEntry, erpJournalLine, erpFiscalYear,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

function safeEval(formula: string, vars: Record<string, number>): number {
  // Sandboxed formula evaluator — no eval(), restricted to math operations
  let expr = formula;
  for (const [key, val] of Object.entries(vars)) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, "g"), String(val));
  }
  // Only allow safe math chars
  if (/[^0-9\s+\-*/().%]/.test(expr)) return 0;
  try {
    return Function(`"use strict"; return (${expr})`)();
  } catch {
    return 0;
  }
}

function computeSalaryComponents(
  components: any,
  ctc: number,
  presentDays: number,
  workingDays: number,
): { earnings: any[]; deductions: any[]; gross: number; net: number } {
  const earnings: any[] = [];
  const deductions: any[] = [];
  const vars: Record<string, number> = { ctc, presentDays, workingDays };

  for (const comp of (components.earnings ?? [])) {
    let amount = 0;
    if (comp.type === "fixed") amount = comp.value ?? 0;
    else if (comp.type === "formula") amount = safeEval(comp.formula ?? "0", vars);
    else if (comp.type === "percentage") {
      const basis = vars[comp.basisOf] ?? 0;
      amount = basis * (comp.rate ?? 0) / 100;
    }
    // Pro-rate
    if (workingDays > 0) amount = amount * presentDays / workingDays;
    vars[comp.name] = amount;
    earnings.push({ name: comp.name, amount: Math.round(amount * 100) / 100 });
  }

  const grossAmount = earnings.reduce((s, e) => s + e.amount, 0);
  vars.gross = grossAmount;

  for (const comp of (components.deductions ?? [])) {
    let amount = 0;
    if (comp.type === "fixed") amount = comp.value ?? 0;
    else if (comp.type === "formula") amount = safeEval(comp.formula ?? "0", vars);
    else if (comp.type === "percentage") {
      const basis = vars[comp.basisOf] ?? 0;
      amount = basis * (comp.rate ?? 0) / 100;
    }
    vars[comp.name] = amount;
    deductions.push({ name: comp.name, amount: Math.round(amount * 100) / 100 });
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);

  return {
    earnings,
    deductions,
    gross: Math.round(grossAmount * 100) / 100,
    net: Math.round((grossAmount - totalDeductions) * 100) / 100,
  };
}

export function createPayrollEntryRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/payroll-entries" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:payroll:run")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpPayrollRun)
        .where(eq(erpPayrollRun.organizationId, actor.orgId))
        .orderBy(desc(erpPayrollRun.createdAt));
      return { payrollEntries: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:payroll:run")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;
      const period = `${body.year}-${String(body.month).padStart(2, "0")}`;

      const [run] = await db.insert(erpPayrollRun).values({
        organizationId: orgId,
        period,
        status: "draft",
      }).returning();

      (ctx as any).set.status = 201;
      return { payrollEntry: run };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:payroll:run")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [run] = await db.select().from(erpPayrollRun).where(eq(erpPayrollRun.id, id));
      if (!run) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const slips = await db.select().from(erpSalarySlip).where(eq(erpSalarySlip.payrollRunId, id));
      return { payrollEntry: run, salarySlips: slips };
    })

    .post("/:id/generate-slips", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:payroll:run")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const [run] = await db.select().from(erpPayrollRun).where(eq(erpPayrollRun.id, id));
      if (!run || run.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Payroll run must be in draft status" };
      }

      // Delete existing draft slips (idempotent)
      await db.delete(erpSalarySlip).where(
        and(eq(erpSalarySlip.payrollRunId, id), eq(erpSalarySlip.status, "draft"))
      );

      const [year, month] = run.period.split("-").map(Number);
      const workingDays = new Date(year, month, 0).getDate();

      // Fetch all employees
      const employees = await db.select().from(persons).where(
        and(eq(persons.type, "employee"), eq(persons.organizationId, run.organizationId))
      );

      let totalGross = 0;
      let totalNet = 0;
      let totalDeductions = 0;

      const slips = [];
      for (const emp of employees) {
        const empMeta = emp.meta as any;
        const ctc = Number(empMeta?.ctc ?? empMeta?.annualSalary ?? 0) / 12;

        // Get attendance for the month
        const attendance = await db.select().from(erpAttendance).where(eq(erpAttendance.personId, emp.id));
        const presentDays = attendance.filter((a) => ["present", "half-day"].includes(a.status)).length || workingDays;

        // Get salary structure
        let structure = null;
        if (body.salaryStructureId) {
          const [s] = await db.select().from(erpSalaryStructure).where(eq(erpSalaryStructure.id, body.salaryStructureId));
          structure = s;
        }

        const defaultComponents = structure?.components as any ?? {
          earnings: [
            { name: "Basic", type: "formula", formula: "ctc * 0.5" },
            { name: "HRA", type: "percentage", basisOf: "Basic", rate: 40 },
          ],
          deductions: [
            { name: "Employee PF", type: "percentage", basisOf: "Basic", rate: 12 },
            { name: "Professional Tax", type: "fixed", value: 200 },
          ],
        };

        const computed = computeSalaryComponents(defaultComponents, ctc, presentDays, workingDays);

        const [slip] = await db.insert(erpSalarySlip).values({
          payrollRunId: id,
          personId: emp.id,
          workingDays,
          presentDays,
          structureId: structure?.id,
          earnings: computed.earnings,
          deductions: computed.deductions,
          gross: String(computed.gross.toFixed(2)),
          net: String(computed.net.toFixed(2)),
          status: "draft",
        }).returning();

        totalGross += computed.gross;
        totalNet += computed.net;
        totalDeductions += computed.gross - computed.net;
        slips.push(slip);
      }

      await db.update(erpPayrollRun).set({
        totalGross: String(totalGross.toFixed(2)),
        totalDeductions: String(totalDeductions.toFixed(2)),
        totalNet: String(totalNet.toFixed(2)),
        employeeCount: employees.length,
      }).where(eq(erpPayrollRun.id, id));

      return { success: true, slipsGenerated: slips.length, totalGross, totalNet };
    })

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:payroll:run")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [run] = await db.select().from(erpPayrollRun).where(eq(erpPayrollRun.id, id));
      if (!run) { (ctx as any).set.status = 404; return { error: "Not found" }; }

      const slips = await db.select().from(erpSalarySlip).where(eq(erpSalarySlip.payrollRunId, id));
      const notSubmitted = slips.filter((s) => s.status !== "submitted");
      if (notSubmitted.length > 0) {
        (ctx as any).set.status = 400;
        return { error: `${notSubmitted.length} salary slips are not submitted yet` };
      }

      await db.update(erpPayrollRun).set({
        status: "submitted",
        processedAt: new Date(),
      }).where(eq(erpPayrollRun.id, id));

      return { success: true, status: "submitted" };
    });
}
