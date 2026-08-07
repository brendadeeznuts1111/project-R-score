#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Per-file tests/ inventory — pass / fail / HANG with wall timeout.
 *
 *   bun run test:inventory
 *   bun run test:inventory -- --timeout-ms=15000 --json
 *   bun run test:inventory -- --parallel-probe   # groups of 10 under --parallel
 *   bun run test:inventory -- --lane=linux-ci --shards=4 \
 *     --shard-plan-out=tmp/test-shard-plan.json
 *
 * Distinguishes **wall** (this process kills spawn after --timeout-ms, default 20s)
 * from **bun --timeout** (per-test, capped at min(10s, wall-1s)). A file can pass
 * under full `bun test` (long per-test timeouts) yet HANG here if wall is too low.
 * Known slow: harness-tenant-runbooks (freshRerun spawns; needs wall ≥180s),
 * ops-bot-verifydod / dod-lifecycle (DOD process), guides-verify (live bun.com).
 *
 * Writes: tmp/test-file-report.json
 */
import { Glob } from 'bun';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { dirnamePath, joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  buildTestSuiteInventoryReport,
  type TestDurationRow,
} from './lib/duration-balanced-shards.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT = joinPath(ROOT, 'tmp', 'test-file-report.json');
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('test:inventory', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const JSON_ONLY = argv.includes('--json');
const PARALLEL_PROBE = argv.includes('--parallel-probe');

function optionValue(name: string): string | undefined {
  const inlinePrefix = `${name}=`;
  const inline = argv.find(arg => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

const timeoutMs = (() => {
  const raw = optionValue('--timeout-ms');
  const parsed = raw === undefined ? 20_000 : Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1_001) {
    throw new RangeError('--timeout-ms must be an integer greater than 1000');
  }
  return parsed;
})();
const laneName = optionValue('--lane') ?? (PARALLEL_PROBE ? 'parallel-probe' : 'local-serial');
const shardCount = (() => {
  const raw = optionValue('--shards');
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RangeError('--shards must be a positive integer');
  }
  return parsed;
})();
const shardPlanOut = optionValue('--shard-plan-out');
if (shardPlanOut && shardCount === undefined) {
  throw new TypeError('--shard-plan-out requires --shards');
}

async function runOne(path: string, parallel: boolean): Promise<TestDurationRow> {
  const t0 = performance.now();
  const args = ['test', `--timeout=${Math.min(10_000, timeoutMs - 1000)}`, '--pass-with-no-tests'];
  if (parallel) args.push('--parallel');
  args.push(path);
  // Do not force BUN_CONSOLE_DEPTH — tests such as console-depth assert the
  // env/default precedence and would false-fail under a probe override.
  const proc = Bun.spawn(bunSpawnArgs(args), {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env },
  });

  const killer = setTimeout(() => {
    try {
      proc.kill();
    } catch {
      // ignore
    }
  }, timeoutMs);

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = (await proc.exited) ?? 1;
  clearTimeout(killer);
  const s = Math.round((performance.now() - t0) / 10) / 100;
  const text = stdout + stderr;
  if (s >= timeoutMs / 1000 - 0.5 && code !== 0) {
    return { path, status: 'HANG', s, msg: `wall ≥${timeoutMs}ms` };
  }
  let msg = '';
  for (const line of text.split('\n')) {
    if (line.includes('(fail)') || line.startsWith('error:')) {
      msg = line.trim().slice(0, 160);
      break;
    }
  }
  return { path, status: code === 0 ? 'pass' : 'fail', s, msg };
}

const glob = new Glob('**/*.test.ts');
const files: string[] = [];
for await (const f of glob.scan({ cwd: joinPath(ROOT, 'tests'), absolute: false })) {
  files.push(joinPath('tests', f));
}
files.sort();

if (!JSON_ONLY) console.info(`test-suite-inventory: ${files.length} files, timeout=${timeoutMs}ms`);

const results: TestDurationRow[] = [];
const tAll = performance.now();

if (PARALLEL_PROBE) {
  const size = 10;
  for (let i = 0; i < files.length; i += size) {
    const batch = files.slice(i, i + size);
    const t0 = performance.now();
    const proc = Bun.spawn(
      ['bun', 'test', '--parallel', '--timeout=8000', '--pass-with-no-tests', ...batch],
      { cwd: ROOT, stdout: 'pipe', stderr: 'pipe', env: Bun.env }
    );
    const killer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // ignore
      }
    }, 25_000);
    const code = (await proc.exited) ?? 1;
    clearTimeout(killer);
    const s = Math.round((performance.now() - t0) / 10) / 100;
    if (!JSON_ONLY) {
      console.info(`batch ${i / size} ${code === 0 ? 'ok' : 'fail'} ${s}s n=${batch.length}`);
    }
  }
}

for (const path of files) {
  const row = await runOne(path, false);
  results.push(row);
  if (!JSON_ONLY && (row.status !== 'pass' || row.s >= 5)) {
    console.info(
      `${row.status.padEnd(4)} ${row.s.toFixed(1).padStart(5)}s ${path} ${row.msg.slice(0, 80)}`
    );
  }
}

const elapsed = Math.round((performance.now() - tAll) / 10) / 100;
const report = buildTestSuiteInventoryReport(results, {
  generatedAt: new Date().toISOString(),
  lane: {
    name: laneName,
    // Per-file evidence is collected by runOne serially. --parallel-probe is
    // an additional batch diagnostic, represented separately below.
    mode: 'serial',
    parallelProbe: PARALLEL_PROBE,
    runtime: 'bun',
    runtimeVersion: process.versions.bun ?? 'unknown',
    platform: process.platform,
    architecture: process.arch,
    timeoutMs,
  },
  elapsedSec: elapsed,
  ...(shardCount === undefined ? {} : { shardCount }),
});

await Bun.$`mkdir -p ${dirnamePath(OUT)}`.quiet();
await Bun.write(OUT, JSON.stringify(report, null, 2) + '\n');
if (shardPlanOut && report.shardPlan) {
  const resolvedShardPlanOut = resolvePath(ROOT, shardPlanOut);
  await Bun.$`mkdir -p ${dirnamePath(resolvedShardPlanOut)}`.quiet();
  await Bun.write(resolvedShardPlanOut, JSON.stringify(report.shardPlan, null, 2) + '\n');
  if (!JSON_ONLY) console.info(`wrote ${resolvedShardPlanOut}`);
}
if (!JSON_ONLY) {
  console.info('');
  console.info(`DONE ${elapsed}s counts=${JSON.stringify(report.counts)}`);
  console.info(`wrote ${OUT}`);
  for (const h of report.hangs) console.info(` HANG ${h}`);
  for (const f of report.fails) console.info(` FAIL ${f.path}`);
}
process.exit(report.counts.HANG + report.counts.fail > 0 ? 1 : 0);
