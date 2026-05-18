#!/usr/bin/env bun

/**
 * Environment Validation Script
 * 
 * Validates .env file and required environment variables
 * Run with: bun scripts/validate-env.ts
 */

import { validateEnvironment, printEnvironmentSummary } from "../src/server/env-utils";
import { resolve } from "path";

const ENV_FILE_PATTERNS = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
];

async function main() {
  console.info("🔍 Environment Validation");
  console.info("=".repeat(60));

  // Check .env files
  console.info("\n📁 .env Files");
  console.info("-".repeat(30));

  let foundAny = false;
  for (const pattern of ENV_FILE_PATTERNS) {
    const path = resolve(pattern);
    const file = Bun.file(path);
    if (await file.exists()) {
      foundAny = true;
      const content = await file.text();
      const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      console.info(`  ✅ ${pattern} (${lines.length} variables)`);
    }
  }
  
  if (!foundAny) {
    console.info("  ⚠️  No .env files found");
    console.info("  💡 Copy .env.example to .env and configure");
  }

  // Validate environment
  console.info("\n🔐 Environment Validation");
  console.info("-".repeat(30));
  
  const result = validateEnvironment();
  
  if (result.valid) {
    console.info("  ✅ All critical checks passed");
  } else {
    console.info(`  ❌ ${result.errors.length} error(s) found`);
    for (const error of result.errors) {
      console.info(`     - ${error}`);
    }
  }
  
  if (result.warnings.length > 0) {
    console.info(`\n  ⚠️  ${result.warnings.length} warning(s):`);
    for (const warning of result.warnings) {
      console.info(`     - ${warning}`);
    }
  }

  // Print summary
  console.info("");
  printEnvironmentSummary();
  
  // Exit code
  if (!result.valid) {
    console.info("❌ Validation failed");
    process.exit(1);
  }
  
  console.info("✅ Environment validation complete");
}

main().catch((error) => {
  console.error("Validation error:", error);
  process.exit(1);
});
