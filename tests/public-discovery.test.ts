import { describe, expect, test } from 'bun:test';
import {
  DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS,
  PUBLIC_PERIMETER,
  parsePublicSeverity,
  publicReportPasses,
  runPublicDiscovery,
} from '../lib/public-discovery.ts';

describe('public-discovery', () => {
  test('parsePublicSeverity accepts warn/warning aliases', () => {
    expect(parsePublicSeverity('warn')).toBe('warn');
    expect(parsePublicSeverity('warning')).toBe('warn');
    expect(parsePublicSeverity('errors')).toBe('error');
    expect(parsePublicSeverity('info')).toBe('info');
  });

  test('PUBLIC_PERIMETER covers portal and registry', () => {
    expect(PUBLIC_PERIMETER.some(p => p === 'public/portal')).toBe(true);
    expect(PUBLIC_PERIMETER.some(p => p === 'public/site.webmanifest')).toBe(true);
    expect(PUBLIC_PERIMETER.some(p => p === 'public/registry')).toBe(true);
  });

  test('documented bake orphans are allowlisted (public-plane SSOT)', () => {
    expect(DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS.has('partner-profile-coverage.json')).toBe(true);
    expect(DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS.has('partner-ledger.json')).toBe(true);
    expect(DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS.has('stale-anchors.json')).toBe(true);
  });

  test('runPublicDiscovery returns structured report', async () => {
    const report = await runPublicDiscovery();
    expect(report.generatedAt).toMatch(/^\d{4}-/);
    expect(report.perimeter.length).toBeGreaterThan(0);
    expect(report.summary.total).toBe(report.findings.length);
    expect(typeof report.summary.errors).toBe('number');
    const orphans = report.findings.filter(f => f.kind === 'orphan-registry-artifact');
    for (const o of orphans) {
      expect(DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS.has(String(o.detail))).toBe(false);
    }
  });

  test('publicReportPasses fails when errors present', () => {
    expect(
      publicReportPasses(
        {
          generatedAt: '',
          perimeter: [],
          findings: [
            {
              kind: 'broken-registry-ref',
              severity: 'error',
              id: 'x',
              title: 't',
            },
          ],
          summary: { total: 1, errors: 1, warnings: 0, byKind: {} },
        },
        'error'
      )
    ).toBe(false);
  });

  test('public:discover:check passes on current tree', async () => {
    const report = await runPublicDiscovery();
    const errors = report.findings.filter(f => f.severity === 'error');
    if (errors.length > 0) {
      console.warn(
        'public-discovery errors (fix before merge):',
        errors.map(e => `${e.kind}:${e.id}`).join(', ')
      );
    }
    expect(publicReportPasses(report, 'error')).toBe(true);
  });
});
