import { Elysia, t } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { parties } from "@db/schema/party";
import { and, eq } from "drizzle-orm";
import { hasPermission } from "../../permissions/matrix";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function createVendorRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/vendors" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:vendor:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const orgId = actor.orgId;
      const rows = await db.select().from(parties).where(
        and(eq(parties.type, "vendor"), eq(parties.organizationId, orgId))
      );
      return { vendors: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:vendor:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      if (body.gstin && !GSTIN_REGEX.test(body.gstin)) {
        (ctx as any).set.status = 400;
        return { error: "Invalid GSTIN format" };
      }

      const result = await mediator.dispatch({
        type: "party.createParty",
        payload: {
          type: "vendor",
          organizationId: orgId,
          name: body.name,
          status: "pending-approval",
          meta: {
            subType: body.type,
            gstin: body.gstin,
            pan: body.pan,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            currency: body.currency ?? "INR",
            paymentTerms: body.paymentTerms,
            bankDetails: body.bankDetails,
          },
        },
        actorId: actor.actorId,
        orgId,
        correlationId: generateId(),
      });

      (ctx as any).set.status = 201;
      return { vendor: result };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:vendor:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [vendor] = await db.select().from(parties).where(
        and(eq(parties.id, id), eq(parties.type, "vendor"))
      );
      if (!vendor) { (ctx as any).set.status = 404; return { error: "Vendor not found" }; }
      return { vendor };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:vendor:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;

      if (body.gstin && !GSTIN_REGEX.test(body.gstin)) {
        (ctx as any).set.status = 400;
        return { error: "Invalid GSTIN format" };
      }

      const [existing] = await db.select().from(parties).where(
        and(eq(parties.id, id), eq(parties.type, "vendor"))
      );
      if (!existing) { (ctx as any).set.status = 404; return { error: "Vendor not found" }; }

      const newMeta = { ...(existing.meta as any), ...body };
      await db.update(parties).set({ name: body.name ?? existing.name, meta: newMeta }).where(eq(parties.id, id));
      return { success: true };
    })

    .post("/:id/approve", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:vendor:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      await db.update(parties).set({ status: "active" } as any).where(
        and(eq(parties.id, id), eq(parties.type, "vendor"))
      );
      return { success: true, status: "active" };
    })

    .post("/:id/blacklist", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:vendor:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      if (!body.reason) {
        (ctx as any).set.status = 400;
        return { error: "reason required" };
      }
      await db.update(parties).set({ status: "blacklisted", meta: { blacklistReason: body.reason } } as any).where(
        and(eq(parties.id, id), eq(parties.type, "vendor"))
      );
      return { success: true, status: "blacklisted" };
    });
}
