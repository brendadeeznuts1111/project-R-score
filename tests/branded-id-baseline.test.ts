import { describe, expect, test } from 'bun:test';

import { resolveBunExecutable } from '../lib/bun-executable.ts';
import {
  candidateBrandNameForField,
  findStaleBaselineKeys,
  summarizeBaselineKeyMatches,
} from '../tools/branded-id-check.ts';

describe('branded ID baseline ratchet', () => {
  test('returns only baseline keys no longer backed by actionable declarations', () => {
    const liveKey = ['lib/a.ts', 'accountId', 'accountId: ' + 'string;'].join('\t');
    const baseline = new Set([liveKey, 'stale-key']);
    const live = new Set([liveKey, 'new-unbaselined-key']);

    expect(findStaleBaselineKeys(baseline, live)).toEqual(['stale-key']);
  });

  test('sorts stale keys for deterministic diagnostics', () => {
    expect(findStaleBaselineKeys(new Set(['z', 'a']), new Set())).toEqual(['a', 'z']);
  });

  test('reports repeated declarations covered by one baseline key', () => {
    expect(summarizeBaselineKeyMatches(new Set(['live', 'stale']), ['live', 'live'])).toEqual({
      scope: 'repository',
      keyCount: 2,
      matchedKeyCount: 1,
      matchCount: 2,
      staleKeys: ['stale'],
      duplicateMatches: [{ key: 'live', count: 2 }],
    });
  });

  test('scoped scans never infer repository-wide stale keys', () => {
    expect(summarizeBaselineKeyMatches(new Set(['outside-scope']), [], 'paths').staleKeys).toEqual(
      []
    );
  });
});

describe('branded ID workflow UX', () => {
  const repo = new URL('..', import.meta.url).pathname;
  const bunExecutable = resolveBunExecutable();

  test('normalizes unknown fields to naming candidates without claiming catalog membership', () => {
    expect(candidateBrandNameForField('commandId')).toBe('CommandId');
    expect(candidateBrandNameForField('agent_id')).toBe('AgentId');
  });

  test('--help prints usage without scanning the repository', () => {
    const result = Bun.spawnSync([bunExecutable, 'tools/branded-id-check.ts', '--help'], {
      cwd: repo,
    });
    const output = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(output).toContain('Usage:');
    expect(output).toContain('--legacy');
    expect(output).not.toContain('Unbranded ID declarations');
  });

  test('unknown options fail instead of silently running a different scan', () => {
    const result = Bun.spawnSync([bunExecutable, 'tools/branded-id-check.ts', '--smrat'], {
      cwd: repo,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr.toString()).toContain('Unknown option(s): --smrat');
    expect(result.stdout.toString()).toContain('Usage:');
  });

  test('--strict uses smart classification instead of the raw legacy rollup', () => {
    const result = Bun.spawnSync([bunExecutable, 'tools/branded-id-check.ts', '--strict'], {
      cwd: repo,
      timeout: 60_000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('branded-id-check --smart');
    expect(result.stdout.toString()).not.toContain('Unbranded ID declarations');
  });

  test('--legacy --json exposes empty migration queue after baseline migration', () => {
    const result = Bun.spawnSync(
      [bunExecutable, 'tools/branded-id-check.ts', '--legacy', '--json'],
      { cwd: repo, timeout: 60_000 }
    );
    const report = JSON.parse(result.stdout.toString()) as {
      baseline: {
        keyCount: number;
        matchedKeyCount: number;
        matchCount: number;
        staleKeys: string[];
      };
      legacyHits: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(report.baseline.keyCount).toBe(0);
    expect(report.baseline.matchedKeyCount).toBe(0);
    expect(report.baseline.matchCount).toBe(0);
    expect(report.baseline.staleKeys).toEqual([]);
    expect(report.legacyHits).toEqual([]);
  });

  test('harness violations legacy queue is empty after baseline migration', () => {
    const result = Bun.spawnSync(
      [
        bunExecutable,
        'tools/harness-violations.ts',
        '--rule',
        'brands',
        '--legacy-brands',
        '--json',
      ],
      { cwd: repo, timeout: 60_000 }
    );
    const report = JSON.parse(result.stdout.toString()) as {
      count: number;
      byRule: Record<string, number>;
      hits: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(report.count).toBe(0);
    expect(report.hits).toEqual([]);
  });
});
