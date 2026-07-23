// @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch
import { describe, expect, test } from 'bun:test';
import { verifyTarget, type NetTarget } from '../tools/verify-networking.ts';

describe('tools/verify-networking', () => {
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

    const rows = await verifyTarget(target, { skipWrite: true });
    expect(rows.some(r => r.optimization === 'DNS Prefetch' && r.status === 'PASS')).toBe(true);
    expect(rows.some(r => r.optimization === 'Preconnect')).toBe(true);

    if (reachable) {
      expect(rows.some(r => r.optimization === 'Cold Fetch' && r.status === 'PASS')).toBe(true);
      expect(rows.some(r => r.optimization === 'Warm Fetch' && r.status === 'PASS')).toBe(true);
    }
  });
});
