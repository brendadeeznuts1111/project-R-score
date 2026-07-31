/**
 * Limit-raises monitoring/health UI surfaces (payload.limitRaises / artifacts.limitRaises).
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderMonitoringDashboard } from '../public/monitoring/monitoring-dashboard.js';

const ROOT = join(import.meta.dir, '..');

function baseMon(overrides: Record<string, unknown> = {}) {
  return {
    source: 'snapshot',
    packageCount: 1,
    versionCount: 1,
    lastIntegrity: { status: 'ok', failures: 0 },
    platformSummary: {},
    platformApiAvailable: { yes: 0, no: 0 },
    dodQueue: 0,
    dodByStatus: {},
    experimentsActive: 0,
    predictionN: 0,
    timestamp: '2026-07-28T12:00:00.000Z',
    env: { summary: { ok: 1, total: 1, requiredMissing: 0 } },
    routeStats: {
      routing: { passed: 1, total: 1, criticalFailed: 0, routes: [] },
    },
    ...overrides,
  };
}

describe('monitoring limitRaises tile', () => {
  test('renders partners / raises / lookback when payload.limitRaises present', () => {
    const view = renderMonitoringDashboard({
      mon: baseMon({
        limitRaises: {
          available: true,
          ok: true,
          partners: 9,
          raises: 11,
          lookbackHours: 48,
          generatedAt: '2026-07-28T14:16:36.111Z',
          path: '/registry/limit-raises.json',
          portal: '/portal/limits/',
        },
      }),
      monSource: '/registry/monitoring.json',
      ops: null,
    });
    expect(view.cardsHtml).toContain('Limit raises');
    expect(view.cardsHtml).toContain('11');
    expect(view.cardsHtml).toContain('9 partners');
    expect(view.cardsHtml).toContain('48h lookback');
    expect(view.cardsHtml).toContain('href="/portal/limits/"');
    expect(view.sectionsHtml).toContain('href="/portal/limits/"');
    expect(view.sectionsHtml).toContain('href="/registry/limit-raises.json"');
  });

  test('missing bake shows ops:snapshot hint (not degraded copy)', () => {
    const view = renderMonitoringDashboard({
      mon: baseMon(),
      monSource: '/api/monitoring',
      ops: null,
    });
    expect(view.cardsHtml).toContain('Limit raises');
    expect(view.cardsHtml).toContain('run ops:snapshot');
    expect(view.cardsHtml).not.toContain('degraded');
  });
});

describe('health-page limitRaises surface', () => {
  test('source wires artifacts.limitRaises like complianceBoard', () => {
    const src = readFileSync(join(ROOT, 'public/portal/health-page.js'), 'utf8');
    expect(src).toContain('artifacts?.limitRaises');
    expect(src).toContain("id: 'limit-raises'");
    expect(src).toContain("'limit-raises': {");
    expect(src).toContain('/portal/limits/');
    expect(src).toContain('/registry/limit-raises.json');
    expect(src).toContain('optional bake');
    expect(src).toContain('bun run ops:snapshot');
    // Missing bake must not use degraded wording
    const lrBlock = src.slice(src.indexOf('artifacts?.limitRaises'));
    expect(lrBlock).not.toMatch(/degraded/i);
  });
});
