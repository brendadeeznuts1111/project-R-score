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
  console.log("🔍 Environment Validation");
  console.log("=".repeat(60));

  // Check .env files
  console.log("\n📁 .env Files");
  console.log("-".repeat(30));

  let foundAny = false;
  for (const pattern of ENV_FILE_PATTERNS) {
    const path = resolve(pattern);
    const file = Bun.file(path);
    if (await file.exists()) {
      foundAny = true;
      const content = await file.text();
      const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      console.log(`  ✅ ${pattern} (${lines.length} variables)`);
    }
  }
  
  if (!foundAny) {
    console.log("  ⚠️  No .env files found");
    console.log("  💡 Copy .env.example to .env and configure");
  }

  // Validate environment
  console.log("\n🔐 Environment Validation");
  console.log("-".repeat(30));
  
  const result = validateEnvironment();
  
  if (result.valid) {
    console.log("  ✅ All critical checks passed");
  } else {
    console.log(`  ❌ ${result.errors.length} error(s) found`);
    for (const error of result.errors) {
      console.log(`     - ${error}`);
    }
  }
  
  if (result.warnings.length > 0) {
    console.log(`\n  ⚠️  ${result.warnings.length} warning(s):`);
    for (const warning of result.warnings) {
      console.log(`     - ${warning}`);
    }
  }

  // Print summary
  console.log("");
  printEnvironmentSummary();
  
  // Exit code
  if (!result.valid) {
    console.log("❌ Validation failed");
    process.exit(1);
  }
  
  console.log("✅ Environment validation complete");
}

main().catch((error) => {
  console.error("Validation error:", error);
  process.exit(1);
});
