// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  collectMonitoring,
  formatUptime,
  mergeIntegritySnapshots,
  recordIntegrityCheck,
  renderMonitoringHtml,
} from '../lib/monitoring/index.ts';
import { onRequest as monitoringApiOnRequest } from '../functions/api/monitoring.ts';

describe('monitoring', () => {
  test('formatUptime humanizes durations', () => {
    expect(formatUptime(0)).toBe('0d 0h 0m 0s');
    expect(formatUptime(90_000)).toMatch(/1m/);
  });

  test('collectMonitoring returns live payload shape', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    recordIntegrityCheck(db, { status: 'ok', failures: 0 });
    const data = await collectMonitoring(db, { source: 'live', uptimeOriginMs: Date.now() - 5000 });
    expect(data.source).toBe('live');
    expect(data.uptimeMs).toBeGreaterThanOrEqual(4000);
    expect(typeof data.packageCount).toBe('number');
    expect(data.lastIntegrity.status).toBe('ok');
    expect(data.lastIntegrity.failures).toBe(0);
    expect(data.platformSummary).toBeDefined();
    expect(typeof data.dodQueue).toBe('number');
    db.close();
  });

  test('collectMonitoring includes compliance when board is baked', async () => {
    const board = Bun.file('public/registry/compliance-board.json');
    if (!(await board.exists())) {
      // Optional plane — skip when workspace has no bake yet
      return;
    }
    const db = openOperationsDb({ path: ':memory:' });
    const data = await collectMonitoring(db, { source: 'snapshot' });
    db.close();

    expect(data.compliance).toBeDefined();
    expect(data.compliance?.available).toBe(true);
    expect(data.compliance?.path).toBe('/registry/compliance-board.json');
    expect(data.compliance?.portal).toBe('/portal/compliance/');
    expect(typeof data.compliance?.ok).toBe('boolean');
    expect(data.compliance?.enhancements).toMatch(/^\d+\/\d+$/);
    expect(typeof data.compliance?.shadowMismatches).toBe('number');
  });

  test('collectMonitoring includes limitRaises when bake is present', async () => {
    const bake = Bun.file('public/registry/limit-raises.json');
    if (!(await bake.exists())) return;
    const db = openOperationsDb({ path: ':memory:' });
    const data = await collectMonitoring(db, { source: 'snapshot' });
    db.close();

    expect(data.limitRaises).toBeDefined();
    expect(data.limitRaises?.available).toBe(true);
    expect(data.limitRaises?.path).toBe('/registry/limit-raises.json');
    expect(data.limitRaises?.portal).toBe('/portal/limits/');
    expect(typeof data.limitRaises?.ok).toBe('boolean');
  });

  test('renderMonitoringHtml embeds Bun.inspect.table output', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const data = await collectMonitoring(db, { source: 'live' });
    const html = renderMonitoringHtml(data);
    expect(html).toContain('Registry overview');
    expect(html).toContain('<pre>');
    expect(html).toContain('Metric');
    expect(html).toContain('Packages');
    db.close();
  });
});

describe('mergeIntegritySnapshots', () => {
  test('prefers newer file report over stale sqlite row', () => {
    const sqlite = {
      status: 'ok',
      timestamp: '2026-01-01T00:00:00.000Z',
      failures: 0,
      source: 'sqlite' as const,
    };
    const file = {
      status: 'failed',
      timestamp: '2026-07-23T00:00:00.000Z',
      failures: 2,
      source: 'file' as const,
    };
    expect(mergeIntegritySnapshots(sqlite, file).failures).toBe(2);
    expect(mergeIntegritySnapshots(sqlite, undefined).source).toBe('sqlite');
  });
});

describe('Pages monitoring API', () => {
  test('returns snapshot JSON when ASSETS binding serves monitoring.json', async () => {
    const payload = {
      source: 'snapshot',
      packageCount: 2,
      versionCount: 5,
      timestamp: '2026-07-23T12:00:00.000Z',
    };
    const res = await monitoringApiOnRequest({
      request: new Request('https://example.com/api/monitoring'),
      env: {
        ASSETS: {
          fetch: async () =>
            new Response(JSON.stringify(payload), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
        },
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { packageCount: number; source: string };
    expect(body.packageCount).toBe(2);
    expect(body.source).toBe('snapshot');
  });

  test('503 when snapshot missing', async () => {
    const res = await monitoringApiOnRequest({
      request: new Request('https://example.com/api/monitoring'),
      env: {
        ASSETS: {
          fetch: async () => new Response('not found', { status: 404 }),
        },
      },
    });
    expect(res.status).toBe(503);
  });
});
