export const PO_STATES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  CANCELLED: "cancelled",
  RECEIVED: "received",
} as const;

export type PoState = typeof PO_STATES[keyof typeof PO_STATES];

export const PO_TRANSITIONS: Record<PoState, PoState[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "cancelled", "draft"],
  approved: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export function canTransitionPo(from: PoState, to: PoState): boolean {
  return PO_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertPoTransition(from: PoState, to: PoState): void {
  if (!canTransitionPo(from, to)) {
    throw new Error(`PO: invalid transition ${from} -> ${to}`);
  }
}
