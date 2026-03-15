#!/usr/bin/env bun
/**
 * Export OpenAPI spec from the running server
 *
 * Usage: bun run scripts/export-openapi.ts
 *
 * This script:
 * 1. Starts the server in background (if not running)
 * 2. Fetches the OpenAPI spec from /swagger/openapi.json
 * 3. Saves it to docs/api/openapi.json
 * 4. Stops the server
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DOCS_DIR = join(import.meta.dir, "..", "docs", "api");
const OPENAPI_FILE = join(DOCS_DIR, "openapi.json");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function exportOpenAPI() {
  console.log("📄 Exporting OpenAPI spec...");

  try {
    // Ensure docs/api directory exists
    await ensureDir(DOCS_DIR);

    // Fetch OpenAPI spec
    const response = await fetch(`${SERVER_URL}/swagger/openapi.json`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`,
      );
    }

    const openapi: unknown = await response.json();

    // Save to file
    await Bun.write(OPENAPI_FILE, JSON.stringify(openapi, null, 2));

    // Extract counts safely
    const isOpenApi = (
      obj: unknown,
    ): obj is { paths?: unknown; components?: unknown } =>
      typeof obj === "object" && obj !== null;

    let endpointCount = 0;
    let schemaCount = 0;

    if (isOpenApi(openapi)) {
      if (typeof openapi.paths === "object" && openapi.paths !== null) {
        endpointCount = Object.keys(openapi.paths).length;
      }
      if (
        typeof openapi.components === "object" &&
        openapi.components !== null &&
        "schemas" in openapi.components &&
        typeof openapi.components.schemas === "object" &&
        openapi.components.schemas !== null
      ) {
        schemaCount = Object.keys(openapi.components.schemas).length;
      }
    }

    console.log(`✅ OpenAPI spec exported to ${OPENAPI_FILE}`);
    console.log(`   - ${endpointCount} endpoints`);
    console.log(`   - ${schemaCount} schemas`);

    return true;
  } catch (error) {
    console.error("❌ Failed to export OpenAPI spec:");
    console.error(error instanceof Error ? error.message : error);
    console.log("\n💡 Make sure the server is running: bun run dev");
    return false;
  }
}

// Run if executed directly
if (import.meta.main) {
  const success = await exportOpenAPI();
  process.exit(success ? 0 : 1);
}

export { exportOpenAPI };
