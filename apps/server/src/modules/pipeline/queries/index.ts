import type { QueryHandler } from "@core";
import { db } from "@db/client";
import { pipelines, pipelineStages } from "@db/schema/pipeline";
import type { Pipeline, PipelineStage } from "@db/schema/pipeline";
import { eq, and, isNull, asc, desc, count } from "drizzle-orm";

export const getPipelineHandler: QueryHandler<{ id: string }, Pipeline | null> = async (query) => {
  const [row] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, query.params.id), eq(pipelines.organizationId, query.orgId), isNull(pipelines.deletedAt)))
    .limit(1);
  return row ?? null;
};

interface ListParams {
  entityType?: string;
  limit?: number;
  offset?: number;
}

export const listPipelinesHandler: QueryHandler<ListParams, { items: Pipeline[]; total: number }> = async (query) => {
  const { entityType, limit = 50, offset = 0 } = query.params;
  const conditions = [eq(pipelines.organizationId, query.orgId), isNull(pipelines.deletedAt)];
  if (entityType) conditions.push(eq(pipelines.entityType, entityType));

  const [items, [c]] = await Promise.all([
    db.select().from(pipelines).where(and(...conditions)).orderBy(desc(pipelines.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(pipelines).where(and(...conditions)),
  ]);
  return { items, total: c?.value ?? 0 };
};

export const countPipelinesHandler: QueryHandler<Record<string, never>, number> = async (query) => {
  const [c] = await db
    .select({ value: count() })
    .from(pipelines)
    .where(and(eq(pipelines.organizationId, query.orgId), isNull(pipelines.deletedAt)));
  return c?.value ?? 0;
};

export const getStagesHandler: QueryHandler<{ pipelineId: string }, PipelineStage[]> = async (query) => {
  return db
    .select()
    .from(pipelineStages)
    .where(and(
      eq(pipelineStages.pipelineId, query.params.pipelineId),
      eq(pipelineStages.organizationId, query.orgId),
      isNull(pipelineStages.deletedAt),
    ))
    .orderBy(asc(pipelineStages.position));
};
