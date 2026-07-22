#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
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
 * @see {@link ../config/r2-env.ts} Cloudflare / R2 / registry URL SSOT
 */

import { $ } from 'bun';
import { Glob } from 'bun';
import { factoryWagerRegistryUrlFromEnv, r2BucketUrlFromEnv } from '../config/r2-env.ts';
import { ensureDir } from './lib/fs-bun';

/** Output directory for packed packages */
const PACKS_DIR = './dist/packs';

/** Registry URL for FactoryWager packages */
const REGISTRY_URL = factoryWagerRegistryUrlFromEnv();

/** R2 bucket URL for package storage */
const R2_BUCKET_URL = r2BucketUrlFromEnv();

/**
 * Pack a single package
 * @param dir - Package directory
 * @param name - Package name
 */
async function packPackage(dir: string, name: string): Promise<boolean> {
  try {
    console.info(`Packing ${name}...`);
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
  console.info('📦 Packing all workspace packages...\n');
  console.info(`   Registry: ${REGISTRY_URL}`);
  console.info(`   R2 Store: ${R2_BUCKET_URL}`);
  console.info(`   Output:   ${PACKS_DIR}\n`);

  await ensureDir(PACKS_DIR);

  const glob = new Glob('*/package.json');
  const packages = [...glob.scanSync({ cwd: '.' })];

  let packedCount = 0;

  // Pack root package first
  try {
    console.info('Packing root package...');
    await $`bun pm pack --destination ${PACKS_DIR}`;
    packedCount++;
  } catch (error) {
    console.error('  ✗ Root package failed');
  }

  // Pack workspace packages
  for (const pkgPath of packages) {
    const dir = pkgPath.replace('/package.json', '');
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

  console.info(`\n✅ Packed ${packedCount} packages to ${PACKS_DIR}/`);
  console.info(`\n🚀 Next steps:`);
  console.info(`   1. Verify packages: ls -la ${PACKS_DIR}/`);
  console.info(
    `   2. Publish to registry: npm publish ${PACKS_DIR}/*.tgz --registry=${REGISTRY_URL}`
  );
  console.info(`   3. Upload to R2: bun run r2:sync`);
}

if (import.meta.main) {
  await main();
}
