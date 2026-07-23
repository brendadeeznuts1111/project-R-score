// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  PORTAL_DASHBOARD_ROUTES,
  SIMD_ROUTES,
  mergeHotFromHealth,
  publicRouteCatalog,
  publicRoutesByCategory,
} from '../lib/http/public-routes.ts';
import { RouteProbeReport } from '../lib/http/networking-report.ts';
import { probePublicRoutes } from '../tools/verify-networking.ts';
import { inspectCustom } from '../lib/console-depth.ts';

describe('lib/http/public-routes', () => {
  test('catalog includes portal dashboards + health + critical APIs', () => {
    const cat = publicRouteCatalog();
    const paths = new Set(cat.map(r => r.path));
    expect(paths.has('/health')).toBe(true);
    expect(paths.has('/health/pre')).toBe(true);
    expect(paths.has('/portal/ops/')).toBe(true);
    expect(paths.has('/portal/health/')).toBe(true);
    expect(paths.has('/api/operations/summary')).toBe(true);
    expect(paths.has('/api/monitoring')).toBe(true);
    expect(paths.has('/registry/prediction/report.html')).toBe(true);
    expect(SIMD_ROUTES.some(r => r.critical)).toBe(true);
    expect(PORTAL_DASHBOARD_ROUTES.some(r => r.path === '/portal/ops/')).toBe(true);
  });

  test('byCategory groups portal separately', () => {
    const by = publicRoutesByCategory();
    expect(by.portal?.length).toBeGreaterThanOrEqual(3);
    expect(by.api?.length).toBeGreaterThanOrEqual(3);
    expect(by.health?.length).toBeGreaterThanOrEqual(2);
  });

  test('mergeHotFromHealth adds unseen hot paths', () => {
    const base = publicRouteCatalog();
    const merged = mergeHotFromHealth(base, {
      serve: { hotPreloaded: ['/registry/extra-hot.json', '/health'] },
    });
    expect(merged.some(r => r.path === '/registry/extra-hot.json')).toBe(true);
    // /health already present — no dup
    expect(merged.filter(r => r.path === '/health').length).toBe(1);
  });
});

describe('probePublicRoutes (live when serve-public up)', () => {
  test('probes dashboards and route objects', async () => {
    let up = false;
    try {
      const r = await fetch('http://127.0.0.1:3000/ready', {
        signal: AbortSignal.timeout(1500),
      });
      up = r.ok;
    } catch {
      up = false;
    }
    if (!up) return;

    const probe = await probePublicRoutes('http://127.0.0.1:3000');
    expect(probe.health?.routeStats?.staticRoutes).toBeGreaterThan(0);
    expect(probe.health?.serve?.hotPreloaded?.length).toBeGreaterThan(0);
    expect(probe.summary.criticalFailed).toBe(0);
    expect(probe.rows.some(r => r.path === '/portal/ops/' && r.pass)).toBe(true);
    expect(probe.rows.some(r => r.path === '/portal/health/' && r.pass)).toBe(true);
    expect(probe.rows.some(r => r.path === '/api/operations/summary' && r.pass)).toBe(true);

    // Bun.inspect.custom → inspect.table (docs shape)
    const report = new RouteProbeReport(probe);
    expect(typeof report[inspectCustom]).toBe('function');
    const printed = Bun.inspect(report, { colors: false });
    expect(printed).toContain('RouteProbeReport');
    expect(printed).toContain('/health');
    expect(printed).toContain('PASS');
    const j = report.toJSON();
    expect(j.routes.length).toBe(probe.rows.length);
    expect(j.rendered.routes).toContain('/portal/ops/');
  });
});
