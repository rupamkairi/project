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
    source: "party",
  };
}

export const PartyEvents = {
  personCreated(personId: string, type: string) {
    return ev("person.created", personId, "Person", { type });
  },
  personUpdated(personId: string) {
    return ev("person.updated", personId, "Person", {});
  },
  personDeleted(personId: string) {
    return ev("person.deleted", personId, "Person", {});
  },
  partyCreated(partyId: string, type: string) {
    return ev("party.created", partyId, "Party", { type });
  },
  partyUpdated(partyId: string) {
    return ev("party.updated", partyId, "Party", {});
  },
  partyDeleted(partyId: string) {
    return ev("party.deleted", partyId, "Party", {});
  },
};
