// Compose Hook System - Event handlers for compose-level orchestration

import type { DomainEvent } from "../event";
import type { ID, Timestamp } from "../entity";
import type { ComposeDefinition } from "./types";

// ============================================================================
// Hook Context
// ============================================================================

/**
 * Context passed to hook handlers - provides access to compose services
 */
export interface HookContext {
  composeId: string;
  compose: ComposeDefinition;
  actorId?: ID;
  orgId: ID;
  correlationId: ID;
  requestId: ID;
  startedAt: Timestamp;

  // Service helpers
  dispatch(action: string, payload: unknown): Promise<unknown>;
  query(query: string, params: unknown): Promise<unknown>;
  emit(event: Omit<DomainEvent, "id" | "occurredAt">): Promise<void>;
}

// ============================================================================
// Hook Handler
// ============================================================================

/**
 * Async handler function for compose hooks
 */
export type HookHandler<T = unknown> = (
  event: DomainEvent<T>,
  context: HookContext,
) => Promise<void> | void;

/**
 * Filter function to determine if a hook should run
 */
export type HookFilter = (event: DomainEvent, context: HookContext) => boolean;

// ============================================================================
// Hook Definition
// ============================================================================

/**
 * A registered hook in the system
 */
export interface ComposeHook {
  id: string;
  composeId: string;
  eventPattern: string; // e.g., "order.placed", "payment.*", "**"
  filter?: HookFilter;
  handler: HookHandler;
  priority?: number; // lower = higher priority, default 100
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a hook
 */
export interface CreateHookOptions {
  id?: string;
  composeId: string;
  eventPattern: string;
  filter?: Record<string, unknown>; // static filter config
  handler: HookHandler;
  priority?: number;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Hook Registry
// ============================================================================

/**
 * Hook Registry - manages hooks for a compose
 */
export class HookRegistry {
  private hooks: Map<string, ComposeHook> = new Map();
  private eventIndex: Map<string, Set<string>> = new Map(); // pattern -> hookIds
  private composeHooks: Map<string, Set<string>> = new Map(); // composeId -> hookIds

  /**
   * Register a new hook
   */
  register(options: CreateHookOptions): ComposeHook {
    const hook: ComposeHook = {
      id: options.id ?? this.generateHookId(),
      composeId: options.composeId,
      eventPattern: options.eventPattern,
      filter: options.filter ? this.compileFilter(options.filter) : undefined,
      handler: options.handler,
      priority: options.priority ?? 100,
      enabled: options.enabled ?? true,
      metadata: options.metadata,
    };

    this.hooks.set(hook.id, hook);
    this.indexHook(hook);
    this.addToComposeIndex(hook);

    return hook;
  }

  /**
   * Unregister a hook by ID
   */
  unregister(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    this.removeFromIndex(hook);
    this.removeFromComposeIndex(hook);
    this.hooks.delete(hookId);

    return true;
  }

  /**
   * Get a hook by ID
   */
  get(hookId: string): ComposeHook | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * Get all hooks for a specific compose
   */
  getByCompose(composeId: string): ComposeHook[] {
    const hookIds = this.composeHooks.get(composeId);
    if (!hookIds) return [];

    return Array.from(hookIds)
      .map((id) => this.hooks.get(id))
      .filter((h): h is ComposeHook => h !== undefined);
  }

  /**
   * Find hooks matching an event type
   */
  findMatchingHooks(event: DomainEvent): ComposeHook[] {
    const matchingHooks: ComposeHook[] = [];
    const eventType = event.type;

    // Find hooks by exact match and wildcards
    for (const [pattern, hookIds] of this.eventIndex) {
      if (this.matchesPattern(eventType, pattern)) {
        for (const hookId of hookIds) {
          const hook = this.hooks.get(hookId);
          if (hook && hook.enabled) {
            // Check filter if exists
            if (hook.filter) {
              const context: HookContext = {
                composeId: hook.composeId,
                compose: {} as ComposeDefinition,
                actorId: event.actorId,
                orgId: event.orgId,
                correlationId: event.correlationId,
                requestId: event.id,
                startedAt: event.occurredAt,
                dispatch: async () => ({}),
                query: async () => ({}),
                emit: async () => {},
              };

              if (hook.filter(event, context)) {
                matchingHooks.push(hook);
              }
            } else {
              matchingHooks.push(hook);
            }
          }
        }
      }
    }

    // Sort by priority
    return matchingHooks.sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );
  }

  /**
   * Execute all matching hooks for an event
   */
  async executeHooks(event: DomainEvent, context: HookContext): Promise<void> {
    const hooks = this.findMatchingHooks(event);

    for (const hook of hooks) {
      try {
        const hookContext: HookContext = {
          ...context,
          composeId: hook.composeId,
        };
        await hook.handler(event, hookContext);
      } catch (error) {
        // Log error but continue with other hooks
        console.error(`Hook ${hook.id} failed:`, error);
        // Could emit an error event here
      }
    }
  }

  /**
   * Enable or disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    hook.enabled = enabled;
    return true;
  }

  /**
   * Get all registered hooks
   */
  getAll(): ComposeHook[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Clear all hooks for a compose
   */
  clearCompose(composeId: string): void {
    const hooks = this.getByCompose(composeId);
    for (const hook of hooks) {
      this.unregister(hook.id);
    }
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  private generateHookId(): string {
    return `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private indexHook(hook: ComposeHook): void {
    const patterns = this.expandPattern(hook.eventPattern);
    for (const pattern of patterns) {
      let hookIds = this.eventIndex.get(pattern);
      if (!hookIds) {
        hookIds = new Set();
        this.eventIndex.set(pattern, hookIds);
      }
      hookIds.add(hook.id);
    }
  }

  private removeFromIndex(hook: ComposeHook): void {
    const patterns = this.expandPattern(hook.eventPattern);
    for (const pattern of patterns) {
      const hookIds = this.eventIndex.get(pattern);
      if (hookIds) {
        hookIds.delete(hook.id);
        if (hookIds.size === 0) {
          this.eventIndex.delete(pattern);
        }
      }
    }
  }

  private addToComposeIndex(hook: ComposeHook): void {
    let hookIds = this.composeHooks.get(hook.composeId);
    if (!hookIds) {
      hookIds = new Set();
      this.composeHooks.set(hook.composeId, hookIds);
    }
    hookIds.add(hook.id);
  }

  private removeFromComposeIndex(hook: ComposeHook): void {
    const hookIds = this.composeHooks.get(hook.composeId);
    if (hookIds) {
      hookIds.delete(hook.id);
      if (hookIds.size === 0) {
        this.composeHooks.delete(hook.composeId);
      }
    }
  }

  private expandPattern(pattern: string): string[] {
    // Expand pattern into more specific patterns for indexing
    const parts = pattern.split(".");
    const patterns: string[] = [pattern];

    // Add wildcard variations
    for (let i = 0; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join(".");
      if (prefix) {
        patterns.push(`${prefix}.*`);
        patterns.push(`${prefix}.**`);
      }
    }

    // Add root wildcards
    patterns.push("*");
    patterns.push("**");

    return [...new Set(patterns)];
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    const eventParts = eventType.split(".");
    const patternParts = pattern.split(".");

    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i];

      if (part === "*") {
        // Single wildcard - skip one event part
        continue;
      }

      if (part === "**") {
        // Double wildcard - matches anything remaining
        return true;
      }

      // Specific match
      if (i >= eventParts.length || part !== eventParts[i]) {
        return false;
      }
    }

    return patternParts.length === eventParts.length;
  }

  private compileFilter(filter: Record<string, unknown>): HookFilter {
    // Compile static filter config into a filter function
    return (event: DomainEvent, _context: HookContext) => {
      for (const [key, expectedValue] of Object.entries(filter)) {
        const actualValue = key.startsWith("payload.")
          ? this.getNestedValue(event.payload, key.substring(8))
          : (event as unknown as Record<string, unknown>)[key];

        if (actualValue !== expectedValue) {
          return false;
        }
      }
      return true;
    };
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== "object") return undefined;
    return path.split(".").reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
}

// ============================================================================
// Hook Builder - Fluent API for creating hooks
// ============================================================================

/**
 * Fluent builder for creating hooks
 */
export class HookBuilder {
  private options: Partial<CreateHookOptions> = {};

  constructor(composeId: string) {
    this.options.composeId = composeId;
  }

  /**
   * Set the event pattern to listen to
   */
  on(eventPattern: string): this {
    this.options.eventPattern = eventPattern;
    return this;
  }

  /**
   * Add a filter to the hook
   */
  withFilter(filter: Record<string, unknown>): this {
    this.options.filter = filter;
    return this;
  }

  /**
   * Set the handler function
   */
  handle(handler: HookHandler): this {
    this.options.handler = handler;
    return this;
  }

  /**
   * Set priority (lower = higher priority)
   */
  priority(priority: number): this {
    this.options.priority = priority;
    return this;
  }

  /**
   * Set metadata
   */
  withMetadata(metadata: Record<string, unknown>): this {
    this.options.metadata = metadata;
    return this;
  }

  /**
   * Set custom ID
   */
  withId(id: string): this {
    this.options.id = id;
    return this;
  }

  /**
   * Build and register the hook
   */
  register(registry: HookRegistry): ComposeHook {
    if (!this.options.eventPattern) {
      throw new Error("Event pattern is required");
    }
    if (!this.options.handler) {
      throw new Error("Handler is required");
    }

    return registry.register({
      composeId: this.options.composeId!,
      eventPattern: this.options.eventPattern,
      filter: this.options.filter,
      handler: this.options.handler,
      priority: this.options.priority,
      id: this.options.id,
      metadata: this.options.metadata,
    });
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a new HookRegistry
 */
export function createHookRegistry(): HookRegistry {
  return new HookRegistry();
}

/**
 * Create a new HookBuilder
 */
export function createHook(composeId: string): HookBuilder {
  return new HookBuilder(composeId);
}
