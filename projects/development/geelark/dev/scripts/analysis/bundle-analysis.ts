#!/usr/bin/env bun
/**
 * Bundle Analysis Tool for Bun Feature Flags
 * Measures dead code elimination and bundle size impact
 */

import { execSync } from "child_process";
import { statSync } from "fs";

interface BuildResult {
  name: string;
  features: string[];
  size: number;
  path: string;
  buildTime: number;
}

interface AnalysisResult {
  builds: BuildResult[];
  comparisons: {
    [key: string]: {
      sizeReduction: number;
      sizeReductionPercent: number;
      deadCodeEliminated: string;
    };
  };
}

const BUILD_CONFIGS = [
  {
    name: "development",
    features: ["ENV_DEVELOPMENT", "FEAT_EXTENDED_LOGGING", "FEAT_MOCK_API"],
    minify: false,
  },
  {
    name: "prod-lite",
    features: ["ENV_PRODUCTION", "FEAT_ENCRYPTION"],
    minify: true,
  },
  {
    name: "prod-standard",
    features: [
      "ENV_PRODUCTION",
      "FEAT_AUTO_HEAL",
      "FEAT_NOTIFICATIONS",
      "FEAT_ENCRYPTION",
      "FEAT_BATCH_PROCESSING",
    ],
    minify: true,
  },
  {
    name: "prod-premium",
    features: [
      "ENV_PRODUCTION",
      "FEAT_PREMIUM",
      "FEAT_AUTO_HEAL",
      "FEAT_NOTIFICATIONS",
      "FEAT_ENCRYPTION",
      "FEAT_BATCH_PROCESSING",
      "FEAT_ADVANCED_MONITORING",
      "FEAT_EXTENDED_LOGGING",
      "FEAT_VALIDATION_STRICT",
    ],
    minify: true,
  },
  {
    name: "test",
    features: ["ENV_DEVELOPMENT", "FEAT_MOCK_API"],
    minify: false,
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function buildBundle(config: (typeof BUILD_CONFIGS)[0]): BuildResult {
  const startTime = Date.now();
  const outputPath = `dist/analysis-${config.name}.js`;

  // Build command with proper feature flags
  const featureFlags = config.features.map((f) => `--feature=${f}`).join(" ");
  const minifyFlag = config.minify ? "--minify" : "";

  const command = `bun build ${featureFlags} ${minifyFlag} src/index.ts --outfile=${outputPath}`;

  try {
    execSync(command, { stdio: "pipe" });
    const stats = statSync(outputPath);
    const buildTime = Date.now() - startTime;

    return {
      name: config.name,
      features: config.features,
      size: stats.size,
      path: outputPath,
      buildTime,
    };
  } catch (error) {
    console.error(`Failed to build ${config.name}:`, error);
    throw error;
  }
}

function analyzeBundles(builds: BuildResult[]): AnalysisResult {
  const comparisons: AnalysisResult["comparisons"] = {};

  // Compare each build to the base (development) build
  const baseBuild = builds.find((b) => b.name === "development");
  if (!baseBuild) throw new Error("Base build not found");

  builds.forEach((build) => {
    if (build.name === "development") return;

    const sizeReduction = baseBuild.size - build.size;
    const sizeReductionPercent = (sizeReduction / baseBuild.size) * 100;

    // Estimate dead code eliminated based on size reduction
    const deadCodeEliminated =
      sizeReductionPercent > 50
        ? "Excellent"
        : sizeReductionPercent > 30
        ? "Good"
        : sizeReductionPercent > 15
        ? "Moderate"
        : "Minimal";

    comparisons[build.name] = {
      sizeReduction,
      sizeReductionPercent,
      deadCodeEliminated,
    };
  });

  return {
    builds,
    comparisons,
  };
}

function printAnalysis(analysis: AnalysisResult): void {
  console.log("\n🔍 BUNDLE ANALYSIS REPORT");
  console.log("=".repeat(50));

  // Build results table
  console.log("\n📦 BUILD RESULTS:");
  console.log("| Build Name | Features | Size | Build Time |");
  console.log("|------------|----------|------|------------|");

  analysis.builds.forEach((build) => {
    const features = build.features.length;
    const size = formatBytes(build.size);
    const time = `${build.buildTime}ms`;
    console.log(
      `| ${build.name.padEnd(11)} | ${features
        .toString()
        .padEnd(8)} | ${size.padEnd(6)} | ${time.padEnd(10)} |`
    );
  });

  // Comparisons
  console.log("\n📊 DEAD CODE ELIMINATION:");
  console.log(
    "| Comparison | Size Reduction | % Reduction | Elimination Quality |"
  );
  console.log(
    "|------------|----------------|-------------|-------------------|"
  );

  Object.entries(analysis.comparisons).forEach(([name, comp]) => {
    const sizeRed = formatBytes(comp.sizeReduction);
    const percent = comp.sizeReductionPercent.toFixed(1) + "%";
    console.log(
      `| dev vs ${name.padEnd(12)} | ${sizeRed.padEnd(14)} | ${percent.padEnd(
        11
      )} | ${comp.deadCodeEliminated.padEnd(17)} |`
    );
  });

  // Feature impact analysis
  console.log("\n🎯 FEATURE IMPACT ANALYSIS:");
  const premiumBuild = analysis.builds.find((b) => b.name === "prod-premium");
  const liteBuild = analysis.builds.find((b) => b.name === "prod-lite");

  if (premiumBuild && liteBuild) {
    const premiumFeatures =
      premiumBuild.features.length - liteBuild.features.length;
    const sizeIncrease = premiumBuild.size - liteBuild.size;
    const sizePerFeature = sizeIncrease / premiumFeatures;

    console.log(
      `• Premium features add: ${formatBytes(
        sizeIncrease
      )} (${premiumFeatures} features)`
    );
    console.log(`• Average cost per feature: ${formatBytes(sizePerFeature)}`);
  }

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:");

  const bestElimination = Object.entries(analysis.comparisons).sort(
    ([, a], [, b]) => b.sizeReductionPercent - a.sizeReductionPercent
  )[0];

  if (bestElimination) {
    console.log(
      `• Best dead code elimination: ${
        bestElimination[0]
      } (${bestElimination[1].sizeReductionPercent.toFixed(1)}%)`
    );
  }

  const fastestBuild = analysis.builds.reduce((min, build) =>
    build.buildTime < min.buildTime ? build : min
  );

  console.log(
    `• Fastest build: ${fastestBuild.name} (${fastestBuild.buildTime}ms)`
  );

  const smallestBuild = analysis.builds.reduce((min, build) =>
    build.size < min.size ? build : min
  );

  console.log(
    `• Smallest bundle: ${smallestBuild.name} (${formatBytes(
      smallestBuild.size
    )})`
  );

  console.log("\n🚀 OPTIMIZATION TIPS:");
  console.log("• Use --minify for production builds");
  console.log("• Combine feature flags for maximum elimination");
  console.log("• Consider feature dependencies to avoid conflicts");
  console.log("• Test different feature combinations");
}

function cleanup(): void {
  try {
    execSync("rm -f dist/analysis-*.js", { stdio: "pipe" });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function main(): Promise<void> {
  console.log("🔍 Starting Bundle Analysis...\n");

  try {
    // Clean up previous analysis files
    cleanup();

    // Build all configurations
    const builds: BuildResult[] = [];
    for (const config of BUILD_CONFIGS) {
      console.log(`📦 Building ${config.name}...`);
      const build = buildBundle(config);
      builds.push(build);
      console.log(
        `✅ ${config.name}: ${formatBytes(build.size)} (${build.buildTime}ms)`
      );
    }

    // Analyze results
    const analysis = analyzeBundles(builds);

    // Print comprehensive analysis
    printAnalysis(analysis);

    // Cleanup
    cleanup();

    console.log("\n✨ Bundle analysis complete!");
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { analyzeBundles, buildBundle, printAnalysis };
