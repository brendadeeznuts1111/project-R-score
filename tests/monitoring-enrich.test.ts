import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectMonitoring } from '../lib/monitoring/collect.ts';
import { loadComplianceMonitoringSlice } from '../lib/monitoring/compliance-slice.ts';
import { enrichMonitoringForSnapshot } from '../lib/monitoring/enrich-snapshot.ts';
import { openOperationsDb } from '../lib/operations/db.ts';

describe('enrichMonitoringForSnapshot', () => {
  test('merges routing and bun utils slices', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const base = await collectMonitoring(db, { source: 'snapshot' });
    db.close();

    const enriched = enrichMonitoringForSnapshot(base, {
      env: { summary: { total: 1, ok: 1, requiredMissing: 0 }, table: [] },
      routing: {
        available: true,
        passed: 16,
        total: 16,
        baseUrl: 'https://score.factory-wager.com',
        routes: [{ path: '/api/monitoring', status: 200, pass: true, critical: true }],
      },
      bunUtils: { passed: 30, total: 30, bunVersion: '1.4.0', timestamp: '2026-07-24T00:00:00.000Z' },
    });

    expect(enriched.routeStats?.routing?.passed).toBe(16);
    expect(enriched.routeStats?.routing?.routes?.[0]?.path).toBe('/api/monitoring');
    expect(enriched.bunApiProof?.demosPassed).toBe(30);
    expect(enriched.env?.summary?.total).toBe(1);
  });

  test('snapshot collect retains compliance slice through enrich', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const base = await collectMonitoring(db, { source: 'snapshot' });
    db.close();

    // Board may be present in workspace; if so, freeze shape must round-trip enrich.
    if (base.compliance) {
      const enriched = enrichMonitoringForSnapshot(base, {
        env: { summary: { total: 0, ok: 0, requiredMissing: 0 }, table: [] },
      });
      expect(enriched.compliance?.available).toBe(true);
      expect(enriched.compliance?.path).toBe('/registry/compliance-board.json');
      expect(enriched.compliance?.portal).toBe('/portal/compliance/');
      expect(typeof enriched.compliance?.ok).toBe('boolean');
      expect(enriched.compliance?.enhancements).toMatch(/^\d+\/\d+$/);
    }
  });
});

describe('loadComplianceMonitoringSlice', () => {
  test('projects board file into monitoring freeze shape', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'compliance-mon-'));
    const boardPath = join(dir, 'compliance-board.json');
    try {
      await writeFile(
        boardPath,
        JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-07-27T12:00:00.000Z',
          enhancements: { passed: 8, total: 8 },
          shadow: { summary: { mismatches: 0, allow: 4, block: 4 } },
        })
      );

      const slice = await loadComplianceMonitoringSlice(boardPath);
      expect(slice).not.toBeNull();
      expect(slice).toEqual({
        available: true,
        ok: true,
        enhancements: '8/8',
        shadowMismatches: 0,
        shadowAllow: 4,
        shadowBlock: 4,
        generatedAt: '2026-07-27T12:00:00.000Z',
        path: '/registry/compliance-board.json',
        portal: '/portal/compliance/',
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('returns null when board missing', async () => {
    const slice = await loadComplianceMonitoringSlice(
      join(tmpdir(), 'no-such-compliance-board-zzz.json')
    );
    expect(slice).toBeNull();
  });

  test('ok is false when shadow mismatches', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'compliance-mon-bad-'));
    const boardPath = join(dir, 'compliance-board.json');
    try {
      await writeFile(
        boardPath,
        JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-07-27T12:00:00.000Z',
          enhancements: { passed: 7, total: 8 },
          shadow: { summary: { mismatches: 2, allow: 3, block: 5 } },
        })
      );
      const slice = await loadComplianceMonitoringSlice(boardPath);
      expect(slice?.ok).toBe(false);
      expect(slice?.enhancements).toBe('7/8');
      expect(slice?.shadowMismatches).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
