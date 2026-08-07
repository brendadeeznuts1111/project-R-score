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
