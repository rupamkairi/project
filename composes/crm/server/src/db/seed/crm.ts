// CRM Compose — seed data.
//
// Seeds CRM roles into the identity `roles` master table and default CRM
// pipelines into the pipeline master tables (via `seedPipeline`). Master tables
// are owned by foundation modules; the CRM compose only seeds its own slugs and
// entity-type pipelines — it never creates those tables.
//
// Run after the foundation seed (`apps/server/src/infra/db/seed.ts`):
//   bun run src/infra/db/seed.ts   # then call seedCrm(orgId) from a script.

import { db } from "@db/client";
import { roles } from "@db/schema/identity";
import { seedPipeline } from "@db/seed";

// Default org id is established by the foundation seed (apps/server/src/infra/db/seed.ts).
// Platform uses org_platform_default; CRM reuses the same default org for dev.
export const CRM_DEFAULT_ORG_ID = "org_platform_default";

// --- Roles ------------------------------------------------------------------

const CRM_ROLES_SEED = [
  {
    id: "plt_role_crm_admin",
    name: "crm:admin",
    description: "CRM Administrator — full access, manage pipelines/campaigns/export",
    permissions: ["*:*"],
  },
  {
    id: "plt_role_crm_sales_manager",
    name: "crm:sales-manager",
    description: "Sales Manager — full access to all records, approve deals, analytics",
    permissions: ["*:read", "*:create", "*:update", "*:delete"],
  },
  {
    id: "plt_role_crm_sales_rep",
    name: "crm:sales-rep",
    description: "Sales Rep — own records only, no delete, no analytics",
    permissions: ["*:read", "*:create", "*:update"],
  },
  {
    id: "plt_role_crm_viewer",
    name: "crm:viewer",
    description: "Viewer — read-only across all CRM records",
    permissions: ["*:read"],
  },
];

// --- Default pipelines ------------------------------------------------------
// Probability lives in pipeline_stages.meta; rotPeriodDays likewise (used by the
// deal-rotting job). Names must match the FE stage labels.

const DEAL_STAGES = [
  { name: "Prospecting", meta: { probability: 10, rotPeriodDays: 14 } },
  { name: "Qualification", meta: { probability: 30, rotPeriodDays: 21 } },
  { name: "Proposal", meta: { probability: 60, rotPeriodDays: 30 } },
  { name: "Closed Won", meta: { probability: 100 } },
  { name: "Closed Lost", meta: { probability: 0 } },
];

const LEAD_STAGES = [
  { name: "New" },
  { name: "Contacted" },
  { name: "Qualified" },
  { name: "Converted" },
];

export interface SeedCrmResult {
  orgId: string;
  roles: string[];
  dealPipeline: { pipelineId: string; stageIds: Record<string, string> };
  leadPipeline: { pipelineId: string; stageIds: Record<string, string> };
}

/**
 * Seed CRM roles + default pipelines into the master tables.
 * Idempotent: roles use fixed ids + onConflictDoNothing; pipelines rely on
 * seedPipeline's own onConflictDoNothing.
 */
export async function seedCrm(orgId: string = CRM_DEFAULT_ORG_ID): Promise<SeedCrmResult> {
  console.log("Seeding CRM data...");

  const now = new Date();
  await db
    .insert(roles)
    .values(
      CRM_ROLES_SEED.map((r) => ({
        ...r,
        organizationId: orgId,
        isSystem: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
        deletedAt: null,
      })),
    )
    .onConflictDoNothing();
  console.log("✓ Seeded CRM roles:", CRM_ROLES_SEED.map((r) => r.name).join(", "));

  const dealPipeline = await seedPipeline(orgId, "crm.deal", DEAL_STAGES, {
    name: "Sales Pipeline",
  });
  console.log("✓ Seeded crm.deal pipeline:", dealPipeline.pipelineId);

  const leadPipeline = await seedPipeline(orgId, "crm.lead", LEAD_STAGES, {
    name: "Lead Pipeline",
  });
  console.log("✓ Seeded crm.lead pipeline:", leadPipeline.pipelineId);

  console.log("CRM seed complete.");
  return {
    orgId,
    roles: CRM_ROLES_SEED.map((r) => r.name),
    dealPipeline,
    leadPipeline,
  };
}
