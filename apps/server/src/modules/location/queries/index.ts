import type { QueryHandler } from "@core";
import { db } from "@db/client";
import { locations } from "@db/schema/location";
import type { Location } from "@db/schema/location";
import { eq, and, isNull, desc, count } from "drizzle-orm";

export const getLocationHandler: QueryHandler<{ id: string }, Location | null> = async (query) => {
  const [row] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, query.params.id), eq(locations.organizationId, query.orgId), isNull(locations.deletedAt)))
    .limit(1);
  return row ?? null;
};

interface ListParams {
  type?: string;
  parentId?: string;
  limit?: number;
  offset?: number;
}

export const listLocationsHandler: QueryHandler<ListParams, { items: Location[]; total: number }> = async (query) => {
  const { type, parentId, limit = 50, offset = 0 } = query.params;
  const conditions = [eq(locations.organizationId, query.orgId), isNull(locations.deletedAt)];
  if (type) conditions.push(eq(locations.type, type as Location["type"]));
  if (parentId) conditions.push(eq(locations.parentId, parentId));

  const [items, [c]] = await Promise.all([
    db.select().from(locations).where(and(...conditions)).orderBy(desc(locations.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(locations).where(and(...conditions)),
  ]);
  return { items, total: c?.value ?? 0 };
};

export const countLocationsHandler: QueryHandler<{ type?: string }, number> = async (query) => {
  const conditions = [eq(locations.organizationId, query.orgId), isNull(locations.deletedAt)];
  if (query.params.type) conditions.push(eq(locations.type, query.params.type as Location["type"]));
  const [c] = await db.select({ value: count() }).from(locations).where(and(...conditions));
  return c?.value ?? 0;
};
