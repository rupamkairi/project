import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, desc } from "drizzle-orm";
import {
  erpLeaveType, erpLeaveAllocation, erpLeaveApplication,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createLeaveRoutes(mediator: Mediator) {
  return new Elysia()
    .get("/leave-types", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpLeaveType).where(eq(erpLeaveType.organizationId, actor.orgId));
      return { leaveTypes: rows };
    })

    .post("/leave-types", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [lt] = await db.insert(erpLeaveType).values({
        organizationId: actor.orgId,
        name: body.name,
        maxDays: body.maxDays ?? 0,
        isPaid: body.isPaid ?? true,
        isCarryForward: body.isCarryForward ?? false,
        maxCarryForward: body.maxCarryForward ?? 0,
      }).returning();
      (ctx as any).set.status = 201;
      return { leaveType: lt };
    })

    .get("/leave-allocations", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpLeaveAllocation);
      return { allocations: rows };
    })

    .post("/leave-allocations", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const allocated = Number(body.allocated);
      const [alloc] = await db.insert(erpLeaveAllocation).values({
        personId: body.personId,
        leaveTypeId: body.leaveTypeId,
        year: body.year ?? new Date().getFullYear(),
        allocated: String(allocated),
        used: "0",
        balance: String(allocated),
      }).returning();
      (ctx as any).set.status = 201;
      return { allocation: alloc };
    })

    .get("/leave-applications", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpLeaveApplication)
        .orderBy(desc(erpLeaveApplication.createdAt));
      return { applications: rows };
    })

    .post("/leave-applications", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const from = new Date(body.fromDate);
      const to = new Date(body.toDate);
      const diffTime = Math.abs(to.getTime() - from.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const [app] = await db.insert(erpLeaveApplication).values({
        personId: body.personId ?? actor.actorId,
        leaveTypeId: body.leaveTypeId,
        fromDate: from,
        toDate: to,
        days: String(days),
        status: "draft",
        reason: body.reason,
      }).returning();
      (ctx as any).set.status = 201;
      return { application: app };
    })

    .get("/leave-applications/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor) { (ctx as any).set.status = 403; return { error: "Forbidden" }; }
      const { id } = (ctx as any).params;
      const [app] = await db.select().from(erpLeaveApplication).where(eq(erpLeaveApplication.id, id));
      if (!app) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { application: app };
    })

    .post("/leave-applications/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor) { (ctx as any).set.status = 403; return { error: "Forbidden" }; }
      const { id } = (ctx as any).params;
      const [app] = await db.select().from(erpLeaveApplication).where(eq(erpLeaveApplication.id, id));
      if (!app || app.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Application must be in draft status" };
      }

      // Check leave balance
      const [alloc] = await db.select().from(erpLeaveAllocation).where(
        and(eq(erpLeaveAllocation.personId, app.personId), eq(erpLeaveAllocation.leaveTypeId, app.leaveTypeId))
      );
      if (!alloc || Number(alloc.balance ?? 0) < Number(app.days)) {
        (ctx as any).set.status = 400;
        return { error: `Insufficient leave balance. Available: ${alloc?.balance ?? 0}, Required: ${app.days}` };
      }

      await db.update(erpLeaveApplication).set({ status: "submitted" }).where(eq(erpLeaveApplication.id, id));
      return { success: true, status: "submitted" };
    })

    .post("/leave-applications/:id/approve", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [app] = await db.select().from(erpLeaveApplication).where(eq(erpLeaveApplication.id, id));
      if (!app || app.status !== "submitted") {
        (ctx as any).set.status = 400;
        return { error: "Application must be submitted first" };
      }

      // Deduct leave balance
      await db.transaction(async (tx) => {
        const [alloc] = await tx.select().from(erpLeaveAllocation).where(
          and(eq(erpLeaveAllocation.personId, app.personId), eq(erpLeaveAllocation.leaveTypeId, app.leaveTypeId))
        );
        if (alloc) {
          const newUsed = Number(alloc.used ?? 0) + Number(app.days);
          const newBalance = Number(alloc.allocated) - newUsed;
          await tx.update(erpLeaveAllocation).set({
            used: String(newUsed),
            balance: String(newBalance),
          }).where(eq(erpLeaveAllocation.id, alloc.id));
        }
        await tx.update(erpLeaveApplication).set({
          status: "approved",
          approvedBy: actor.actorId,
        }).where(eq(erpLeaveApplication.id, id));
      });

      return { success: true, status: "approved" };
    })

    .post("/leave-applications/:id/reject", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      if (!body.reason) {
        (ctx as any).set.status = 400;
        return { error: "Rejection reason required" };
      }
      await db.update(erpLeaveApplication).set({ status: "rejected" }).where(eq(erpLeaveApplication.id, id));
      return { success: true, status: "rejected" };
    });
}
