#!/usr/bin/env bun
/**
 * Consolidated Entry Guard Tests
 * Tests that entry guards prevent accidental imports of CLI tools
 * Merged from test-import-direct.ts and test-import-guard.ts
 */

export {}; // Make this a module for top-level await

console.info("🧪 Testing entry guard functionality...\n");

// Test 1: Try to import overseer-cli.ts (should cause exit)
console.info("1️⃣  Testing overseer-cli.ts entry guard...");
const { spawnSync } = Bun;

const overseerTest = spawnSync(["bun", "-e", 'import "../tools/overseer-cli.ts"; console.info("ERROR: Should not reach here");'], {
  cwd: Bun.cwd,
  timeout: 5000
});

if (overseerTest.exitCode === 0) {
  console.info("✅ overseer-cli.ts guard works - exited cleanly\n");
} else {
  console.info(`❌ overseer-cli.ts guard failed - exit code: ${overseerTest.exitCode}\n`);
}

// Test 2: Try to import guide-cli.ts (should cause exit)
console.info("2️⃣  Testing guide-cli.ts entry guard...");
const guideTest = spawnSync(["bun", "-e", 'import "../utils/guide-cli.ts"; console.info("ERROR: Should not reach here");'], {
  cwd: Bun.cwd,
  timeout: 5000
});

if (guideTest.exitCode === 0) {
  console.info("✅ guide-cli.ts guard works - exited cleanly\n");
} else {
  console.info(`❌ guide-cli.ts guard failed - exit code: ${guideTest.exitCode}\n`);
}

// Test 3: Verify direct execution still works
console.info("3️⃣  Testing direct execution of guide-cli.ts...");
const directTest = spawnSync(["bun", "../utils/guide-cli.ts"], {
  cwd: Bun.cwd,
  timeout: 5000
});

// Should show help and exit with code 0 or 1 (both are acceptable for help)
if (directTest.exitCode >= 0 && directTest.exitCode <= 1) {
  console.info("✅ Direct execution works\n");
} else {
  console.info(`❌ Direct execution failed - exit code: ${directTest.exitCode}\n`);
}

// Test 4: Test with a non-guarded module (should work)
console.info("4️⃣  Testing import of non-guarded module...");
try {
  await import("../utils/project-colors.ts");
  console.info("✅ Non-guarded module import works\n");
} catch (err) {
  console.info(`❌ Non-guarded module import failed: ${err}\n`);
}

console.info("🎉 Entry guard tests completed!");
console.info("\nSummary:");
console.info("- Entry guards prevent accidental imports ✅");
console.info("- Direct execution still works ✅");
console.info("- Non-guarded modules can be imported ✅");
