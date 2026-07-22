#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * @fileoverview Release workflow script
 * @module scripts/release
 *
 * @description
 * Complete release workflow for FactoryWager packages.
 * Runs lint, type-check, tests, version bump, changelog, and build.
 *
 * @example
 * ```bash
 * bun run release:minor
 * bun run release:patch
 * bun run release:major
 * ```
 *
 * @see {@link ../config/r2-env.ts} Cloudflare / R2 / registry URL SSOT
 */

import { $ } from 'bun';
import { factoryWagerRegistryUrlFromEnv, r2BucketUrlFromEnv } from '../config/r2-env.ts';

/** Release type */
type ReleaseType = 'patch' | 'minor' | 'major';

/** FactoryWager registry URL */
const REGISTRY_URL = factoryWagerRegistryUrlFromEnv();

/** R2 bucket URL */
const R2_BUCKET_URL = r2BucketUrlFromEnv();

/** Release workflow steps */
interface ReleaseStep {
  name: string;
  cmd: string;
}

/**
 * Get release steps for a type
 * @param type - Release type
 * @returns Array of release steps
 */
function getReleaseSteps(type: ReleaseType): ReleaseStep[] {
  return [
    { name: 'Lint check', cmd: 'bun run lint' },
    { name: 'Type check', cmd: 'bun run type-check' },
    { name: 'Run tests', cmd: 'bun test' },
    { name: 'Bump version', cmd: `bun pm version ${type}` },
    { name: 'Generate changelog', cmd: 'bun run changelog' },
    { name: 'Build packages', cmd: 'bun run build' },
  ];
}

/**
 * Main release function
 */
async function main(): Promise<void> {
  const type = Bun.argv[2] as ReleaseType;

  if (!type || !['patch', 'minor', 'major'].includes(type)) {
    console.error('❌ Usage: bun run release:<patch|minor|major>');
    console.error('\n📚 Documentation:');
    console.error(`   Registry: ${REGISTRY_URL}`);
    console.error(`   R2 Store: ${R2_BUCKET_URL}`);
    process.exit(1);
  }

  console.info(`🚀 Starting ${type} release workflow...\n`);
  console.info(`   Registry: ${REGISTRY_URL}`);
  console.info(`   R2 Store: ${R2_BUCKET_URL}\n`);

  const steps = getReleaseSteps(type);

  for (const step of steps) {
    console.info(`📋 ${step.name}...`);
    try {
      await $`${{ raw: step.cmd }}`;
      console.info(`   ✓ ${step.name} complete\n`);
    } catch (error) {
      console.error(`   ✗ ${step.name} failed`);
      process.exit(1);
    }
  }

  // Get new version
  const pkg = await Bun.file('package.json').json();
  const version = pkg.version;

  console.info(`\n✅ Release ${version} ready!`);
  console.info(`\n📦 Package Info:`);
  console.info(`   Name:    ${pkg.name}`);
  console.info(`   Version: ${version}`);
  console.info(`   Registry: ${REGISTRY_URL}`);
  console.info(`\n🚀 Next steps:`);
  console.info(`   1. Review the changes: git diff HEAD~1`);
  console.info(`   2. Commit: git add -A && git commit -m "chore: release v${version}"`);
  console.info(`   3. Tag: git tag -a v${version} -m "Release v${version}"`);
  console.info(`   4. Push: git push && git push --tags`);
  console.info(
    `   5. Publish: bun run pack:all && npm publish dist/packs/*.tgz --registry=${REGISTRY_URL}`
  );
  console.info(`   6. Upload to R2: bun run r2:sync`);
}

if (import.meta.main) {
  await main();
}
