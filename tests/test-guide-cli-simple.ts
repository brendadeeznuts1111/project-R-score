#!/usr/bin/env bun
/**
 * Simple direct test of guide-cli.ts
 * This actually runs guide-cli.ts to verify it works
 */

console.log("🧪 Testing guide-cli.ts directly...\n");

// Test 1: Show help (no args)
console.log("1️⃣  Testing help output:");
const helpResult = Bun.spawnSync(["bun", "../guide-cli.ts"]);
const helpOutput = helpResult.stdout.toString() + helpResult.stderr.toString();
if (helpOutput.includes("Usage:") && helpResult.exitCode === 1) {
  console.log("✅ Shows usage and exits with code 1\n");
} else {
  console.log("❌ Help test failed\n");
  console.log("Exit code:", helpResult.exitCode);
  console.log("Output:", helpOutput.substring(0, 200));
}

// Test 2: Missing project
console.log("2️⃣  Testing missing project:");
const missingResult = Bun.spawnSync(["bun", "../guide-cli.ts", "--project", "nonexistent", "--bin", "bun"]);
const missingOutput = missingResult.stdout.toString() + missingResult.stderr.toString();
if (missingOutput.includes("not found") && missingResult.exitCode === 1) {
  console.log("✅ Properly handles missing project\n");
} else {
  console.log("❌ Missing project test failed\n");
  console.log("Exit code:", missingResult.exitCode);
  console.log("Output:", missingOutput.substring(0, 200));
}

// Test 3: Try to resolve bun in my-bun-app (with diagnostics)
console.log("3️⃣  Testing binary resolution with diagnostics:");
const diagResult = Bun.spawnSync(["bun", "../guide-cli.ts", "--project", "my-bun-app", "--bin", "bun", "--diagnostics"]);
const diagOutput = diagResult.stdout.toString() + diagResult.stderr.toString();
if (diagOutput.includes("Found:") || diagOutput.includes("Searched:")) {
  console.log("✅ Binary resolution with diagnostics works\n");
} else {
  console.log("⚠️  Diagnostics test - check output below:");
  console.log(diagOutput);
  console.log("");
}

// Test 4: Check that entry guard works (importing should exit)
console.log("4️⃣  Testing entry guard via import:");
const importResult = Bun.spawnSync(["bun", "-e", "import('../guide-cli.ts')"]);
if (importResult.exitCode === 0) {
  console.log("✅ Import exits with code 0 (guard active)\n");
} else {
  console.log("❌ Entry guard test failed (exit code should be 0)\n");
}

console.log("═══════════════════════════════════════════════════════");
console.log("Manual test complete. Check output above for any ❌ marks");
console.log("═══════════════════════════════════════════════════════");