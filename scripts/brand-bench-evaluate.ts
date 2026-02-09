#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  BrandBenchEvaluation,
  BrandBenchPinnedBaseline,
  BrandBenchReport,
  BrandBenchSeverity,
  BrandBenchViolation,
} from './lib/brand-bench-types';
import { createShutdown } from './lib/graceful-shutdown';

const THRESHOLDS = {
  warn: {
    throughputDropPct: 5,
    latencyIncreasePct: 8,
    memoryIncreasePct: 10,
  },
  fail: {
    throughputDropPct: 10,
    latencyIncreasePct: 15,
    memoryIncreasePct: 20,
  },
  // Reduce false positives from micro-jitter in ultra-fast benchmarks.
  minAbsoluteDelta: {
    latencyMs: 0.05,
    memoryFootprint: 64,
  },
} as const;

type EvaluateOptions = {
  strict: boolean;
  json: boolean;
  currentPath: string;
  baselinePath: string;
  governancePath: string;
};

function parseArgs(argv: string[]): EvaluateOptions {
  return {
    strict: argv.includes('--strict'),
    json: argv.includes('--json'),
    currentPath: resolve(argv.find(a => a.startsWith('--current='))?.split('=')[1] || 'reports/brand-bench/latest.json'),
    baselinePath: resolve(argv.find(a => a.startsWith('--baseline='))?.split('=')[1] || 'reports/brand-bench/pinned-baseline.json'),
    governancePath: resolve(argv.find(a => a.startsWith('--governance='))?.split('=')[1] || 'reports/brand-bench/governance.json'),
  };
}

type BenchGovernance = {
  mode?: 'warn' | 'strict';
  warnCycle?: number;
  warnCyclesTotal?: number;
};

function pctDelta(current: number, baseline: number): number {
  if (!Number.isFinite(baseline) || baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

function severityFor(pct: number, kind: 'throughput_drop' | 'latency_spike' | 'memory_increase'): BrandBenchSeverity {
  if (kind === 'throughput_drop') {
    const drop = -pct;
    if (drop >= THRESHOLDS.fail.throughputDropPct) return 'fail';
    if (drop >= THRESHOLDS.warn.throughputDropPct) return 'warn';
    return 'ok';
  }

  if (kind === 'latency_spike') {
    if (pct >= THRESHOLDS.fail.latencyIncreasePct) return 'fail';
    if (pct >= THRESHOLDS.warn.latencyIncreasePct) return 'warn';
    return 'ok';
  }

  if (pct >= THRESHOLDS.fail.memoryIncreasePct) return 'fail';
  if (pct >= THRESHOLDS.warn.memoryIncreasePct) return 'warn';
  return 'ok';
}

function anomalyTypeFrom(violations: BrandBenchViolation[]): BrandBenchEvaluation['anomalyType'] {
  if (violations.some(v => v.kind === 'latency_spike')) return 'latency_spike';
  if (violations.some(v => v.kind === 'throughput_drop')) return 'throughput_drop';
  if (violations.some(v => v.kind === 'memory_increase')) return 'memory_increase';
  return 'stable';
}

function compareMetric(
  metric: string,
  kind: 'throughput_drop' | 'latency_spike' | 'memory_increase',
  baseline: number,
  current: number
): BrandBenchViolation | null {
  const deltaAbs = current - baseline;
  if (kind === 'latency_spike' && deltaAbs < THRESHOLDS.minAbsoluteDelta.latencyMs) return null;
  if (kind === 'memory_increase' && deltaAbs < THRESHOLDS.minAbsoluteDelta.memoryFootprint) return null;
  const deltaPct = pctDelta(current, baseline);
  const severity = severityFor(deltaPct, kind);
  if (severity === 'ok') return null;

  return {
    metric,
    kind,
    severity,
    baseline,
    current,
    deltaAbs: Number(deltaAbs.toFixed(4)),
    deltaPct: Number(deltaPct.toFixed(4)),
    message: `${metric} ${kind} ${deltaPct.toFixed(2)}%`,
  };
}

export function evaluateBrandBench(
  current: BrandBenchReport,
  baseline: BrandBenchReport,
  options: {
    strict: boolean;
    currentPath: string;
    baselinePath: string;
    gateMode?: 'warn' | 'strict';
    warnCycle?: number;
    warnCyclesTotal?: number;
  }
): BrandBenchEvaluation {
  const violations: BrandBenchViolation[] = [];

  for (const [name, baselineMetric] of Object.entries(baseline.operations)) {
    const currentMetric = current.operations[name];
    if (!currentMetric) continue;

    const throughputViolation = compareMetric(
      `operations.${name}.opsPerSec`,
      'throughput_drop',
      baselineMetric.opsPerSec,
      currentMetric.opsPerSec
    );
    if (throughputViolation) violations.push(throughputViolation);

    const latencyViolation = compareMetric(
      `operations.${name}.p95Ms`,
      'latency_spike',
      baselineMetric.p95Ms,
      currentMetric.p95Ms
    );
    if (latencyViolation) violations.push(latencyViolation);
  }

  for (const [name, baselineScenario] of Object.entries(baseline.domainInstrumentation)) {
    const currentScenario = current.domainInstrumentation[name];
    if (!currentScenario) continue;

    const loadLatencyViolation = compareMetric(
      `domain.${name}.loadResourcesMs.p95Ms`,
      'latency_spike',
      baselineScenario.loadResourcesMs.p95Ms,
      currentScenario.loadResourcesMs.p95Ms
    );
    if (loadLatencyViolation) violations.push(loadLatencyViolation);

    const memoryViolation = compareMetric(
      `domain.${name}.avgMemoryFootprint`,
      'memory_increase',
      baselineScenario.avgMemoryFootprint,
      currentScenario.avgMemoryFootprint
    );
    if (memoryViolation) violations.push(memoryViolation);
  }

  const hasFail = violations.some(v => v.severity === 'fail');
  const hasWarn = violations.some(v => v.severity === 'warn');
  const status: BrandBenchEvaluation['status'] = options.strict
    ? (hasFail ? 'fail' : hasWarn ? 'warn' : 'ok')
    : (hasFail || hasWarn ? 'warn' : 'ok');

  return {
    ok: status !== 'fail' || !options.strict,
    strict: options.strict,
    gateMode: options.gateMode,
    warnCycle: options.warnCycle,
    warnCyclesTotal: options.warnCyclesTotal,
    status,
    anomalyType: anomalyTypeFrom(violations),
    baselinePath: options.baselinePath,
    currentPath: options.currentPath,
    baselineRunId: baseline.runId,
    currentRunId: current.runId,
    violations,
    thresholds: THRESHOLDS,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  let governance: BenchGovernance = {};

  let current: BrandBenchReport;
  let baselinePinned: BrandBenchPinnedBaseline;
  try {
    governance = JSON.parse(await readFile(options.governancePath, 'utf8')) as BenchGovernance;
  } catch {
    governance = {};
  }

  const strict = options.strict || governance.mode === 'strict';
  const gateMode: 'warn' | 'strict' = strict ? 'strict' : 'warn';
  const warnCycle = Number.isFinite(governance.warnCycle) ? Number(governance.warnCycle) : 1;
  const warnCyclesTotal = Number.isFinite(governance.warnCyclesTotal) ? Number(governance.warnCyclesTotal) : 5;

  try {
    current = JSON.parse(await readFile(options.currentPath, 'utf8')) as BrandBenchReport;
  } catch (error) {
    throw new Error(`Unable to read current report at ${options.currentPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    baselinePinned = JSON.parse(await readFile(options.baselinePath, 'utf8')) as BrandBenchPinnedBaseline;
  } catch {
    const result: BrandBenchEvaluation = {
      ok: true,
      strict,
      gateMode,
      warnCycle,
      warnCyclesTotal,
      status: 'warn',
      anomalyType: 'stable',
      baselinePath: options.baselinePath,
      currentPath: options.currentPath,
      baselineRunId: null,
      currentRunId: current.runId,
      violations: [
        {
          metric: 'baseline',
          kind: 'latency_spike',
          severity: 'warn',
          baseline: 0,
          current: 0,
          deltaAbs: 0,
          deltaPct: 0,
          message: 'Baseline file missing; run brand:bench:pin to establish baseline.',
        },
      ],
      thresholds: THRESHOLDS,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
    return;
  }

  if (!baselinePinned.report) {
    const result: BrandBenchEvaluation = {
      ok: true,
      strict,
      gateMode,
      warnCycle,
      warnCyclesTotal,
      status: 'warn',
      anomalyType: 'stable',
      baselinePath: options.baselinePath,
      currentPath: options.currentPath,
      baselineRunId: baselinePinned.baselineRunId,
      currentRunId: current.runId,
      violations: [
        {
          metric: 'baseline',
          kind: 'latency_spike',
          severity: 'warn',
          baseline: 0,
          current: 0,
          deltaAbs: 0,
          deltaPct: 0,
          message: 'Baseline report is empty; run brand:bench:pin with --from.',
        },
      ],
      thresholds: THRESHOLDS,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
    return;
  }

  const result = evaluateBrandBench(current, baselinePinned.report, {
    strict,
    gateMode,
    warnCycle,
    warnCyclesTotal,
    currentPath: options.currentPath,
    baselinePath: options.baselinePath,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`status=${result.status} anomalyType=${result.anomalyType} violations=${result.violations.length}`);
  }

  process.exit(strict && result.status === 'fail' ? 1 : 0);
}

if (import.meta.main) {
  const shutdown = createShutdown({ name: 'brand-bench-evaluate', autoExit: true });
  await main();
  shutdown.dispose();
}
