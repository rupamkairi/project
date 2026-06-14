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
    source: "identity",
  };
}

export const IdentityEvents = {
  actorRegistered(actorId: string, email: string) {
    return ev("actor.registered", actorId, "Actor", { email });
  },
  actorActivated(actorId: string) {
    return ev("actor.activated", actorId, "Actor", {});
  },
  actorLogin(actorId: string, sessionId: string) {
    return ev("actor.login", actorId, "Actor", { sessionId });
  },
  actorLogout(actorId: string, sessionId: string) {
    return ev("actor.logout", actorId, "Actor", { sessionId });
  },
  actorSuspended(actorId: string, suspendedBy: string) {
    return ev("actor.suspended", actorId, "Actor", { suspendedBy });
  },
  actorReactivated(actorId: string) {
    return ev("actor.reactivated", actorId, "Actor", {});
  },
  roleAssigned(actorId: string, roleId: string, assignedBy: string) {
    return ev("actor.role-assigned", actorId, "Actor", { roleId, assignedBy });
  },
  roleRevoked(actorId: string, roleId: string, revokedBy: string) {
    return ev("actor.role-revoked", actorId, "Actor", { roleId, revokedBy });
  },
  orgCreated(orgId: string, name: string) {
    return ev("org.created", orgId, "Organization", { name });
  },
  passwordChanged(actorId: string) {
    return ev("actor.password-changed", actorId, "Actor", {});
  },
};
