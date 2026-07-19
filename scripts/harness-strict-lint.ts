#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Run bun-native strict lint on STRICT_INVENTORY files from rollout config.
 */
import { STRICT_INVENTORY } from '../config/eslint/harness/rollout.ts';

const repoRoot = import.meta.dir + '/..';
const files = [...STRICT_INVENTORY];

const proc = Bun.spawn(['eslint', '--config', 'eslint.bun-native.config.ts', ...files], {
  cwd: repoRoot,
  stdout: 'inherit',
  stderr: 'inherit',
});

const code = await proc.exited;
process.exit(code);
