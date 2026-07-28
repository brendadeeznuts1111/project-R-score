// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildDurationBalancedShardPlan,
  buildTestSuiteInventoryReport,
  type TestDurationRow,
} from '../scripts/lib/duration-balanced-shards.ts';

function row(path: string, s: number): TestDurationRow {
  return { path, s, status: 'pass', msg: '' };
}

describe('buildDurationBalancedShardPlan', () => {
  test('uses deterministic longest-processing-time assignment', () => {
    const plan = buildDurationBalancedShardPlan(
      [row('tests/d.test.ts', 4), row('tests/a.test.ts', 8), row('tests/c.test.ts', 5), row('tests/b.test.ts', 7)],
      { lane: 'linux-ci', shardCount: 2 }
    );

    expect(plan).toEqual({
      schemaVersion: 1,
      lane: 'linux-ci',
      algorithm: 'longest-processing-time-v1',
      shardCount: 2,
      fileCount: 4,
      totalDurationSec: 24,
      shards: [
        {
          shard: 1,
          estimatedDurationSec: 12,
          files: ['tests/a.test.ts', 'tests/d.test.ts'],
        },
        {
          shard: 2,
          estimatedDurationSec: 12,
          files: ['tests/b.test.ts', 'tests/c.test.ts'],
        },
      ],
    });
  });

  test('is stable across input order and breaks equal-duration ties by path', () => {
    const inputs = [
      row('tests/c.test.ts', 1),
      row('tests/a.test.ts', 1),
      row('tests/b.test.ts', 1),
    ];
    const forward = buildDurationBalancedShardPlan(inputs, { lane: 'local', shardCount: 2 });
    const reverse = buildDurationBalancedShardPlan([...inputs].reverse(), {
      lane: 'local',
      shardCount: 2,
    });

    expect(reverse).toEqual(forward);
    expect(forward.shards).toEqual([
      {
        shard: 1,
        estimatedDurationSec: 2,
        files: ['tests/a.test.ts', 'tests/c.test.ts'],
      },
      { shard: 2, estimatedDurationSec: 1, files: ['tests/b.test.ts'] },
    ]);
  });

  test('retains failed and hanging files in the plan', () => {
    const plan = buildDurationBalancedShardPlan(
      [
        { path: 'tests/pass.test.ts', status: 'pass', s: 0.5, msg: '' },
        { path: 'tests/fail.test.ts', status: 'fail', s: 0.25, msg: 'failed' },
        { path: 'tests/hang.test.ts', status: 'HANG', s: 20, msg: 'wall timeout' },
      ],
      { lane: 'inventory', shardCount: 2 }
    );

    expect(plan.fileCount).toBe(3);
    expect(plan.shards.flatMap(shard => shard.files).sort()).toEqual([
      'tests/fail.test.ts',
      'tests/hang.test.ts',
      'tests/pass.test.ts',
    ]);
  });

  test('keeps empty shards when requested shard count exceeds file count', () => {
    const plan = buildDurationBalancedShardPlan([row('tests/a.test.ts', 0.01)], {
      lane: 'small',
      shardCount: 3,
    });

    expect(plan.shards).toHaveLength(3);
    expect(plan.shards[2]).toEqual({ shard: 3, estimatedDurationSec: 0, files: [] });
  });

  test('rejects invalid durations, duplicate paths, shard counts, and lanes', () => {
    expect(() =>
      buildDurationBalancedShardPlan([row('tests/a.test.ts', Number.NaN)], {
        lane: 'local',
        shardCount: 1,
      })
    ).toThrow('duration must be a finite non-negative number');
    expect(() =>
      buildDurationBalancedShardPlan([row('tests/a.test.ts', 1), row('tests/a.test.ts', 2)], {
        lane: 'local',
        shardCount: 1,
      })
    ).toThrow('duplicate test path');
    expect(() =>
      buildDurationBalancedShardPlan([], { lane: 'local', shardCount: 0 })
    ).toThrow('shardCount must be a positive safe integer');
    expect(() => buildDurationBalancedShardPlan([], { lane: ' ', shardCount: 1 })).toThrow(
      'lane must be non-empty'
    );
  });
});

describe('buildTestSuiteInventoryReport', () => {
  test('retains every row while keeping the legacy top-30 slow summary', () => {
    const rows = Array.from({ length: 35 }, (_, index) =>
      row(`tests/${String(index).padStart(2, '0')}.test.ts`, index + 1)
    );
    rows[0] = { ...rows[0]!, status: 'fail', msg: 'assertion failed' };
    rows[1] = { ...rows[1]!, status: 'HANG', msg: 'wall timeout' };

    const report = buildTestSuiteInventoryReport(rows, {
      generatedAt: '2026-07-28T00:00:00.000Z',
      elapsedSec: 42,
      lane: {
        name: 'macos-local',
        mode: 'serial',
        parallelProbe: false,
        runtime: 'bun',
        runtimeVersion: '1.4.0',
        platform: 'darwin',
        architecture: 'arm64',
        timeoutMs: 20_000,
      },
      shardCount: 2,
    });

    expect(report.schema).toBe('factorywager.test-suite-inventory');
    expect(report.schemaVersion).toBe(1);
    expect(report.rows).toEqual(rows);
    expect(report.rows).not.toBe(rows);
    expect(report.slow).toHaveLength(30);
    expect(report.counts).toEqual({ pass: 33, fail: 1, HANG: 1 });
    expect(report.fails).toEqual([
      { path: 'tests/00.test.ts', msg: 'assertion failed', s: 1 },
    ]);
    expect(report.hangs).toEqual(['tests/01.test.ts']);
    expect(report.shardPlan?.fileCount).toBe(35);
    expect(report.shardPlan?.lane).toBe('macos-local');
  });
});
