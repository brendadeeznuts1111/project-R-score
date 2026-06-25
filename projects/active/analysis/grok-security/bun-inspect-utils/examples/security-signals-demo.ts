// [1.0.0.0] SECURITY + SIGNALS DEMO
// Bun-native editor guard + tension signal integration
// Financial-grade security with zero dependencies

import { safeOpenInEditor, isPathSafe, getEditorConfig } from "../src/security/editorGuard";
import { tensionSignal } from "../src/signals/tensionSignal";

console.info("\n🔐 [1.0.0.0] SECURITY + SIGNALS DEMO\n");

// [1.1.0.0] Editor Guard Demo
console.info("📋 [1.1.0.0] Editor Guard - Path Safety Validation");
console.info("─".repeat(50));

const testPaths = [
  "/Users/test/file.ts",
  "~/secret.txt",
  "../../../etc/passwd",
  "./src/utils/file.ts",
];

for (const path of testPaths) {
  const safe = isPathSafe(path);
  console.info(`  ${safe ? "✅" : "❌"} ${path}`);
}
console.info();

// [1.2.0.0] Editor Configuration
console.info("⚙️  [1.2.0.0] Editor Configuration");
console.info("─".repeat(50));
const config = getEditorConfig();
console.info(`  Allowed editors: ${config.allowedEditors.join(", ")}`);
console.info(`  Block production: ${config.blockProduction}`);
console.info(`  Sanitize paths: ${config.sanitizePaths}`);
console.info();

// [2.0.0.0] Tension Signal Demo
console.info("📊 [2.0.0.0] Tension Signal - State Management");
console.info("─".repeat(50));

// Setup callbacks
tensionSignal.onStateChange = (state) => {
  console.info(`  📈 State: tension=${state.value}, errors=${state.errorCount}, healthy=${state.isHealthy}`);
};

tensionSignal.onWarning = (msg) => {
  console.info(`  ⚠️  ${msg}`);
};

tensionSignal.onError = (error) => {
  console.info(`  🔥 Error: ${error.message} (severity: ${error.severity})`);
};

// [2.1.0.0] Normal operation
console.info("\n🟢 Normal Operation:");
tensionSignal.set(30);
tensionSignal.set(45);

// [2.2.0.0] Warning state
console.info("\n🟡 Warning State:");
tensionSignal.set(60);
tensionSignal.set(75);

// [2.3.0.0] Critical state
console.info("\n🔴 Critical State:");
tensionSignal.set(85);

// [2.4.0.0] Error handling
console.info("\n⚠️  Error Handling:");
const error = new Error("Financial validation failed");
(error as any).severity = "high";
tensionSignal.triggerError(error);

// [2.5.0.0] Health status
console.info("\n💊 Health Status:");
const health = tensionSignal.getHealth();
console.info(`  Status: ${health.status.toUpperCase()}`);
console.info(`  Tension: ${health.tension}/100`);
console.info(`  Errors: ${health.errors}`);

// [2.6.0.0] Reset
console.info("\n🔄 Reset to Healthy:");
tensionSignal.reset();
const resetHealth = tensionSignal.getHealth();
console.info(`  Status: ${resetHealth.status.toUpperCase()}`);
console.info(`  Tension: ${resetHealth.tension}/100`);

console.info("\n✅ Demo complete! Security + Signals ready for production.\n");

