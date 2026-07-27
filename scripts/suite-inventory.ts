#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Per-file tests/ inventory — pass / fail / HANG with wall timeout.
 *
 *   bun run test:inventory
 *   bun run test:inventory -- --timeout-ms=15000 --json
 *   bun run test:inventory -- --parallel-probe   # groups of 10 under --parallel
 *
 * Writes: tmp/test-file-report.json
 */
import { Glob } from 'bun';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT = joinPath(ROOT, 'tmp', 'test-file-report.json');
const argv = Bun.argv.slice(2);
const JSON_ONLY = argv.includes('--json');
const PARALLEL_PROBE = argv.includes('--parallel-probe');
const timeoutMs = (() => {
  const i = argv.indexOf('--timeout-ms');
  if (i >= 0 && argv[i + 1]) return Number(argv[i + 1]);
  return 20_000;
})();

type Row = { path: string; status: 'pass' | 'fail' | 'HANG'; s: number; msg: string };

async function runOne(path: string, parallel: boolean): Promise<Row> {
  const t0 = performance.now();
  const args = ['test', `--timeout=${Math.min(10_000, timeoutMs - 1000)}`, '--pass-with-no-tests'];
  if (parallel) args.push('--parallel');
  args.push(path);
  // Do not force BUN_CONSOLE_DEPTH — tests such as console-depth assert the
  // env/default precedence and would false-fail under a probe override.
  const proc = Bun.spawn(['bun', ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: Bun.env,
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

const results: Row[] = [];
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
const counts = {
  pass: results.filter(r => r.status === 'pass').length,
  fail: results.filter(r => r.status === 'fail').length,
  HANG: results.filter(r => r.status === 'HANG').length,
};

const report = {
  generatedAt: new Date().toISOString(),
  elapsedSec: elapsed,
  counts,
  hangs: results.filter(r => r.status === 'HANG').map(r => r.path),
  fails: results.filter(r => r.status === 'fail').map(r => ({ path: r.path, msg: r.msg, s: r.s })),
  slow: [...results]
    .filter(r => r.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, 30),
};

await Bun.write(OUT, JSON.stringify(report, null, 2) + '\n');
if (!JSON_ONLY) {
  console.info('');
  console.info(`DONE ${elapsed}s counts=${JSON.stringify(counts)}`);
  console.info(`wrote ${OUT}`);
  for (const h of report.hangs) console.info(` HANG ${h}`);
  for (const f of report.fails) console.info(` FAIL ${f.path}`);
}
process.exit(counts.HANG + counts.fail > 0 ? 1 : 0);
