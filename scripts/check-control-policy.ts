#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @updated Bun.spawnSync · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawnSync · changed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.spawnSync · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawnSync · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawnSync · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawnSync · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.spawnSync · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @verified Bun.spawnSync · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
import { bunHelpControlDrift, controlPolicySchemaIssues } from '../lib/security/control-policy.ts';

function main(): void {
  const argv = Bun.argv.slice(2);
  if (argv.length > 0) {
    process.stderr.write(`guard:controls:check accepts no arguments: ${argv.join(' ')}\n`);
    process.exitCode = 2;
    return;
  }

  const schemaIssues = controlPolicySchemaIssues();
  const runtimeHelp = Bun.spawnSync({
    cmd: [process.execPath, '--help'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const installHelp = Bun.spawnSync({
    cmd: [process.execPath, 'install', '--help'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const processIssues = [
    ...(runtimeHelp.exitCode === 0 ? [] : [`bun --help exited ${runtimeHelp.exitCode}`]),
    ...(installHelp.exitCode === 0 ? [] : [`bun install --help exited ${installHelp.exitCode}`]),
  ];
  const helpDrift =
    processIssues.length === 0
      ? bunHelpControlDrift(runtimeHelp.stdout.toString(), installHelp.stdout.toString())
      : [];

  if (schemaIssues.length > 0 || processIssues.length > 0 || helpDrift.length > 0) {
    process.stderr.write(
      `${JSON.stringify({ schemaIssues, processIssues, helpDrift }, null, 2)}\n`
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write('guard:controls:check ok\n');
}

if (import.meta.main) main();
