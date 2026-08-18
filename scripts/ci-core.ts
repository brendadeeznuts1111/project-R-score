#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * One local/CI envelope after `bun ci`: install proof + hygiene + ci:harness.
 * Avoids a second GHA job that re-installs for hygiene alone.
 *
 *   bun run ci:core
 *   bun run ci:core -- --fast
 *   bun run ci:core -- --full-lint --verbose
 *
 * Extra args after `--` forward to ci:harness.
 */
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-core-timing.json`;

type GateTiming = { name: string; ms: number; ok: boolean };

type CoreStep = {
  name: string;
  cmd: string[];
  /** Write captured stdout to this repo-relative artifact on success. */
  writeOut?: string;
};

const CORE_STEPS: CoreStep[] = [
  {
    name: 'install-verify',
    cmd: ['bun', 'scripts/verify-install-cache.ts', '--strict', '--quiet'],
  },
  {
    name: 'cache-lifecycle',
    cmd: ['bun', 'run', 'install:cache:lifecycle'],
  },
  {
    name: 'hygiene',
    cmd: ['bun', 'run', 'hygiene'],
  },
  {
    name: 'agent-skills',
    cmd: ['bun', 'run', 'skills:validate'],
  },
  {
    name: 'native-docs',
    cmd: ['bun', 'run', 'docs:native:check'],
  },
  {
    name: 'bun-release-contracts',
    cmd: ['bun', 'run', 'bun:release-contracts:check'],
  },
  {
    name: 'bun-release-knowledge',
    cmd: ['bun', 'run', 'bun:release-knowledge:validate:all'],
  },
  {
    name: 'markdown-contract',
    cmd: ['bun', 'run', 'check:docs'],
  },
  {
    name: 'wiki-coverage',
    cmd: ['bun', 'run', 'wiki:coverage:check'],
  },
  {
    name: 'wiki-links',
    cmd: ['bun', 'run', 'wiki:links:check'],
  },
  {
    name: 'import-graph',
    cmd: ['bun', 'scripts/check-import-graph.ts'],
  },
  {
    name: 'console-format-ratchet',
    cmd: ['bun', 'scripts/lint-console-format.ts'],
  },
  {
    name: 'brand-manifest',
    cmd: ['bun', 'tools/brand-manifest.ts', '--check'],
  },
  {
    name: 'brand-adoption',
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict', '--quiet'],
  },
  {
    name: 'brand-catalog',
    cmd: ['bun', 'test', 'tests/branded-catalog.test.ts'],
  },
  {
    name: 'policy-audit',
    cmd: ['bun', 'tools/policy-audit.ts'],
  },
  {
    name: 'jurisdictions-docs',
    cmd: ['bun', 'tools/jurisdictions-docs.ts', '--check'],
  },
  {
    name: 'monorepo-health',
    cmd: ['bun', 'scripts/check-monorepo-health.ts', '--no-history', '--no-write'],
  },
  {
    name: 'concept-audit',
    cmd: ['bun', 'run', 'concept:audit', '--', '--strict', '--output', 'json'],
    writeOut: 'concept-audit.json',
  },
  {
    name: 'tennis-ssot-release',
    cmd: ['bun', 'run', 'tennis:ssot:release:check'],
  },
];

async function run(
  cmd: string[],
  inherit: boolean
): Promise<{ code: number; ms: number; out: string }> {
  const t0 = performance.now();
  const proc = Bun.spawn(cmd, {
    cwd: repoRoot,
    stdout: inherit ? 'inherit' : 'pipe',
    stderr: inherit ? 'inherit' : 'pipe',
    stdin: 'ignore',
  });
  let out = '';
  if (!inherit) {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    out = `${stdout}${stderr}`;
  }
  const code = (await proc.exited) ?? 1;
  return { code, ms: Math.round(performance.now() - t0), out };
}

const harnessArgs = import.meta.main
  ? applyUnknownLongOptionGuardFor('ci:core', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const verbose = harnessArgs.includes('--verbose');
const timings: GateTiming[] = [];

for (const step of CORE_STEPS) {
  // writeOut steps always capture stdout (needed for the artifact), even in verbose mode.
  const { code, ms, out } = await run(step.cmd, verbose && !step.writeOut);
  timings.push({ name: step.name, ms, ok: code === 0 });
  if (!verbose) console.info(`${code === 0 ? '✓' : '✗'} ${step.name} (${ms}ms)`);
  if (code !== 0) {
    if (!verbose && out.trim()) console.error(out.trimEnd());
    console.error(`❌ ${step.name} failed`);
    await ensureDir(`${repoRoot}/reports`);
    await writeJson(TIMING_PATH, {
      generatedAt: new Date().toISOString(),
      totalMs: timings.reduce((s, t) => s + t.ms, 0),
      gates: timings,
    });
    process.exit(code);
  }
  if (step.writeOut) {
    await Bun.write(`${repoRoot}/${step.writeOut}`, out);
  }
}

const harnessCmd = ['bun', 'scripts/ci-harness.ts', ...harnessArgs];
const t0 = performance.now();
const harness = Bun.spawn(harnessCmd, {
  cwd: repoRoot,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});
const harnessCode = (await harness.exited) ?? 1;
timings.push({
  name: 'ci-harness',
  ms: Math.round(performance.now() - t0),
  ok: harnessCode === 0,
});

await ensureDir(`${repoRoot}/reports`);
const totalMs = timings.reduce((s, t) => s + t.ms, 0);
await writeJson(TIMING_PATH, {
  generatedAt: new Date().toISOString(),
  totalMs,
  gates: timings,
});

if (harnessCode !== 0) process.exit(harnessCode);
console.info(`✅ ci:core ${totalMs}ms step-sum`);
