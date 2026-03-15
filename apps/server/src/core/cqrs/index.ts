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
 * @typeParam TCommand - Command type
 * @typeParam TResult - Return type
 *
 * @category Core
 */
export type CommandHandler<TCommand extends Command, TResult = unknown> = (
  command: TCommand,
  context: SystemContext,
) => Promise<TResult>;

/**
 * Query handler function signature.
 *
 * @typeParam TQuery - Query type
 * @typeParam TResult - Return type
 *
 * @category Core
 */
export type QueryHandler<TQuery extends Query, TResult = unknown> = (
  query: TQuery,
  context: SystemContext,
) => Promise<TResult>;

/**
 * System context for command/query execution.
 *
 * Provides access to actor, organization, and runtime information.
 *
 * @category Core
 */
export interface SystemContext {
  /**
   * Current actor information
   */
  actor: {
    id: ID;
    roles: string[];
    orgId: ID;
    type: "human" | "system" | "api_key";
  };

  /**
   * Organization information
   */
  org: { id: ID; slug: string; settings: Record<string, unknown> };

  /**
   * Correlation ID for tracing
   */
  correlationId: ID;

  /**
   * Request ID for this specific operation
   */
  requestId: ID;

  /**
   * Timestamp when execution started
   */
  startedAt: number;
}

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

/**
 * Idempotency cache entry.
 *
 * @internal
 */
interface IdempotencyEntry {
  result: unknown;
  expiresAt: number;
}

/**
 * Creates an in-memory mediator with idempotency support.
 *
 * @returns Mediator instance
 *
 * @remarks
 * Features:
 * - Command/query handler registration
 * - Middleware pipeline execution
 * - Idempotency caching (24 hour TTL)
 * - Automatic cache cleanup
 *
 * @category Core
 */
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
