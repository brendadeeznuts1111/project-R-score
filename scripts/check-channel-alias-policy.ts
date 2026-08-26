#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
import { channelAliasContractIssues } from '../lib/content-store/index.ts';

function main(): void {
  const argv = Bun.argv.slice(2);
  if (argv.length > 0) {
    process.stderr.write(`guard:channels:check accepts no arguments: ${argv.join(' ')}\n`);
    process.exitCode = 2;
    return;
  }
  const issues = channelAliasContractIssues();
  if (issues.length > 0) {
    process.stderr.write(`${JSON.stringify({ issues }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write('channel alias policy ratchet ok\n');
}

if (import.meta.main) main();
