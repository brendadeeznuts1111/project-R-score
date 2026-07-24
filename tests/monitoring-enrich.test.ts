import { describe, expect, test } from 'bun:test';
import { collectMonitoring } from '../lib/monitoring/collect.ts';
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
});
