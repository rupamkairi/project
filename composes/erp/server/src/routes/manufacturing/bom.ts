import { Elysia } from "elysia";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { eq, and, desc } from "drizzle-orm";
import { erpBom, erpBomItem } from "../../db/schema/erp";
import { hasPermission } from "../../permissions/matrix";

const MAX_BOM_DEPTH = 5;

async function explodeBom(bomId: string, multiplier: number, depth: number): Promise<any[]> {
  if (depth > MAX_BOM_DEPTH) return [];
  const items = await db.select().from(erpBomItem).where(eq(erpBomItem.bomId, bomId));
  const result: any[] = [];

  for (const item of items) {
    const required = Number(item.qty) * multiplier * (1 + Number(item.scrapPercent ?? 0) / 100);
    result.push({ itemId: item.componentItemId, qty: required, uom: item.uom, depth });
    // Check if component has a BOM (sub-assembly)
    const [subBom] = await db.select().from(erpBom).where(and(eq(erpBom.itemId, item.componentItemId), eq(erpBom.isActive, true)));
    if (subBom) {
      const subItems = await explodeBom(subBom.id, required / Number(subBom.quantity ?? 1), depth + 1);
      result.push(...subItems);
    }
  }

  return result;
}

export function createBomRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/boms" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const rows = await db.select().from(erpBom).where(eq(erpBom.organizationId, actor.orgId));
      return { boms: rows };
    })

    .post("/", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const body = (ctx as any).body as any;
      const orgId = actor.orgId;

      const existingBoms = await db.select().from(erpBom).where(
        and(eq(erpBom.itemId, body.itemId), eq(erpBom.organizationId, orgId))
      );
      const version = existingBoms.length + 1;

      const [bom] = await db.insert(erpBom).values({
        organizationId: orgId,
        itemId: body.itemId,
        version,
        isActive: false,
        quantity: String(body.quantity ?? 1),
        uom: body.uom,
        operatingCost: String(body.operatingCost ?? 0),
      }).returning();

      if (body.items?.length) {
        await db.insert(erpBomItem).values(
          body.items.map((item: any) => ({
            bomId: bom.id,
            componentItemId: item.itemId,
            qty: String(item.qty),
            uom: item.uom,
            scrapPercent: String(item.scrapPct ?? 0),
          }))
        );
      }

      (ctx as any).set.status = 201;
      return { bom };
    })

    .get("/by-item/:itemId", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { itemId } = (ctx as any).params;
      const boms = await db.select().from(erpBom).where(
        and(eq(erpBom.itemId, itemId), eq(erpBom.organizationId, actor.orgId))
      );
      return { boms };
    })

    .get("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [bom] = await db.select().from(erpBom).where(
        and(eq(erpBom.id, id), eq(erpBom.organizationId, actor.orgId))
      );
      if (!bom) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      const items = await db.select().from(erpBomItem).where(eq(erpBomItem.bomId, id));
      return { bom, items };
    })

    .get("/:id/explode", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:read")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const query = (ctx as any).query ?? {};
      const quantity = Number(query.quantity ?? 1);

      const [bom] = await db.select().from(erpBom).where(eq(erpBom.id, id));
      if (!bom) { (ctx as any).set.status = 404; return { error: "Not found" }; }

      const multiplier = quantity / Number(bom.quantity ?? 1);
      const materials = await explodeBom(id, multiplier, 1);

      return { materials };
    })

    .patch("/:id", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const body = (ctx as any).body as any;
      await db.update(erpBom).set({
        operatingCost: body.operatingCost ? String(body.operatingCost) : undefined,
        uom: body.uom,
      }).where(eq(erpBom.id, id));
      return { success: true };
    })

    .post("/:id/activate", async (ctx) => {
      const actor = (ctx as any).actor;
      if (!actor || !hasPermission(actor, "erp:inventory:transfer")) {
        (ctx as any).set.status = 403;
        return { error: "Forbidden" };
      }
      const { id } = (ctx as any).params;
      const [bom] = await db.select().from(erpBom).where(eq(erpBom.id, id));
      if (!bom) { (ctx as any).set.status = 404; return { error: "Not found" }; }
      // Deactivate other BOMs for the same item
      await db.update(erpBom).set({ isActive: false }).where(
        and(eq(erpBom.itemId, bom.itemId), eq(erpBom.organizationId, bom.organizationId))
      );
      await db.update(erpBom).set({ isActive: true }).where(eq(erpBom.id, id));
      return { success: true };
    });
}
