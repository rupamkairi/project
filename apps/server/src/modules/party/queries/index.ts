import type { QueryHandler } from "@core";
import { db } from "@db/client";
import { persons, parties } from "@db/schema/party";
import type { Person, Party } from "@db/schema/party";
import { eq, and, isNull, desc, count } from "drizzle-orm";

interface ListParams {
  type?: string;
  limit?: number;
  offset?: number;
}
interface ListResult<T> {
  items: T[];
  total: number;
}

// --- persons ---------------------------------------------------------------

export const getPersonHandler: QueryHandler<{ id: string }, Person | null> = async (query) => {
  const [row] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, query.params.id), eq(persons.organizationId, query.orgId), isNull(persons.deletedAt)))
    .limit(1);
  return row ?? null;
};

export const listPersonsHandler: QueryHandler<ListParams, ListResult<Person>> = async (query) => {
  const { type, limit = 50, offset = 0 } = query.params;
  const conditions = [eq(persons.organizationId, query.orgId), isNull(persons.deletedAt)];
  if (type) conditions.push(eq(persons.type, type as Person["type"]));

  const [items, [c]] = await Promise.all([
    db.select().from(persons).where(and(...conditions)).orderBy(desc(persons.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(persons).where(and(...conditions)),
  ]);
  return { items, total: c?.value ?? 0 };
};

export const countPersonsHandler: QueryHandler<{ type?: string }, number> = async (query) => {
  const conditions = [eq(persons.organizationId, query.orgId), isNull(persons.deletedAt)];
  if (query.params.type) conditions.push(eq(persons.type, query.params.type as Person["type"]));
  const [c] = await db.select({ value: count() }).from(persons).where(and(...conditions));
  return c?.value ?? 0;
};

// --- parties ---------------------------------------------------------------

export const getPartyHandler: QueryHandler<{ id: string }, Party | null> = async (query) => {
  const [row] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, query.params.id), eq(parties.organizationId, query.orgId), isNull(parties.deletedAt)))
    .limit(1);
  return row ?? null;
};

export const listPartiesHandler: QueryHandler<ListParams, ListResult<Party>> = async (query) => {
  const { type, limit = 50, offset = 0 } = query.params;
  const conditions = [eq(parties.organizationId, query.orgId), isNull(parties.deletedAt)];
  if (type) conditions.push(eq(parties.type, type as Party["type"]));

  const [items, [c]] = await Promise.all([
    db.select().from(parties).where(and(...conditions)).orderBy(desc(parties.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(parties).where(and(...conditions)),
  ]);
  return { items, total: c?.value ?? 0 };
};

export const countPartiesHandler: QueryHandler<{ type?: string }, number> = async (query) => {
  const conditions = [eq(parties.organizationId, query.orgId), isNull(parties.deletedAt)];
  if (query.params.type) conditions.push(eq(parties.type, query.params.type as Party["type"]));
  const [c] = await db.select({ value: count() }).from(parties).where(and(...conditions));
  return c?.value ?? 0;
};
