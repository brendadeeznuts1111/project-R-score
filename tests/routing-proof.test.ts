// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  compareRoutingProofs,
  computeLatencyStats,
  mapPool,
  probeEndpoint,
  routingToOpsSlice,
  runRoutingProof,
  type RoutingProbeSpec,
  type RoutingProofResult,
} from '../lib/routing-proof.ts';

describe('routing-proof v2', () => {
  test('probeEndpoint maps expected 400 without requireOk', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: 'Invalid registry object key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const r = await probeEndpoint(
      'https://example.test',
      { path: '/api/registry', expectedStatus: 400, requireOk: false },
      fetchImpl
    );
    expect(r.status).toBe(400);
    expect(r.ok).toBe(false);
    expect(r.pass).toBe(true);
  });

  test('expectContentType fails when mismatched', async () => {
    const fetchImpl = (async () =>
      new Response('<html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })) as typeof fetch;

    const r = await probeEndpoint(
      'https://example.test',
      {
        path: '/api/operations/summary',
        requireOk: true,
        expectContentType: 'application/json',
        critical: true,
      },
      fetchImpl
    );
    expect(r.ok).toBe(true);
    expect(r.pass).toBe(false);
    expect(r.critical).toBe(true);
  });

  test('mapPool preserves order under concurrency', async () => {
    const out = await mapPool([1, 2, 3, 4, 5], 2, async n => {
      await Bun.sleep(5 - n);
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  test('computeLatencyStats percentiles', () => {
    const s = computeLatencyStats([10, 20, 30, 40, 100]);
    expect(s.minMs).toBe(10);
    expect(s.maxMs).toBe(100);
    expect(s.p50Ms).toBeGreaterThanOrEqual(20);
    expect(s.p95Ms).toBeGreaterThanOrEqual(40);
  });

  test('compareRoutingProofs detects status and latency regressions', () => {
    const previous: Pick<RoutingProofResult, 'probes' | 'timestamp' | 'proofHash'> = {
      timestamp: 't0',
      proofHash: 'abc',
      probes: [
        {
          path: '/a',
          status: 200,
          ok: true,
          pass: true,
          critical: true,
          timeMs: 100,
          contentType: 'application/json',
        },
        {
          path: '/slow',
          status: 200,
          ok: true,
          pass: true,
          critical: false,
          timeMs: 300,
          contentType: 'text/html',
        },
      ],
    };
    const current = {
      probes: [
        {
          path: '/a',
          status: 503,
          ok: false,
          pass: false,
          critical: true,
          timeMs: 50,
          contentType: 'application/json',
        },
        {
          path: '/slow',
          status: 200,
          ok: true,
          pass: true,
          critical: false,
          timeMs: 900,
          contentType: 'text/html',
        },
      ],
    };
    const changes = compareRoutingProofs(current, previous, {
      latencyFactor: 2.5,
      latencyFloorMs: 250,
    });
    expect(changes.some(c => c.path === '/a' && c.kind === 'status')).toBe(true);
    expect(changes.some(c => c.path === '/a' && c.kind === 'pass')).toBe(true);
    expect(changes.some(c => c.path === '/slow' && c.kind === 'latency')).toBe(true);
  });

  test('runRoutingProof concurrent + summary', async () => {
    const specs: RoutingProbeSpec[] = [
      { path: '/a', requireOk: true, critical: true, expectContentType: 'application/json' },
      { path: '/b', expectedStatus: 404, requireOk: false },
    ];
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      if (n === 1) {
        return new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('missing', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }) as typeof fetch;

    const proof = await runRoutingProof({
      baseUrl: 'https://example.test',
      specs,
      fetchImpl,
      concurrency: 2,
      noPrevious: true,
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: 'test',
      bunRevision: 'test',
    });

    expect(proof.schemaVersion).toBe(2);
    expect(proof.summary.passed).toBe(2);
    expect(proof.summary.criticalFailed).toBe(0);
    expect(proof.latency.maxMs).toBeGreaterThanOrEqual(0);
    expect(proof.proofHash).toMatch(/^[a-f0-9]{64}$/);

    const slice = routingToOpsSlice(proof);
    expect(slice.available).toBe(true);
    expect(slice.passed).toBe(2);
    expect(slice.total).toBe(2);
  });
});
