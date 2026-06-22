// Activity Module — foundation master table: activities (interaction log).

import type { AppModule, BootRegistry } from "@core";
import { ActivitySchema } from "./entities";
import {
  logActivityHandler,
  updateActivityHandler,
  completeActivityHandler,
  cancelActivityHandler,
  deleteActivityHandler,
} from "./commands";
import { getActivityHandler, listActivitiesHandler, countActivitiesHandler } from "./queries";

export const ActivityModule: AppModule = {
  manifest: {
    id: "activity",
    version: "0.1.0",
    dependsOn: [],
    entities: [ActivitySchema],
    idPrefixes: { Activity: "act_" },
    events: [
      "activity.logged",
      "activity.updated",
      "activity.completed",
      "activity.cancelled",
      "activity.deleted",
    ],
    commands: [
      "activity.log",
      "activity.update",
      "activity.complete",
      "activity.cancel",
      "activity.delete",
    ],
    queries: ["activity.get", "activity.list", "activity.count"],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator, schemas } = registry;

    schemas.register(ActivitySchema);

    mediator.registerCommand("activity.log", logActivityHandler);
    mediator.registerCommand("activity.update", updateActivityHandler);
    mediator.registerCommand("activity.complete", completeActivityHandler);
    mediator.registerCommand("activity.cancel", cancelActivityHandler);
    mediator.registerCommand("activity.delete", deleteActivityHandler);

    mediator.registerQuery("activity.get", getActivityHandler);
    mediator.registerQuery("activity.list", listActivitiesHandler);
    mediator.registerQuery("activity.count", countActivitiesHandler);
  },

  async shutdown(): Promise<void> {},
};
