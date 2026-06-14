/**
 * CQRS (Command Query Responsibility Segregation)
 *
 * Mediator pattern implementation for CQRS with command/query handlers and middleware.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID } from "../entity";
import { generateId } from "../entity";
import type { SystemContext, Logger } from "../context";
import { AuthorizationError, ValidationError } from "../errors";

/**
 * Command interface for write operations.
 *
 * Commands represent intent to change state and are handled by exactly one handler.
 *
 * @example
 * ```typescript
 * const command: Command<CreateUserPayload> = {
 *   type: "user.create",
 *   payload: { email: "user@example.com", name: "John" },
 *   actorId: currentUserId,
 *   orgId: orgId,
 *   correlationId: correlationId
 * };
 * ```
 *
 * @category Core
 */
export interface Command<T = unknown> {
  /**
   * Command type (e.g., "user.create", "order.submit")
   */
  type: string;

  /**
   * Command payload containing operation data
   */
  payload: T;

  /**
   * ID of the actor issuing the command
   */
  actorId: ID;

  /**
   * Organization ID for multi-tenancy
   */
  orgId: ID;

  /**
   * Correlation ID for tracing command chains
   */
  correlationId: ID;

  /**
   * ID of the causing event (for event-driven commands)
   */
  causedBy?: ID;

  /**
   * Idempotency key for duplicate detection
   */
  idempotencyKey?: string;
}

/**
 * Query interface for read operations.
 *
 * Queries retrieve data without causing side effects.
 *
 * @example
 * ```typescript
 * const query: Query<GetUserParams> = {
 *   type: "user.get",
 *   params: { id: userId },
 *   actorId: currentUserId,
 *   orgId: orgId
 * };
 * ```
 *
 * @category Core
 */
export interface Query<T = unknown> {
  /**
   * Query type (e.g., "user.get", "order.list")
   */
  type: string;

  /**
   * Query parameters
   */
  params: T;

  /**
   * ID of the actor issuing the query
   */
  actorId: ID;

  /**
   * Organization ID for multi-tenancy
   */
  orgId: ID;
}

/**
 * Command handler function signature.
 *
 * @typeParam TPayload - Command payload type
 * @typeParam TResult - Return type
 *
 * @category Core
 */
// TODO: spec uses payload-typed generics (TPayload = unknown) instead of
// TCommand extends Command. Relaxed here — callers that typed TCommand as a
// full Command interface will still compile because Command<TPayload> satisfies
// the broader signature.
export type CommandHandler<TPayload = unknown, TResult = unknown> = (
  command: Command<TPayload>,
  context: SystemContext,
) => Promise<TResult>;

/**
 * Query handler function signature.
 *
 * @typeParam TPayload - Query params type
 * @typeParam TResult - Return type
 *
 * @category Core
 */
export type QueryHandler<TPayload = unknown, TResult = unknown> = (
  query: Query<TPayload>,
  context: SystemContext,
) => Promise<TResult>;

/**
 * Re-export SystemContext so that existing imports of
 * `SystemContext` from "../cqrs" continue to resolve.
 * The canonical definition lives in ../context.
 */
export type { SystemContext } from "../context";

/**
 * Mediator middleware function signature.
 *
 * Middleware can intercept and modify command/query execution.
 *
 * @example
 * ```typescript
 * const loggingMiddleware: MediatorMiddleware = async (request, ctx, next) => {
 *   console.log(`Executing ${request.type}`);
 *   const start = Date.now();
 *   const result = await next();
 *   console.log(`Completed in ${Date.now() - start}ms`);
 *   return result;
 * };
 * ```
 *
 * @category Core
 */
export type MediatorMiddleware = (
  request: Command | Query,
  ctx: SystemContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

/**
 * Mediator interface for dispatching commands and queries.
 *
 * Implements the mediator pattern to decouple senders from handlers.
 *
 * @example
 * ```typescript
 * const mediator = createMediator();
 *
 * // Register handler
 * mediator.registerCommand("user.create", async (command, ctx) => {
 *   const user = await createUser(command.payload);
 *   return user;
 * });
 *
 * // Dispatch command
 * const user = await mediator.dispatch({
 *   type: "user.create",
 *   payload: { email: "user@example.com" },
 *   actorId: currentUserId,
 *   orgId: orgId,
 *   correlationId: correlationId
 * });
 *
 * // Add middleware
 * mediator.use(loggingMiddleware);
 * mediator.use(authMiddleware);
 * ```
 *
 * @category Core
 */
export interface Mediator {
  /**
   * Dispatches a command to its handler.
   *
   * @typeParam R - Return type
   * @param cmd - Command to dispatch
   * @returns Handler result
   */
  dispatch<R = unknown>(cmd: Command): Promise<R>;

  /**
   * Sends a query to its handler.
   *
   * @typeParam R - Return type
   * @param q - Query to send
   * @returns Handler result
   */
  query<R = unknown>(q: Query): Promise<R>;

  /**
   * Registers a command handler.
   *
   * @param type - Command type
   * @param handler - Handler function
   */
  registerCommand(type: string, handler: CommandHandler<any>): void;

  /**
   * Registers a query handler.
   *
   * @param type - Query type
   * @param handler - Handler function
   */
  registerQuery(type: string, handler: QueryHandler<any>): void;

  /**
   * Adds middleware to the execution pipeline.
   *
   * @param middleware - Middleware function
   */
  use(middleware: MediatorMiddleware): void;
}

// ---------------------------------------------------------------------------
// Built-In Middleware Factories (C8 — shipped with Core)
// ---------------------------------------------------------------------------

/**
 * Authorization middleware factory.
 *
 * Calls the supplied `check` function before every command/query. Throws
 * `AuthorizationError` if the check returns `false`.
 *
 * @param check - Predicate that receives the request and context; return
 *   `true` to allow, `false` to deny.
 * @returns Middleware that enforces the authorization policy.
 *
 * @example
 * ```typescript
 * mediator.use(AuthorizationMiddleware((req, ctx) =>
 *   ctx.actor.roles.includes("admin"),
 * ));
 * ```
 *
 * @category Core
 */
export function AuthorizationMiddleware(
  check: (
    req: Command | Query,
    ctx: SystemContext,
  ) => boolean | Promise<boolean>,
): MediatorMiddleware {
  return async (request, ctx, next) => {
    const allowed = await check(request, ctx);
    if (!allowed) {
      throw new AuthorizationError(
        `Authorization denied for ${request.type}`,
        { type: request.type, actorId: request.actorId },
      );
    }
    return next();
  };
}

/**
 * Validation middleware factory.
 *
 * Runs a validator against every command/query. If any failures are returned,
 * throws `ValidationError` with those failures attached.
 *
 * @param validator - Function that returns an array of validation failures
 *   (empty array means valid).
 * @returns Middleware that enforces the validation policy.
 *
 * @example
 * ```typescript
 * mediator.use(ValidationMiddleware((req) => {
 *   if (!("payload" in req)) return [];
 *   const cmd = req as Command;
 *   if (!cmd.payload) return [{ field: "payload", message: "Required" }];
 *   return [];
 * }));
 * ```
 *
 * @category Core
 */
export function ValidationMiddleware(
  validator: (
    req: Command | Query,
  ) =>
    | Array<{ field: string; message: string }>
    | Promise<Array<{ field: string; message: string }>>,
): MediatorMiddleware {
  return async (request, _ctx, next) => {
    const failures = await validator(request);
    if (failures.length > 0) {
      throw new ValidationError(
        `Validation failed for ${request.type}`,
        failures,
        { type: request.type },
      );
    }
    return next();
  };
}

/**
 * Idempotency middleware factory.
 *
 * Deduplicates commands that carry the same `idempotencyKey` within the TTL
 * window. Subsequent dispatches with the same key return the cached result
 * without re-executing the handler.
 *
 * @param opts.ttl - Time-to-live in milliseconds (default: 24 hours).
 * @returns Middleware that enforces idempotency.
 *
 * @example
 * ```typescript
 * mediator.use(IdempotencyMiddleware({ ttl: 60_000 })); // 1 minute
 * ```
 *
 * @category Core
 */
export function IdempotencyMiddleware(opts?: { ttl?: number }): MediatorMiddleware {
  const ttl = opts?.ttl ?? 24 * 60 * 60 * 1000; // default 24 h
  const cache = new Map<string, { result: unknown; expiresAt: number }>();

  // Periodic cleanup — runs in the background every hour
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }, 60 * 60 * 1000);

  return async (request, _ctx, next) => {
    // Only Commands can carry an idempotency key
    const cmd = request as Command;
    if (!cmd.idempotencyKey) {
      return next();
    }

    const key = `${cmd.type}:${cmd.idempotencyKey}`;
    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.result;
    }

    const result = await next();
    cache.set(key, { result, expiresAt: Date.now() + ttl });
    return result;
  };
}

/**
 * Logging middleware factory.
 *
 * Logs the request type and execution duration (in ms) for every
 * command/query that passes through the mediator.
 *
 * @param logger - A `Logger` instance (from `../context`).
 * @returns Middleware that produces structured timing logs.
 *
 * @example
 * ```typescript
 * mediator.use(LoggingMiddleware(ctx.logger));
 * ```
 *
 * @category Core
 */
export function LoggingMiddleware(logger: Logger): MediatorMiddleware {
  return async (request, _ctx, next) => {
    const start = Date.now();
    try {
      const result = await next();
      logger.info(`[mediator] ${request.type} completed`, {
        type: request.type,
        durationMs: Date.now() - start,
      });
      return result;
    } catch (err) {
      logger.error(`[mediator] ${request.type} failed`, {
        type: request.type,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

/**
 * Tracing span entry stored in memory.
 *
 * @internal
 */
interface TraceSpan {
  requestId: string;
  correlationId: string | undefined;
  type: string;
  serviceName: string;
  startedAt: number;
  endedAt?: number;
}

/**
 * In-memory trace store used by `TracingMiddleware`.
 *
 * Useful for testing — inspect spans written by the middleware.
 *
 * @category Core
 */
export const tracingStore: TraceSpan[] = [];

/**
 * Tracing middleware factory.
 *
 * Attaches a `correlationId` + `requestId` to an in-memory trace span for
 * every command/query. No external dependencies — spans are written to the
 * exported `tracingStore` array and can be inspected in tests.
 *
 * @param opts.serviceName - Label for the service (default: "server").
 * @returns Middleware that records trace spans.
 *
 * @example
 * ```typescript
 * mediator.use(TracingMiddleware({ serviceName: "catalog" }));
 * ```
 *
 * @category Core
 */
export function TracingMiddleware(opts?: { serviceName?: string }): MediatorMiddleware {
  const serviceName = opts?.serviceName ?? "server";

  return async (request, _ctx, next) => {
    const requestId = generateId();
    const correlationId =
      "correlationId" in request
        ? (request as Command).correlationId
        : undefined;

    const span: TraceSpan = {
      requestId,
      correlationId,
      type: request.type,
      serviceName,
      startedAt: Date.now(),
    };

    tracingStore.push(span);

    try {
      const result = await next();
      span.endedAt = Date.now();
      return result;
    } catch (err) {
      span.endedAt = Date.now();
      throw err;
    }
  };
}

/**
 * Rate-limit window entry.
 *
 * @internal
 */
interface RateLimitWindow {
  count: number;
  resetAt: number;
}

/**
 * Rate-limit middleware factory.
 *
 * Enforces a per-actor, per-command-type request rate. Once `limit` requests
 * are made within `windowMs`, subsequent calls throw `AuthorizationError`
 * until the window resets.
 *
 * @param opts.limit - Maximum requests per actor per window.
 * @param opts.windowMs - Window duration in milliseconds.
 * @returns Middleware that enforces per-actor rate limits.
 *
 * @example
 * ```typescript
 * mediator.use(RateLimitMiddleware({ limit: 100, windowMs: 60_000 }));
 * ```
 *
 * @category Core
 */
export function RateLimitMiddleware(opts: {
  limit: number;
  windowMs: number;
}): MediatorMiddleware {
  const { limit, windowMs } = opts;
  // Key: `actorId:type` → window entry
  const windows = new Map<string, RateLimitWindow>();

  return async (request, _ctx, next) => {
    const key = `${request.actorId}:${request.type}`;
    const now = Date.now();

    let window = windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(key, window);
    }

    window.count += 1;

    if (window.count > limit) {
      throw new AuthorizationError(
        `Rate limit exceeded for ${request.type}`,
        {
          type: request.type,
          actorId: request.actorId,
          limit,
          windowMs,
          resetAt: window.resetAt,
        },
      );
    }

    return next();
  };
}

/**
 * Options for createMediator.
 *
 * @category Core
 */
export interface MediatorOptions {
  /**
   * Factory that builds a SystemContext for each incoming request.
   *
   * Must be wired at module boot. If omitted, dispatch/query will throw a
   * clear error on the first call so mis-wiring fails loudly.
   */
  contextFactory?: (request: Command | Query) => SystemContext;
}

/**
 * Creates an in-memory mediator.
 *
 * Idempotency is now handled by the standalone `IdempotencyMiddleware` factory.
 * Wire it in via `mediator.use(IdempotencyMiddleware())` if you need dedup.
 *
 * @param options - Optional mediator configuration (contextFactory)
 * @returns Mediator instance
 *
 * @remarks
 * Features:
 * - Command/query handler registration
 * - Middleware pipeline execution
 * - contextFactory-driven SystemContext (no more `{} as SystemContext`)
 *
 * @category Core
 */
export function createMediator(options?: MediatorOptions): Mediator {
  const commandHandlers = new Map<string, CommandHandler<any>>();
  const queryHandlers = new Map<string, QueryHandler<any>>();
  const middlewares: MediatorMiddleware[] = [];

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

  function buildContext(request: Command | Query): SystemContext {
    if (!options?.contextFactory) {
      throw new Error(
        "Mediator: contextFactory not configured (wire it at module boot)",
      );
    }
    return options.contextFactory(request);
  }

  return {
    async dispatch<R = unknown>(cmd: Command): Promise<R> {
      return executeMiddleware(cmd, buildContext(cmd), 0) as R;
    },

    async query<R = unknown>(q: Query): Promise<R> {
      return executeMiddleware(q, buildContext(q), 0) as R;
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
