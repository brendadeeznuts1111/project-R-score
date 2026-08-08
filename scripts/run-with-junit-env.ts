#!/usr/bin/env bun
// @see https://bun.com/docs/test/reporters#environment-variables-in-junit-reports
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Run a command (usually `bun test …`) with fill-missing JUnit provenance env
 * applied *before* process start — Bun's JUnit reporter snapshots env at launch,
 * so `tests/preload.ts` is too late for `<properties>`.
 *
 *   bun scripts/run-with-junit-env.ts test tests/failure-report.test.ts
 *   bun scripts/run-with-junit-env.ts test --shard=1/4
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { ensureJunitReporterEnv } from '../lib/junit-reporter-env.ts';

if (!isModuleEntrypoint(import.meta)) {
  throw new Error('run-with-junit-env.ts is a CLI entrypoint');
}

ensureJunitReporterEnv();

const args = Bun.argv.slice(2);
if (args.length === 0) {
  console.error('usage: bun scripts/run-with-junit-env.ts <bun-args…>');
  console.error('example: bun scripts/run-with-junit-env.ts test tests/');
  process.exit(2);
}

// Inherit parent env after ensureJunitReporterEnv mutated Bun.env (Bun.env ratchet).
const child = Bun.spawn(['bun', ...args], {
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});

process.exit(await child.exited);
