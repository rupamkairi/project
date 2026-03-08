import type Elysia from "elysia";
import type { Command, Query } from "../core/cqrs";
import { env } from "../infra/env";
import { createComposeHostRuntime } from "./runtime";

type ComposeRouteContext = {
  actor: {
    id: string;
    type: "user" | "system" | "api-key";
    roles: string[];
    permissions: string[];
  };
  org: {
    id: string;
  };
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string>;
};

type ComposeRouteResult<T = unknown> = {
  status: number;
  body: T;
  headers?: Record<string, string>;
};

type ComposeRouteDefinition = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  handler: (ctx: ComposeRouteContext) => Promise<ComposeRouteResult>;
  middleware: Array<
    (
      ctx: ComposeRouteContext,
      next: () => Promise<ComposeRouteResult>,
    ) => Promise<ComposeRouteResult>
  >;
};

type ComposePluginContext = {
  eventBus: unknown;
  fsmEngine: unknown;
  ruleEngine: unknown;
  queue: unknown;
  scheduler: unknown;
  realtime: unknown;
  db: unknown;
  logger: unknown;
  dispatch: <R = unknown>(command: Command) => Promise<R>;
  query: <R = unknown>(query: Query) => Promise<R>;
  config: {
    features: {
      enableCertificates: boolean;
      enableCohorts: boolean;
      enableLiveSessions: boolean;
      enableQuizzes: boolean;
      enablePeerReview: boolean;
    };
    defaults: {
      completionThreshold: number;
      refundWindowDays: number;
      inactivityNudgeDays: number;
      sessionReminderMinutes: number[];
      maxQuizAttempts: number;
      certificateExpiresAfterDays: number | null;
    };
    adapters: Record<string, unknown>;
  };
};

type ActiveComposePlugin = {
  init(context: ComposePluginContext): Promise<void>;
  getRoutes(): ComposeRouteDefinition[];
  getJobs(): Array<{ id: string; cron: string }>;
  getManifest(): unknown;
};

const composeModuleNames = {
  lms: "@projectx/compose-lms",
} as const;

type ComposeId = keyof typeof composeModuleNames;

function resolveActiveComposeId(): ComposeId {
  return env.ACTIVE_COMPOSE === "lms" ? env.ACTIVE_COMPOSE : "lms";
}

function splitHeaderValue(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createRouteContext(input: {
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
}): ComposeRouteContext {
  const actorId = input.headers["x-actor-id"];
  const orgId = input.headers["x-org-id"] ?? "system";

  return {
    actor: actorId
      ? {
          id: actorId,
          type: "user",
          roles: splitHeaderValue(input.headers["x-roles"]),
          permissions: splitHeaderValue(input.headers["x-permissions"]),
        }
      : {
          id: "system",
          type: "system",
          roles: [],
          permissions: [],
        },
    org: {
      id: orgId,
    },
    params: input.params,
    query: input.query,
    body: input.body,
    headers: Object.fromEntries(
      Object.entries(input.headers).filter(([, value]) => value !== undefined),
    ) as Record<string, string>,
  };
}

async function runRoute(
  route: ComposeRouteDefinition,
  ctx: ComposeRouteContext,
  index = 0,
): Promise<{ status: number; body: unknown; headers?: Record<string, string> }> {
  if (index >= route.middleware.length) {
    return route.handler(ctx);
  }

  return route.middleware[index]!(ctx, () => runRoute(route, ctx, index + 1));
}

function applyRoute(app: any, route: ComposeRouteDefinition) {
  const method = route.method.toLowerCase() as
    | "get"
    | "post"
    | "patch"
    | "put"
    | "delete";

  const routeHandler = async ({
    body,
    headers,
    params,
    query,
    set,
  }: {
    body: unknown;
    headers: Record<string, string | undefined>;
    params: Record<string, string>;
    query: unknown;
    set: { status: number; headers: Record<string, string> };
  }) => {
    const result = await runRoute(
      route,
      createRouteContext({
        body,
        headers,
        params,
        query: query as Record<string, unknown>,
      }),
    );

    set.status = result.status;

    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        set.headers[key] = value;
      }
    }

    return result.body;
  };

  return (app[method] as any).call(app, route.path, routeHandler);
}

export function mountComposeRoutes(app: any, routes: ComposeRouteDefinition[]) {
  return routes.reduce((currentApp, route) => applyRoute(currentApp, route), app);
}

export async function prepareActiveCompose(options?: {
  schedulerMode?: "real" | "noop";
}) {
  const activeComposeId = resolveActiveComposeId();
  const composeModuleName = composeModuleNames[activeComposeId];
  const composeModule = (await import(composeModuleName)) as {
    createLMSPlugin: () => ActiveComposePlugin;
  };
  const plugin = composeModule.createLMSPlugin();
  const { runtime, bootRegistry } = createComposeHostRuntime({
    composeId: activeComposeId,
    schedulerMode: options?.schedulerMode ?? "noop",
  });

  const context: ComposePluginContext = {
    eventBus: runtime.eventBus as unknown,
    fsmEngine: runtime.fsmEngine as unknown,
    ruleEngine: runtime.ruleEngine as unknown,
    queue: runtime.queue as unknown,
    scheduler: runtime.scheduler as unknown,
    realtime: runtime.realtime as unknown,
    db: runtime.db as unknown,
    logger: runtime.logger as unknown,
    dispatch: <R = unknown>(command: Command) => runtime.mediator.dispatch<R>(command),
    query: <R = unknown>(query: Query) => runtime.mediator.query<R>(query),
    config: {
      features: {
        enableCertificates: true,
        enableCohorts: true,
        enableLiveSessions: true,
        enableQuizzes: true,
        enablePeerReview: false,
      },
      defaults: {
        completionThreshold: 80,
        refundWindowDays: 14,
        inactivityNudgeDays: 7,
        sessionReminderMinutes: [1440, 30],
        maxQuizAttempts: 3,
        certificateExpiresAfterDays: null,
      },
      adapters: {},
    },
  };

  return {
    activeComposeId,
    bootRegistry,
    runtime,
    plugin,
    async initialize() {
      await plugin.init(context);

      return {
        routes: plugin.getRoutes(),
        jobs: plugin.getJobs(),
        manifest: plugin.getManifest(),
      };
    },
  };
}

export type { ComposeId };
