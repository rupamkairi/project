import { generateId } from "@core";
import type { DomainEvent } from "@core";

function ev<T>(
  type: string,
  aggregateId: string,
  aggregateType: string,
  payload: T,
): Omit<DomainEvent<T>, "actorId" | "orgId" | "correlationId"> {
  return {
    id: generateId(),
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: Date.now(),
    version: 1,
    source: "location",
  };
}

export const LocationEvents = {
  created(locationId: string, type: string) {
    return ev("location.created", locationId, "Location", { type });
  },
  updated(locationId: string) {
    return ev("location.updated", locationId, "Location", {});
  },
  deleted(locationId: string) {
    return ev("location.deleted", locationId, "Location", {});
  },
};
