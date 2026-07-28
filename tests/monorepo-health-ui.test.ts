// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  computeMonorepoHealth,
  type MonorepoHealthReport,
} from '../lib/harness/monorepo-health.ts';
import {
  appendHealthHistory,
  computeHealthTrend,
  openHealthHistory,
  recordHealthRun,
} from '../lib/harness/monorepo-health-history.ts';
import {
  MONOREPO_HEALTH_MIN_BUN,
  checkBunVersion,
  formatTrendLine,
  metricTableRows,
  probeExternalTools,
  parseHealthReportSchemaIssues,
} from '../lib/harness/monorepo-health-ui.ts';

function sampleReport(scoreOverride?: number): MonorepoHealthReport {
  const base = computeMonorepoHealth({
    duplicateDepCount: 0,
    deadCodePercent: 0,
    largeFilePercent: 0,
    testFailureRate: 0,
    cyclicDependencyCount: 0,
    testCoveragePercent: 50,
  });
  return {
    ...base,
    score: scoreOverride ?? base.score,
    grade:
      (scoreOverride ?? base.score) >= 90
        ? 'healthy'
        : (scoreOverride ?? base.score) >= 60
          ? 'needs-improvement'
          : 'critical',
    generatedAt: new Date().toISOString(),
    root: process.cwd(),
    bunVersion: Bun.version,
    fileCount: 10,
    largeFileCount: 1,
    deadFileCount: 0,
    workspacePackageCount: 3,
    entrypointsUsed: ['lib/x.ts'],
    testsRun: true,
    buildRun: true,
    notes: ['test'],
  };
}

describe('monorepo-health-ui', () => {
  test('checkBunVersion satisfies min pin', () => {
    const r = checkBunVersion(`>=${MONOREPO_HEALTH_MIN_BUN}`);
    expect(r.version).toBe(Bun.version);
    expect(r.ok).toBe(true);
  });

  test('parseHealthReportSchemaIssues accepts sample and rejects junk', () => {
    expect(parseHealthReportSchemaIssues(sampleReport())).toEqual([]);
    expect(parseHealthReportSchemaIssues(null).length).toBeGreaterThan(0);
    expect(parseHealthReportSchemaIssues({ score: 50 }).length).toBeGreaterThan(0);
  });

  test('metricTableRows preprocess columns', () => {
    const rows = metricTableRows(sampleReport());
    expect(rows.length).toBe(6);
    expect(String(rows[0]!.Metric)).toContain('duplicate');
  });

  test('probeExternalTools finds bun', () => {
    const tools = probeExternalTools(['bun', 'definitely-not-a-bin-xyz']);
    expect(tools.find(t => t.name === 'bun')?.path).toBeTruthy();
    expect(tools.find(t => t.name === 'definitely-not-a-bin-xyz')?.path).toBeNull();
  });
});

describe('monorepo-health-history', () => {
  test('records runs and computes trend delta', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mh-hist-'));
    const dbPath = join(dir, 'h.sqlite');
    const db = openHealthHistory(dbPath);
    recordHealthRun(db, sampleReport(70));
    recordHealthRun(db, sampleReport(80));
    const trend = computeHealthTrend(db, { historyPath: dbPath });
    db.close();
    expect(trend.samples).toBe(2);
    expect(trend.delta).toBe(10);
    expect(trend.direction).toBe('up');
    expect(formatTrendLine(trend)).toContain('↑');

    const a = await appendHealthHistory(sampleReport(85), { historyPath: dbPath });
    expect(a.id).toBeGreaterThan(0);
    expect(a.trend.samples).toBe(3);
  });
});
