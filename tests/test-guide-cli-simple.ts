#!/usr/bin/env bun
/**
 * Simple direct test of guide-cli.ts
 * This actually runs guide-cli.ts to verify it works
 */

console.info("🧪 Testing guide-cli.ts directly...\n");

// Test 1: Show help (no args)
console.info("1️⃣  Testing help output:");
const helpResult = Bun.spawnSync(["bun", "../utils/guide-cli.ts"]);
const helpOutput = helpResult.stdout.toString() + helpResult.stderr.toString();
if (helpOutput.includes("Usage:") && helpResult.exitCode === 1) {
  console.info("✅ Shows usage and exits with code 1\n");
} else {
  console.info("❌ Help test failed\n");
  console.info("Exit code:", helpResult.exitCode);
  console.info("Output:", helpOutput.substring(0, 200));
}

// Test 2: Missing project
console.info("2️⃣  Testing missing project:");
const missingResult = Bun.spawnSync(["bun", "../utils/guide-cli.ts", "--project", "nonexistent", "--bin", "bun"]);
const missingOutput = missingResult.stdout.toString() + missingResult.stderr.toString();
if (missingOutput.includes("not found") && missingResult.exitCode === 1) {
  console.info("✅ Properly handles missing project\n");
} else {
  console.info("❌ Missing project test failed\n");
  console.info("Exit code:", missingResult.exitCode);
  console.info("Output:", missingOutput.substring(0, 200));
}

// Test 3: Try to resolve bun in my-bun-app (with diagnostics)
console.info("3️⃣  Testing binary resolution with diagnostics:");
const diagResult = Bun.spawnSync(["bun", "../utils/guide-cli.ts", "--project", "my-bun-app", "--bin", "bun", "--diagnostics"]);
const diagOutput = diagResult.stdout.toString() + diagResult.stderr.toString();
if (diagOutput.includes("Found:") || diagOutput.includes("Searched:")) {
  console.info("✅ Binary resolution with diagnostics works\n");
} else {
  console.info("⚠️  Diagnostics test - check output below:");
  console.info(diagOutput);
  console.info("");
}

// Test 4: Check that entry guard works (importing should exit)
console.info("4️⃣  Testing entry guard via import:");
const importResult = Bun.spawnSync(["bun", "-e", "import('../utils/guide-cli.ts')"]);
if (importResult.exitCode === 0) {
  console.info("✅ Import exits with code 0 (guard active)\n");
} else {
  console.info("❌ Entry guard test failed (exit code should be 0)\n");
}

console.info("═══════════════════════════════════════════════════════");
console.info("Manual test complete. Check output above for any ❌ marks");
console.info("═══════════════════════════════════════════════════════");