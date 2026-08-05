import { describe, expect, test } from 'bun:test';
import {
  nameSimilarity,
  NAMING_CLUSTERS,
  reportPasses,
  runReferenceDiscovery,
} from '../lib/reference-discovery.ts';

describe('reference-discovery', () => {
  test('nameSimilarity ranks near-duplicates', () => {
    expect(nameSimilarity('REGISTRY_URL', 'FACTORY_REGISTRY_URL')).toBeGreaterThan(0.55);
    expect(nameSimilarity('REGISTRY_URL', 'ROUTING_PROBE_BASE_URL')).toBeLessThan(0.55);
  });

  test('NAMING_CLUSTERS include registry and pages planes', () => {
    const ids = NAMING_CLUSTERS.map(c => c.id);
    expect(ids).toContain('registry-plane');
    expect(ids).toContain('pages-plane');
  });

  test(
    'runReferenceDiscovery returns structured report',
    async () => {
      const report = await runReferenceDiscovery({ skipUnused: true });
      expect(report.generatedAt).toMatch(/^\d{4}-/);
      expect(report.perimeter.length).toBeGreaterThan(0);
      expect(report.summary.total).toBe(report.findings.length);
      expect(typeof report.summary.errors).toBe('number');
      expect(
        report.findings.filter(
          finding => finding.kind === 'similar-env' && finding.severity === 'warn'
        )
      ).toEqual([]);
    },
    { timeout: 30_000 }
  );

  test('reportPasses fails when errors present', () => {
    expect(
      reportPasses(
        {
          generatedAt: '',
          perimeter: [],
          findings: [
            {
              kind: 'plane-mismatch',
              severity: 'error',
              id: 'x',
              title: 't',
            },
          ],
          summary: { total: 1, errors: 1, warnings: 0, byKind: {} },
        },
        'warn'
      )
    ).toBe(false);
  });
});
