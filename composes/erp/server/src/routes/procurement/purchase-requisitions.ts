import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { eq, and, like, desc } from "drizzle-orm";
import {
  erpPurchaseRequisition,
  erpPrItem,
} from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";
import { nextRefNo } from "../../lib/ref-numbers";

export function createPurchaseRequisitionRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/purchase-requisitions" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select()
        .from(erpPurchaseRequisition)
        .where(eq(erpPurchaseRequisition.organizationId, actor.orgId))
        .orderBy(desc(erpPurchaseRequisition.createdAt));
      return { requisitions: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;
      const year = new Date().getFullYear();
      const refNo = await nextRefNo(db, orgId, "PR", year, erpPurchaseRequisition, erpPurchaseRequisition.refNo);

      const [pr] = await db.insert(erpPurchaseRequisition).values({
        organizationId: orgId,
        refNo,
        requestedById: actor.actorId,
        departmentId: body.department,
        urgency: body.urgency ?? "normal",
        justification: body.justification,
        requiredBy: body.requiredBy ? new Date(body.requiredBy) : undefined,
        status: "draft",
      }).returning();

      if (body.items?.length) {
        await db.insert(erpPrItem).values(
          body.items.map((item: any) => ({
            requisitionId: pr.id,
            itemId: item.itemId,
            qty: String(item.qty),
            uom: item.uom,
            estimatedUnitCost: item.estimatedUnitPrice ? String(item.estimatedUnitPrice) : null,
          }))
        );
      }

      (ctx as any).set.status = 201;
      return { requisition: pr };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [pr] = await db.select().from(erpPurchaseRequisition).where(
        and(eq(erpPurchaseRequisition.id, id), eq(erpPurchaseRequisition.organizationId, actor.orgId))
      );
      if (!pr) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const items = await db.select().from(erpPrItem).where(eq(erpPrItem.requisitionId, id));
      return { requisition: pr, items };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const [pr] = await db.select().from(erpPurchaseRequisition).where(eq(erpPurchaseRequisition.id, id));
      if (!pr || pr.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Can only edit draft requisitions" };
      }
      await db.update(erpPurchaseRequisition).set({
        justification: body.justification ?? pr.justification,
        urgency: body.urgency ?? pr.urgency,
        updatedAt: new Date(),
      }).where(eq(erpPurchaseRequisition.id, id));
      return { success: true };
    })

    .post("/:id/submit", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:create")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [pr] = await db.select().from(erpPurchaseRequisition).where(eq(erpPurchaseRequisition.id, id));
      if (!pr || pr.status !== "draft") {
        (ctx as any).set.status = 400;
        return { error: "Requisition must be in draft status" };
      }
      await db.update(erpPurchaseRequisition).set({ status: "submitted", updatedAt: new Date() })
        .where(eq(erpPurchaseRequisition.id, id));
      return { success: true, status: "submitted" };
    })

    .post("/:id/approve", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [pr] = await db.select().from(erpPurchaseRequisition).where(eq(erpPurchaseRequisition.id, id));
      if (!pr || pr.status !== "submitted") {
        (ctx as any).set.status = 400;
        return { error: "Requisition must be submitted first" };
      }
      await db.update(erpPurchaseRequisition).set({
        status: "approved",
        approvedBy: actor.actorId,
        updatedAt: new Date(),
      }).where(eq(erpPurchaseRequisition.id, id));
      return { success: true, status: "approved" };
    })

    .post("/:id/reject", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      if (!body.reason) {
        (ctx as any).set.status = 400;
        return { error: "Rejection reason required" };
      }
      await db.update(erpPurchaseRequisition).set({
        status: "rejected",
        rejectedReason: body.reason,
        updatedAt: new Date(),
      }).where(eq(erpPurchaseRequisition.id, id));
      return { success: true, status: "rejected" };
    })

    .post("/:id/convert", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:purchase-req:approve")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      const [pr] = await db.select().from(erpPurchaseRequisition).where(eq(erpPurchaseRequisition.id, id));
      if (!pr || pr.status !== "approved") {
        (ctx as any).set.status = 400;
        return { error: "Requisition must be approved before converting to PO" };
      }
      const items = await db.select().from(erpPrItem).where(eq(erpPrItem.requisitionId, id));

      const year = new Date().getFullYear();
      const poRefNo = `PO-${year}-${Date.now().toString().slice(-4)}`;

      const result = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "purchase_order",
          organizationId: actor.orgId,
          refNo: poRefNo,
          partyId: body.vendorId,
          status: "draft",
          meta: { prId: id, source: "pr-conversion" },
          lines: items.map((item) => ({
            itemId: item.itemId,
            qty: item.qty,
            unitPrice: item.estimatedUnitCost ?? "0",
            uom: item.uom,
          })),
        },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      });

      await db.update(erpPurchaseRequisition).set({ status: "converted", updatedAt: new Date() })
        .where(eq(erpPurchaseRequisition.id, id));

      (ctx as any).set.status = 201;
      return { success: true, purchaseOrderId: (result as any)?.id };
    });
}
