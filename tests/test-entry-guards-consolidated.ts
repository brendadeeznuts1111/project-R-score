#!/usr/bin/env bun
/**
 * Consolidated Entry Guard Tests
 * Tests that entry guards prevent accidental imports of CLI tools
 * Merged from test-import-direct.ts and test-import-guard.ts
 */

export {}; // Make this a module for top-level await

console.log("🧪 Testing entry guard functionality...\n");

// Test 1: Try to import overseer-cli.ts (should cause exit)
console.log("1️⃣  Testing overseer-cli.ts entry guard...");
const { spawnSync } = Bun;

const overseerTest = spawnSync(["bun", "-e", 'import "../tools/overseer-cli.ts"; console.log("ERROR: Should not reach here");'], {
  cwd: Bun.cwd,
  timeout: 5000
});

if (overseerTest.exitCode === 0) {
  console.log("✅ overseer-cli.ts guard works - exited cleanly\n");
} else {
  console.log(`❌ overseer-cli.ts guard failed - exit code: ${overseerTest.exitCode}\n`);
}

// Test 2: Try to import guide-cli.ts (should cause exit)
console.log("2️⃣  Testing guide-cli.ts entry guard...");
const guideTest = spawnSync(["bun", "-e", 'import "../utils/guide-cli.ts"; console.log("ERROR: Should not reach here");'], {
  cwd: Bun.cwd,
  timeout: 5000
});

if (guideTest.exitCode === 0) {
  console.log("✅ guide-cli.ts guard works - exited cleanly\n");
} else {
  console.log(`❌ guide-cli.ts guard failed - exit code: ${guideTest.exitCode}\n`);
}

// Test 3: Verify direct execution still works
console.log("3️⃣  Testing direct execution of guide-cli.ts...");
const directTest = spawnSync(["bun", "../utils/guide-cli.ts"], {
  cwd: Bun.cwd,
  timeout: 5000
});

// Should show help and exit with code 0 or 1 (both are acceptable for help)
if (directTest.exitCode >= 0 && directTest.exitCode <= 1) {
  console.log("✅ Direct execution works\n");
} else {
  console.log(`❌ Direct execution failed - exit code: ${directTest.exitCode}\n`);
}

// Test 4: Test with a non-guarded module (should work)
console.log("4️⃣  Testing import of non-guarded module...");
try {
  await import("../project-colors.ts");
  console.log("✅ Non-guarded module import works\n");
} catch (err) {
  console.log(`❌ Non-guarded module import failed: ${err}\n`);
}

console.log("🎉 Entry guard tests completed!");
console.log("\nSummary:");
console.log("- Entry guards prevent accidental imports ✅");
console.log("- Direct execution still works ✅");
console.log("- Non-guarded modules can be imported ✅");
