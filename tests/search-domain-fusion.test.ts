import { describe, expect, test } from 'bun:test';
import { applyDomainFusion } from '../scripts/lib/search-domain-fusion';
import type { DomainHealthSummary } from '../scripts/lib/domain-health-read';

describe('applyDomainFusion', () => {
  test('applies weighting and preserves deterministic ordering', () => {
    const summary: DomainHealthSummary = {
      domain: 'factory-wager.com',
      source: 'local',
      checkedAt: '2026-02-08T00:00:00.000Z',
      overall: { status: 'healthy', score: 0.9 },
      dns: { status: 'healthy', score: 1 },
      storage: { status: 'healthy', score: 1 },
      cookie: { status: 'healthy', score: 1 },
      notes: [],
    };

    const hits = [
      { file: 'a.ts', score: 20, reason: ['a'] },
      { file: 'b.ts', score: 10, reason: ['b'] },
    ];

    const out = applyDomainFusion(hits, summary, { fusionWeight: 0.35 });
    expect(out).toHaveLength(2);
    expect(out[0]?.file).toBe('a.ts');
    expect(out[0]?.fusionScore).toBeGreaterThan(out[1]?.fusionScore || 0);
    expect(out[0]?.fusionReason?.length).toBeGreaterThan(0);
  });

  test('enforces critical cap and penalties', () => {
    const summary: DomainHealthSummary = {
      domain: 'factory-wager.com',
      source: 'local',
      checkedAt: '2026-02-08T00:00:00.000Z',
      overall: { status: 'critical', score: 0.9 },
      dns: { status: 'critical', score: 0.1 },
      storage: { status: 'critical', score: 0.1 },
      cookie: { status: 'critical', score: 0.1 },
      latency: { strictP95Ms: 1200 },
      notes: [],
    };

    const out = applyDomainFusion([{ file: 'a.ts', score: 100 }], summary, {
      fusionWeight: 0.35,
      strictP95Threshold: 900,
    });

    expect(out[0]?.fusionScore).toBeLessThanOrEqual(0.45);
    expect(out[0]?.fusionReason?.join(' ')).toContain('dns critical penalty');
    expect(out[0]?.fusionReason?.join(' ')).toContain('strict p95 penalty');
  });
});
