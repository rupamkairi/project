// CRM Compose — /crm/pipelines routes.
//
// Pipelines use the master `pipelines` + `pipeline_stages` tables, filtered by
// `entity_type` (crm.deal, crm.lead). Managers may create/edit; reps read-only.

import Elysia from "elysia";
import { generateId } from "@core";
import type { Mediator } from "@core";
import { db } from "@db/client";
import { pipelines, pipelineStages } from "@db/schema/pipeline";
import { eq, and, isNull, count } from "drizzle-orm";
import { requirePermission } from "../permissions";
import { getActor } from "./helpers";

export function createPipelinesRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: "/pipelines" })
    .get("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "pipeline:read");

      const items = await db
        .select()
        .from(pipelines)
        .where(
          and(
            eq(pipelines.organizationId, actor.orgId),
            isNull(pipelines.deletedAt),
          ),
        );

      // Filter to CRM entity types only
      const crmPipelines = items.filter((p) =>
        p.entityType.startsWith("crm."),
      );

      // Enrich with stages
      const enriched = await Promise.all(
        crmPipelines.map(async (p) => {
          const stages = await db
            .select()
            .from(pipelineStages)
            .where(
              and(
                eq(pipelineStages.pipelineId, p.id),
                eq(pipelineStages.organizationId, actor.orgId),
              ),
            )
            .orderBy(pipelineStages.position);
          return { ...p, stages };
        }),
      );

      return enriched;
    })
    .get("/:id", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "pipeline:read");
      const { id } = (ctx as any).params;

      const [pipeline] = await db
        .select()
        .from(pipelines)
        .where(and(eq(pipelines.id, id), eq(pipelines.organizationId, actor.orgId), isNull(pipelines.deletedAt)))
        .limit(1);
      if (!pipeline) {
        (ctx as any).set.status = 404;
        return { error: "Pipeline not found" };
      }

      const stages = await db
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.pipelineId, id), eq(pipelineStages.organizationId, actor.orgId)))
        .orderBy(pipelineStages.position);

      return { ...pipeline, stages };
    })
    .post("/", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "pipeline:manage");
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [pipeline] = await db
        .insert(pipelines)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          entityType: body.entityType ?? "crm.deal",
          name: body.name,
          isDefault: body.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning();

      // Seed stages if provided
      if (body.stages?.length) {
        for (let i = 0; i < body.stages.length; i++) {
          await db.insert(pipelineStages).values({
            id: generateId(),
            organizationId: actor.orgId,
            pipelineId: pipeline!.id,
            name: body.stages[i].name,
            position: i,
            meta: body.stages[i].meta ?? {},
            createdAt: now,
            updatedAt: now,
            version: 1,
          });
        }
      }

      (ctx as any).set.status = 201;
      return pipeline;
    })
    .post("/:id/stages", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "pipeline:manage");
      const { id } = (ctx as any).params;
      const body = (ctx as any).body ?? {};
      const now = new Date();

      const [stage] = await db
        .insert(pipelineStages)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          pipelineId: id,
          name: body.name,
          position: body.position ?? 0,
          meta: body.meta ?? {},
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning();
      (ctx as any).set.status = 201;
      return stage;
    })
    .patch("/:id/stages/:stageId", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "pipeline:manage");
      const { stageId } = (ctx as any).params;
      const body = (ctx as any).body ?? {};

      const [updated] = await db
        .update(pipelineStages)
        .set({
          ...(body.name != null && { name: body.name }),
          ...(body.position != null && { position: body.position }),
          ...(body.meta != null && { meta: body.meta }),
          updatedAt: new Date(),
        })
        .where(eq(pipelineStages.id, stageId))
        .returning();
      if (!updated) {
        (ctx as any).set.status = 404;
        return { error: "Stage not found" };
      }
      return updated;
    })
    .delete("/:id/stages/:stageId", async (ctx) => {
      const actor = getActor(ctx);
      requirePermission(actor, "pipeline:manage");
      const { stageId } = (ctx as any).params;
      await db.update(pipelineStages).set({ deletedAt: new Date() }).where(eq(pipelineStages.id, stageId));
      return { success: true };
    });
}
