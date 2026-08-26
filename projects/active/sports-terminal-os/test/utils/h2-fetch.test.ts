import { describe, expect, test } from 'bun:test';
import {
  createProtocolClient,
  isExactHttp2Unsupported,
  type ProtocolFetchInit,
} from '../../src/utils/h2-fetch';

function unsupported(): Error & { code: string } {
  return Object.assign(new Error('HTTP2Unsupported'), { code: 'HTTP2Unsupported' });
}

describe('typed protocol client', () => {
  test('recognizes only exact Bun HTTP2Unsupported errors', () => {
    expect(isExactHttp2Unsupported(unsupported())).toBe(true);
    expect(isExactHttp2Unsupported({ cause: { name: 'HTTP2Unsupported' } })).toBe(true);
    expect(isExactHttp2Unsupported(new Error('server h2 HTTP2 failure'))).toBe(false);
    expect(isExactHttp2Unsupported({ code: 'ERR_HTTP2_STREAM_ERROR' })).toBe(false);
  });

  test('falls back safe reads and caches unsupported capability by full route key', async () => {
    const calls: Array<{ url: string; protocol?: string }> = [];
    const client = createProtocolClient({
      fetcher: async (input, init) => {
        calls.push({ url: input.toString(), protocol: init?.protocol });
        if (init?.protocol === 'http2') throw unsupported();
        return new Response('h1');
      },
    });
    const route = { routeMode: 'named-proxy', proxyIdentity: 'proxy-a', tlsIdentity: 'strict-v1' } as const;
    expect(await (await client('https://api.example.test/a', route)).text()).toBe('h1');
    expect(await (await client('https://api.example.test/b', route)).text()).toBe('h1');
    expect(calls.map(call => call.protocol)).toEqual(['http2', 'http1.1', 'http1.1']);

    await client('https://api.example.test/c', { ...route, proxyIdentity: 'proxy-b' });
    await client('https://api.example.test/d', { ...route, tlsIdentity: 'strict-v2' });
    expect(calls.filter(call => call.protocol === 'http2')).toHaveLength(3);
  });

  test('never replays an unsafe write after protocol failure', async () => {
    const calls: string[] = [];
    const client = createProtocolClient({ fetcher: async (_input, init) => {
      calls.push(init?.protocol ?? 'none');
      throw unsupported();
    }});
    await expect(client('https://write.example.test/rpc', { method: 'POST', body: 'mutation' }))
      .rejects.toThrow('HTTP2Unsupported');
    expect(calls).toEqual(['http2']);
  });

  test('recreates explicitly replayable bodies for H2 attempt and H1 fallback', async () => {
    const bodies: string[] = [];
    let creates = 0;
    const client = createProtocolClient({ fetcher: async (_input, init) => {
      bodies.push(String(init?.body));
      if (init?.protocol === 'http2') throw unsupported();
      return new Response('ok');
    }});
    const response = await client('https://write.example.test/rpc', {
      method: 'POST',
      recreatableBody: { class: 'recreatable', create: () => `body-${++creates}` },
    });
    expect(response.status).toBe(200);
    expect(bodies).toEqual(['body-1', 'body-2']);
    await expect(client('https://write.example.test/rpc', {
      method: 'POST', body: 'one-shot', recreatableBody: { class: 'recreatable', create: () => 'new' },
    })).rejects.toThrow('instead of a one-shot body');
  });

  test('expires capability state and singleflights first negotiation', async () => {
    let clock = 10;
    let h2Calls = 0;
    let release: (() => void) | undefined;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const client = createProtocolClient({ capabilityTtlMs: 5, now: () => clock, fetcher: async (_input, init) => {
      if (init?.protocol === 'http2') {
        h2Calls++;
        if (h2Calls === 1) await blocked;
      }
      return new Response('ok');
    }});
    const first = client('https://api.example.test/a');
    const second = client('https://api.example.test/b');
    await Bun.sleep(0);
    expect(h2Calls).toBe(1);
    release?.();
    await Promise.all([first, second]);
    expect(h2Calls).toBe(2);
    clock = 16;
    await client('https://api.example.test/c');
    expect(h2Calls).toBe(3);
  });

  test('offline and cached-only reject before invoking fetch', async () => {
    let calls = 0;
    const client = createProtocolClient({ fetcher: async () => { calls++; return new Response(); } });
    for (const networkState of ['offline-no-socket', 'cached-only'] as const) {
      await expect(client('https://api.example.test', { networkState })).rejects.toThrow('forbids network fetch');
    }
    expect(calls).toBe(0);
  });

  test('rejects credential-bearing cache dimensions', async () => {
    const client = createProtocolClient({ fetcher: async () => new Response() });
    const init: ProtocolFetchInit = { proxyIdentity: 'user:secret@proxy' };
    await expect(client('https://api.example.test', init)).rejects.toThrow('must not contain credentials');
  });
});
