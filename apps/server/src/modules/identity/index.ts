import type { AppModule, BootRegistry } from "@core";
import {
  OrganizationSchema,
  ActorSchema,
  RoleSchema,
  SessionSchema,
  ApiKeySchema,
} from "./entities";
import { ActorFSM } from "./fsm";
import {
  loginHandler,
  logoutHandler,
  registerHandler,
  activateHandler,
  suspendActorHandler,
  activateActorHandler,
  assignRoleHandler,
  revokeRoleHandler,
  createOrgHandler,
} from "./commands";
import {
  getActorHandler,
  listActorsHandler,
  getSessionHandler,
  resolveSessionHandler,
  resolveAPIKeyHandler,
  getPermissionsHandler,
  hasPermissionHandler,
  listRolesHandler,
} from "./queries";
import { purgeExpiredSessionsJob } from "./jobs";

export const IdentityModule: AppModule = {
  manifest: {
    id: "identity",
    version: "0.2.0",
    dependsOn: [],
    entities: [OrganizationSchema, ActorSchema, RoleSchema, SessionSchema, ApiKeySchema],
    idPrefixes: {
      Organization: "org_",
      Actor: "act_",
      Role: "rol_",
      Session: "ses_",
      ApiKey: "key_",
    },
    events: [
      "actor.registered",
      "actor.activated",
      "actor.login",
      "actor.logout",
      "actor.suspended",
      "actor.reactivated",
      "actor.role-assigned",
      "actor.role-revoked",
      "actor.password-changed",
      "org.created",
    ],
    commands: [
      "identity.login",
      "identity.logout",
      "identity.register",
      "identity.activate",
      "identity.suspendActor",
      "identity.activateActor",
      "identity.assignRole",
      "identity.revokeRole",
      "identity.createOrg",
    ],
    queries: [
      "identity.getActor",
      "identity.listActors",
      "identity.getSession",
      "identity.resolveSession",
      "identity.resolveAPIKey",
      "identity.getPermissions",
      "identity.hasPermission",
      "identity.listRoles",
    ],
    fsms: ["actor:lifecycle"],
    migrations: [],
    scheduledJobs: [
      { name: "identity.purge-expired-sessions", cron: "0 0 * * *" },
    ],
  },

  async boot(registry: BootRegistry): Promise<void> {
    const { mediator, schemas, fsms, scheduler } = registry;

    // entities
    schemas.register(OrganizationSchema);
    schemas.register(ActorSchema);
    schemas.register(RoleSchema);
    schemas.register(SessionSchema);
    schemas.register(ApiKeySchema);

    // fsms
    fsms.register(ActorFSM);

    // commands
    mediator.registerCommand("identity.login", loginHandler);
    mediator.registerCommand("identity.logout", logoutHandler);
    mediator.registerCommand("identity.register", registerHandler);
    mediator.registerCommand("identity.activate", activateHandler);
    mediator.registerCommand("identity.suspendActor", suspendActorHandler);
    mediator.registerCommand("identity.activateActor", activateActorHandler);
    mediator.registerCommand("identity.assignRole", assignRoleHandler);
    mediator.registerCommand("identity.revokeRole", revokeRoleHandler);
    mediator.registerCommand("identity.createOrg", createOrgHandler);

    // queries
    mediator.registerQuery("identity.getActor", getActorHandler);
    mediator.registerQuery("identity.listActors", listActorsHandler);
    mediator.registerQuery("identity.getSession", getSessionHandler);
    mediator.registerQuery("identity.resolveSession", resolveSessionHandler);
    mediator.registerQuery("identity.resolveAPIKey", resolveAPIKeyHandler);
    mediator.registerQuery("identity.getPermissions", getPermissionsHandler);
    mediator.registerQuery("identity.hasPermission", hasPermissionHandler);
    mediator.registerQuery("identity.listRoles", listRolesHandler);

    // jobs
    scheduler.define(
      "identity.purge-expired-sessions",
      "0 0 * * *",
      purgeExpiredSessionsJob,
    );
  },

  async shutdown(): Promise<void> {},
};
