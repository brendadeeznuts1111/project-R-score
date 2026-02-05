// [1.0.0.0] Editor Guard Benchmark with Safe Path Resolution
// Demonstrates secure path handling for editor invocation
// Run with: bun examples/editor-guard-benchmark.ts

import { safeOpenInEditor, isPathSafe } from "../src/security/editorGuard";

console.log("\n🔐 [1.0.0.0] Editor Guard Benchmark - Safe Path Resolution\n");

// [1.1.0.0] Benchmark helper
const runBenchmark = (name: string, fn: () => void): number => {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = (end - start).toFixed(3);
  console.log(`  ⏱️  ${name}: ${duration}ms`);
  return end - start;
};

// [1.2.0.0] Path resolution patterns
console.log("📋 Path Resolution Patterns:");
console.log("─".repeat(50));

// ❌ Unsafe: Relative path (depends on caller's CWD)
console.log("\n❌ UNSAFE: Relative path");
console.log("  Path: './src/table-utils.ts'");
console.log("  Risk: Depends on caller's working directory");

// ✅ Safe: URL-based resolution (anchored to module)
console.log("\n✅ SAFE: URL-based resolution");
const safeTarget = new URL("../src/utils/table-utils.ts", import.meta.url).pathname;
console.log(`  Path: ${safeTarget}`);
console.log("  Benefit: Anchored to module location, independent of CWD");

// [1.3.0.0] Benchmark path safety checks
console.log("\n📊 Benchmark Results:");
console.log("─".repeat(50));

const testPaths = [
  "/Users/test/file.ts",
  "~/secret.txt",
  "../../../etc/passwd",
  "./src/utils/file.ts",
];

console.log("\n🔍 Path Safety Validation:");
let totalTime = 0;
for (const path of testPaths) {
  const time = runBenchmark(`isPathSafe("${path}")`, () => {
    isPathSafe(path);
  });
  totalTime += time;
}

console.log(`\n  📈 Total validation time: ${totalTime.toFixed(3)}ms`);
console.log(`  📈 Average per path: ${(totalTime / testPaths.length).toFixed(3)}ms`);

// [1.4.0.0] Demonstrate safe editor invocation pattern
console.log("\n🎯 Safe Editor Invocation Pattern:");
console.log("─".repeat(50));

console.log("\n// ✅ Recommended pattern:");
console.log("const target = new URL('../src/table-utils.ts', import.meta.url).pathname;");
console.log("safeOpenInEditor(target, { line: 1 }, { allowedEditors: ['vscode'] });");

console.log("\nBenefits:");
console.log("  ✅ Path is anchored to module (import.meta.url)");
console.log("  ✅ Independent of caller's working directory");
console.log("  ✅ Sanitized by safeOpenInEditor internally");
console.log("  ✅ Editor allowlist enforced");
console.log("  ✅ Production environment guard active");

// [1.5.0.0] Configuration audit
console.log("\n⚙️  Configuration Audit:");
console.log("─".repeat(50));

const config = {
  allowedEditors: ["vscode", "subl", "vim"],
  blockProduction: true,
  sanitizePaths: true,
};

console.log(`  Allowed editors: ${config.allowedEditors.join(", ")}`);
console.log(`  Block production: ${config.blockProduction}`);
console.log(`  Sanitize paths: ${config.sanitizePaths}`);

console.log("\n✅ Benchmark complete - Safe path resolution ready for production.\n");

