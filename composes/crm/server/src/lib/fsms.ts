// CRM Compose — finite state machines.
//
// Implemented as pure transition maps validated at the route layer. Each machine
// declares its states, the legal transitions between them, and optional guards.
// `canTransition` / `assertTransition` are the only runtime entry points;
// side-effects are applied by the routes after a successful assertion.

import { BusinessError } from "@core";

// --- Lead FSM ---------------------------------------------------------------

export const LEAD_STATES = [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
] as const;
export type LeadState = (typeof LEAD_STATES)[number];

export const LEAD_TRANSITIONS: Record<LeadState, LeadState[]> = {
  new: ["contacted", "disqualified"],
  contacted: ["qualified", "disqualified"],
  qualified: ["converted", "disqualified"],
  disqualified: ["new"],   // reopen — lead can be re-engaged
  converted: [],
};

/** Guard for qualified → converted: a converted lead must carry an estimated value. */
export function leadCanConvert(estimatedValue: unknown): boolean {
  return (
    !!estimatedValue &&
    typeof estimatedValue === "object" &&
    "amount" in (estimatedValue as object) &&
    (estimatedValue as { amount: number }).amount > 0
  );
}

// --- Deal FSM ---------------------------------------------------------------

export const DEAL_STATES = ["open", "won", "lost", "abandoned"] as const;
export type DealState = (typeof DEAL_STATES)[number];

export const DEAL_TRANSITIONS: Record<DealState, DealState[]> = {
  open: ["won", "lost", "abandoned"],
  won: [],
  lost: [],
  abandoned: [],
};

// --- Campaign FSM -----------------------------------------------------------

export const CAMPAIGN_STATES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "cancelled",
] as const;
export type CampaignState = (typeof CAMPAIGN_STATES)[number];

export const CAMPAIGN_TRANSITIONS: Record<CampaignState, CampaignState[]> = {
  draft: ["scheduled", "sending", "cancelled"],
  scheduled: ["sending", "cancelled"],
  sending: ["sent", "paused", "cancelled"],
  paused: ["sending", "cancelled"],
  sent: [],
  cancelled: [],
};

// --- Ticket FSM -------------------------------------------------------------

export const TICKET_STATES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type TicketState = (typeof TICKET_STATES)[number];

export const TICKET_TRANSITIONS: Record<TicketState, TicketState[]> = {
  open: ["in_progress", "resolved"],
  in_progress: ["resolved", "open"],  // can unassign back to open
  resolved: ["closed", "open"],       // reopen if customer replies
  closed: [],
};

// --- Generic engine helpers -------------------------------------------------

function assertNeverState(state: string, machine: string): never {
  throw new BusinessError(`Unknown ${machine} state: ${state}`, {
    reason: "INVALID_STATE",
  });
}

/** Throw a BusinessError unless `from → to` is a legal transition. */
export function assertTransition<S extends string>(
  machine: string,
  transitions: Record<S, S[]>,
  from: string,
  to: S,
): void {
  const allowed = transitions[from as S];
  if (!allowed) assertNeverState(from, machine);
  if (!allowed.includes(to)) {
    throw new BusinessError(
      `Illegal ${machine} transition: ${from} → ${to}. Allowed: ${allowed.join(", ") || "(terminal)"}`,
      { reason: "ILLEGAL_TRANSITION", from, to },
    );
  }
}

export function canTransition<S extends string>(
  transitions: Record<S, S[]>,
  from: string,
  to: S,
): boolean {
  const allowed = transitions[from as S];
  return !!allowed && allowed.includes(to);
}

// Convenience wrappers keep call sites readable.
export function assertLeadTransition(from: string, to: LeadState): void {
  assertTransition("lead", LEAD_TRANSITIONS, from, to);
}
export function assertDealTransition(from: string, to: DealState): void {
  assertTransition("deal", DEAL_TRANSITIONS, from, to);
}
export function assertCampaignTransition(from: string, to: CampaignState): void {
  assertTransition("campaign", CAMPAIGN_TRANSITIONS, from, to);
}
export function assertTicketTransition(from: string, to: TicketState): void {
  assertTransition("ticket", TICKET_TRANSITIONS, from, to);
}
