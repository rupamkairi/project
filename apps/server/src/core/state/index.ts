// State Machine and FSM Engine

export type Op =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "matches"
  | "exists"
  | "empty";

// Forward declare RuleExpr from rule module
export interface RuleExpr {
  field?: string;
  op?: Op;
  value?: unknown;
  and?: RuleExpr[];
  or?: RuleExpr[];
  not?: RuleExpr;
  ref?: string;
}

export interface Action {
  type: "emit" | "dispatch" | "assign" | "log";
  event?: string;
  command?: string;
  payload?: Record<string, unknown>;
  field?: string;
  value?: unknown;
  message?: string;
}

export interface Transition<S> {
  target: S;
  guard?: RuleExpr;
  actions?: Action[];
}

export interface TimedTransition<S> {
  after: number; // milliseconds
  target: S;
  guard?: RuleExpr;
  actions?: Action[];
}

export interface StateNode<S, E extends string> {
  label?: string;
  terminal?: boolean;
  on?: Partial<Record<E, Transition<S> | Transition<S>[]>>;
  entry?: Action[];
  exit?: Action[];
  after?: TimedTransition<S>[];
}

export interface StateMachine<S extends string, E extends string> {
  id: string;
  entityType: string;
  initial: S;
  states: Record<S, StateNode<S, E>>;
}

export interface FSMContext {
  entityId: string;
  currentState: string;
  data: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  targetState?: string;
  actions?: Action[];
  error?: string;
}

// FSM Engine - manages state machines and executes transitions
export interface FSMEngine {
  register<S extends string, E extends string>(
    machine: StateMachine<S, E>,
  ): void;
  resolve(id: string): StateMachine<any, any> | undefined;
  can(
    machineId: string,
    currentState: string,
    event: string,
    context: FSMContext,
  ): boolean;
  transition(
    machineId: string,
    currentState: string,
    event: string,
    context: FSMContext,
  ): Promise<TransitionResult>;
  validEvents(
    machineId: string,
    currentState: string,
    context: FSMContext,
  ): string[];
}

// In-memory FSM Engine implementation
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
