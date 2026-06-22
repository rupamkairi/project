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
    source: "commerce",
  };
}

export const CommerceEvents = {
  created(transactionId: string, type: string) {
    return ev("transaction.created", transactionId, "Transaction", { type });
  },
  updated(transactionId: string) {
    return ev("transaction.updated", transactionId, "Transaction", {});
  },
  deleted(transactionId: string) {
    return ev("transaction.deleted", transactionId, "Transaction", {});
  },
  stageChanged(transactionId: string, stageId: string) {
    return ev("transaction.stage-changed", transactionId, "Transaction", { stageId });
  },
};
