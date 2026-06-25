import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, desc } from "drizzle-orm";
import { erpAttendance } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createAttendanceRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/attendance" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpAttendance)
        .orderBy(desc(erpAttendance.date)).limit(500);
      return { attendance: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      // Bulk import
      const records = Array.isArray(body) ? body : [body];
      await db.insert(erpAttendance).values(
        records.map((r: any) => ({
          personId: r.personId,
          date: new Date(r.date),
          status: r.status,
          checkIn: r.checkIn ? new Date(r.checkIn) : undefined,
          checkOut: r.checkOut ? new Date(r.checkOut) : undefined,
          workHours: r.workHours ? String(r.workHours) : undefined,
        }))
      );
      return { success: true, count: records.length };
    })

    .post("/mark", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor) { (ctx as any).set.status = 403; return { error: "Forbidden" }; }
      const body = (ctx as any).body as any;
      const [record] = await db.insert(erpAttendance).values({
        personId: actor.actorId,
        date: new Date(body.date),
        status: body.status,
        checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
      }).returning();
      return { attendance: record };
    })

    .get("/monthly", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const query = (ctx as any).query ?? {};
      const month = Number(query.month ?? new Date().getMonth() + 1);
      const year = Number(query.year ?? new Date().getFullYear());

      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);

      const rows = await db.select().from(erpAttendance)
        .where(and(
          eq(erpAttendance.date, from),
          eq(erpAttendance.date, to)
        ));

      return { attendance: rows, month, year };
    });
}
