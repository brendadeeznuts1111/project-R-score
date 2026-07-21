#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * ESLint bun-native on changed harness paths (PR/agent default).
 * Full-tree rollout only with --full or HARNESS_FULL_LINT=1 (main push).
 *
 *   bun run lint:bun-native:changed
 *   bun run lint:bun-native:changed -- --full
 *   bun run lint:bun-native:rollout   # explicit full tree
 */
import { hasFlag } from './lib/cli-args';
import {
  hasCodeLikeChange,
  isHarnessLintPath,
  listChangedFiles,
  resolveMainHead,
} from './lib/git-changed';

const repoRoot = `${import.meta.dir}/..`;
const CACHE = `${repoRoot}/reports/.eslintcache`;

const full =
  hasFlag('full') || Bun.env.HARNESS_FULL_LINT === '1' || Bun.env.HARNESS_FULL_LINT === 'true';

async function runEslint(files: string[]): Promise<number> {
  const cmd = [
    'bun',
    'eslint',
    '--config',
    'eslint.bun-native.config.ts',
    '--cache',
    '--cache-location',
    CACHE,
    '--quiet',
    '--max-warnings',
    '0',
    ...files,
  ];
  const proc = Bun.spawn(cmd, {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return (await proc.exited) ?? 1;
}

if (full) {
  const proc = Bun.spawn(['bun', 'run', 'lint:bun-native:rollout'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...Bun.env, HARNESS_FULL_LINT: '1' },
  });
  process.exit((await proc.exited) ?? 1);
}

const since = await resolveMainHead();
const changed = await listChangedFiles({ since, dirty: true });
const targets = changed.filter(isHarnessLintPath);

if (targets.length === 0) {
  if (!hasCodeLikeChange(changed)) {
    console.info(`✓ eslint — skip (no harness TS since ${since})`);
  } else {
    console.info(`✓ eslint — skip (0 harness lint paths since ${since})`);
  }
  process.exit(0);
}

console.info(`eslint ${targets.length} file(s) since ${since}`);
process.exit(await runEslint(targets));
