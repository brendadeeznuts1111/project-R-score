import { afterEach, describe, expect, test } from 'bun:test';

const children: ReturnType<typeof Bun.spawn>[] = [];

afterEach(() => {
  for (const child of children.splice(0)) {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
});

async function waitFor(url: string, timeoutMs = 10000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return;
    } catch {
      // retry
    }
    await Bun.sleep(200);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

describe('search benchmark dashboard unified status api', () => {
  test('returns unified status JSON with standardized headers', async () => {
    const port = 34000 + Math.floor(Math.random() * 1000);
    const child = Bun.spawn(['bun', 'run', 'scripts/search-benchmark-dashboard.ts', '--port', String(port)], {
      cwd: process.cwd(),
      stdout: 'ignore',
      stderr: 'ignore',
    });
    children.push(child);

    await waitFor(`http://127.0.0.1:${port}/healthz`);

    const res = await fetch(`http://127.0.0.1:${port}/api/search-status-unified?source=local&domain=factory-wager.com`, {
      cache: 'no-store',
    });
    expect(res.ok).toBe(true);
    expect(res.headers.get('content-type') || '').toContain('application/json');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect((res.headers.get('x-search-status-source') || '').toLowerCase()).toBe('local');

    const payload = await res.json() as any;
    expect(typeof payload.generatedAt).toBe('string');
    expect(payload.overall && typeof payload.overall.status === 'string').toBe(true);
    expect(Array.isArray(payload.contractChecks)).toBe(true);
  });

  test('returns dashboard debug payload and keeps legacy sessions route', async () => {
    const port = 35000 + Math.floor(Math.random() * 1000);
    const child = Bun.spawn(['bun', 'run', 'scripts/search-benchmark-dashboard.ts', '--port', String(port)], {
      cwd: process.cwd(),
      stdout: 'ignore',
      stderr: 'ignore',
    });
    children.push(child);

    await waitFor(`http://127.0.0.1:${port}/healthz`);

    const debugRes = await fetch(`http://127.0.0.1:${port}/api/dashboard/debug`, { cache: 'no-store' });
    expect(debugRes.ok).toBe(true);
    expect((debugRes.headers.get('x-search-status-source') || '').toLowerCase()).toBe('mixed');
    const debugPayload = await debugRes.json() as any;
    expect(debugPayload.ok).toBe(true);
    expect(debugPayload.debug?.route).toBe('/api/dashboard/debug');
    expect(typeof debugPayload.r2?.sessions).toBe('object');

    const legacyRes = await fetch(`http://127.0.0.1:${port}/api/debug/r2-sessions`, { cache: 'no-store' });
    expect(legacyRes.ok).toBe(true);
    expect((legacyRes.headers.get('x-search-status-source') || '').toLowerCase()).toBe('r2');
    const legacyPayload = await legacyRes.json() as any;
    expect(typeof legacyPayload).toBe('object');
  });
});
