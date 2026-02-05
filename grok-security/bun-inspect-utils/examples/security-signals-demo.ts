// [1.0.0.0] SECURITY + SIGNALS DEMO
// Bun-native editor guard + tension signal integration
// Financial-grade security with zero dependencies

import { safeOpenInEditor, isPathSafe, getEditorConfig } from "../src/security/editorGuard";
import { tensionSignal } from "../src/signals/tensionSignal";

console.log("\n🔐 [1.0.0.0] SECURITY + SIGNALS DEMO\n");

// [1.1.0.0] Editor Guard Demo
console.log("📋 [1.1.0.0] Editor Guard - Path Safety Validation");
console.log("─".repeat(50));

const testPaths = [
  "/Users/test/file.ts",
  "~/secret.txt",
  "../../../etc/passwd",
  "./src/utils/file.ts",
];

for (const path of testPaths) {
  const safe = isPathSafe(path);
  console.log(`  ${safe ? "✅" : "❌"} ${path}`);
}
console.log();

// [1.2.0.0] Editor Configuration
console.log("⚙️  [1.2.0.0] Editor Configuration");
console.log("─".repeat(50));
const config = getEditorConfig();
console.log(`  Allowed editors: ${config.allowedEditors.join(", ")}`);
console.log(`  Block production: ${config.blockProduction}`);
console.log(`  Sanitize paths: ${config.sanitizePaths}`);
console.log();

// [2.0.0.0] Tension Signal Demo
console.log("📊 [2.0.0.0] Tension Signal - State Management");
console.log("─".repeat(50));

// Setup callbacks
tensionSignal.onStateChange = (state) => {
  console.log(`  📈 State: tension=${state.value}, errors=${state.errorCount}, healthy=${state.isHealthy}`);
};

tensionSignal.onWarning = (msg) => {
  console.log(`  ⚠️  ${msg}`);
};

tensionSignal.onError = (error) => {
  console.log(`  🔥 Error: ${error.message} (severity: ${error.severity})`);
};

// [2.1.0.0] Normal operation
console.log("\n🟢 Normal Operation:");
tensionSignal.set(30);
tensionSignal.set(45);

// [2.2.0.0] Warning state
console.log("\n🟡 Warning State:");
tensionSignal.set(60);
tensionSignal.set(75);

// [2.3.0.0] Critical state
console.log("\n🔴 Critical State:");
tensionSignal.set(85);

// [2.4.0.0] Error handling
console.log("\n⚠️  Error Handling:");
const error = new Error("Financial validation failed");
(error as any).severity = "high";
tensionSignal.triggerError(error);

// [2.5.0.0] Health status
console.log("\n💊 Health Status:");
const health = tensionSignal.getHealth();
console.log(`  Status: ${health.status.toUpperCase()}`);
console.log(`  Tension: ${health.tension}/100`);
console.log(`  Errors: ${health.errors}`);

// [2.6.0.0] Reset
console.log("\n🔄 Reset to Healthy:");
tensionSignal.reset();
const resetHealth = tensionSignal.getHealth();
console.log(`  Status: ${resetHealth.status.toUpperCase()}`);
console.log(`  Tension: ${resetHealth.tension}/100`);

console.log("\n✅ Demo complete! Security + Signals ready for production.\n");

