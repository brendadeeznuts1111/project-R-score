#!/usr/bin/env bun
/**
 * bench-status.ts — print harness Bun bench / profile metric catalog.
 *
 *   bun run bench:status
 *   bun run bench:status -- --json
 *
 * SSOT prose: docs/harness/tenants/bun-bench-profiling.md
 *
 * @see https://bun.com/docs/project/benchmarking
 * @see https://bun.com/docs/project/benchmarking#cpu-profiling
 * @see https://bun.com/reference/bun/argv — Bun.argv
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { cliOut, logTable } from '../lib/console-depth.ts';

export type BenchSuiteRow = {
  suite: string;
  scripts: string[];
  metrics: string[];
  pinOrEvidence: string;
  profile: string;
};

/** Harness metric catalog (keep in lockstep with bun-bench-profiling.md). */
export const BENCH_METRIC_CATALOG: readonly BenchSuiteRow[] = [
  {
    suite: 'search',
    scripts: ['search:bench', 'search:bench:gate', 'search:bench:baseline:verify'],
    metrics: [
      'latencyP50Ms',
      'latencyP95Ms',
      'latencyMaxMs',
      'peakRssMB',
      'peakHeapUsedMB',
      'quality',
    ],
    pinOrEvidence: '.search/ + docs/performance/SEARCH_BASELINE_GOVERNANCE.md',
    profile: 'n/a',
  },
  {
    suite: 'brand',
    scripts: ['brand:bench:run', 'brand:bench:evaluate', 'brand:bench:pin'],
    metrics: ['opsPerSec', 'p50Ms', 'p95Ms', 'avgMemoryFootprint'],
    pinOrEvidence: 'brand-bench pins (reports/) · scripts/lib/brand-bench-types.ts',
    profile: 'brand:bench:profile → reports/brand-bench/profiles/*.cpuprofile',
  },
  {
    suite: 'limits-lab',
    scripts: ['ops:limits:lab', 'ops:limits:lab:profile'],
    metrics: ['labWallTime', 'forecastDiagnostics'],
    pinOrEvidence: 'docs/harness/tenants/limit-forecast-lab.md',
    profile: 'ops:limits:lab:profile → reports/limit-forecast-lab/profiles/',
  },
  {
    suite: 'console-depth',
    scripts: ['bench:console-depth'],
    metrics: ['stringWidthOps', 'sliceAnsiOps', 'naiveBaseline'],
    pinOrEvidence: 'PROOF console-depth-boundaries · tools/benchmarks/console-depth-perf.ts',
    profile: 'n/a',
  },
  {
    suite: 'deep-inspect',
    scripts: ['bench:deep'],
    metrics: ['meanNs', 'stddevNs', 'percentiles'],
    pinOrEvidence: 'stdout (no pin yet) · tools/benchmarks/deep-benchmark.ts',
    profile: 'n/a',
  },
] as const;

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('bench:status', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const JSON_MODE = argv.includes('--json');

function main(): void {
  if (JSON_MODE) {
    cliOut(
      {
        claim: 'bun-bench-profiling',
        tenant: 'docs/harness/tenants/bun-bench-profiling.md',
        bunDocs: 'https://bun.com/docs/project/benchmarking',
        suites: BENCH_METRIC_CATALOG,
      },
      { json: true }
    );
    return;
  }

  console.log('Harness Bun bench / profile catalog (claim bun-bench-profiling)\n');
  logTable(
    BENCH_METRIC_CATALOG.map(row => ({
      suite: row.suite,
      scripts: row.scripts.join(' · '),
      metrics: row.metrics.join(', '),
      pin: row.pinOrEvidence,
      profile: row.profile,
    })),
    ['suite', 'scripts', 'metrics', 'pin', 'profile']
  );
  console.log('\nTenant: docs/harness/tenants/bun-bench-profiling.md');
  console.log('Runners: tools/benchmarks/README.md');
}

if (import.meta.main) {
  main();
}
