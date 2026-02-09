import { describe, expect, test } from 'bun:test';
import { evaluateBrandBench } from '../scripts/brand-bench-evaluate';
import type { BrandBenchReport } from '../scripts/lib/brand-bench-types';

function makeReport(overrides: Partial<BrandBenchReport> = {}): BrandBenchReport {
  return {
    runId: 'run-a',
    createdAt: new Date().toISOString(),
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    seedSet: [0, 120, 240],
    iterations: 1000,
    warmup: 100,
    operations: {
      generatePalette: { iterations: 1000, warmup: 100, totalMs: 10, opsPerSec: 100000, p50Ms: 0.01, p95Ms: 0.03 },
      bunColorHex: { iterations: 1000, warmup: 100, totalMs: 5, opsPerSec: 200000, p50Ms: 0.005, p95Ms: 0.02 },
      bunColorAnsi: { iterations: 1000, warmup: 100, totalMs: 5, opsPerSec: 200000, p50Ms: 0.005, p95Ms: 0.02 },
      markdownRender: { iterations: 1000, warmup: 100, totalMs: 15, opsPerSec: 66666, p50Ms: 0.01, p95Ms: 0.05 },
      markdownReact: { iterations: 1000, warmup: 100, totalMs: 20, opsPerSec: 50000, p50Ms: 0.02, p95Ms: 0.06 },
    },
    domainInstrumentation: {
      lowMemLowTension: {
        withPerformanceMs: { iterations: 1000, warmup: 100, totalMs: 10, opsPerSec: 100000, p50Ms: 0.01, p95Ms: 0.03 },
        loadResourcesMs: { iterations: 8, warmup: 2, totalMs: 80, opsPerSec: 100, p50Ms: 10, p95Ms: 12 },
        avgMemoryFootprint: 160,
      },
      highMemLowTension: {
        withPerformanceMs: { iterations: 1000, warmup: 100, totalMs: 10, opsPerSec: 100000, p50Ms: 0.01, p95Ms: 0.03 },
        loadResourcesMs: { iterations: 8, warmup: 2, totalMs: 85, opsPerSec: 94, p50Ms: 11, p95Ms: 13 },
        avgMemoryFootprint: 170,
      },
      lowMemHighTension: {
        withPerformanceMs: { iterations: 1000, warmup: 100, totalMs: 10, opsPerSec: 100000, p50Ms: 0.01, p95Ms: 0.03 },
        loadResourcesMs: { iterations: 8, warmup: 2, totalMs: 90, opsPerSec: 88, p50Ms: 11, p95Ms: 13 },
        avgMemoryFootprint: 165,
      },
      highMemHighTension: {
        withPerformanceMs: { iterations: 1000, warmup: 100, totalMs: 10, opsPerSec: 100000, p50Ms: 0.01, p95Ms: 0.03 },
        loadResourcesMs: { iterations: 8, warmup: 2, totalMs: 95, opsPerSec: 84, p50Ms: 12, p95Ms: 14 },
        avgMemoryFootprint: 175,
      },
    },
    profileFiles: [],
    status: 'ok',
    violations: [],
    ...overrides,
  };
}

describe('brand bench evaluate', () => {
  test('stable report returns ok', () => {
    const baseline = makeReport({ runId: 'baseline' });
    const current = makeReport({ runId: 'current' });

    const result = evaluateBrandBench(current, baseline, {
      strict: false,
      currentPath: '/tmp/current.json',
      baselinePath: '/tmp/baseline.json',
    });

    expect(result.status).toBe('ok');
    expect(result.anomalyType).toBe('stable');
    expect(result.violations).toHaveLength(0);
  });

  test('warn mode reports warn but keeps ok true', () => {
    const baseline = makeReport({ runId: 'baseline' });
    const current = makeReport({
      runId: 'current',
      domainInstrumentation: {
        ...baseline.domainInstrumentation,
        lowMemLowTension: {
          ...baseline.domainInstrumentation.lowMemLowTension,
          loadResourcesMs: {
            ...baseline.domainInstrumentation.lowMemLowTension.loadResourcesMs,
            p95Ms: baseline.domainInstrumentation.lowMemLowTension.loadResourcesMs.p95Ms * 1.1,
          },
        },
      },
    });

    const result = evaluateBrandBench(current, baseline, {
      strict: false,
      currentPath: '/tmp/current.json',
      baselinePath: '/tmp/baseline.json',
    });

    expect(result.status).toBe('warn');
    expect(result.ok).toBe(true);
    expect(result.anomalyType).toBe('latency_spike');
  });

  test('strict mode fail remains non-ok', () => {
    const baseline = makeReport({ runId: 'baseline' });
    const current = makeReport({
      runId: 'current',
      operations: {
        ...baseline.operations,
        generatePalette: {
          ...baseline.operations.generatePalette,
          opsPerSec: baseline.operations.generatePalette.opsPerSec * 0.75,
        },
      },
    });

    const result = evaluateBrandBench(current, baseline, {
      strict: true,
      currentPath: '/tmp/current.json',
      baselinePath: '/tmp/baseline.json',
    });

    expect(result.status).toBe('fail');
    expect(result.ok).toBe(false);
    expect(result.anomalyType).toBe('throughput_drop');
  });
});
