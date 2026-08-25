// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { describe, expect, test } from 'bun:test';
import {
  runCoreStep,
  writeCoreTimingReport,
} from '../scripts/lib/ci-core-runner';

describe('ci-core runner', () => {
  test('captures output and exit status for a successful Bun child', async () => {
    const result = await runCoreStep(['bun', '-e', 'console.log("runner-ok")'], {
      cwd: `${import.meta.dir}/..`,
      inherit: false,
    });

    expect(result.code).toBe(0);
    expect(result.out.trim()).toBe('runner-ok');
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  test('reports elapsed wall time separately from the parallel step sum', async () => {
    const outputDir = `${Bun.env.TMPDIR ?? '/tmp'}/fw-ci-core-${Bun.randomUUIDv7()}`;
    const outputPath = `${outputDir}/timing.json`;
    try {
      await writeCoreTimingReport({
        path: outputPath,
        startedAt: performance.now() - 10,
        timings: [
          { name: 'one', ms: 20, ok: true },
          { name: 'two', ms: 30, ok: true },
        ],
      });

      const report = await Bun.file(outputPath).json();
      expect(report.totalMs).toBe(50);
      expect(report.wallMs).toBeGreaterThanOrEqual(10);
      expect(report.gates).toHaveLength(2);
    } finally {
      await Bun.$`rm -rf ${outputDir}`.quiet();
    }
  });
});
