/**
 * State Machine & FSM Engine
 *
 * Finite state machine definitions and engine for managing entity lifecycles.
 *
 * @category Core
 * @packageDocumentation
 */

import type { RuleExpr } from "../rule";

/**
 * State machine action definition.
 *
 * Actions are executed when transitions occur.
 *
 * @example
 * ```typescript
 * const action: Action = {
 *   type: "emit",
 *   event: "order.confirmed",
 *   payload: { orderId: "123" }
 * };
 * ```
 *
 * @category Core
 */
export interface Action {
  /**
   * Action type
   * - `emit`: Publish a domain event
   * - `dispatch`: Send a command
   * - `assign`: Update context data
   * - `log`: Log a message
   */
  type: "emit" | "dispatch" | "assign" | "log";

  /**
   * Event type for emit actions
   */
  event?: string;

  /**
   * Command type for dispatch actions
   */
  command?: string;

  /**
   * Payload for emit/dispatch actions
   */
  payload?: Record<string, unknown>;

  /**
   * Field to assign (for assign actions)
   */
  field?: string;

  /**
   * Value to assign (for assign actions)
   */
  value?: unknown;

  /**
   * Message to log (for log actions)
   */
  message?: string;
}

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
  after: number;

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
 *         payment.received: { target: "confirmed" },
 *         payment.failed: { target: "failed" }
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
}

/**
 * FSM execution context.
 *
 * @category Core
 */
export interface FSMContext {
  /**
   * Entity ID being managed
   */
  entityId: string;

  /**
   * Current state
   */
  currentState: string;

  /**
   * Mutable data available to guards and actions
   */
  data: Record<string, unknown>;
}

/**
 * Result of a transition attempt.
 *
 * @category Core
 */
export interface TransitionResult {
  /**
   * Whether transition was successful
   */
  success: boolean;

  /**
   * Target state (if successful)
   */
  targetState?: string;

  /**
   * Actions to execute (if successful)
   */
  actions?: Action[];

  /**
   * Error message (if failed)
   */
  error?: string;
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
   * @returns The state machine or undefined
   */
  resolve(id: string): StateMachine<any, any> | undefined;

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
 * if (result.success) {
 *   console.log(`Transitioned to ${result.targetState}`);
 *   // Execute result.actions...
 * }
 * ```
 *
 * @category Core
 */
export function createFSMEngine(ruleEngine?: {
  evaluate(expr: RuleExpr, context: Record<string, unknown>): boolean;
}): FSMEngine {
  const machines = new Map<string, StateMachine<any, any>>();

  return {
    register<S extends string, E extends string>(
      machine: StateMachine<S, E>,
    ): void {
      machines.set(machine.id, machine);
    },

    resolve(id: string): StateMachine<any, any> | undefined {
      return machines.get(id);
    },

    can(
      machineId: string,
      currentState: string,
      event: string,
      _context: FSMContext,
    ): boolean {
      const machine = machines.get(machineId);
      if (!machine) return false;

      const stateNode =
        machine.states[currentState as keyof typeof machine.states];
      if (!stateNode || !stateNode.on) return false;

      const transition = stateNode.on[event as keyof typeof stateNode.on];
      if (!transition) return false;

      // Check guard if present
      const transitions = Array.isArray(transition) ? transition : [transition];
      return transitions.some(
        (t) =>
          !t.guard || (ruleEngine?.evaluate(t.guard, _context.data) ?? true),
      );
    },

    async transition(
      machineId: string,
      currentState: string,
      event: string,
      context: FSMContext,
    ): Promise<TransitionResult> {
      const machine = machines.get(machineId);
      if (!machine) {
        return { success: false, error: `Machine ${machineId} not found` };
      }

      const stateNode =
        machine.states[currentState as keyof typeof machine.states];
      if (!stateNode || !stateNode.on) {
        return {
          success: false,
          error: `No transitions defined for state ${currentState}`,
        };
      }

      const transition = stateNode.on[event as keyof typeof stateNode.on];
      if (!transition) {
        return {
          success: false,
          error: `No transition for event ${event} in state ${currentState}`,
        };
      }

      const transitions = Array.isArray(transition) ? transition : [transition];

      // Find first valid transition (with passing guard or no guard)
      let selectedTransition: Transition<any> | undefined;
      for (const t of transitions) {
        if (!t.guard || (ruleEngine?.evaluate(t.guard, context.data) ?? true)) {
          selectedTransition = t;
          break;
        }
      }

      if (!selectedTransition) {
        return {
          success: false,
          error: `All guards failed for event ${event}`,
        };
      }

      // Execute exit actions
      const allActions: Action[] = [...(stateNode.exit ?? [])];

      // Execute transition actions
      if (selectedTransition.actions) {
        allActions.push(...selectedTransition.actions);
      }

      // Execute entry actions of target state
      const targetStateNode = machine.states[selectedTransition.target];
      if (targetStateNode?.entry) {
        allActions.push(...targetStateNode.entry);
      }

      return {
        success: true,
        targetState: selectedTransition.target,
        actions: allActions,
      };
    },

    validEvents(
      machineId: string,
      currentState: string,
      context: FSMContext,
    ): string[] {
      const machine = machines.get(machineId);
      if (!machine) return [];

      const stateNode =
        machine.states[currentState as keyof typeof machine.states];
      if (!stateNode || !stateNode.on) return [];

      return Object.keys(stateNode.on).filter((event) => {
        return this.can(machineId, currentState, event, context);
      });
    },
  };
}
