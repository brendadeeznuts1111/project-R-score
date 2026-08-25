import { describe, expect, test } from 'bun:test';
import {
  nameSimilarity,
  NAMING_CLUSTERS,
  isAllowedSimilarEnvPair,
  reportPasses,
  runReferenceDiscovery,
  similarEnvRepair,
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

  test('similarEnvRepair is context-aware (not R2-only boilerplate)', () => {
    expect(similarEnvRepair('R2_BUCKET', 'S3_BUCKET')).toContain('r2-env.ts');
    expect(similarEnvRepair('CONCEPT_GRAPH_FOCUS', 'CONCEPT_GRAPH_FORMAT')).toContain(
      'concept CLI'
    );
    expect(similarEnvRepair('TELEGRAM_BOT_FACTORY', 'TELEGRAM_OPS_CHAT_ID')).toContain(
      'Telegram'
    );
    expect(similarEnvRepair('HTTP_PROXY', 'HTTPS_PROXY')).toContain('lib/net/proxy.ts');
    expect(similarEnvRepair('FOO_BAR', 'FOO_BAZ')).toContain('isAllowedSimilarEnvPair');
  });

  test('allows the intentional Bun fetch proxy environment family', () => {
    expect(isAllowedSimilarEnvPair('HTTP_PROXY', 'HTTPS_PROXY')).toBe(true);
    expect(isAllowedSimilarEnvPair('HTTP_PROXY', 'NO_PROXY')).toBe(true);
    expect(isAllowedSimilarEnvPair('HTTPS_PROXY', 'NO_PROXY')).toBe(true);
  });

  test('allows distinct pre-push profile child and kind controls', () => {
    expect(isAllowedSimilarEnvPair('PREPUSH_PROFILE_CHILD', 'PREPUSH_PROFILE_KIND')).toBe(true);
    expect(isAllowedSimilarEnvPair('PREPUSH_PROFILE_KIND', 'PREPUSH_PROFILE_CHILD')).toBe(true);
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
