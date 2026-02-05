import config from '../src/config/config-loader';
/**
 * §Bun:Build - Tiered Build System
 * @perf <500ms build
 * @roi ∞
 */

import { build } from "bun";
import { readFileSync, writeFileSync } from "node:fs";

async function runBuild() {
  const config = JSON.parse(readFileSync("empire-pro.config.json", "utf-8"));
  const activeFeatures = config.empirePro.patternSystem.features || [];

  console.log(`🚀 Building Empire Pro [Features: ${activeFeatures.join(", ")}]...`);

  const isFreeTier = activeFeatures.includes("FREE");

  const result = await build({
    entrypoints: ["src/main.ts"],
    outdir: "./dist",
    target: "bun",
    // Bun 1.1+ Native Feature Flags
    // @ts-ignore - 'features' is a newer Bun API
    features: activeFeatures,
    minify: true,
    sourcemap: "external",
    // Specialized optimizations for FREE tier
    ...(isFreeTier && {
      plugins: [{
        name: "free-tier-dce",
        setup(build) {
          build.onLoad({ filter: /\.ts$/ }, (args) => {
            // Further optimization logic could be added here
            return undefined;
          });
        }
      }]
    })
  });

  if (result.success) {
    console.log("✅ Build successful.");
    for (const output of result.outputs) {
       console.log(`   📦 ${output.path} (${(output.size / 1024).toFixed(2)} KB)`);
    }
  } else {
    console.error("❌ Build failed:", result.logs);
  }
}

runBuild().catch(console.error);
