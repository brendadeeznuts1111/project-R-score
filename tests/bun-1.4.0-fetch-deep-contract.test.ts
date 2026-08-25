// @see https://github.com/oven-sh/bun/issues/28792 — reconciled Bun 1.4 fetch changes
import { describe, expect, test } from 'bun:test';

const rt = Bun.version === '1.4.0' ? test : test.skip;

describe('Bun 1.4 fetch changed-behavior contracts', () => {
  rt('redirect:error rejects exactly the five Fetch redirect statuses', async () => {
    const redirects = new Set([301, 302, 303, 307, 308]);
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        const status = Number(new URL(request.url).pathname.slice(1));
        return new Response(null, {
          status,
          headers: redirects.has(status) ? { Location: '/target' } : undefined,
        });
      },
    });
    try {
      for (const status of redirects) {
        await expect(fetch(new URL(`/${status}`, server.url), { redirect: 'error' })).rejects.toThrow();
      }
      const notModified = await fetch(new URL('/304', server.url), { redirect: 'error' });
      expect(notModified.status).toBe(304);
    } finally {
      server.stop(true);
    }
  });

  rt('already-aborted fetch rejects without network I/O', async () => {
    let hits = 0;
    const server = Bun.serve({ port: 0, fetch: () => (hits++, new Response('unexpected')) });
    const controller = new AbortController();
    controller.abort('preflight-stop');
    try {
      await expect(fetch(server.url, { signal: controller.signal })).rejects.toThrow();
      expect(hits).toBe(0);
    } finally {
      server.stop(true);
    }
  });

  rt('consumed request bodies fail before network I/O', async () => {
    let hits = 0;
    const server = Bun.serve({ port: 0, fetch: () => (hits++, new Response('unexpected')) });
    const request = new Request(server.url, { method: 'POST', body: 'already consumed' });
    await request.text();
    try {
      await expect(fetch(request)).rejects.toThrow(TypeError);
      expect(hits).toBe(0);
      expect(() => request.clone()).toThrow(TypeError);
    } finally {
      server.stop(true);
    }
  });

  rt('failed streaming body reads become used and cannot be cloned', async () => {
    const server = Bun.serve({
      port: 0,
      development: false,
      error() {
        return new Response(null, { status: 500 });
      },
      fetch() {
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('partial'));
              setTimeout(() => controller.error(new Error('cut-off')), 10);
            },
          })
        );
      },
    });
    try {
      const response = await fetch(server.url);
      await expect(response.text()).rejects.toThrow();
      expect(response.bodyUsed).toBe(true);
      expect(() => response.clone()).toThrow(TypeError);
    } finally {
      server.stop(true);
    }
  });

  rt('duplicate headers combine while Set-Cookie remains separately enumerable', async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        const headers = new Headers();
        headers.append('X-Meta', 'first');
        headers.append('X-Meta', 'second');
        headers.append('Set-Cookie', 'a=1');
        headers.append('Set-Cookie', 'b=2');
        return new Response('ok', { headers });
      },
    });
    try {
      const response = await fetch(server.url);
      expect(response.headers.get('X-Meta')).toBe('first, second');
      expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
    } finally {
      server.stop(true);
    }
  });
});
