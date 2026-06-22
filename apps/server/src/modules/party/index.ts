// Party Module — foundation master tables: persons, parties

import type { AppModule, BootRegistry } from "@core";
import { PersonSchema, PartySchema } from "./entities";
import {
  createPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
  createPartyHandler,
  updatePartyHandler,
  deletePartyHandler,
} from "./commands";
import {
  getPersonHandler,
  listPersonsHandler,
  countPersonsHandler,
  getPartyHandler,
  listPartiesHandler,
  countPartiesHandler,
} from "./queries";

export const PartyModule: AppModule = {
  manifest: {
    id: "party",
    version: "0.1.0",
    dependsOn: [],
    entities: [PersonSchema, PartySchema],
    idPrefixes: { Person: "per_", Party: "pty_" },
    events: [
      "person.created",
      "person.updated",
      "person.deleted",
      "party.created",
      "party.updated",
      "party.deleted",
    ],
    commands: [
      "party.createPerson",
      "party.updatePerson",
      "party.deletePerson",
      "party.createParty",
      "party.updateParty",
      "party.deleteParty",
    ],
    queries: [
      "party.getPerson",
      "party.listPersons",
      "party.countPersons",
      "party.getParty",
      "party.listParties",
      "party.countParties",
    ],
    fsms: [],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator, schemas } = registry;

    schemas.register(PersonSchema);
    schemas.register(PartySchema);

    mediator.registerCommand("party.createPerson", createPersonHandler);
    mediator.registerCommand("party.updatePerson", updatePersonHandler);
    mediator.registerCommand("party.deletePerson", deletePersonHandler);
    mediator.registerCommand("party.createParty", createPartyHandler);
    mediator.registerCommand("party.updateParty", updatePartyHandler);
    mediator.registerCommand("party.deleteParty", deletePartyHandler);

    mediator.registerQuery("party.getPerson", getPersonHandler);
    mediator.registerQuery("party.listPersons", listPersonsHandler);
    mediator.registerQuery("party.countPersons", countPersonsHandler);
    mediator.registerQuery("party.getParty", getPartyHandler);
    mediator.registerQuery("party.listParties", listPartiesHandler);
    mediator.registerQuery("party.countParties", countPartiesHandler);
  },

  async shutdown(): Promise<void> {},
};
