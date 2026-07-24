/**
 * Edge health plain renderer + stable ETag payload.
 * @see lib/http/portal-health-edge.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  edgeHealthETagPayload,
  renderEdgeHealthPlain,
  type EdgeHealthBody,
} from '../lib/http/portal-health-edge.ts';

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
    },
    registry: { packages: 3, versions: 5 },
    monitoring: { packageCount: 3, dodQueue: 1 },
    bunApiProof: {
      available: true,
      generated: '2026-07-23T00:00:00.000Z',
      bunVersion: '1.4.0',
      summary: { demos: 10, demosPassed: 10, apis: 20, apisVerified: 20 },
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
  test('renderEdgeHealthPlain includes routing + TOC + links', () => {
    const text = renderEdgeHealthPlain(sample());
    expect(text).toContain('FactoryWager · Health Diagnostics');
    expect(text).toContain('Pass:        16/16');
    expect(text).toContain('Warmed:      3');
    expect(text).toContain('T/I/OE:      1 / 2 / 3');
    expect(text).toContain('GET /health/pre');
    expect(text).toContain('Demos:       10/10 passed');
  });

  test('edgeHealthETagPayload drops checkedAt', () => {
    const body = sample();
    const payload = edgeHealthETagPayload(body) as Record<string, unknown>;
    expect(payload.checkedAt).toBeUndefined();
    expect(payload.status).toBe('ok');
    expect(payload.registry).toEqual({ packages: 3, versions: 5 });
  });
});
