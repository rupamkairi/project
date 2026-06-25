import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { ConflictError, NotFoundError, ValidationError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstShifts } from "../db/schema/restaurant";
import { nextLocationSeq, formatBillNumber } from "../lib/utils";
import { rstConfig } from "../config";

async function getOrderWithLines(mediator: Mediator, orderId: string, orgId: string) {
  const order = await mediator.query<any>({
    type: "commerce.getTransaction",
    params: { transactionId: orderId, organizationId: orgId },
    actorId: "system",
    orgId,
  });
  return order;
}

async function getBillStage(mediator: Mediator, orgId: string, stageName: string) {
  const stages = await mediator.query<any>({
    type: "pipeline.listStages",
    params: { organizationId: orgId, entityType: "rst.bill" },
    actorId: "system",
    orgId,
  });
  return (stages?.items ?? stages ?? []).find((s: any) => s.name === stageName);
}

export function billingRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/bills" })
    .post("/", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const orderId = (body as any).orderId;

      const order = await getOrderWithLines(mediator, orderId, orgId);
      if (!order) throw new NotFoundError("Order not found");

      const outletId = order.meta?.outletId;
      const outlet = await mediator.query<any>({
        type: "location.getLocation",
        params: { locationId: outletId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      const seq = await nextLocationSeq(outletId, "lastBillSeq");
      const billNumber = formatBillNumber(outlet?.code ?? "BIL", seq);

      const lines = order.lines ?? [];
      const subtotal = lines.reduce(
        (sum: number, l: any) =>
          sum + (parseFloat(l.unitPriceAmount ?? l.unitPrice ?? 0) * (l.qty ?? 1)),
        0,
      );
      const serviceCharge = subtotal * (rstConfig.serviceChargePct / 100);
      const total = subtotal + serviceCharge;

      const openStage = await getBillStage(mediator, orgId, "Open");

      const bill = await mediator.dispatch<any>({
        type: "commerce.createTransaction",
        payload: {
          type: "bill",
          organizationId: orgId,
          personId: order.personId ?? null,
          stageId: openStage?.id ?? null,
          meta: {
            orderId,
            outletId,
            billNumber,
            subtotal: subtotal.toFixed(2),
            serviceCharge: serviceCharge.toFixed(2),
            total: total.toFixed(2),
            payments: [],
            status: "open",
          },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: bill };
    })

    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const bill = await mediator.query<any>({
        type: "commerce.getTransaction",
        params: { transactionId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!bill) throw new NotFoundError("Bill not found");
      return bill;
    })

    .post("/:id/print", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: {
          transactionId: params.id,
          organizationId: orgId,
          meta: { status: "printed", printedAt: new Date().toISOString() },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "printed" };
    })

    .post("/:id/settle", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const payments: any[] = (body as any).payments ?? [];
      const roundOff: number = (body as any).roundOff ?? 0;

      const bill = await mediator.query<any>({
        type: "commerce.getTransaction",
        params: { transactionId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!bill) throw new NotFoundError("Bill not found");

      const billTotal = parseFloat(bill.meta?.total ?? "0");
      const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0) + roundOff;
      const tolerance = 0.01;

      if (Math.abs(totalPaid - billTotal) > tolerance) {
        throw new ConflictError(
          `Payments total ${totalPaid} does not match bill ${billTotal}`,
        );
      }

      const settledStage = await getBillStage(mediator, orgId, "Settled");

      await mediator.dispatch<any>({
        type: "commerce.advanceStage",
        payload: { transactionId: params.id, stageId: settledStage?.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: {
          transactionId: params.id,
          organizationId: orgId,
          meta: {
            status: "settled",
            payments,
            settledAt: new Date().toISOString(),
            roundOff,
          },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      const orderId = bill.meta?.orderId;
      if (orderId) {
        const order = await getOrderWithLines(mediator, orderId, orgId);
        if (order?.meta?.tableId && order.meta.orderType === "dine-in") {
          await mediator.dispatch<any>({
            type: "location.updateStatus",
            payload: { locationId: order.meta.tableId, status: "active" },
            actorId: "system",
            orgId,
            correlationId: generateId(),
          });
        }
      }

      await bus.publish(createDomainEvent(
        "rst.order.settled",
        params.id,
        "rst.bill",
        { billId: params.id, orderId: bill.meta?.orderId, orgId },
        orgId,
      ));
      return { status: "settled" };
    })

    .post("/:id/void", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      if (!(body as any).reason) {
        throw new ValidationError("Void reason required");
      }

      const voidedStage = await getBillStage(mediator, orgId, "Voided");

      await mediator.dispatch<any>({
        type: "commerce.advanceStage",
        payload: { transactionId: params.id, stageId: voidedStage?.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: {
          transactionId: params.id,
          organizationId: orgId,
          meta: { status: "voided", voidReason: (body as any).reason, voidedAt: new Date().toISOString() },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "voided" };
    })

    // Split bill
    .post("/split", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const { orderId, splits } = body as any;

      const order = await getOrderWithLines(mediator, orderId, orgId);
      if (!order) throw new NotFoundError("Order not found");

      const orderItemIds = (order.lines ?? []).map((l: any) => l.id);
      const allCoveredIds = (splits as any[]).flatMap((s: any) => s.itemIds ?? []);
      const uniqueCovered = new Set(allCoveredIds);

      if (uniqueCovered.size !== allCoveredIds.length) {
        throw new ConflictError("Item appears in multiple splits");
      }

      const unassigned = orderItemIds.filter((id: string) => !uniqueCovered.has(id));
      if (unassigned.length > 0) {
        throw new ConflictError(`Items not in any split: ${unassigned.join(", ")}`);
      }

      const outletId = order.meta?.outletId;
      const outlet = await mediator.query<any>({
        type: "location.getLocation",
        params: { locationId: outletId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      const createdBills = [];
      for (const split of splits as any[]) {
        const seq = await nextLocationSeq(outletId, "lastBillSeq");
        const billNumber = formatBillNumber(outlet?.code ?? "BIL", seq);

        const splitLines = (order.lines ?? []).filter((l: any) => split.itemIds.includes(l.id));
        const subtotal = splitLines.reduce(
          (sum: number, l: any) =>
            sum + (parseFloat(l.unitPriceAmount ?? l.unitPrice ?? 0) * (l.qty ?? 1)),
          0,
        );
        const serviceCharge = subtotal * (rstConfig.serviceChargePct / 100);
        const total = subtotal + serviceCharge;

        const openStage = await getBillStage(mediator, orgId, "Open");

        const bill = await mediator.dispatch<any>({
          type: "commerce.createTransaction",
          payload: {
            type: "bill",
            organizationId: orgId,
            stageId: openStage?.id ?? null,
            meta: {
              orderId,
              outletId,
              billNumber,
              guestLabel: split.guestLabel,
              itemIds: split.itemIds,
              subtotal: subtotal.toFixed(2),
              serviceCharge: serviceCharge.toFixed(2),
              total: total.toFixed(2),
              payments: [],
              status: "open",
              isSplit: true,
            },
          },
          actorId: actor?.id ?? "system",
          orgId,
          correlationId: generateId(),
        });

        createdBills.push(bill);
      }

      return { data: createdBills };
    });
}

export function shiftRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/shifts" })
    .get("/", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const shifts = await db.query.rstShifts.findMany({
        where: and(
          eq(rstShifts.organizationId, orgId),
          q.outletId ? eq(rstShifts.locationId, q.outletId) : undefined,
          q.status ? eq(rstShifts.status, q.status) : undefined,
        ),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });

      return { data: shifts };
    })

    .post("/", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const now = new Date();
      const shift = await db
        .insert(rstShifts)
        .values({
          id: generateId(),
          organizationId: orgId,
          locationId: (body as any).outletId,
          date: now.toISOString().slice(0, 10),
          startTime: now.toTimeString().slice(0, 5),
          status: "open",
          openingBalance: String((body as any).openingBalance ?? 0),
        })
        .returning();

      return { data: shift[0] };
    })

    .post("/:id/close", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const shift = await db.query.rstShifts.findFirst({
        where: and(eq(rstShifts.id, params.id), eq(rstShifts.organizationId, orgId)),
      });

      if (!shift) throw new NotFoundError("Shift not found");
      if (shift.status !== "open") throw new ConflictError("Shift is not open");

      const closingBalance = parseFloat((body as any).closingBalance ?? "0");
      const openingBalance = parseFloat(shift.openingBalance ?? "0");
      const expectedBalance = openingBalance;
      const variance = closingBalance - expectedBalance;
      const threshold = rstConfig.shiftVarianceThreshold;

      const newStatus = Math.abs(variance) > threshold ? "variance-flagged" : "closing";

      await db
        .update(rstShifts)
        .set({
          endTime: new Date().toTimeString().slice(0, 5),
          status: newStatus,
          closingBalance: String(closingBalance),
          expectedBalance: String(expectedBalance),
          variance: String(variance),
          updatedAt: new Date(),
        })
        .where(eq(rstShifts.id, params.id));

      return { status: newStatus, variance };
    })

    .post("/:id/approve", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await db
        .update(rstShifts)
        .set({ status: "closed", approvedBy: actor?.id, updatedAt: new Date() })
        .where(and(eq(rstShifts.id, params.id), eq(rstShifts.organizationId, orgId)));

      return { status: "closed" };
    });
}
