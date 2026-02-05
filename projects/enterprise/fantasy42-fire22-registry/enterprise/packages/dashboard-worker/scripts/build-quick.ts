#!/usr/bin/env bun

/**
 * Fire22 Dashboard Worker - Quick Build Script
 *
 * Fast build for development with minimal overhead
 */

import { $ } from 'bun';

async function quickBuild() {
  console.log('🚀 Fire22 Quick Build Starting...\n');

  try {
    // Step 1: Build packages only
    console.log('📦 Building packages...');
    const packageDirs = await $`ls packages`.text();
    const packageList = packageDirs.trim().split('\n');

    for (const pkg of packageList) {
      const packagePath = `packages/${pkg}`;
      const packageJsonPath = `${packagePath}/package.json`;

      if (await Bun.file(packageJsonPath).exists()) {
        console.log(`  📦 Building ${pkg}...`);
        try {
          await $`cd ${packagePath} && bun run build`.quiet();
          console.log(`  ✅ ${pkg} built successfully`);
        } catch (error) {
          console.error(`  ❌ ${pkg} build failed:`, error);
          throw error;
        }
      }
    }

    // Step 2: Quick main build
    console.log('\n🏗️ Building main application...');
    await $`bun build ./src/index.ts --target=bun --outdir ./dist`;

    console.log('\n✅ Quick build completed successfully!');
  } catch (error) {
    console.error('\n❌ Quick build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  quickBuild();
}

export { quickBuild };
