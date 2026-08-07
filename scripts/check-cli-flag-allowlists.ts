#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Agent verification for Project-R CLI long-option allowlists.
 *
 *   bun run cli:flags:check
 *
 * Proves unknown `--*` fail (or throw) under
 * `applyUnknownLongOptionGuardFor` / `ALLOWED_LONG_REGISTRY`, and that strip
 * mode continues when `BUN_STRIP_UNKNOWN=true`.
 *
 * @see docs/harness/cli-constants-flags.md
 * @see lib/docs/ref-id-tool-flags.ts
 */

import { ALLOWED_LONG_REGISTRY } from '../lib/docs/ref-id-tool-flags.ts';

type Case = {
  name: string;
  cmd: string[];
  env?: Record<string, string>;
  /** Accept these exit codes (ops/telegram exit 2; throw-path CLIs exit 1). */
  expectExit: readonly number[] | ((code: number) => boolean);
  stdoutOrStderrIncludes?: string[];
};

const cases: Case[] = [
  {
    name: 'telegram:ops unknown (strict)',
    cmd: ['bun', 'tools/telegram-ops.ts', 'send', '--chat', '123', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in telegram:ops: --typo'],
  },
  {
    name: 'telegram:ops strip mode',
    cmd: ['bun', 'tools/telegram-ops.ts', 'send', '--chat', '123', '--typo', '--preview', 'x'],
    env: { BUN_STRIP_UNKNOWN: 'true' },
    expectExit: code => code !== 2,
    stdoutOrStderrIncludes: ['BUN_STRIP_UNKNOWN=true — stripping'],
  },
  {
    name: 'partner:onboard unknown',
    cmd: ['bun', 'tools/partner-onboard.ts', '--bad'],
    expectExit: [1],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in partner:onboard: --bad'],
  },
  {
    name: 'images:generate unknown',
    cmd: ['bun', 'scripts/images-generate.ts', '--typo'],
    expectExit: [1],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in images:generate: --typo'],
  },
  {
    name: 'ops:snapshot unknown',
    cmd: ['bun', 'tools/ops-snapshot.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in ops:snapshot: --typo'],
  },
  {
    name: 'bun:pr:verify unknown',
    cmd: ['bun', 'tools/bun-pr-verify.ts', '1', '--typo'],
    expectExit: [1],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in bun:pr:verify: --typo'],
  },
  {
    name: 'bun:pr:verify strip mode',
    cmd: ['bun', 'tools/bun-pr-verify.ts', '99999', '--typo', '--json'],
    env: { BUN_STRIP_UNKNOWN: 'true' },
    // stripped typo → missing bun-99999 path (exit 1), not unknown-flag exit 2
    expectExit: [1],
    stdoutOrStderrIncludes: ['BUN_STRIP_UNKNOWN=true — stripping', 'bun-99999 not on PATH'],
  },
  {
    name: 'bun:runtime-pin unknown',
    cmd: ['bun', 'tools/bun-runtime-pin.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in bun:runtime-pin: --typo'],
  },
  {
    name: 'glossary:health unknown',
    cmd: ['bun', 'tools/glossary-health.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in glossary:health: --typo'],
  },
  {
    name: 'cloudflare:env:validate unknown',
    cmd: ['bun', 'tools/cloudflare-env-validate.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in cloudflare:env:validate: --typo'],
  },
  {
    name: 'routing:registry-proof unknown',
    cmd: ['bun', 'tools/routing-registry-proof.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in routing:registry-proof: --typo'],
  },
  {
    name: 'ops:seed:toc unknown',
    cmd: ['bun', 'tools/ops-seed-toc.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in ops:seed:toc: --typo'],
  },
  {
    name: 'discovery:compose unknown',
    cmd: ['bun', 'tools/discovery-compose.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in discovery:compose: --typo'],
  },
  {
    name: 'public:discovery unknown',
    cmd: ['bun', 'tools/public-discovery.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in public:discovery: --typo'],
  },
  {
    name: 'schema:audit unknown',
    cmd: ['bun', 'tools/schema-audit.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in schema:audit: --typo'],
  },
  {
    name: 'telegram:handshake:catalog unknown',
    cmd: ['bun', 'tools/telegram-handshake-catalog.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in telegram:handshake:catalog: --typo'],
  },
  {
    name: 'concept:health unknown',
    cmd: ['bun', 'scripts/concept-health.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in concept:health: --typo'],
  },
  {
    name: 'ops:loop:gate-backfill unknown',
    cmd: ['bun', 'tools/ops-loop-gate-backfill.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in ops:loop:gate-backfill: --typo'],
  },
  {
    name: 'ops:limits:check unknown',
    cmd: ['bun', 'tools/ops-check-limits.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in ops:limits:check: --typo'],
  },
  {
    name: 'identity:admin unknown',
    cmd: ['bun', 'tools/identity-admin.ts', 'aliases', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in identity:admin: --typo'],
  },
  {
    name: 'provision:queue unknown',
    cmd: ['bun', 'tools/provision-queue.ts', 'list', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in provision:queue: --typo'],
  },
  {
    name: 'monorepo:health unknown',
    cmd: ['bun', 'tools/monorepo-health.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in monorepo:health: --typo'],
  },
  {
    name: 'brand:status unknown',
    cmd: ['bun', 'tools/brand-status.ts', '--once', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in brand:status: --typo'],
  },
  {
    name: 'docs:refid unknown',
    cmd: ['bun', 'tools/docs-refid.ts', 'check', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in docs:refid: --typo'],
  },
  {
    name: 'concept:audit unknown',
    cmd: ['bun', 'scripts/concept-audit.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in concept:audit: --typo'],
  },
  {
    name: 'concept:registry:graph unknown',
    cmd: ['bun', 'scripts/concept-registry-graph.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in concept:registry:graph: --typo'],
  },
  {
    name: 'concept:discover unknown',
    cmd: ['bun', 'scripts/concept-discover.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in concept:discover: --typo'],
  },
  {
    name: 'seat:desk unknown',
    cmd: ['bun', 'tools/seat-desk-cli.ts', 'post', 'X', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in seat:desk: --typo'],
  },
  {
    name: 'packages:metafile-audit unknown',
    cmd: ['bun', 'tools/packages-metafile-audit.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in packages:metafile-audit: --typo'],
  },
  {
    name: 'harness:violations unknown',
    cmd: ['bun', 'tools/harness-violations.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in harness:violations: --typo'],
  },
  {
    name: 'portal:cli unknown',
    cmd: ['bun', 'tools/portal-cli.ts', 'doctor', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in portal:cli: --typo'],
  },
  {
    name: 'bun:brand-map unknown',
    cmd: ['bun', 'tools/bun-brand-map.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in bun:brand-map: --typo'],
  },
  {
    name: 'env:inventory unknown',
    cmd: ['bun', 'scripts/env-inventory.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in env:inventory: --typo'],
  },
  {
    name: 'check:import-graph unknown',
    cmd: ['bun', 'scripts/check-import-graph.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in check:import-graph: --typo'],
  },
  {
    name: 'check:console-format unknown',
    cmd: ['bun', 'scripts/lint-console-format.ts', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in check:console-format: --typo'],
  },
  {
    name: 'concept:review unknown',
    cmd: ['bun', 'scripts/concept-review.ts', '--list', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in concept:review: --typo'],
  },
  {
    name: 'concept:deprecate unknown',
    cmd: ['bun', 'scripts/concept-deprecate.ts', 'x', '--typo'],
    expectExit: [2],
    stdoutOrStderrIncludes: ['❌ Unknown long option(s) in concept:deprecate: --typo'],
  },
];

function okExit(expect: Case['expectExit'], code: number): boolean {
  return typeof expect === 'function' ? expect(code) : expect.includes(code);
}

async function runCase(c: Case): Promise<{ code: number; blob: string }> {
  const proc = Bun.spawn(c.cmd, {
    env: { ...Bun.env, ...c.env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code: code ?? 1, blob: `${stdout}${stderr}` };
}

let failed = 0;

console.log('ALLOWED_LONG_REGISTRY:');
for (const [name, leaves] of Object.entries(ALLOWED_LONG_REGISTRY)) {
  console.log(`  ${name}: ${leaves.length} leaves`);
}

console.log('\nVerification cases:');
for (const c of cases) {
  const { code, blob } = await runCase(c);
  const exitOk = okExit(c.expectExit, code);
  const textOk = !c.stdoutOrStderrIncludes || c.stdoutOrStderrIncludes.every(s => blob.includes(s));
  if (exitOk && textOk) {
    console.log(`  ✓ ${c.name}`);
  } else {
    failed++;
    console.error(`  ✗ ${c.name}`);
    console.error(`    exit=${code} (ok=${exitOk}) textOk=${textOk}`);
    if (!textOk) {
      console.error(`    expected substrings: ${c.stdoutOrStderrIncludes?.join(' | ')}`);
      console.error(`    output (trunc):\n${blob.slice(0, 600)}`);
    }
  }
}

if (failed > 0) {
  console.error(`\ncli:flags:check failed (${failed} case(s))`);
  process.exit(1);
}
console.log('\ncli:flags:check ok');
