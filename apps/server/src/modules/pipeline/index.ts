// Pipeline Module — foundation master tables: pipelines, pipeline_stages.
// Stages are stored here; transitions are enforced by the Core FSM primitive.
// Composes seed their own pipelines + register the matching FSM definitions.

import type { AppModule, BootRegistry } from "@core";
import { PipelineSchema, PipelineStageSchema } from "./entities";
import {
  createPipelineHandler,
  updatePipelineHandler,
  deletePipelineHandler,
  addStageHandler,
  updateStageHandler,
  removeStageHandler,
  reorderStagesHandler,
} from "./commands";
import {
  getPipelineHandler,
  listPipelinesHandler,
  countPipelinesHandler,
  getStagesHandler,
} from "./queries";

export const PipelineModule: AppModule = {
  manifest: {
    id: "pipeline",
    version: "0.1.0",
    dependsOn: [],
    entities: [PipelineSchema, PipelineStageSchema],
    idPrefixes: { Pipeline: "ppl_", PipelineStage: "pps_" },
    events: [
      "pipeline.created",
      "pipeline.updated",
      "pipeline.deleted",
      "pipeline.stage-added",
      "pipeline.stage-updated",
      "pipeline.stage-removed",
    ],
    commands: [
      "pipeline.create",
      "pipeline.update",
      "pipeline.delete",
      "pipeline.addStage",
      "pipeline.updateStage",
      "pipeline.removeStage",
      "pipeline.reorderStages",
    ],
    queries: ["pipeline.get", "pipeline.list", "pipeline.count", "pipeline.getStages"],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator, schemas } = registry;

    schemas.register(PipelineSchema);
    schemas.register(PipelineStageSchema);

    mediator.registerCommand("pipeline.create", createPipelineHandler);
    mediator.registerCommand("pipeline.update", updatePipelineHandler);
    mediator.registerCommand("pipeline.delete", deletePipelineHandler);
    mediator.registerCommand("pipeline.addStage", addStageHandler);
    mediator.registerCommand("pipeline.updateStage", updateStageHandler);
    mediator.registerCommand("pipeline.removeStage", removeStageHandler);
    mediator.registerCommand("pipeline.reorderStages", reorderStagesHandler);

    mediator.registerQuery("pipeline.get", getPipelineHandler);
    mediator.registerQuery("pipeline.list", listPipelinesHandler);
    mediator.registerQuery("pipeline.count", countPipelinesHandler);
    mediator.registerQuery("pipeline.getStages", getStagesHandler);
  },

  async shutdown(): Promise<void> {},
};
