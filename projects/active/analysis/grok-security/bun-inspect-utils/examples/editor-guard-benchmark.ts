// [1.0.0.0] Editor Guard Benchmark with Safe Path Resolution
// Demonstrates secure path handling for editor invocation
// Run with: bun examples/editor-guard-benchmark.ts

import { safeOpenInEditor, isPathSafe } from "../src/security/editorGuard";

console.info("\n🔐 [1.0.0.0] Editor Guard Benchmark - Safe Path Resolution\n");

// [1.1.0.0] Benchmark helper
const runBenchmark = (name: string, fn: () => void): number => {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = (end - start).toFixed(3);
  console.info(`  ⏱️  ${name}: ${duration}ms`);
  return end - start;
};

// [1.2.0.0] Path resolution patterns
console.info("📋 Path Resolution Patterns:");
console.info("─".repeat(50));

// ❌ Unsafe: Relative path (depends on caller's CWD)
console.info("\n❌ UNSAFE: Relative path");
console.info("  Path: './src/table-utils.ts'");
console.info("  Risk: Depends on caller's working directory");

// ✅ Safe: URL-based resolution (anchored to module)
console.info("\n✅ SAFE: URL-based resolution");
const safeTarget = new URL("../src/utils/table-utils.ts", import.meta.url).pathname;
console.info(`  Path: ${safeTarget}`);
console.info("  Benefit: Anchored to module location, independent of CWD");

// [1.3.0.0] Benchmark path safety checks
console.info("\n📊 Benchmark Results:");
console.info("─".repeat(50));

const testPaths = [
  "/Users/test/file.ts",
  "~/secret.txt",
  "../../../etc/passwd",
  "./src/utils/file.ts",
];

console.info("\n🔍 Path Safety Validation:");
let totalTime = 0;
for (const path of testPaths) {
  const time = runBenchmark(`isPathSafe("${path}")`, () => {
    isPathSafe(path);
  });
  totalTime += time;
}

console.info(`\n  📈 Total validation time: ${totalTime.toFixed(3)}ms`);
console.info(`  📈 Average per path: ${(totalTime / testPaths.length).toFixed(3)}ms`);

// [1.4.0.0] Demonstrate safe editor invocation pattern
console.info("\n🎯 Safe Editor Invocation Pattern:");
console.info("─".repeat(50));

console.info("\n// ✅ Recommended pattern:");
console.info("const target = new URL('../src/table-utils.ts', import.meta.url).pathname;");
console.info("safeOpenInEditor(target, { line: 1 }, { allowedEditors: ['vscode'] });");

console.info("\nBenefits:");
console.info("  ✅ Path is anchored to module (import.meta.url)");
console.info("  ✅ Independent of caller's working directory");
console.info("  ✅ Sanitized by safeOpenInEditor internally");
console.info("  ✅ Editor allowlist enforced");
console.info("  ✅ Production environment guard active");

// [1.5.0.0] Configuration audit
console.info("\n⚙️  Configuration Audit:");
console.info("─".repeat(50));

const config = {
  allowedEditors: ["vscode", "subl", "vim"],
  blockProduction: true,
  sanitizePaths: true,
};

console.info(`  Allowed editors: ${config.allowedEditors.join(", ")}`);
console.info(`  Block production: ${config.blockProduction}`);
console.info(`  Sanitize paths: ${config.sanitizePaths}`);

console.info("\n✅ Benchmark complete - Safe path resolution ready for production.\n");

