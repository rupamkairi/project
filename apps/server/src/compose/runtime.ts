import { createMediator } from "../core/cqrs";
import { InMemoryEventBus } from "../core/event";
import type { BootRegistry } from "../core/module";
import { createRuleEngine } from "../core/rule";
import { createFSMEngine } from "../core/state";
import { createRealtimeGateway } from "../infra/realtime/gateway";
import { createQueue } from "../infra/queue/client";

type SchedulerMode = "real" | "noop";

function createLogger(scope: string) {
  const write =
    (method: "info" | "warn" | "error" | "debug") =>
    (message: string, meta?: Record<string, unknown>) => {
      const prefix = `[${scope}] ${message}`;
      if (meta && Object.keys(meta).length > 0) {
        console[method](prefix, meta);
        return;
      }

      console[method](prefix);
    };

  return {
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    debug: write("debug"),
  };
}

function createQueueAdapter(queueName: string) {
  const queue = createQueue(queueName);
  const priorityMap = {
    critical: 1,
    standard: 5,
    bulk: 10,
  } as const;

  return {
    async add(
      name: string,
      data: unknown,
      opts?: {
        delay?: number;
        attempts?: number;
        priority?: keyof typeof priorityMap;
      },
    ) {
      const job = await queue.add(name, data, {
        delay: opts?.delay,
        attempts: opts?.attempts,
        priority: opts?.priority
          ? priorityMap[opts.priority]
          : priorityMap.standard,
      });

      return {
        id: String(job.id),
        name: job.name,
        data: job.data,
        status: String(job.finishedOn ? "completed" : job.processedOn ? "active" : "waiting") as
          | "waiting"
          | "active"
          | "completed"
          | "failed"
          | "delayed",
        progress:
          typeof job.progress === "number"
            ? job.progress
            : Number(job.progress ?? 0),
        attemptsMade: job.attemptsMade ?? 0,
      };
    },

    async getJob(id: string) {
      const job = await queue.getJob(id);
      if (!job) {
        return null;
      }

      return {
        id: String(job.id),
        name: job.name,
        data: job.data,
        status: String(job.finishedOn ? "completed" : job.processedOn ? "active" : "waiting") as
          | "waiting"
          | "active"
          | "completed"
          | "failed"
          | "delayed",
        progress:
          typeof job.progress === "number"
            ? job.progress
            : Number(job.progress ?? 0),
        attemptsMade: job.attemptsMade ?? 0,
      };
    },
  };
}

function createSchedulerAdapter(queueName: string, mode: SchedulerMode) {
  if (mode === "noop") {
    return {
      async schedule(
        _cron: string,
        _name: string,
        _data: unknown,
        _opts?: { repeat?: { cron: string } },
      ) {},
      async cancel(_name: string) {},
    };
  }

  const queue = createQueue(queueName);

  return {
    async schedule(
      cron: string,
      name: string,
      data: unknown,
      _opts?: { repeat?: { cron: string } },
    ) {
      await queue.add(name, data, {
        jobId: name,
        repeat: { pattern: cron },
      });
    },

    async cancel(_name: string) {},
  };
}

function createRealtimeAdapter() {
  const gateway = createRealtimeGateway();

  return {
    gateway,
    adapter: {
      async broadcast(channel: string, event: string, payload: unknown) {
        gateway.publish(channel, { event, payload });
      },
      subscribe(clientId: string, channels: string[]) {
        gateway.subscribe(clientId, channels);
      },
      unsubscribe(clientId: string, channels: string[]) {
        gateway.unsubscribe(clientId, channels);
      },
    },
  };
}

export function createComposeHostRuntime(options: {
  composeId: string;
  schedulerMode: SchedulerMode;
}) {
  const logger = createLogger(`compose:${options.composeId}`);
  const eventBus = new InMemoryEventBus();
  const ruleEngine = createRuleEngine();
  const fsmEngine = createFSMEngine(ruleEngine);
  const mediator = createMediator();
  const { adapter: realtime, gateway } = createRealtimeAdapter();
  const queueName = `compose:${options.composeId}`;

  const runtime = {
    logger,
    eventBus,
    ruleEngine,
    fsmEngine,
    mediator,
    queue: createQueueAdapter(queueName),
    scheduler: createSchedulerAdapter(queueName, options.schedulerMode),
    realtime,
    realtimeGateway: gateway,
    db: {
      async query<T = unknown>(_sql: string, _params: unknown[]) {
        return [] as T[];
      },
      async execute(_sql: string, _params: unknown[]) {},
    },
  };

  const bootRegistry: Partial<BootRegistry> = {
    registerCommand(type, handler) {
      runtime.mediator.registerCommand(type, handler as never);
    },
    registerQuery(type, handler) {
      runtime.mediator.registerQuery(type, handler as never);
    },
    registerEventHandler(pattern, handler) {
      runtime.eventBus.subscribe(pattern, handler);
    },
    registerFSM(machine) {
      runtime.fsmEngine.register(machine);
    },
    registerEntity() {},
  };

  return { runtime, bootRegistry };
}
