// CRM Compose — permissions matrix.
//
// Six CRM roles filter every record in the compose. Role slugs are seeded into
// the identity `roles` table; auth plugin surfaces them on `ctx.actor.roles`.
// `requirePermission(actor, perm)` is the per-route guard used across all routes.

import type { AuthActor } from "@projectx/plugin-auth-server";
import { AuthorizationError } from "@core";

// --- Roles ------------------------------------------------------------------

export const CRM_ROLES = {
  admin: "crm:admin",
  salesManager: "crm:sales-manager",
  salesRep: "crm:sales-rep",
  supportAgent: "crm:support-agent",
  marketing: "crm:marketing",
  viewer: "crm:viewer",
} as const;

/** Roles that may delete records or manage pipelines/campaigns. */
export const CRM_MANAGER_ROLES = [CRM_ROLES.admin, CRM_ROLES.salesManager] as const;

/** Roles that may access analytics. */
export const CRM_ANALYTICS_ROLES = [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.marketing] as const;

// --- Permission matrix ------------------------------------------------------
// permission → roles that hold it. Sales-rep scopes apply at the route layer
// (own records only) — see `assertOwnership` / list-query ownerId filtering.

export const CRM_PERMISSIONS = {
  // contacts
  "contact:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.supportAgent,
    CRM_ROLES.marketing,
    CRM_ROLES.viewer,
  ],
  "contact:create": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep, CRM_ROLES.marketing],
  "contact:update": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "contact:delete": [CRM_ROLES.admin, CRM_ROLES.salesManager],
  "contact:reassign": [CRM_ROLES.admin, CRM_ROLES.salesManager],

  // accounts (mirror contacts)
  "account:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.supportAgent,
    CRM_ROLES.viewer,
  ],
  "account:create": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "account:update": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "account:delete": [CRM_ROLES.admin, CRM_ROLES.salesManager],

  // leads
  "lead:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.marketing,
    CRM_ROLES.viewer,
  ],
  "lead:create": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep, CRM_ROLES.marketing],
  "lead:update": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "lead:delete": [CRM_ROLES.admin, CRM_ROLES.salesManager],
  "lead:qualify": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "lead:disqualify": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "lead:convert": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],

  // deals
  "deal:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.viewer,
  ],
  "deal:create": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "deal:update": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep],
  "deal:delete": [CRM_ROLES.admin, CRM_ROLES.salesManager],
  "deal:approve": [CRM_ROLES.admin, CRM_ROLES.salesManager],

  // activities
  "activity:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.supportAgent,
    CRM_ROLES.viewer,
  ],
  "activity:create": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep, CRM_ROLES.supportAgent],
  "activity:update": [CRM_ROLES.admin, CRM_ROLES.salesManager, CRM_ROLES.salesRep, CRM_ROLES.supportAgent],
  "activity:delete": [CRM_ROLES.admin, CRM_ROLES.salesManager],

  // tickets
  "ticket:read": [CRM_ROLES.admin, CRM_ROLES.supportAgent],
  "ticket:create": [CRM_ROLES.admin, CRM_ROLES.supportAgent],
  "ticket:assign": [CRM_ROLES.admin, CRM_ROLES.supportAgent],
  "ticket:resolve": [CRM_ROLES.admin, CRM_ROLES.supportAgent],
  "ticket:delete": [CRM_ROLES.admin],

  // pipelines
  "pipeline:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.viewer,
  ],
  "pipeline:manage": [CRM_ROLES.admin, CRM_ROLES.salesManager],

  // campaigns
  "campaign:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.marketing,
    CRM_ROLES.viewer,
  ],
  "campaign:manage": [CRM_ROLES.admin, CRM_ROLES.marketing],

  // segments
  "segment:read": [
    CRM_ROLES.admin,
    CRM_ROLES.salesManager,
    CRM_ROLES.salesRep,
    CRM_ROLES.marketing,
    CRM_ROLES.viewer,
  ],
  "segment:manage": [CRM_ROLES.admin, CRM_ROLES.marketing],

  // analytics
  "analytics:read": CRM_ANALYTICS_ROLES,

  // import/export
  "data:import": [CRM_ROLES.admin, CRM_ROLES.salesManager],
  "data:export": [CRM_ROLES.admin, CRM_ROLES.salesManager],
} as const;

export type CrmPermission = keyof typeof CRM_PERMISSIONS;

// --- Guards -----------------------------------------------------------------

/**
 * Throw AuthorizationError unless the actor holds the given permission.
 * Assumes the auth plugin attached `actor` to the request context; if there is
 * no actor at all the request is treated as unauthenticated.
 */
export function requirePermission(actor: AuthActor | null | undefined, permission: CrmPermission): void {
  if (!actor) {
    throw new AuthorizationError("Authentication required", { reason: "AUTH_REQUIRED" });
  }
  const allowed = CRM_PERMISSIONS[permission];
  if (!allowed.some((r) => actor.roles.includes(r))) {
    throw new AuthorizationError(
      `Missing permission: ${permission}`,
      { reason: "FORBIDDEN", permission },
    );
  }
}

/**
 * True if the actor is an admin/manager (i.e. not scoped to own records).
 * Used to relax ownerId filters on list queries.
 */
export function isManager(actor: AuthActor): boolean {
  return (CRM_MANAGER_ROLES as readonly string[]).some((r) =>
    actor.roles.includes(r),
  );
}
