import type { CommandHandler } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { activities } from "@db/schema/activity";
import type { Activity } from "@db/schema/activity";
import { eq, and, isNull } from "drizzle-orm";
import { ActivityEvents } from "../events";

type ActivityType = Activity["type"];

export interface LogActivityPayload {
  type: ActivityType;
  subject?: string;
  body?: string;
  actorId?: string;
  entityId?: string;
  entityType?: string;
  dueAt?: Date;
}

export const logActivityHandler: CommandHandler<LogActivityPayload, Activity> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const [row] = await db
    .insert(activities)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      type: p.type,
      subject: p.subject ?? null,
      body: p.body ?? null,
      status: "pending",
      actorId: p.actorId ?? command.actorId ?? null,
      entityId: p.entityId ?? null,
      entityType: p.entityType ?? null,
      dueAt: p.dueAt ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning();

  await context.publish(ActivityEvents.logged(row!.id, row!.type));
  return row!;
};

export interface UpdateActivityPayload {
  id: string;
  subject?: string;
  body?: string;
  dueAt?: Date;
}

export const updateActivityHandler: CommandHandler<UpdateActivityPayload, Activity> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(activities)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(activities.id, id), eq(activities.organizationId, command.orgId), isNull(activities.deletedAt)))
    .returning();

  if (!row) throw new Error("Activity not found");
  await context.publish(ActivityEvents.updated(id));
  return row;
};

export const completeActivityHandler: CommandHandler<{ id: string }, Activity> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  const now = new Date();
  const [row] = await db
    .update(activities)
    .set({ status: "done", completedAt: now, updatedAt: now })
    .where(and(eq(activities.id, id), eq(activities.organizationId, command.orgId), isNull(activities.deletedAt)))
    .returning();

  if (!row) throw new Error("Activity not found");
  await context.publish(ActivityEvents.completed(id));
  return row;
};

export const cancelActivityHandler: CommandHandler<{ id: string }, Activity> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  const [row] = await db
    .update(activities)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(activities.id, id), eq(activities.organizationId, command.orgId), isNull(activities.deletedAt)))
    .returning();

  if (!row) throw new Error("Activity not found");
  await context.publish(ActivityEvents.cancelled(id));
  return row;
};

export const deleteActivityHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  await db
    .update(activities)
    .set({ deletedAt: new Date() })
    .where(and(eq(activities.id, id), eq(activities.organizationId, command.orgId)));
  await context.publish(ActivityEvents.deleted(id));
};
