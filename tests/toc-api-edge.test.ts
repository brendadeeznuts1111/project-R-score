/**
 * Pages TOC Ops API — snapshot envelope + agent headers.
 */
import { describe, expect, test } from 'bun:test';
import { onRequest } from '../functions/api/toc/[[path]].ts';
import { buildDemoTocOpsFixture, withTocMetrics } from '../lib/toc-ops/index.ts';
import { buildTocOpsBakeProof } from '../lib/toc-ops/bake-proof.ts';

function assetsFrom(map: Record<string, unknown>) {
  return {
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input instanceof Request
                ? input.url
                : String(input);
        for (const [path, body] of Object.entries(map)) {
          if (url.includes(path)) {
            return new Response(JSON.stringify(body), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
        return new Response('missing', { status: 404 });
      },
    },
  };
}

describe('Pages TOC API', () => {
  const snap = withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
  const proof = buildTocOpsBakeProof(snap);

  test('GET index returns fixture + X-TOC headers', async () => {
    const res = await onRequest({
      request: new Request('https://example.com/api/toc'),
      env: assetsFrom({ '/registry/toc-ops.json': snap }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-TOC-Read-Only')).toBe('1');
    expect(res.headers.get('X-TOC-Plane')).toBe('demo-readonly');
    expect(res.headers.get('X-TOC-Enforcement')).toBe('operate-lite');
    expect(res.headers.get('X-TOC-Focus')).toBeTruthy();
    const body = (await res.json()) as {
      mode: string;
      plane: string;
      enforcement: { plane: string };
      partners: unknown[];
    };
    expect(body.mode).toBe('snapshot');
    expect(body.plane).toBe('demo-readonly');
    expect(body.enforcement.plane).toBe('operate-lite');
    expect(body.partners.length).toBe(3);
  });

  test('GET summary includes enforcement + returnEfficiency', async () => {
    const res = await onRequest({
      request: new Request('https://example.com/api/toc/summary'),
      env: assetsFrom({ '/registry/toc-ops.json': snap }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      enforcement: { focus: string; throughput: { T: number } };
      returnEfficiency: { avgRP: number };
      rankedActions: unknown[];
    };
    expect(body.enforcement.focus).toBeTruthy();
    expect(body.enforcement.throughput.T).toBeGreaterThanOrEqual(0);
    expect(typeof body.returnEfficiency.avgRP).toBe('number');
    expect(body.rankedActions.length).toBeGreaterThan(0);
  });

  test('GET proof returns bake proof', async () => {
    const res = await onRequest({
      request: new Request('https://example.com/api/toc/proof'),
      env: assetsFrom({ '/registry/toc-ops-bake-proof.json': proof }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-TOC-Proof')).toBe('1');
    const body = (await res.json()) as { schema: string; ok: boolean };
    expect(body.schema).toBe('factorywager.toc-ops.bake-proof.v1');
    expect(body.ok).toBe(true);
  });

  test('POST returns 503', async () => {
    const res = await onRequest({
      request: new Request('https://example.com/api/toc', { method: 'POST' }),
      env: {},
    });
    expect(res.status).toBe(503);
    expect(res.headers.get('X-TOC-Read-Only')).toBe('1');
  });
});
