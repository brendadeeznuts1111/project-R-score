#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.3.14 · 2026-08-06 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
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

// Explicit inherit after fill-missing — Bun JUnit snapshots env at child start.
const childEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(Bun.env)) {
  if (v !== undefined) childEnv[k] = v;
}

const child = Bun.spawn(['bun', ...args], {
  env: childEnv,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});

process.exit(await child.exited);
