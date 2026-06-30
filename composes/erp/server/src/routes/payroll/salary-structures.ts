import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq } from "drizzle-orm";
import { erpSalaryStructure } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

export function createSalaryStructureRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/salary-structures" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpSalaryStructure).where(eq(erpSalaryStructure.organizationId, actor.orgId));
      return { structures: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const [structure] = await db.insert(erpSalaryStructure).values({
        organizationId: actor.orgId,
        name: body.name,
        components: body.components,
      }).returning();
      (ctx as any).set.status = 201;
      return { structure };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [structure] = await db.select().from(erpSalaryStructure).where(eq(erpSalaryStructure.id, id));
      if (!structure) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      return { structure };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:hr:manage")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      await db.update(erpSalaryStructure).set({
        name: body.name,
        components: body.components,
      }).where(eq(erpSalaryStructure.id, id));
      return { success: true };
    });
}
