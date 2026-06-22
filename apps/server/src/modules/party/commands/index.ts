import type { CommandHandler } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { persons, parties } from "@db/schema/party";
import type { Person, Party } from "@db/schema/party";
import { eq, and, isNull } from "drizzle-orm";
import { PartyEvents } from "../events";

type PersonType = Person["type"];
type PartyType = Party["type"];

// --- persons ---------------------------------------------------------------

export interface CreatePersonPayload {
  type?: PersonType;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  partyId?: string;
  actorId?: string;
}

export const createPersonHandler: CommandHandler<CreatePersonPayload, Person> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const [row] = await db
    .insert(persons)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      type: p.type ?? "contact",
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      source: p.source ?? null,
      partyId: p.partyId ?? null,
      actorId: p.actorId ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning();

  await context.publish(PartyEvents.personCreated(row!.id, row!.type));
  return row!;
};

export interface UpdatePersonPayload extends Partial<CreatePersonPayload> {
  id: string;
}

export const updatePersonHandler: CommandHandler<UpdatePersonPayload, Person> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(persons)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(persons.id, id), eq(persons.organizationId, command.orgId), isNull(persons.deletedAt)))
    .returning();

  if (!row) throw new Error("Person not found");
  await context.publish(PartyEvents.personUpdated(id));
  return row;
};

export interface DeletePersonPayload {
  id: string;
}

export const deletePersonHandler: CommandHandler<DeletePersonPayload, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  await db
    .update(persons)
    .set({ deletedAt: new Date() })
    .where(and(eq(persons.id, id), eq(persons.organizationId, command.orgId)));
  await context.publish(PartyEvents.personDeleted(id));
};

// --- parties ---------------------------------------------------------------

export interface CreatePartyPayload {
  type?: PartyType;
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
}

export const createPartyHandler: CommandHandler<CreatePartyPayload, Party> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const [row] = await db
    .insert(parties)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      type: p.type ?? "company",
      name: p.name,
      domain: p.domain ?? null,
      industry: p.industry ?? null,
      employeeCount: p.employeeCount ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning();

  await context.publish(PartyEvents.partyCreated(row!.id, row!.type));
  return row!;
};

export interface UpdatePartyPayload extends Partial<CreatePartyPayload> {
  id: string;
}

export const updatePartyHandler: CommandHandler<UpdatePartyPayload, Party> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(parties)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(parties.id, id), eq(parties.organizationId, command.orgId), isNull(parties.deletedAt)))
    .returning();

  if (!row) throw new Error("Party not found");
  await context.publish(PartyEvents.partyUpdated(id));
  return row;
};

export interface DeletePartyPayload {
  id: string;
}

export const deletePartyHandler: CommandHandler<DeletePartyPayload, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  await db
    .update(parties)
    .set({ deletedAt: new Date() })
    .where(and(eq(parties.id, id), eq(parties.organizationId, command.orgId)));
  await context.publish(PartyEvents.partyDeleted(id));
};
