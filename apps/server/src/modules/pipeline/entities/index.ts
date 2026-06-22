import type { EntitySchema } from "@core";

export const PipelineSchema: EntitySchema = {
  name: "Pipeline",
  namespace: "pipeline",
  idPrefix: "ppl_",
  fields: [
    { key: "entityType", type: "string", required: true },
    { key: "name", type: "string", required: true },
    { key: "isDefault", type: "boolean", default: false },
  ],
};

export const PipelineStageSchema: EntitySchema = {
  name: "PipelineStage",
  namespace: "pipeline",
  idPrefix: "pps_",
  fields: [
    { key: "pipelineId", type: "ref", refEntity: "Pipeline", required: true },
    { key: "name", type: "string", required: true },
    { key: "position", type: "number", default: 0 },
  ],
};
