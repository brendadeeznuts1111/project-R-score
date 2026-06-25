#!/usr/bin/env bun
/**
 * Run bun-first guard on STRICT_INVENTORY files from rollout config.
 */
import { STRICT_INVENTORY } from '../config/eslint/harness/rollout.ts';

const repoRoot = import.meta.dir + '/..';
const guardPath = `${repoRoot}/packages/guards/src/bun-first-guard.ts`;

const proc = Bun.spawn(['bun', guardPath, ...STRICT_INVENTORY], {
  cwd: repoRoot,
  stdout: 'inherit',
  stderr: 'inherit',
});

const code = await proc.exited;
process.exit(code);
