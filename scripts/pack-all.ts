#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @verified Bun.$ · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/shell
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/glob#quickstart
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
  console.info(`   2. Publish one reviewed archive: bun run factory:publish -- <archive>`);
  console.info(`   3. Refresh the read snapshot after the R2 write`);
}

if (import.meta.main) {
  await main();
}
