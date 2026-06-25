export const SO_STATES = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  DELIVERED: "delivered",
  INVOICED: "invoiced",
  CANCELLED: "cancelled",
  CLOSED: "closed",
} as const;

export type SoState = typeof SO_STATES[keyof typeof SO_STATES];

export const SO_TRANSITIONS: Record<SoState, SoState[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: ["invoiced"],
  invoiced: ["closed"],
  cancelled: [],
  closed: [],
};

export function canTransitionSo(from: SoState, to: SoState): boolean {
  return SO_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertSoTransition(from: SoState, to: SoState): void {
  if (!canTransitionSo(from, to)) {
    throw new Error(`SO: invalid transition ${from} -> ${to}`);
  }
}
