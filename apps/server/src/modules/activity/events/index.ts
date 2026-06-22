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
    source: "activity",
  };
}

export const ActivityEvents = {
  logged(activityId: string, type: string) {
    return ev("activity.logged", activityId, "Activity", { type });
  },
  updated(activityId: string) {
    return ev("activity.updated", activityId, "Activity", {});
  },
  completed(activityId: string) {
    return ev("activity.completed", activityId, "Activity", {});
  },
  cancelled(activityId: string) {
    return ev("activity.cancelled", activityId, "Activity", {});
  },
  deleted(activityId: string) {
    return ev("activity.deleted", activityId, "Activity", {});
  },
};
