#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Build configurations for different environments
const buildConfigs = {
  production: {
    features: ["CLOUD_UPLOAD", "AUDIT_LOG"],
    minify: true,
    outdir: "./dist/prod",
  },
  premium: {
    features: [
      "CLOUD_UPLOAD",
      "PREMIUM",
      "AUDIT_LOG",
      "METRICS",
      "ADVANCED_UI",
    ],
    minify: true,
    outdir: "./dist/premium",
  },
  development: {
    features: ["LOCAL_DEV", "DEBUG"],
    minify: false,
    outdir: "./dist/dev",
  },
  testing: {
    features: ["LOCAL_DEV", "DEBUG", "MOCK_API"],
    minify: false,
    outdir: "./dist/test",
  },
};

interface BuildResult {
  success: boolean;
  size: number;
  features: string[];
  duration: number;
  outputPath: string;
}

async function buildAll(): Promise<void> {
  console.log("🏗️  Building Dashboard for Multiple Environments\n");

  const results: Record<string, BuildResult> = {};

  for (const [env, config] of Object.entries(buildConfigs)) {
    console.log(
      `📦 Building ${env} with features: ${config.features.join(", ")}`
    );

    const startTime = performance.now();

    try {
      // Create output directory
      if (!existsSync(config.outdir)) {
        await Bun.$`mkdir -p ${config.outdir}`;
      }

      // Build using Bun CLI with features
      const featuresFlag = config.features
        .map((f) => `--features=${f}`)
        .join(" ");
      const minifyFlag = config.minify ? "--minify" : "";

      const buildCmd = `bun build ${featuresFlag} ${minifyFlag} src/main.ts --outdir ${config.outdir}`;

      console.log(`  Running: ${buildCmd}`);

      const result = await Bun.$`${buildCmd}`.quiet();

      const duration = performance.now() - startTime;

      if (result.exitCode === 0) {
        // Calculate bundle size
        const mainJsPath = join(config.outdir, "main.js");

        try {
          const stats = await Bun.file(mainJsPath).stat();
          const size = stats.size;

          results[env] = {
            success: true,
            size,
            features: config.features,
            duration,
            outputPath: config.outdir,
          };

          console.log(
            `  ✅ ${env}: ${(size / 1024).toFixed(2)} KB (${duration.toFixed(0)}ms)`
          );

          // Verify features
          await verifyFeatures(mainJsPath, config.features);
        } catch (fileError) {
          results[env] = {
            success: false,
            size: 0,
            features: config.features,
            duration,
            outputPath: config.outdir,
          };
          console.log(
            `  ⚠️  ${env}: Build completed but couldn't read output file`
          );
        }
      } else {
        results[env] = {
          success: false,
          size: 0,
          features: config.features,
          duration,
          outputPath: config.outdir,
        };

        console.log(
          `  ❌ ${env}: Build failed (exit code: ${result.exitCode})`
        );
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      results[env] = {
        success: false,
        size: 0,
        features: config.features,
        duration,
        outputPath: config.outdir,
      };

      console.log(`  ❌ ${env}: ${error}`);
    }

    console.log("");
  }

  // Show comparison table
  showComparisonTable(results);

  // Generate deployment scripts
  await generateDeploymentScripts(results);
}

async function verifyFeatures(
  bundlePath: string,
  expectedFeatures: string[]
): Promise<void> {
  try {
    const content = readFileSync(bundlePath, "utf-8");

    console.log("  🔍 Feature verification:");

    // Check that expected features are present
    for (const feature of expectedFeatures) {
      const featurePattern = new RegExp(`["']${feature}["']`, "i");
      if (featurePattern.test(content)) {
        console.log(`    ✅ ${feature}: Present`);
      } else {
        console.log(`    ⚠️  ${feature}: Not found (may be tree-shaken)`);
      }
    }

    // Check that debug code is properly eliminated in production
    if (!expectedFeatures.includes("DEBUG")) {
      const debugPatterns = ["console.log", "console.debug", "console.warn"];
      const debugFound = debugPatterns.some((pattern) =>
        content.includes(pattern)
      );

      if (!debugFound) {
        console.log(`    ✅ Debug code: Eliminated`);
      } else {
        console.log(`    ⚠️  Debug code: Still present`);
      }
    }
  } catch (error) {
    console.warn(`    ⚠️  Could not verify features: ${error}`);
  }
}

function showComparisonTable(results: Record<string, BuildResult>): void {
  console.log("📊 Build Comparison:");
  console.log("┌─────────────┬─────────────┬─────────────┬─────────────┐");
  console.log("│ Environment │ Size (KB)   │ Duration    │ Features    │");
  console.log("├─────────────┼─────────────┼─────────────┼─────────────┤");

  for (const [env, result] of Object.entries(results)) {
    const size = result.success ? `${(result.size / 1024).toFixed(2)}` : "N/A";
    const duration = `${result.duration.toFixed(0)}ms`;
    const features = result.features.length.toString();

    console.log(
      `│ ${env.padEnd(11)} │ ${size.padEnd(11)} │ ${duration.padEnd(11)} │ ${features.padEnd(11)} │`
    );
  }

  console.log("└─────────────┴─────────────┴─────────────┴─────────────┘");

  // Calculate size savings
  const premium = results.premium;
  const production = results.production;

  if (premium.success && production.success) {
    const savings = premium.size - production.size;
    const savingsPercent = ((savings / premium.size) * 100).toFixed(1);
    console.log(
      `\n💰 Size savings (Production vs Premium): ${(savings / 1024).toFixed(2)} KB (${savingsPercent}% smaller)`
    );
  }
}

async function generateDeploymentScripts(
  results: Record<string, BuildResult>
): Promise<void> {
  console.log("🚀 Generating deployment scripts...");

  // Generate deployment script for each environment
  for (const [env, result] of Object.entries(results)) {
    if (!result.success) continue;

    const script = generateDeployScript(env, result);
    const scriptPath = join(result.outputPath, "deploy.sh");

    writeFileSync(scriptPath, script);
    await Bun.$`chmod +x ${scriptPath}`;

    console.log(`  📜 ${env}: ${scriptPath}`);
  }
}

function generateDeployScript(env: string, result: BuildResult): string {
  const features = result.features.join(",");

  return `#!/bin/bash
# Deployment script for ${env} environment

set -e

echo "🚀 Deploying ${env} dashboard..."
echo "Features: ${features}"
echo "Bundle size: ${(result.size / 1024).toFixed(2)} KB"

# Upload to cloud storage based on features
if [[ "${features}" == *"CLOUD_UPLOAD"* ]]; then
  if [[ "${features}" == *"PREMIUM"* ]]; then
    echo "📤 Uploading to premium R2 bucket..."
    bun --features=${features} src/upload-engine.ts r2
  else
    echo "📤 Uploading to production S3 bucket..."
    bun --features=${features} src/upload-engine.ts s3
  fi
fi

# Run health check
echo "🏥 Running health check..."
bun --features=${features} dist/${env}/main.js --health-check

echo "✅ Deployment complete!"
`;
}

// Main execution
if (import.meta.main) {
  buildAll().catch(console.error);
}

export { buildAll, type BuildResult };
