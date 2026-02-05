/**
 * Bundle Analysis Integration Script
 * Run: bun run scripts/analyze-bundle.ts
 */

import { BundleMatrixAnalyzer } from "../src/analyzers/BundleMatrix";

async function main() {
  console.log("🐰 Analyzing bundle with Bun-native DuoPlus...\n");

  // Analyze the main project
  const matrix = await BundleMatrixAnalyzer.analyzeProject(
    [
      "./src/main.ts",
      "./src/config/scope.config.ts",
      "./src/config/matrix.loader.ts"
    ],
    {
      outdir: "./dist",
      target: "bun",
      minify: true,
      external: ["bun"],
      verbose: true
    }
  );

  // Export metrics
  await BundleMatrixAnalyzer.exportMetrics(matrix, "./metrics/bundle-latest.json");

  // Check if we have previous metrics for comparison
  const previousMetrics = await BundleMatrixAnalyzer.loadMetrics(
    "./metrics/bundle-previous.json"
  );

  if (previousMetrics) {
    const comparison = BundleMatrixAnalyzer.compareAnalyses(
      previousMetrics,
      matrix
    );
    console.log("\n📈 COMPARISON WITH PREVIOUS BUILD");
    console.log("=".repeat(60));
    console.log(comparison.summary);
    console.log("=".repeat(60));

    // Fail CI if health dropped significantly
    if (comparison.healthChange < -10) {
      console.error("❌ Bundle health degraded by > 10 points!");
      process.exit(1);
    }
  }

  // Check compliance for CI/CD
  const allPassed = matrix.compliance.every(c => c.passed);
  if (!allPassed) {
    console.error("\n⚠️  COMPLIANCE CHECKS FAILED");
    const failed = matrix.compliance.filter(c => !c.passed);
    failed.forEach(check => {
      console.error(`  ✗ ${check.rule}: ${check.details}`);
    });
  }

  // Check health threshold
  if (matrix.summary.bundleHealth < 60) {
    console.error(
      `\n❌ Bundle health ${matrix.summary.bundleHealth}/100 below threshold (60)`
    );
    process.exit(1);
  }

  console.log("\n✅ All checks passed!");
  console.log(`🎯 Final health score: ${matrix.summary.bundleHealth}/100`);
}

main().catch(err => {
  console.error("❌ Analysis failed:", err);
  process.exit(1);
});
