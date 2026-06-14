/**
 * State Machine & FSM Engine
 *
 * Finite state machine definitions and engine for managing entity lifecycles.
 *
 * @category Core
 * @packageDocumentation
 */

import type { ID } from "../entity";
import type { DomainEvent } from "../event";
import type { RuleExpr } from "../rule";
import { NotFoundError } from "../errors";

/**
 * State machine action definition — discriminated union of 4 side-effect types.
 *
 * Actions are side-effect descriptors resolved and executed by the FSM engine.
 * They do NOT call business logic directly — they emit commands into the Mediator.
 *
 * @example
 * ```typescript
 * const action: Action = { type: "emit", event: "order.confirmed" };
 * ```
 *
 * @category Core
 */
export type Action =
  | { type: "emit"; event: string; payload?: Record<string, unknown> }
  | { type: "dispatch"; command: string; payload?: Record<string, unknown> }
  | { type: "assign"; field: string; value: unknown | ((ctx: FSMContext) => unknown) }
  | { type: "log"; message: string };

/**
 * State transition definition.
 *
 * @typeParam S - State type
 *
 * @category Core
 */
export interface Transition<S> {
  /**
   * Target state after transition
   */
  target: S;

  /**
   * Guard condition that must pass for transition
   */
  guard?: RuleExpr;

  /**
   * Actions to execute during transition
   */
  actions?: Action[];

  /**
   * Human-readable description (e.g., 'Payment confirmed by gateway')
   */
  description?: string;
}

/**
 * Timed transition definition (transitions after a delay).
 *
 * @typeParam S - State type
 *
 * @category Core
 */
export interface TimedTransition<S> {
  /**
   * Delay in milliseconds before transition
   */
  delay: number;

  /**
   * Target state after timeout
   */
  target: S;

  /**
   * Guard condition (optional)
   */
  guard?: RuleExpr;

  /**
   * Actions to execute (optional)
   */
  actions?: Action[];
}

/**
 * State node definition within a state machine.
 *
 * @typeParam S - State type (all possible states)
 * @typeParam E - Event type (all possible events)
 *
 * @category Core
 */
export interface StateNode<S, E extends string> {
  /**
   * Human-readable label for the state
   */
  label?: string;

  /**
   * UI color hint for rendering (e.g., '#F59E0B')
   */
  color?: string;

  /**
   * If true, this is a terminal state (no outgoing transitions)
   */
  terminal?: boolean;

  /**
   * Event-to-transition mappings
   */
  on?: Partial<Record<E, Transition<S> | Transition<S>[]>>;

  /**
   * Actions executed when entering this state
   */
  entry?: Action[];

  /**
   * Actions executed when exiting this state
   */
  exit?: Action[];

  /**
   * Timed transitions (timeout-based)
   */
  after?: TimedTransition<S>[];
}

/**
 * State machine definition.
 *
 * Defines all states and transitions for an entity type.
 *
 * @typeParam S - State type (union of all possible states)
 * @typeParam E - Event type (union of all possible events)
 *
 * @example
 * ```typescript
 * const orderMachine: StateMachine<OrderState, OrderEvent> = {
 *   id: "order",
 *   entityType: "Order",
 *   initial: "pending",
 *   states: {
 *     pending: {
 *       label: "Pending Payment",
 *       on: {
 *         "payment.received": { target: "confirmed" },
 *         "payment.failed": { target: "failed" }
 *       }
 *     },
 *     confirmed: {
 *       label: "Confirmed",
 *       entry: [{ type: "emit", event: "order.confirmed" }],
 *       on: {
 *         ship: { target: "shipped" },
 *         cancel: { target: "cancelled" }
 *       }
 *     },
 *     shipped: { terminal: true },
 *     failed: { terminal: true },
 *     cancelled: { terminal: true }
 *   }
 * };
 * ```
 *
 * @category Core
 */
export interface StateMachine<S extends string, E extends string> {
  /**
   * Unique machine identifier
   */
  id: string;

  /**
   * Entity type this machine manages
   */
  entityType: string;

  /**
   * Initial state when entity is created
   */
  initial: S;

  /**
   * All state definitions
   */
  states: Record<S, StateNode<S, E>>;

  /**
   * Optional metadata (diagram, description)
   */
  meta?: {
    description?: string;
    /** Mermaid stateDiagram string (auto-generatable) */
    diagram?: string;
  };
}

/**
 * FSM execution context.
 *
 * @category Core
 */
export interface FSMContext {
  /**
   * Current entity data
   */
  entity: Record<string, unknown>;

  /**
   * Actor performing the transition
   */
  actor: { id: ID; roles: string[]; orgId: ID };

  /**
   * Event-specific input payload
   */
  payload?: Record<string, unknown>;
}

/**
 * Result of a completed transition.
 *
 * @category Core
 */
export interface TransitionResult {
  /**
   * State the machine was in before the transition
   */
  previousState: string;

  /**
   * State the machine moved into
   */
  nextState: string;

  /**
   * Actions that were executed during the transition (exit + transition + entry)
   */
  actionsExecuted: Action[];

  /**
   * Domain events emitted as side-effects of the transition
   */
  eventsEmitted: DomainEvent[];
}

/**
 * FSM Engine interface for managing state machines.
 *
 * @category Core
 */
export interface FSMEngine {
  /**
   * Registers a state machine definition.
   *
   * @param machine - State machine to register
   */
  register<S extends string, E extends string>(
    machine: StateMachine<S, E>,
  ): void;

  /**
   * Resolves a registered machine by ID.
   *
   * @param id - Machine ID
   * @returns The state machine
   * @throws {NotFoundError} When no machine with the given ID is registered
   */
  resolve(id: string): StateMachine<any, any>;

  /**
   * Checks if a transition is valid.
   *
   * @param machineId - Machine ID
   * @param currentState - Current state
   * @param event - Event triggering transition
   * @param context - Execution context
   * @returns True if transition is valid
   */
  can(
    machineId: string,
    currentState: string,
    event: string,
    context: FSMContext,
  ): boolean;

  /**
   * Executes a transition.
   *
   * @param machineId - Machine ID
   * @param currentState - Current state
   * @param event - Event triggering transition
   * @param context - Execution context
   * @returns Transition result
   */
  transition(
    machineId: string,
    currentState: string,
    event: string,
    context: FSMContext,
  ): Promise<TransitionResult>;

  /**
   * Gets all valid events for current state.
   *
   * @param machineId - Machine ID
   * @param currentState - Current state
   * @param context - Execution context
   * @returns Array of valid event names
   */
  validEvents(
    machineId: string,
    currentState: string,
    context: FSMContext,
  ): string[];

  /**
   * Gets all states reachable from the current state via BFS (ignoring guards).
   *
   * Used for progress indicators and workflow visualization.
   *
   * @param machineId - Machine ID
   * @param currentState - State to start from
   * @returns Array of reachable state names (not including currentState itself)
   */
  reachableStates(machineId: string, currentState: string): string[];
}

/**
 * Registry for managing multiple state machines.
 *
 * @category Core
 */
export interface StateMachineRegistry {
  /**
   * Registers a state machine.
   *
   * @param machine - State machine to register
   */
  register(machine: StateMachine<any, any>): void;

  /**
   * Resolves a state machine by ID.
   *
   * @param id - Machine ID
   * @returns The state machine or undefined if not found
   */
  resolve(id: string): StateMachine<any, any> | undefined;

  /**
   * Returns all registered state machines.
   *
   * @returns Array of registered state machines
   */
  list(): StateMachine<any, any>[];
}

/**
 * Creates an in-memory StateMachineRegistry.
 *
 * @returns StateMachineRegistry instance
 *
 * @example
 * ```typescript
 * const registry = createStateMachineRegistry();
 * registry.register(orderMachine);
 * const machine = registry.resolve("order");
 * const all = registry.list();
 * ```
 *
 * @category Core
 */
export function createStateMachineRegistry(): StateMachineRegistry {
  const machines = new Map<string, StateMachine<any, any>>();

  return {
    register(machine: StateMachine<any, any>): void {
      machines.set(machine.id, machine);
    },

    resolve(id: string): StateMachine<any, any> | undefined {
      return machines.get(id);
    },

    list(): StateMachine<any, any>[] {
      return Array.from(machines.values());
    },
  };
}

/**
 * Creates an in-memory FSM engine.
 *
 * @param ruleEngine - Optional rule engine for guard evaluation
 * @returns FSM engine instance
 *
 * @example
 * ```typescript
 * const engine = createFSMEngine();
 *
 * // Register machine
 * engine.register(orderMachine);
 *
 * // Check if transition is valid
 * const canShip = engine.can("order", "confirmed", "ship", context);
 *
 * // Execute transition
 * const result = await engine.transition("order", "confirmed", "ship", context);
 * console.log(`${result.previousState} -> ${result.nextState}`);
 * ```
 *
 * @category Core
 */
export function createFSMEngine(ruleEngine?: {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
}): FSMEngine {
  const machines = new Map<string, StateMachine<any, any>>();

  /** Evaluate a guard using the rule engine if provided; defaults to true when absent. */
  function evalGuard(guard: RuleExpr | undefined, ctx: FSMContext): boolean {
    if (!guard) return true;
    // Flatten entity + payload into a single context object for the rule engine
    const ruleCtx: Record<string, unknown> = {
      ...ctx.entity,
      actor: ctx.actor,
      payload: ctx.payload,
    };
    return ruleEngine?.evaluate(guard, ruleCtx) ?? true;
  }

  return {
    register<S extends string, E extends string>(
      machine: StateMachine<S, E>,
    ): void {
      machines.set(machine.id, machine);
    },

    resolve(id: string): StateMachine<any, any> {
      const machine = machines.get(id);
      if (!machine) {
        throw new NotFoundError(`State machine '${id}' is not registered`, { id });
      }
      return machine;
    },

    can(
      machineId: string,
      currentState: string,
      event: string,
      context: FSMContext,
    ): boolean {
      const machine = machines.get(machineId);
      if (!machine) return false;

      const stateNode = machine.states[currentState as keyof typeof machine.states];
      if (!stateNode || !stateNode.on) return false;

      const transition = stateNode.on[event as keyof typeof stateNode.on];
      if (!transition) return false;

      const transitions = Array.isArray(transition) ? transition : [transition];
      return transitions.some((t) => evalGuard(t.guard, context));
    },

    async transition(
      machineId: string,
      currentState: string,
      event: string,
      context: FSMContext,
    ): Promise<TransitionResult> {
      const machine = machines.get(machineId);
      if (!machine) {
        throw new NotFoundError(`State machine '${machineId}' is not registered`, { machineId });
      }

      const stateNode = machine.states[currentState as keyof typeof machine.states];
      if (!stateNode || !stateNode.on) {
        throw new Error(`No transitions defined for state '${currentState}'`);
      }

      const transition = stateNode.on[event as keyof typeof stateNode.on];
      if (!transition) {
        throw new Error(`No transition for event '${event}' in state '${currentState}'`);
      }

      const transitions = Array.isArray(transition) ? transition : [transition];

      // Find first valid transition (with passing guard or no guard)
      let selectedTransition: Transition<any> | undefined;
      for (const t of transitions) {
        if (evalGuard(t.guard, context)) {
          selectedTransition = t;
          break;
        }
      }

      if (!selectedTransition) {
        throw new Error(`All guards failed for event '${event}' in state '${currentState}'`);
      }

      // Collect actions: exit + transition + entry
      const actionsExecuted: Action[] = [
        ...(stateNode.exit ?? []),
        ...(selectedTransition.actions ?? []),
      ];

      const targetStateNode = machine.states[selectedTransition.target];
      if (targetStateNode?.entry) {
        actionsExecuted.push(...targetStateNode.entry);
      }

      return {
        previousState: currentState,
        nextState: selectedTransition.target as string,
        actionsExecuted,
        eventsEmitted: [],
      };
    },

    validEvents(
      machineId: string,
      currentState: string,
      context: FSMContext,
    ): string[] {
      const machine = machines.get(machineId);
      if (!machine) return [];

      const stateNode = machine.states[currentState as keyof typeof machine.states];
      if (!stateNode || !stateNode.on) return [];

      return Object.keys(stateNode.on).filter((event) =>
        this.can(machineId, currentState, event, context),
      );
    },

    reachableStates(machineId: string, currentState: string): string[] {
      const machine = machines.get(machineId);
      if (!machine) return [];

      const visited = new Set<string>();
      const queue: string[] = [currentState];
      visited.add(currentState);

      while (queue.length > 0) {
        const state = queue.shift()!;
        const stateNode = machine.states[state as keyof typeof machine.states];
        if (!stateNode || !stateNode.on) continue;

        for (const transition of Object.values(stateNode.on)) {
          const targets = Array.isArray(transition) ? transition : [transition];
          for (const t of targets) {
            const target = (t as Transition<any>).target as string;
            if (!visited.has(target)) {
              visited.add(target);
              queue.push(target);
            }
          }
        }
      }

      // Remove the starting state — return only the states reachable FROM it
      visited.delete(currentState);
      return Array.from(visited);
    },
  };
}
