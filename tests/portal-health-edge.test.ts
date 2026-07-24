/**
 * Edge health plain renderer + stable ETag payload + defaults/audit slices.
 * @see lib/http/portal-health-edge.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  edgeHealthETagPayload,
  edgeTaxonomyDegradesHealth,
  renderEdgeHealthPlain,
  sliceDefaults,
  sliceProofTaxonomy,
  type EdgeHealthBody,
} from '../lib/http/portal-health-edge.ts';
import { portalOptionsResponse } from '../lib/http/portal-cors.ts';

function sample(): EdgeHealthBody {
  return {
    status: 'ok',
    schemaVersion: 1,
    runtime: 'cloudflare-pages',
    edge: true,
    checkedAt: '2026-07-24T07:00:00.000Z',
    portal: '/portal/health/',
    artifacts: {
      opsSummary: { exists: true, generated: '2026-07-24T06:00:00.000Z', source: 'snapshot' },
      defaultsProof: { exists: true },
      proofTaxonomyAudit: { exists: true },
    },
    registry: { packages: 3, versions: 5 },
    monitoring: { packageCount: 3, dodQueue: 1 },
    bunApiProof: {
      available: true,
      generated: '2026-07-23T00:00:00.000Z',
      bunVersion: '1.4.0',
      summary: { demos: 10, demosPassed: 10, apis: 20, apisVerified: 20 },
    },
    defaults: {
      available: true,
      path: '/registry/defaults-proof.json',
      passed: 12,
      total: 12,
      status: 'pass',
      bunVersion: '1.4.0',
      proofHash: 'abcdef0123456789',
      generated: '2026-07-24T04:32:01.921Z',
    },
    proofTaxonomy: {
      available: true,
      path: '/registry/proof-taxonomy-audit.json',
      ok: true,
      contracts: 13,
      contractsOk: 13,
      consistencyOk: 20,
      consistencyTotal: 20,
      source: 'ops-summary',
    },
    env: {
      summary: {
        total: 3,
        ok: 3,
        missing: 0,
        requiredMissing: 0,
        note: 'edge',
      },
    },
    routeStats: {
      note: 'from snapshot',
      routing: {
        passed: 16,
        total: 16,
        criticalFailed: 0,
        meanMs: 100,
        p95Ms: 200,
        baseUrl: 'https://score.factory-wager.com',
        proofHash: 'abc123def456',
      },
    },
    toc: {
      available: true,
      warmed: 3,
      warming: 1,
      onboarding: 0,
      confirmedRails: 2,
      openBottlenecks: 1,
      criticalBottlenecks: 0,
      throughputT: 1,
      throughputI: 2,
      throughputOE: 3,
    },
    channels: { sent: 12, pending: 0, failed: 1, failRate: 0.08 },
    loop: null,
    serve: { etagScope: 'test' },
  };
}

describe('portal-health-edge', () => {
  test('renderEdgeHealthPlain includes routing + TOC + defaults + audit', () => {
    const text = renderEdgeHealthPlain(sample());
    expect(text).toContain('FactoryWager · Health Diagnostics');
    expect(text).toContain('Pass:        16/16');
    expect(text).toContain('Warmed:      3');
    expect(text).toContain('T/I/OE:      1 / 2 / 3');
    expect(text).toContain('GET /health/pre');
    expect(text).toContain('Demos:       10/10 passed');
    expect(text).toContain('── Bun defaults');
    expect(text).toContain('Proof:       12/12 · pass');
    expect(text).toContain('── Proof taxonomy audit');
    expect(text).toContain('Contracts:   13/13');
    expect(text).toContain('GET /api/defaults');
    expect(text).toContain('OPTIONS:');
  });

  test('edgeHealthETagPayload drops checkedAt', () => {
    const body = sample();
    const payload = edgeHealthETagPayload(body) as Record<string, unknown>;
    expect(payload.checkedAt).toBeUndefined();
    expect(payload.status).toBe('ok');
    expect(payload.registry).toEqual({ packages: 3, versions: 5 });
    expect((payload.defaults as { passed: number }).passed).toBe(12);
  });

  test('portalOptionsResponse exposes Allow-Methods and Headers', () => {
    const res = portalOptionsResponse();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('If-None-Match');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('sliceProofTaxonomy prefers audit-json over stale ops embed', () => {
    const slice = sliceProofTaxonomy(
      {
        available: true,
        ok: false,
        contracts: 12,
        contractsOk: 11,
        consistencyOk: 19,
        consistencyTotal: 20,
      },
      {
        ok: true,
        audits: [{ ok: true }, { ok: true }],
        consistency: [{ ok: true }, { ok: true }],
      }
    );
    expect(slice.source).toBe('audit-json');
    expect(slice.ok).toBe(true);
    expect(slice.contracts).toBe(2);
    expect(slice.contractsOk).toBe(2);
    expect(edgeTaxonomyDegradesHealth(slice)).toBe(false);
  });

  test('stale ops-summary ok:false does not degrade health', () => {
    const slice = sliceProofTaxonomy(
      { available: true, ok: false, contracts: 12, contractsOk: 11 },
      null
    );
    expect(slice.source).toBe('ops-summary');
    expect(slice.ok).toBe(false);
    expect(edgeTaxonomyDegradesHealth(slice)).toBe(false);
  });

  test('audit-json ok:false degrades health', () => {
    const slice = sliceProofTaxonomy(null, {
      ok: false,
      audits: [{ ok: true }, { ok: false }],
      consistency: [{ ok: true }],
    });
    expect(slice.source).toBe('audit-json');
    expect(edgeTaxonomyDegradesHealth(slice)).toBe(true);
  });

  test('sliceDefaults reads summary + top-level fields', () => {
    const fromSummary = sliceDefaults({
      summary: { passed: 12, total: 12, status: 'pass' },
      bunVersion: '1.4.0',
      proofHash: 'abc',
      timestamp: '2026-07-24T00:00:00.000Z',
    });
    expect(fromSummary.available).toBe(true);
    expect(fromSummary.passed).toBe(12);
    expect(fromSummary.status).toBe('pass');
    expect(sliceDefaults(null).available).toBe(false);
  });
});
