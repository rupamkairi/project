import { db } from "./client";
import { pipelines, pipelineStages } from "./schema/pipeline";
import { seedPlatform } from "@projectx/platform-server";
import { ulid } from "ulid";

function generateId(): string {
  return ulid();
}

/**
 * Generic seeding contract for the pipeline master tables.
 *
 * Each compose seeds its own pipelines (and matching FSM definitions) for the
 * entity types it sequences — e.g. seedPipeline(orgId, "crm_deal", [...]).
 * Composes likewise seed their own item types, location types, and party/person
 * types from their own `db/seed/` directory; the master tables stay generic.
 *
 * Returns the new pipeline id and a name→stageId map for wiring detail rows.
 */
export async function seedPipeline(
  orgId: string,
  entityType: string,
  stages: { name: string; meta?: Record<string, unknown> }[],
  opts: { name?: string; isDefault?: boolean } = {},
): Promise<{ pipelineId: string; stageIds: Record<string, string> }> {
  const pipelineId = generateId();
  await db
    .insert(pipelines)
    .values({
      id: pipelineId,
      organizationId: orgId,
      entityType,
      name: opts.name ?? entityType,
      isDefault: opts.isDefault ?? true,
    })
    .onConflictDoNothing();

  const stageIds: Record<string, string> = {};
  for (const [position, stage] of stages.entries()) {
    const stageId = generateId();
    await db
      .insert(pipelineStages)
      .values({
        id: stageId,
        organizationId: orgId,
        pipelineId,
        name: stage.name,
        position,
        meta: stage.meta ?? {},
      })
      .onConflictDoNothing();
    stageIds[stage.name] = stageId;
  }

  return { pipelineId, stageIds };
}

async function seed() {
  console.log("Starting seed...");
  console.log("Step 1: Seeding platform demo data...");
  await seedPlatform();
  console.log("✓ Demo seed complete");
}

if (import.meta.path === Bun.main) {
  seed().catch(console.error);
}
