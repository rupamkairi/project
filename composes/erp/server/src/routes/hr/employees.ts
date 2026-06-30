import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { eq, and, desc } from "drizzle-orm";
import {
  erpLeaveAllocation, erpAttendance, erpSalarySlip,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createEmployeeRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/employees" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(persons).where(
        and(eq(persons.type, "employee"), eq(persons.organizationId, actor.orgId))
      );
      return { employees: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const result = await mediator.dispatch({
        type: "person.createPerson",
        payload: {
          organizationId: orgId,
          type: "employee",
          firstName: body.name?.split(" ")[0] ?? body.name,
          lastName: body.name?.split(" ").slice(1).join(" ") ?? "",
          email: body.email,
          phone: body.phone,
          meta: {
            empNo: body.empNo,
            designation: body.designation,
            departmentId: body.departmentId,
            employmentType: body.employmentType ?? "permanent",
            joinDate: body.joinDate,
            pan: body.pan,
            pfNo: body.pfNo,
            esiNo: body.esiNo,
            bankAccount: body.bankAccount,
          },
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { employee: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [emp] = await db.select().from(persons).where(
        and(eq(persons.id, id), eq(persons.type, "employee"))
      );
      if (!emp) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { employee: emp };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const [existing] = await db.select().from(persons).where(eq(persons.id, id));
      if (!existing) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const newMeta = { ...(existing.meta as any), ...body };
      await db.update(persons).set({ meta: newMeta }).where(eq(persons.id, id));
      return { success: true };
    })

    .post("/:id/terminate", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const [existing] = await db.select().from(persons).where(eq(persons.id, id));
      if (!existing) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const newMeta = { ...(existing.meta as any), terminationDate: body.date, terminationReason: body.reason, status: "terminated" };
      await db.update(persons).set({ meta: newMeta }).where(eq(persons.id, id));
      return { success: true };
    })

    .get("/:id/leave-balance", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const allocations = await db.select().from(erpLeaveAllocation)
        .where(and(eq(erpLeaveAllocation.personId, id), eq(erpLeaveAllocation.year, new Date().getFullYear())));
      return { leaveBalances: allocations };
    })

    .get("/:id/attendance", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const rows = await db.select().from(erpAttendance)
        .where(eq(erpAttendance.personId, id))
        .orderBy(desc(erpAttendance.date)).limit(90);
      return { attendance: rows };
    })

    .get("/:id/salary-slips", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const slips = await db.select().from(erpSalarySlip)
        .where(eq(erpSalarySlip.personId, id))
        .orderBy(desc(erpSalarySlip.journalEntryId));
      return { salarySlips: slips };
    });
}
