// CRM Compose — /crm/tickets routes.
//
// Support tickets are CRM-owned (crm_tickets detail table). Linked to a contact
// (person) and optionally a deal or account.
// Ticket FSM: open → in_progress → resolved → closed; resolved can reopen → open.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { persons } from "@db/schema/party";
import { crmTicket } from "../db/schema/crm";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import { requirePermission } from "../permissions";
import { assertTicketTransition, type TicketState } from "../lib/fsms";
import { parsePagination, listResponse, getActor } from "./helpers";

export function createTicketsRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/tickets" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:read");
      const q = (ctx as any).query ?? {};
      const { page, limit, offset } = parsePagination(q);

      const conds = [
        eq(crmTicket.organizationId, actor.orgId),
        isNull(crmTicket.deletedAt),
      ];
      if (q.status) conds.push(eq(crmTicket.status, String(q.status)));
      if (q.priority) conds.push(eq(crmTicket.priority, String(q.priority)));
      if (q.assigneeId) conds.push(eq(crmTicket.assigneeId, String(q.assigneeId)));
      if (q.personId) conds.push(eq(crmTicket.personId, String(q.personId)));

      const [items, [c]] = await Promise.all([
        db.select().from(crmTicket).where(and(...conds)).orderBy(desc(crmTicket.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(crmTicket).where(and(...conds)),
      ]);

      return listResponse(items, c?.value ?? 0, page, limit);
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:read");
      const { id } = (ctx as any).params;

      const [ticket] = await db
        .select()
        .from(crmTicket)
        .where(and(eq(crmTicket.id, id), eq(crmTicket.organizationId, actor.orgId), isNull(crmTicket.deletedAt)))
        .limit(1);
      if (!ticket) {
        (ctx as any).set.status = 404;
        return { error: "Ticket not found" };
      }

      const [contact] = ticket.personId
        ? await db
            .select({ firstName: persons.firstName, lastName: persons.lastName, email: persons.email })
            .from(persons)
            .where(eq(persons.id, ticket.personId))
            .limit(1)
        : [null];

      return {
        ...ticket,
        contactName: contact ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() : null,
        contactEmail: contact?.email ?? null,
      };
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:create");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      if (!body.subject) {
        (ctx as any).set.status = 400;
        return { error: "subject is required" };
      }

      const [ticket] = await db
        .insert(crmTicket)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          subject: body.subject,
          description: body.description ?? null,
          personId: body.personId ?? null,
          partyId: body.partyId ?? null,
          dealId: body.dealId ?? null,
          assigneeId: body.assigneeId ?? actor.id,
          status: "open",
          priority: body.priority ?? "normal",
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();
      (ctx as any).set.status = 201;
      return ticket;
    })
    .patch("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:create");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [existing] = await db
        .select()
        .from(crmTicket)
        .where(and(eq(crmTicket.id, id), eq(crmTicket.organizationId, actor.orgId), isNull(crmTicket.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Ticket not found" };
      }

      if (body.status && body.status !== existing.status) {
        assertTicketTransition(existing.status, body.status as TicketState);
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      const editable = ["subject", "description", "personId", "partyId", "dealId", "priority"];
      for (const f of editable) {
        if (body[f] != null) updates[f] = body[f];
      }
      if (body.status) {
        updates.status = body.status;
        if (body.status === "resolved") updates.resolvedAt = new Date();
        if (body.status === "closed") updates.closedAt = new Date();
      }

      const [updated] = await db
        .update(crmTicket)
        .set(updates)
        .where(eq(crmTicket.id, id))
        .returning();
      return updated;
    })
    .delete("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:delete");
      const { id } = (ctx as any).params;
      await db.update(crmTicket).set({ deletedAt: new Date() }).where(eq(crmTicket.id, id));
      return { success: true };
    })
    // --- FSM: assign --------------------------------------------------------
    .post("/:id/assign", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:assign");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      if (!body.assigneeId) {
        (ctx as any).set.status = 400;
        return { error: "assigneeId is required" };
      }

      const [existing] = await db
        .select()
        .from(crmTicket)
        .where(and(eq(crmTicket.id, id), eq(crmTicket.organizationId, actor.orgId), isNull(crmTicket.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Ticket not found" };
      }

      // Assigning an open ticket moves it to in_progress
      const newStatus = existing.status === "open" ? "in_progress" : existing.status;
      const updates: Record<string, any> = {
        assigneeId: String(body.assigneeId),
        status: newStatus,
        updatedAt: new Date(),
      };
      if (existing.status === "open" && !existing.firstResponseAt) {
        updates.firstResponseAt = new Date();
      }

      const [updated] = await db
        .update(crmTicket)
        .set(updates)
        .where(eq(crmTicket.id, id))
        .returning();
      return updated;
    })
    // --- FSM: resolve -------------------------------------------------------
    .post("/:id/resolve", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:resolve");
      const { id } = (ctx as any).params;

      const [existing] = await db
        .select()
        .from(crmTicket)
        .where(and(eq(crmTicket.id, id), eq(crmTicket.organizationId, actor.orgId), isNull(crmTicket.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Ticket not found" };
      }

      assertTicketTransition(existing.status, "resolved");

      const [updated] = await db
        .update(crmTicket)
        .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
        .where(eq(crmTicket.id, id))
        .returning();
      return updated;
    })
    // --- FSM: reopen --------------------------------------------------------
    .post("/:id/reopen", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "ticket:assign");
      const { id } = (ctx as any).params;

      const [existing] = await db
        .select()
        .from(crmTicket)
        .where(and(eq(crmTicket.id, id), eq(crmTicket.organizationId, actor.orgId), isNull(crmTicket.deletedAt)))
        .limit(1);
      if (!existing) {
        (ctx as any).set.status = 404;
        return { error: "Ticket not found" };
      }

      assertTicketTransition(existing.status, "open");

      const [updated] = await db
        .update(crmTicket)
        .set({ status: "open", resolvedAt: null, updatedAt: new Date() })
        .where(eq(crmTicket.id, id))
        .returning();
      return updated;
    });
}
