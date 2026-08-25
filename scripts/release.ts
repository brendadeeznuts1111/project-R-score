#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @verified Bun.$ · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/shell
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/pm/cli/pm#version — bun pm version
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

import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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

export const RELEASE_COMMIT_PATHS = ['package.json', 'CHANGELOG.md'] as const;

async function gitText(args: string[]): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(stderr.trim() || `git ${args.join(' ')} failed`);
  return stdout.trim();
}

/** A release starts from reviewed main and never hides unrelated mutations. */
export async function assertReleasePreconditions(): Promise<void> {
  const branch = await gitText(['branch', '--show-current']);
  if (branch !== 'main')
    throw new Error(`release must start on main (current: ${branch || 'detached'})`);

  const dirty = await gitText(['status', '--porcelain', '--untracked-files=all']);
  if (dirty !== '') {
    throw new Error('release requires a clean worktree; commit or isolate every change first');
  }

  const [head, upstream] = await Promise.all([
    gitText(['rev-parse', 'HEAD']),
    gitText(['rev-parse', '@{upstream}']),
  ]);
  if (head !== upstream) throw new Error('release requires main to match its upstream exactly');
}

/**
 * Get release steps for a type
 * @param type - Release type
 * @returns Array of release steps
 */
export function getReleaseSteps(type: ReleaseType): ReleaseStep[] {
  return [
    { name: 'Lint check', cmd: 'bun run lint' },
    { name: 'Type check', cmd: 'bun run type-check' },
    { name: 'Run tests', cmd: 'bun test' },
    // Default `bun pm version` creates a commit and tag immediately. Defer both
    // until every later gate succeeds so a failed build cannot publish a tag.
    { name: 'Bump version', cmd: `bun pm version ${type} --no-git-tag-version` },
    { name: 'Generate changelog', cmd: 'bun run changelog' },
    { name: 'Build packages', cmd: 'bun run build' },
  ];
}

/**
 * Main release function
 */
async function main(): Promise<void> {
  // Registry key is release:major; leave form covers patch/minor/major scripts.
  const argv = applyUnknownLongOptionGuardFor('release', Bun.argv.slice(2));
  const type = (argv.find(a => !a.startsWith('-')) ?? Bun.argv[2]) as ReleaseType;

  if (!type || !['patch', 'minor', 'major'].includes(type)) {
    console.error('❌ Usage: bun run release:<patch|minor|major>');
    console.error('\n📚 Documentation:');
    console.error(`   Registry: ${REGISTRY_URL}`);
    console.error(`   R2 Store: ${R2_BUCKET_URL}`);
    process.exit(1);
  }

  try {
    await assertReleasePreconditions();
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
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
  const version = String(pkg.version);
  const tag = `v${version}`;
  const existingTag = await gitText(['tag', '--list', tag]);
  if (existingTag !== '') {
    console.error(`❌ Refusing to reuse immutable release tag ${tag}`);
    process.exit(1);
  }

  console.info(`\n✅ Release ${version} ready!`);
  console.info(`\n📦 Package Info:`);
  console.info(`   Name:    ${pkg.name}`);
  console.info(`   Version: ${version}`);
  console.info(`   Registry: ${REGISTRY_URL}`);
  console.info(`\n🚀 Next steps:`);
  console.info(`   1. Review the release changes: git diff -- ${RELEASE_COMMIT_PATHS.join(' ')}`);
  console.info(
    `   2. Stage only release-owned paths: git add -- ${RELEASE_COMMIT_PATHS.join(' ')}`
  );
  console.info(`   3. Commit: git commit -m "chore(release): publish ${tag}"`);
  console.info(`   4. Tag once: git tag -a ${tag} -m "FactoryWager ${tag}"`);
  console.info(`   5. Push the commit: git push origin main`);
  console.info(`   6. Push only this tag: git push origin refs/tags/${tag}`);
  console.info(`   7. Pack: bun run pack:all`);
  console.info(`   8. Publish one reviewed archive: bun run factory:publish -- <archive>`);
  console.info(`   9. Refresh the read snapshot after the R2 write`);
}

if (import.meta.main) {
  await main();
}
