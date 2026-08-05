// @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import {
  buildNetworkingProofArtifact,
  parseNetworkingProofArtifact,
} from '../lib/http/networking-proof.ts';
import { netCheckRow } from '../lib/http/networking-report.ts';
import { serveBindSnapshot } from '../lib/http/bun-server.ts';
import {
  resolveRouteProbeBase,
  verifyTarget,
  type NetTarget,
} from '../tools/verify-networking.ts';
import { createTestWorkspace } from './harness.ts';
import { writeServePublicBindManifest } from '../lib/http/serve-public-bind.ts';

describe('tools/verify-networking', () => {
  test('buildNetworkingProofArtifact produces parseable proof JSON', () => {
    const rows = [
      netCheckRow({
        target: 'Health',
        category: 'ops',
        type: 'dns-prefetch',
        metric: '0.1ms',
        status: 'PASS',
      }),
      netCheckRow({
        target: 'Health',
        category: 'ops',
        type: 'cold-fetch',
        metric: '1.0ms (200)',
        status: 'PASS',
      }),
    ];
    const proof = buildNetworkingProofArtifact({
      rows,
      targets: [{ name: 'Health', category: 'ops' }],
      base: 'http://127.0.0.1:3000',
      bunVersion: '1.4.0',
    });
    expect(proof.subsystem).toBe('networking');
    expect(proof.global.checksPassed).toBe(2);
    const parsed = parseNetworkingProofArtifact(proof);
    expect(parsed?.proofHash).toBe(proof.proofHash);
  });

  test('local health target: DNS + fetch path when serve-public is up', async () => {
    const target: NetTarget = {
      name: 'Health',
      url: 'http://127.0.0.1:3000/health',
      category: 'ops',
      method: 'GET',
      okStatuses: [200],
      skipBuffer: true,
    };

    let reachable = false;
    try {
      const r = await fetch(target.url, { signal: AbortSignal.timeout(1500) });
      reachable = r.status > 0;
    } catch {
      reachable = false;
    }

    const result = await verifyTarget(target, { skipWrite: true });
    const rows = result;
    expect(rows.some(r => r.optimization === 'DNS Prefetch' && r.status === 'PASS')).toBe(true);
    expect(rows.some(r => r.optimization === 'Preconnect')).toBe(true);

    if (reachable) {
      expect(rows.some(r => r.optimization === 'Cold Fetch' && r.status === 'PASS')).toBe(true);
      expect(rows.some(r => r.optimization === 'Warm Fetch' && r.status === 'PASS')).toBe(true);
    }
  });

  test('route-only base is explicit or owned by the current worktree', async () => {
    expect(await resolveRouteProbeBase('http://127.0.0.1:4311')).toBe(
      'http://127.0.0.1:4311'
    );

    await using workspace = await createTestWorkspace('factorywager-route-base-');
    const bindPath = workspace.resolve('bind.json');
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: () => new Response('ok'),
    });
    const snapshot = serveBindSnapshot(server);
    await writeServePublicBindManifest(
      {
        ...snapshot,
        schemaVersion: 1,
        ephemeralFallback: false,
        requestedDefaultPort: snapshot.port,
        boundAt: '2026-08-05T00:00:00.000Z',
      },
      bindPath
    );
    expect(await resolveRouteProbeBase(undefined, bindPath)).toBe(snapshot.loopbackOrigin);
    await server.stop(true);
    await expect(
      resolveRouteProbeBase(undefined, joinPath(workspace.path, 'missing-bind.json'))
    ).rejects.toThrow('routes-only requires');
  });
});
