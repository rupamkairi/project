import type { CommandHandler } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { pipelines, pipelineStages } from "@db/schema/pipeline";
import type { Pipeline, PipelineStage } from "@db/schema/pipeline";
import { eq, and, isNull } from "drizzle-orm";
import { PipelineEvents } from "../events";

// --- pipelines -------------------------------------------------------------

export interface CreatePipelinePayload {
  entityType: string;
  name: string;
  isDefault?: boolean;
  stages?: { name: string; meta?: Record<string, unknown> }[];
}

export const createPipelineHandler: CommandHandler<CreatePipelinePayload, Pipeline> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const pipelineId = generateId();
  const [row] = await db
    .insert(pipelines)
    .values({
      id: pipelineId,
      organizationId: command.orgId,
      entityType: p.entityType,
      name: p.name,
      isDefault: p.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning();

  if (p.stages?.length) {
    await db.insert(pipelineStages).values(
      p.stages.map((s, i) => ({
        id: generateId(),
        organizationId: command.orgId,
        pipelineId,
        name: s.name,
        position: i,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: s.meta ?? {},
      })),
    );
  }

  await context.publish(PipelineEvents.created(row!.id, row!.entityType));
  return row!;
};

export interface UpdatePipelinePayload {
  id: string;
  name?: string;
  isDefault?: boolean;
}

export const updatePipelineHandler: CommandHandler<UpdatePipelinePayload, Pipeline> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(pipelines)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(pipelines.id, id), eq(pipelines.organizationId, command.orgId), isNull(pipelines.deletedAt)))
    .returning();

  if (!row) throw new Error("Pipeline not found");
  await context.publish(PipelineEvents.updated(id));
  return row;
};

export const deletePipelineHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  const now = new Date();
  await db
    .update(pipelines)
    .set({ deletedAt: now })
    .where(and(eq(pipelines.id, id), eq(pipelines.organizationId, command.orgId)));
  await db
    .update(pipelineStages)
    .set({ deletedAt: now })
    .where(and(eq(pipelineStages.pipelineId, id), eq(pipelineStages.organizationId, command.orgId)));
  await context.publish(PipelineEvents.deleted(id));
};

// --- stages ----------------------------------------------------------------

export interface AddStagePayload {
  pipelineId: string;
  name: string;
  position?: number;
  meta?: Record<string, unknown>;
}

export const addStageHandler: CommandHandler<AddStagePayload, PipelineStage> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const [row] = await db
    .insert(pipelineStages)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      pipelineId: p.pipelineId,
      name: p.name,
      position: p.position ?? 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: p.meta ?? {},
    })
    .returning();

  await context.publish(PipelineEvents.stageAdded(p.pipelineId, row!.id));
  return row!;
};

export interface UpdateStagePayload {
  id: string;
  name?: string;
  position?: number;
  meta?: Record<string, unknown>;
}

export const updateStageHandler: CommandHandler<UpdateStagePayload, PipelineStage> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(pipelineStages)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(pipelineStages.id, id), eq(pipelineStages.organizationId, command.orgId), isNull(pipelineStages.deletedAt)))
    .returning();

  if (!row) throw new Error("Stage not found");
  await context.publish(PipelineEvents.stageUpdated(row.pipelineId, id));
  return row;
};

export const removeStageHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  const [row] = await db
    .update(pipelineStages)
    .set({ deletedAt: new Date() })
    .where(and(eq(pipelineStages.id, id), eq(pipelineStages.organizationId, command.orgId)))
    .returning();
  if (row) await context.publish(PipelineEvents.stageRemoved(row.pipelineId, id));
};

export interface ReorderStagesPayload {
  pipelineId: string;
  order: string[]; // stage ids in new order
}

export const reorderStagesHandler: CommandHandler<ReorderStagesPayload, void> = async (
  command,
  context,
) => {
  const { pipelineId, order } = command.payload;
  const now = new Date();
  for (const [position, stageId] of order.entries()) {
    await db
      .update(pipelineStages)
      .set({ position, updatedAt: now })
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.organizationId, command.orgId)));
  }
  await context.publish(PipelineEvents.updated(pipelineId));
};
