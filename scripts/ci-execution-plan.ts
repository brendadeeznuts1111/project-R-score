#!/usr/bin/env bun
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @released --changed · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --changed · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --changed · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Report the active CI test ownership and command de-duplication contract.
 *
 * This command intentionally does not execute checks or modify files.
 *
 *   bun scripts/ci-execution-plan.ts
 *   bun scripts/ci-execution-plan.ts --json
 */
import { CI_RESERVED_TEST_GROUPS, auditReservedTestGroups } from '../lib/harness/ci-test-groups.ts';
import { jsonOut } from '../lib/console-depth.ts';

type CommandOwner = {
  id: string; // brand-ok — internal command-plan key, not a domain identity.
  command: readonly string[];
  owner: string;
};

const COMMANDS: readonly CommandOwner[] = [
  {
    id: 'ci-core:brand-adoption',
    command: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict', '--quiet'],
    owner: 'ci:core',
  },
];

function fingerprint(command: readonly string[]): string {
  return command.join('\u0000');
}

function duplicateCommands(): Array<{ fingerprint: string; ids: string[]; owners: string[] }> {
  const grouped = new Map<string, CommandOwner[]>();
  for (const command of COMMANDS) {
    const key = fingerprint(command.command);
    grouped.set(key, [...(grouped.get(key) ?? []), command]);
  }
  return [...grouped.entries()]
    .filter(([, commands]) => commands.length > 1)
    .map(([fingerprint, commands]) => ({
      fingerprint: fingerprint.replaceAll('\u0000', ' '),
      ids: commands.map(command => command.id),
      owners: commands.map(command => command.owner),
    }));
}

const audit = auditReservedTestGroups();
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  executionMode: 'exclusive',
  affected: {
    command: 'bun test --changed',
    excludes: 'root bunfig ignores plus every reserved test path',
  },
  reservedGroups: CI_RESERVED_TEST_GROUPS,
  audit,
  duplicateCommands: duplicateCommands(),
};

if (Bun.argv.includes('--json')) {
  jsonOut(report);
  process.exit(0);
}

console.log(`CI execution plan · exclusive · ${report.generatedAt}`);
console.log(`reserved groups: ${audit.groupCount} · unique explicit paths: ${audit.pathCount}`);
console.log(`test overlap: ${audit.duplicatePaths.length}`);
for (const group of CI_RESERVED_TEST_GROUPS) {
  console.log(`  ${group.id} · ${group.paths.length} path(s) · repair: ${group.repair}`);
}
console.log(`duplicate command fingerprints: ${report.duplicateCommands.length}`);
for (const duplicate of report.duplicateCommands) {
  console.log(`  ${duplicate.ids.join(' ↔ ')} · ${duplicate.fingerprint}`);
}
