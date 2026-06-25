import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError, ConflictError, ValidationError } from "@core";
import { db } from "../lib/db.js";
import { rstShifts } from "../db/schema/restaurant.js";
import { and, eq } from "drizzle-orm";

export function billingRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/billing" })
    .post("/bills", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const order = await mediator.query({
        type: "commerce.getTransaction",
        params: { transactionId: input.orderId },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!order) throw new NotFoundError("Order not found");

      const bill = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "bill",
          meta: {
            orderId: input.orderId,
            outletId: order.meta?.outletId,
            status: "open",
            billNumber: `BILL-${Date.now().toString(36).toUpperCase()}`,
            total: order.total ?? 0,
          },
        },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: bill };
    })

    .post("/bills/:id/settle", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const bill = await mediator.query({
        type: "commerce.getTransaction",
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!bill) throw new NotFoundError("Bill not found");

      const billTotal = parseFloat(String(bill.meta?.total ?? 0));
      const totalPaid = (input.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
      if (Math.abs(totalPaid - billTotal) > 0.01) {
        throw new ConflictError(`Payments total ${totalPaid} does not match bill ${billTotal}`);
      }

      await mediator.dispatch({
        type: "commerce.updateTransaction",
        payload: { transactionId: params.id, meta: { ...bill.meta, status: "settled", payments: input.payments } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.order.settled", params.id, "rst.bill",
        { billId: params.id, orderId: bill.meta?.orderId, orgId: session.orgId },
        session.orgId,
      ));
      return { data: { billId: params.id, status: "settled" } };
    })

    .post("/bills/:id/void", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      if (!input?.reason) throw new ValidationError("Void reason required");
      await mediator.dispatch({
        type: "commerce.updateTransaction",
        payload: { transactionId: params.id, meta: { status: "voided", voidReason: input.reason } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: { billId: params.id, status: "voided" } };
    })

    .get("/shifts", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const shifts = await db.query.rstShifts.findMany({
        where: and(
          eq(rstShifts.organizationId, session.orgId),
          outletId ? eq(rstShifts.locationId, outletId) : undefined,
        ),
        orderBy: (t, { desc }) => [desc(t.openedAt)],
        limit: 10,
      });
      return { data: shifts };
    })

    .post("/shifts", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const [shift] = await db.insert(rstShifts).values({
        organizationId: session.orgId,
        locationId: input.outletId,
        date: new Date().toISOString().split("T")[0],
        startTime: new Date().toTimeString().slice(0, 5),
        openedBy: session.actorId,
        openingBalance: input.openingBalance ?? 0,
      }).returning();
      return { data: shift };
    })

    .get("/shifts/open", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const shift = await db.query.rstShifts.findFirst({
        where: and(
          eq(rstShifts.organizationId, session.orgId),
          eq(rstShifts.status, "open"),
          outletId ? eq(rstShifts.locationId, outletId) : undefined,
        ),
      });
      return { data: shift ?? null };
    })

    .post("/shifts/:id/close", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const shift = await db.query.rstShifts.findFirst({ where: eq(rstShifts.id, params.id) });
      if (!shift) throw new NotFoundError("Shift not found");
      if (shift.status !== "open") throw new ConflictError("Shift is not open");
      const [closed] = await db.update(rstShifts).set({
        status: "closed",
        closedBy: session.actorId,
        closingBalance: input.closingBalance,
        notes: input.notes,
        closedAt: new Date(),
      }).where(eq(rstShifts.id, params.id)).returning();
      return { data: closed };
    });
}
