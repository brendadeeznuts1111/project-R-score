#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * @fileoverview Bump all workspace packages version
 * @module scripts/bump-all
 *
 * @description
 * Bumps the version of all packages in the workspace (including root).
 * Uses semantic versioning (patch, minor, major).
 *
 * @example
 * ```bash
 * bun run bump:all patch
 * bun run bump:all minor
 * bun run bump:all major
 * ```
 *
 * @see {@link ../config/r2-env.ts} Cloudflare / R2 / registry URL SSOT
 */

import { Glob } from 'bun';
import { factoryWagerRegistryUrlFromEnv, r2BucketUrlFromEnv } from '../config/r2-env.ts';

/** Registry URL for FactoryWager packages */
const REGISTRY_URL = factoryWagerRegistryUrlFromEnv();

/** R2 bucket URL for package storage */
const R2_BUCKET_URL = r2BucketUrlFromEnv();

/** Version bump type */
type BumpType = 'patch' | 'minor' | 'major';

/**
 * Bump version according to semver
 * @param current - Current version string
 * @param type - Bump type
 * @returns New version string
 */
function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Main bump function
 */
async function main(): Promise<void> {
  const type = Bun.argv[2] as BumpType;

  if (!type || !['patch', 'minor', 'major'].includes(type)) {
    console.error('❌ Usage: bun run bump:all <patch|minor|major>');
    console.error('\n📚 Documentation:');
    console.error(`   Registry: ${REGISTRY_URL}`);
    console.error(`   R2 Store: ${R2_BUCKET_URL}`);
    process.exit(1);
  }

  console.info(`📦 Bumping all workspace packages: ${type}\n`);
  console.info(`   Registry: ${REGISTRY_URL}`);
  console.info(`   R2 Store: ${R2_BUCKET_URL}\n`);

  const glob = new Glob('*/package.json');
  const packages = [...glob.scanSync({ cwd: '.' }), 'package.json'];

  let bumpedCount = 0;

  for (const pkgPath of packages) {
    try {
      const pkg = await Bun.file(pkgPath).json();
      if (!pkg.name) continue;

      const currentVersion = pkg.version || '0.0.0';
      const newVersion = bumpVersion(currentVersion, type);

      pkg.version = newVersion;
      await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.info(`  ✓ ${pkg.name}: ${currentVersion} → ${newVersion}`);
      bumpedCount++;
    } catch (error) {
      console.error(`  ✗ ${pkgPath}: ${error}`);
    }
  }

  console.info(`\n✅ Bumped ${bumpedCount} packages`);
  console.info(`\n🚀 Next steps:`);
  console.info(`   1. Review changes: git diff`);
  console.info(`   2. Publish: bun run pack:all`);
  console.info(`   3. Deploy: bun run registry:publish`);
}

if (import.meta.main) {
  await main();
}
