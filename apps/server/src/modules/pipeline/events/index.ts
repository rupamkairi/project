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
    source: "pipeline",
  };
}

export const PipelineEvents = {
  created(pipelineId: string, entityType: string) {
    return ev("pipeline.created", pipelineId, "Pipeline", { entityType });
  },
  updated(pipelineId: string) {
    return ev("pipeline.updated", pipelineId, "Pipeline", {});
  },
  deleted(pipelineId: string) {
    return ev("pipeline.deleted", pipelineId, "Pipeline", {});
  },
  stageAdded(pipelineId: string, stageId: string) {
    return ev("pipeline.stage-added", pipelineId, "Pipeline", { stageId });
  },
  stageUpdated(pipelineId: string, stageId: string) {
    return ev("pipeline.stage-updated", pipelineId, "Pipeline", { stageId });
  },
  stageRemoved(pipelineId: string, stageId: string) {
    return ev("pipeline.stage-removed", pipelineId, "Pipeline", { stageId });
  },
};
