#!/usr/bin/env bun

/**
 * Build the unified dashboard
 * Run: bun run dashboard/build.ts
 */

import { $ } from "bun";

console.info("🔨 Building Unified Dashboard...\n");

try {
  // Build the React app
  await $`cd dashboard && bun build src/index.tsx --outdir dist --target browser --minify`;

  console.info("✅ Dashboard built successfully!");
  console.info("   📁 Output: dashboard/dist/");
  console.info("   🚀 Run: bun run dashboard");

} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}