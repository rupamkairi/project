// Location Module — foundation master table: locations (cross-domain places)

import type { AppModule, BootRegistry } from "@core";
import { LocationSchema } from "./entities";
import { createLocationHandler, updateLocationHandler, deleteLocationHandler } from "./commands";
import { getLocationHandler, listLocationsHandler, countLocationsHandler } from "./queries";

export const LocationModule: AppModule = {
  manifest: {
    id: "location",
    version: "0.1.0",
    dependsOn: [],
    entities: [LocationSchema],
    idPrefixes: { Location: "loc_" },
    events: ["location.created", "location.updated", "location.deleted"],
    commands: ["location.create", "location.update", "location.delete"],
    queries: ["location.get", "location.list", "location.count"],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator, schemas } = registry;

    schemas.register(LocationSchema);

    mediator.registerCommand("location.create", createLocationHandler);
    mediator.registerCommand("location.update", updateLocationHandler);
    mediator.registerCommand("location.delete", deleteLocationHandler);

    mediator.registerQuery("location.get", getLocationHandler);
    mediator.registerQuery("location.list", listLocationsHandler);
    mediator.registerQuery("location.count", countLocationsHandler);
  },

  async shutdown(): Promise<void> {},
};
