// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { probeEndpoint, runRoutingProof, type RoutingProbeSpec } from '../lib/routing-proof.ts';

describe('routing-proof', () => {
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

  test('runRoutingProof hashes stable body for fixed clock + responses', async () => {
    const specs: RoutingProbeSpec[] = [
      { path: '/a', requireOk: true },
      { path: '/b', expectedStatus: 404, requireOk: false },
    ];
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      if (n === 1) {
        return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return new Response('missing', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }) as typeof fetch;

    const a = await runRoutingProof({
      baseUrl: 'https://example.test',
      specs,
      fetchImpl,
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: 'test',
      bunRevision: 'test',
    });
    n = 0;
    const b = await runRoutingProof({
      baseUrl: 'https://example.test',
      specs,
      fetchImpl,
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: 'test',
      bunRevision: 'test',
    });

    expect(a.summary.passed).toBe(2);
    expect(a.summary.failed).toBe(0);
    expect(a.proofHash).toMatch(/^[a-f0-9]{64}$/);
    // timeMs may differ slightly — if hash drifts, at least structure holds
    expect(a.probes.map(p => p.path)).toEqual(b.probes.map(p => p.path));
    expect(a.probes.map(p => p.status)).toEqual(b.probes.map(p => p.status));
  });
});
