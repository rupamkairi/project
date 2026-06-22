import type { QueryHandler } from "@core";
import { db } from "@db/client";
import { activities } from "@db/schema/activity";
import type { Activity } from "@db/schema/activity";
import { eq, and, isNull, desc, count } from "drizzle-orm";

export const getActivityHandler: QueryHandler<{ id: string }, Activity | null> = async (query) => {
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, query.params.id), eq(activities.organizationId, query.orgId), isNull(activities.deletedAt)))
    .limit(1);
  return row ?? null;
};

interface ListParams {
  type?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export const listActivitiesHandler: QueryHandler<ListParams, { items: Activity[]; total: number }> = async (query) => {
  const { type, status, entityType, entityId, limit = 50, offset = 0 } = query.params;
  const conditions = [eq(activities.organizationId, query.orgId), isNull(activities.deletedAt)];
  if (type) conditions.push(eq(activities.type, type as Activity["type"]));
  if (status) conditions.push(eq(activities.status, status as Activity["status"]));
  if (entityType) conditions.push(eq(activities.entityType, entityType));
  if (entityId) conditions.push(eq(activities.entityId, entityId));

  const [items, [c]] = await Promise.all([
    db.select().from(activities).where(and(...conditions)).orderBy(desc(activities.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(activities).where(and(...conditions)),
  ]);
  return { items, total: c?.value ?? 0 };
};

export const countActivitiesHandler: QueryHandler<{ type?: string }, number> = async (query) => {
  const conditions = [eq(activities.organizationId, query.orgId), isNull(activities.deletedAt)];
  if (query.params.type) conditions.push(eq(activities.type, query.params.type as Activity["type"]));
  const [c] = await db.select({ value: count() }).from(activities).where(and(...conditions));
  return c?.value ?? 0;
};
