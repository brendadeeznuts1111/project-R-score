import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBrandBench } from '../scripts/brand-bench-runner';

describe('brand bench runner', () => {
  test('writes run report and latest pointer with required fields', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'brand-bench-runner-'));

    const report = await runBrandBench({
      full360: false,
      seeds: [0, 120, 240],
      iterations: 600,
      warmup: 60,
      outputDir: outDir,
      runId: 'test-runner-001',
      sampleCount: 64,
      quiet: true,
      profileFiles: [],
      scenarioIterations: 3,
    });

    expect(report.runId).toBe('test-runner-001');
    expect(report.seedSet).toEqual([0, 120, 240]);
    expect(typeof report.operations.generatePalette.opsPerSec).toBe('number');
    expect(report.domainInstrumentation.highMemHighTension.avgMemoryFootprint).toBeGreaterThan(0);

    const latestRaw = await readFile(join(outDir, 'latest.json'), 'utf8');
    const latest = JSON.parse(latestRaw) as typeof report;
    expect(latest.runId).toBe('test-runner-001');
    expect(Array.isArray(latest.seedSet)).toBe(true);
  });

  test('supports full360 sweep mode with bounded iterations', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'brand-bench-runner-360-'));

    const report = await runBrandBench({
      full360: true,
      seeds: Array.from({ length: 360 }, (_, i) => i),
      iterations: 360,
      warmup: 36,
      outputDir: outDir,
      runId: 'test-runner-360',
      sampleCount: 32,
      quiet: true,
      profileFiles: [],
      scenarioIterations: 2,
    });

    expect(report.seedSet).toHaveLength(360);
    expect(report.operations.markdownRender.iterations).toBe(360);
  });
});
