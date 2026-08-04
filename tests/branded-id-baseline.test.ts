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
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('branded-id-check --smart');
    expect(result.stdout.toString()).not.toContain('Unbranded ID declarations');
  });

  test('--legacy --json exposes the complete migration queue and baseline cardinality', () => {
    const result = Bun.spawnSync(
      [bunExecutable, 'tools/branded-id-check.ts', '--legacy', '--json'],
      { cwd: repo }
    );
    const report = JSON.parse(result.stdout.toString()) as {
      baseline: {
        keyCount: number;
        matchedKeyCount: number;
        matchCount: number;
        staleKeys: string[];
      };
      legacyHits: Array<{
        field: string;
        brandHint: string | null;
        candidateBrand: string | null;
      }>;
    };

    expect(result.exitCode).toBe(0);
    expect(report.baseline.matchedKeyCount).toBe(report.baseline.keyCount);
    expect(report.baseline.matchCount).toBe(report.legacyHits.length);
    expect(report.baseline.staleKeys).toEqual([]);
    expect(report.legacyHits.find(hit => hit.field === 'commandId')).toMatchObject({
      brandHint: null,
      candidateBrand: 'CommandId',
    });
  });

  test('harness violations consumes the authoritative legacy queue', () => {
    const result = Bun.spawnSync(
      [
        bunExecutable,
        'tools/harness-violations.ts',
        '--rule',
        'brands',
        '--legacy-brands',
        '--json',
      ],
      { cwd: repo }
    );
    const report = JSON.parse(result.stdout.toString()) as {
      count: number;
      byRule: Record<string, number>;
      hits: Array<{ rule: string; message: string; hint?: string }>;
    };

    expect(result.exitCode).toBe(0);
    expect(report.count).toBe(report.byRule['branded-id/legacy']);
    expect(report.hits.every(hit => hit.rule === 'branded-id/legacy')).toBe(true);
    expect(report.hits.find(hit => hit.message.startsWith('commandId:'))?.hint).toContain(
      'only a naming candidate'
    );
  });
});
