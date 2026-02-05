#!/usr/bin/env bun
/**
 * @fileoverview Pack all workspace packages using bun pm pack
 * @module scripts/pack-all
 * 
 * @description
 * Creates tarball packages for all workspace packages using Bun's pack command.
 * Outputs to ./dist/packs/ directory.
 * 
 * @example
 * ```bash
 * bun run pack:all
 * ```
 * 
 * @see {@link https://bun.sh/docs/cli/pm} Bun Package Manager
 * @see {@link https://npm.factory-wager.com} FactoryWager NPM Registry
 * @see {@link https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry} R2 Storage
 */

import { $ } from "bun";
import { Glob } from "bun";
import { mkdir } from "node:fs/promises";

/** Output directory for packed packages */
const PACKS_DIR = "./dist/packs";

/** Registry URL for FactoryWager packages */
const REGISTRY_URL = process.env.REGISTRY_URL || "https://npm.factory-wager.com";

/** R2 bucket URL for package storage */
const R2_BUCKET_URL = process.env.R2_BUCKET_URL || 
  "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry";

/**
 * Pack a single package
 * @param dir - Package directory
 * @param name - Package name
 */
async function packPackage(dir: string, name: string): Promise<boolean> {
  try {
    console.log(`Packing ${name}...`);
    await $`cd ${dir} && bun pm pack --destination ../../dist/packs`;
    return true;
  } catch (error) {
    console.error(`  ✗ ${dir}: ${error}`);
    return false;
  }
}

/**
 * Main pack function
 */
async function main(): Promise<void> {
  console.log("📦 Packing all workspace packages...\n");
  console.log(`   Registry: ${REGISTRY_URL}`);
  console.log(`   R2 Store: ${R2_BUCKET_URL}`);
  console.log(`   Output:   ${PACKS_DIR}\n`);

  await mkdir(PACKS_DIR, { recursive: true });

  const glob = new Glob("*/package.json");
  const packages = [...glob.scanSync({ cwd: "." })];

  let packedCount = 0;

  // Pack root package first
  try {
    console.log("Packing root package...");
    await $`bun pm pack --destination ${PACKS_DIR}`;
    packedCount++;
  } catch (error) {
    console.error("  ✗ Root package failed");
  }

  // Pack workspace packages
  for (const pkgPath of packages) {
    const dir = pkgPath.replace("/package.json", "");
    try {
      const pkg = await Bun.file(pkgPath).json();
      if (!pkg.name || pkg.private) continue;

      if (await packPackage(dir, pkg.name)) {
        packedCount++;
      }
    } catch (error) {
      console.error(`  ✗ ${dir}: ${error}`);
    }
  }

  console.log(`\n✅ Packed ${packedCount} packages to ${PACKS_DIR}/`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Verify packages: ls -la ${PACKS_DIR}/`);
  console.log(`   2. Publish to registry: npm publish ${PACKS_DIR}/*.tgz --registry=${REGISTRY_URL}`);
  console.log(`   3. Upload to R2: bun run r2:sync`);
}

await main();
