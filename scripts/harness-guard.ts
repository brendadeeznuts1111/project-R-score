#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Run bun-first guard on STRICT_INVENTORY files from rollout config.
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { STRICT_INVENTORY } from '../config/eslint/harness/rollout.ts';

const repoRoot = import.meta.dir + '/..';
const guardPath = `${repoRoot}/packages/guards/src/bun-first-guard.ts`;

const proc = Bun.spawn(bunSpawnArgs([guardPath, ...STRICT_INVENTORY]), {
  cwd: repoRoot,
  stdout: 'inherit',
  stderr: 'inherit',
  env: { ...Bun.env },
});

const code = await proc.exited;
process.exit(code);
