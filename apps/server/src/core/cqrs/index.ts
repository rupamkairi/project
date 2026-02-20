import type { ID } from "../entity";
import { generateId } from "../entity";

// Command and Query definitions
export interface Command<T = unknown> {
  type: string;
  payload: T;
  actorId: ID;
  orgId: ID;
  correlationId: ID;
  causedBy?: ID;
  idempotencyKey?: string;
}

export interface Query<T = unknown> {
  type: string;
  params: T;
  actorId: ID;
  orgId: ID;
}

// Handlers
export type CommandHandler<TCommand extends Command, TResult = unknown> = (
  command: TCommand,
  context: SystemContext,
) => Promise<TResult>;

export type QueryHandler<TQuery extends Query, TResult = unknown> = (
  query: TQuery,
  context: SystemContext,
) => Promise<TResult>;

// Forward declare SystemContext (will be implemented in context module)
export interface SystemContext {
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };
  org: { id: ID; slug: string; settings: Record<string, unknown> };
  correlationId: ID;
  requestId: ID;
  startedAt: number;
}

// Middleware
export type MediatorMiddleware = (
  request: Command | Query,
  ctx: SystemContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

// Mediator interface
export interface Mediator {
  dispatch<R = unknown>(cmd: Command): Promise<R>;
  query<R = unknown>(q: Query): Promise<R>;
  registerCommand(type: string, handler: CommandHandler<any>): void;
  registerQuery(type: string, handler: QueryHandler<any>): void;
  use(middleware: MediatorMiddleware): void;
}

// Idempotency cache entry
interface IdempotencyEntry {
  result: unknown;
  expiresAt: number;
}

// Mediator implementation with in-memory idempotency
export function createMediator(): Mediator {
  const commandHandlers = new Map<string, CommandHandler<any>>();
  const queryHandlers = new Map<string, QueryHandler<any>>();
  const middlewares: MediatorMiddleware[] = [];

  // In-memory idempotency cache with TTL
  const idempotencyCache = new Map<string, IdempotencyEntry>();
  const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Cleanup expired entries periodically
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of idempotencyCache) {
        if (entry.expiresAt < now) {
          idempotencyCache.delete(key);
        }
      }
    },
    60 * 60 * 1000,
  ); // Run every hour

  // Build middleware pipeline
  async function executeMiddleware(
    request: Command | Query,
    context: SystemContext,
    index: number,
  ): Promise<unknown> {
    if (index >= middlewares.length) {
      // Last middleware - execute handler
      if ("type" in request && "payload" in request) {
        // It's a command
        const handler = commandHandlers.get(request.type);
        if (!handler) {
          throw new Error(`No handler registered for command: ${request.type}`);
        }
        return handler(request, context);
      } else {
        // It's a query
        const handler = queryHandlers.get(request.type);
        if (!handler) {
          throw new Error(`No handler registered for query: ${request.type}`);
        }
        return handler(request, context);
      }
    }

    const middleware = middlewares[index];
    if (!middleware) {
      throw new Error(`Middleware at index ${index} not found`);
    }
    return middleware(request, context, () =>
      executeMiddleware(request, context, index + 1),
    );
  }

  return {
    async dispatch<R = unknown>(cmd: Command): Promise<R> {
      // Check idempotency
      if (cmd.idempotencyKey) {
        const key = `${cmd.type}:${cmd.idempotencyKey}`;
        const entry = idempotencyCache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
          return entry.result as R;
        }

        const result = (await executeMiddleware(
          cmd,
          {} as SystemContext,
          0,
        )) as R;

        // Cache result
        idempotencyCache.set(key, {
          result,
          expiresAt: Date.now() + IDEMPOTENCY_TTL,
        });

        return result;
      }

      return executeMiddleware(cmd, {} as SystemContext, 0) as R;
    },

    async query<R = unknown>(q: Query): Promise<R> {
      return executeMiddleware(q, {} as SystemContext, 0) as R;
    },

    registerCommand(type: string, handler: CommandHandler<any>): void {
      commandHandlers.set(type, handler);
    },

    registerQuery(type: string, handler: QueryHandler<any>): void {
      queryHandlers.set(type, handler);
    },

    use(middleware: MediatorMiddleware): void {
      middlewares.push(middleware);
    },
  };
}
