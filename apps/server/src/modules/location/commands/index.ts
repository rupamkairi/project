import type { CommandHandler } from "@core";
import { generateId } from "@core";
import { db } from "@db/client";
import { locations } from "@db/schema/location";
import type { Location } from "@db/schema/location";
import { eq, and, isNull } from "drizzle-orm";
import { LocationEvents } from "../events";

type LocationType = Location["type"];

export interface CreateLocationPayload {
  type: LocationType;
  name: string;
  code?: string;
  capacity?: number;
  parentId?: string;
  addressId?: string;
  status?: string;
}

export const createLocationHandler: CommandHandler<CreateLocationPayload, Location> = async (
  command,
  context,
) => {
  const p = command.payload;
  const now = new Date();
  const [row] = await db
    .insert(locations)
    .values({
      id: generateId(),
      organizationId: command.orgId,
      type: p.type,
      name: p.name,
      code: p.code ?? null,
      capacity: p.capacity ?? null,
      parentId: p.parentId ?? null,
      addressId: p.addressId ?? null,
      status: p.status ?? "active",
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
    })
    .returning();

  await context.publish(LocationEvents.created(row!.id, row!.type));
  return row!;
};

export interface UpdateLocationPayload extends Partial<CreateLocationPayload> {
  id: string;
}

export const updateLocationHandler: CommandHandler<UpdateLocationPayload, Location> = async (
  command,
  context,
) => {
  const { id, ...patch } = command.payload;
  const [row] = await db
    .update(locations)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(locations.id, id), eq(locations.organizationId, command.orgId), isNull(locations.deletedAt)))
    .returning();

  if (!row) throw new Error("Location not found");
  await context.publish(LocationEvents.updated(id));
  return row;
};

export const deleteLocationHandler: CommandHandler<{ id: string }, void> = async (
  command,
  context,
) => {
  const { id } = command.payload;
  await db
    .update(locations)
    .set({ deletedAt: new Date() })
    .where(and(eq(locations.id, id), eq(locations.organizationId, command.orgId)));
  await context.publish(LocationEvents.deleted(id));
};
