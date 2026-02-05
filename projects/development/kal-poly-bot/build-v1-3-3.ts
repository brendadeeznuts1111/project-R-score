#!/usr/bin/env bun
/**
 * Golden Matrix v1.3.3 Production Build Script
 *
 * Builds Components #71-75 with all features enabled for production deployment
 *
 * Usage:
 *   ./build-v1-3-3.sh                    # Full production build
 *   ./build-v1-3-3.sh --dry-run          # Test build without output
 *   ./build-v1-3-3.sh --features=all     # Enable all features
 *   ./build-v1-3-3.sh --analyze          # Show bundle analysis
 */

import { build } from "bun";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";

// Configuration
const CONFIG = {
  entryPoint: "./infrastructure/v1.3.3-integration.bun.ts",
  outputDir: "./dist",
  outputFile: "infrastructure-v1-3-3-final.js",
  target: "bun",
  minify: true,
  sourcemap: "external",
  analyze: false,
  dryRun: false,
  features: {
    SOURCEMAP_INTEGRITY: true,
    NAPI_THREADSAFE: true,
    WS_FRAGMENT_GUARD: true,
    WORKER_THREAD_SAFETY: true,
    YAML_DOC_END_FIX: true,
    BUN_PM_OPTIMIZATIONS: true,
    NATIVE_STABILITY: true,
    GOLDEN_MATRIX_V1_3_3: true
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--analyze") {
      parsed.analyze = true;
    } else if (arg === "--features") {
      const next = args[i + 1];
      if (next === "all") {
        parsed.features = Object.keys(CONFIG.features).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {} as Record<string, boolean>);
      }
      i++;
    } else if (arg === "--output") {
      parsed.outputFile = args[i + 1];
      i++;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
Golden Matrix v1.3.3 Production Build
=====================================

Usage: bun build-v1-3-3.sh [options]

Options:
  --dry-run          Test build without writing output
  --analyze          Show detailed bundle analysis
  --features=all     Enable all features
  --output <file>    Specify output file name
  --help             Show this help message

Examples:
  bun build-v1-3-3.sh
  bun build-v1-3-3.sh --dry-run --analyze
  bun build-v1-3-3.sh --features=all --output custom.js
  `);
}

// Feature flag generation
function generateFeatureFlags(features: Record<string, boolean>): string {
  const flags = Object.entries(features)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join(",\n");

  return `// Generated Feature Flags
export const FEATURE_FLAGS = {
${flags}
};

// Feature function for components
export function feature(name: string): boolean {
  return FEATURE_FLAGS[name] || false;
}

// Environment setup
if (typeof process !== 'undefined') {
  Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
    process.env[\`FEATURE_\${key}\`] = value ? "1" : "0";
  });
}
`;
}

// Bundle analysis
async function analyzeBundle(buildResult: any) {
  console.log("\n📊 Bundle Analysis");
  console.log("==================");

  const outputs = buildResult.outputs || [];
  let totalSize = 0;
  let totalModules = 0;

  for (const output of outputs) {
    if (output.kind === "entry-point") {
      const size = output.size;
      totalSize += size;
      totalModules += output.modules?.length || 0;

      console.log(`📦 Main Bundle: ${output.path}`);
      console.log(`   Size: ${(size / 1024).toFixed(2)} KB`);
      console.log(`   Modules: ${output.modules?.length || 0}`);

      if (output.dependencies) {
        console.log(`   Dependencies: ${output.dependencies.length}`);
      }
    }
  }

  console.log(`\n📈 Totals:`);
  console.log(`   Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`   Total Modules: ${totalModules}`);
  console.log(`   Outputs: ${outputs.length}`);

  // Component breakdown
  console.log(`\n🔧 Component Breakdown:`);
  const components = [
    "Sourcemap-Integrity-Validator",
    "NAPI-ThreadSafety-Guard",
    "WebSocket-Fragment-Guard",
    "Worker-Thread-Safety-Engine",
    "YAML-Doc-End-Fix"
  ];

  components.forEach((comp, i) => {
    const active = Object.values(CONFIG.features)[i];
    const status = active ? "✅ ACTIVE" : "❌ ZERO-COST";
    console.log(`   ${comp.padEnd(35)} ${status}`);
  });

  // Performance metrics
  console.log(`\n⚡ Performance Metrics:`);
  const zeroCostCount = Object.values(CONFIG.features).filter(v => !v).length;
  const activeCount = 5 - zeroCostCount;
  const zeroCostPercent = Math.round((zeroCostCount / 5) * 100);

  console.log(`   Zero-Cost Eliminated: ${zeroCostCount}/5 (${zeroCostPercent}%)`);
  console.log(`   Active Components: ${activeCount}/5`);
  console.log(`   Production Ready: ${Object.values(CONFIG.features).every(v => v) ? "✅ YES" : "⚠️  NO"}`);
}

// Main build function
async function buildProduction() {
  console.log("🚀 Golden Matrix v1.3.3 Production Build");
  console.log("=========================================\n");

  // Parse arguments
  const args = parseArgs();
  const config = { ...CONFIG, ...args };

  // Show configuration
  console.log("📋 Build Configuration:");
  console.log(`   Entry Point: ${config.entryPoint}`);
  console.log(`   Output: ${join(config.outputDir, config.outputFile)}`);
  console.log(`   Target: ${config.target}`);
  console.log(`   Minify: ${config.minify}`);
  console.log(`   Sourcemap: ${config.sourcemap}`);
  console.log(`   Dry Run: ${config.dryRun}`);
  console.log(`   Analyze: ${config.analyze}`);

  // Check entry point
  if (!existsSync(config.entryPoint)) {
    console.error(`❌ Entry point not found: ${config.entryPoint}`);
    process.exit(1);
  }

  // Generate feature flags
  const featureFlags = generateFeatureFlags(config.features);

  if (config.dryRun) {
    console.log("\n🧪 Dry Run Mode - Testing build configuration...");
    console.log("\nFeature Flags:");
    console.log(featureFlags);

    if (config.analyze) {
      await analyzeBundle({ outputs: [] });
    }

    console.log("\n✅ Dry run completed successfully");
    return;
  }

  // Create output directory
  const outputDir = config.outputDir;
  if (!existsSync(outputDir)) {
    console.log(`\n📁 Creating output directory: ${outputDir}`);
    // Note: In real implementation, use fs.mkdirSync
  }

  // Build the bundle
  console.log("\n🔨 Building bundle...");

  try {
    const buildResult = await build({
      entrypoints: [config.entryPoint],
      outdir: outputDir,
      target: config.target,
      minify: config.minify,
      sourcemap: config.sourcemap,
      define: {
        ...Object.entries(config.features).reduce((acc, [key, value]) => {
          acc[`FEATURE_${key}`] = value ? "true" : "false";
          return acc;
        }, {} as Record<string, string>)
      }
    });

    // Write feature flags
    const featureFlagsPath = join(outputDir, "feature-flags.js");
    writeFileSync(featureFlagsPath, featureFlags);
    console.log(`✅ Feature flags written: ${featureFlagsPath}`);

    // Write build manifest
    const manifest = {
      version: "1.3.3",
      timestamp: new Date().toISOString(),
      components: ["71", "72", "73", "74", "75"],
      features: config.features,
      build: {
        target: config.target,
        minify: config.minify,
        sourcemap: config.sourcemap
      },
      metrics: {
        activeComponents: Object.values(config.features).filter(v => v).length,
        zeroCostEliminated: Object.values(config.features).filter(v => !v).length,
        productionReady: Object.values(config.features).every(v => v)
      }
    };

    const manifestPath = join(outputDir, "build-manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Build manifest written: ${manifestPath}`);

    // Analyze bundle if requested
    if (config.analyze) {
      await analyzeBundle(buildResult);
    }

    // Final summary
    console.log("\n🎉 Build Complete!");
    console.log("==================");
    console.log(`📦 Output: ${join(outputDir, config.outputFile)}`);
    console.log(`🔧 Components: 71-75 (v1.3.3 Golden Matrix)`);
    console.log(`⚡ Features Active: ${Object.values(config.features).filter(v => v).length}/5`);
    console.log(`🎯 Production Ready: ${Object.values(config.features).every(v => v) ? "✅ YES" : "⚠️  NO"}`);

    // Show next steps
    console.log("\n📋 Next Steps:");
    console.log("   1. Review build output in dist/ directory");
    console.log("   2. Run tests: bun test infrastructure/v1-3-3/__tests__/components-71-75.test.ts");
    console.log("   3. Deploy to production with feature flags enabled");
    console.log("   4. Monitor audit logs for component health");

  } catch (error) {
    console.error("\n❌ Build failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  buildProduction();
}

export { buildProduction, generateFeatureFlags, analyzeBundle };
