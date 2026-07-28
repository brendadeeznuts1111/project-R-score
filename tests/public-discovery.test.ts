import { describe, expect, test } from 'bun:test';
import {
  PUBLIC_PERIMETER,
  publicReportPasses,
  runPublicDiscovery,
} from '../lib/public-discovery.ts';

describe('public-discovery', () => {
  test('PUBLIC_PERIMETER covers portal and registry', () => {
    expect(PUBLIC_PERIMETER.some(p => p === 'public/portal')).toBe(true);
    expect(PUBLIC_PERIMETER.some(p => p === 'public/site.webmanifest')).toBe(true);
    expect(PUBLIC_PERIMETER.some(p => p === 'public/registry')).toBe(true);
  });

  test('runPublicDiscovery returns structured report', async () => {
    const report = await runPublicDiscovery();
    expect(report.generatedAt).toMatch(/^\d{4}-/);
    expect(report.perimeter.length).toBeGreaterThan(0);
    expect(report.summary.total).toBe(report.findings.length);
    expect(typeof report.summary.errors).toBe('number');
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
