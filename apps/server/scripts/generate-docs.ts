#!/usr/bin/env bun
/**
 * Generate all documentation
 * 
 * Usage: bun run scripts/generate-docs.ts
 * 
 * This script:
 * 1. Runs TypeDoc to generate API documentation
 * 2. Exports OpenAPI spec from the server
 * 3. Outputs summary of generated docs
 */

import { $ } from "bun";
import { exportOpenAPI } from "./export-openapi";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DOCS_DIR = join(import.meta.dir, "..", "docs");

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function generateTypeDoc() {
  console.log("📚 Generating TypeDoc documentation...");
  
  try {
    const result = await $`bunx typedoc --options typedoc.json`.quiet().nothrow();
    
    if (result.exitCode === 0) {
      console.log("✅ TypeDoc documentation generated");
      return true;
    } else {
      console.error("❌ TypeDoc generation failed:");
      console.error(result.stderr.toString());
      return false;
    }
  } catch (error) {
    console.error("❌ TypeDoc generation error:");
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function generateDocs() {
  console.log("🚀 Starting documentation generation...\n");
  
  // Ensure docs directory exists
  await ensureDir(DOCS_DIR);
  
  const results = {
    typedoc: false,
    openapi: false,
  };
  
  // Generate TypeDoc
  results.typedoc = await generateTypeDoc();
  console.log();
  
  // Export OpenAPI (requires running server)
  console.log("📡 Exporting OpenAPI spec...");
  console.log("   Note: Skip with --skip-openapi if server is not running");
  console.log();
  
  if (!process.argv.includes("--skip-openapi")) {
    results.openapi = await exportOpenAPI();
  } else {
    console.log("⏭️  Skipping OpenAPI export (--skip-openapi flag)");
  }
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Documentation Generation Summary");
  console.log("=".repeat(50));
  console.log(`TypeDoc:  ${results.typedoc ? "✅ Success" : "❌ Failed"}`);
  console.log(`OpenAPI:  ${results.openapi ? "✅ Success" : "⏭️  Skipped"}`);
  console.log("=".repeat(50));
  
  if (results.typedoc) {
    console.log("\n📁 Generated files:");
    console.log(`   - ${DOCS_DIR}/generated/index.html`);
    console.log(`   - ${DOCS_DIR}/generated/modules/`);
  }
  
  if (results.openapi) {
    console.log(`   - ${DOCS_DIR}/api/openapi.json`);
  }
  
  console.log("\n💡 To view docs, open: docs/generated/index.html");
  console.log();
  
  return results.typedoc;
}

// Run if executed directly
if (import.meta.main) {
  const success = await generateDocs();
  process.exit(success ? 0 : 1);
}

export { generateDocs };
