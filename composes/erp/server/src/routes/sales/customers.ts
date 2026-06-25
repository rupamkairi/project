import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { parties } from "@db/schema/party";
import { transactions } from "@db/schema/commerce";
import { eq, and, desc } from "drizzle-orm";
import { hasPermission } from "../../permissions/matrix";

export function createCustomerRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/customers" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(parties).where(
        and(eq(parties.type, "customer"), eq(parties.organizationId, actor.orgId))
      );
      return { customers: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const result = await mediator.dispatch({
        type: "party.createParty",
        payload: {
          type: "customer",
          organizationId: orgId,
          name: body.name,
          status: "active",
          meta: {
            gstin: body.gstin,
            pan: body.pan,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            currency: body.currency ?? "INR",
            paymentTerms: body.paymentTerms,
            creditLimit: body.creditLimit ?? 0,
            outstandingBalance: 0,
            billingAddress: body.billingAddress,
          },
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { customer: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [customer] = await db.select().from(parties).where(
        and(eq(parties.id, id), eq(parties.type, "customer"))
      );
      if (!customer) { (ctx as any).set.status = 404; return { error: "Customer not found" }; }
      return { customer };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const [existing] = await db.select().from(parties).where(
        and(eq(parties.id, id), eq(parties.type, "customer"))
      );
      if (!existing) { (ctx as any).set.status = 404; return { error: "Customer not found" }; }
      const newMeta = { ...(existing.meta as any), ...body };
      await db.update(parties).set({ name: body.name ?? existing.name, meta: newMeta }).where(eq(parties.id, id));
      return { success: true };
    })

    .get("/:id/orders", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:sales-order:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const orders = await db.select().from(transactions).where(
        and(eq(transactions.partyId, id), eq(transactions.type, "sales_order"), eq(transactions.organizationId, actor.orgId))
      ).orderBy(desc(transactions.createdAt));
      return { orders };
    })

    .get("/:id/invoices", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:invoice:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const invoices = await db.select().from(transactions).where(
        and(eq(transactions.partyId, id), eq(transactions.type, "invoice"), eq(transactions.organizationId, actor.orgId))
      ).orderBy(desc(transactions.createdAt));
      const outbound = invoices.filter((i: any) => (i.meta as any)?.direction === "outbound");
      return { invoices: outbound };
    });
}
