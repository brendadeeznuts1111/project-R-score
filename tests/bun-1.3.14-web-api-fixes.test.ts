// @see https://bun.com/blog/bun-v1.3.14#web-apis
// @see https://bun.com/blog/bun-v1.3.14#websocket-permessagedeflate-false-now-respected-in-upgrade-requests
// Release-stamped runtime probes: these execute only on the exact Bun release.
import { expect, test } from 'bun:test';

const TARGET_VERSION = '1.3.14';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

releaseTest('Bun 1.3.14 uses the WebKit FormData boundary shape', () => {
  const body = new FormData();
  body.set('partner_code', 'out-ROOT-1');

  const request = new Request('http://partner.test/import', { method: 'POST', body });
  expect(request.headers.get('Content-Type')).toMatch(
    /^multipart\/form-data; boundary=----WebKitFormBoundary[0-9a-f]+$/
  );
});

releaseTest('Bun 1.3.14 keeps empty Blob objects attached', () => {
  expect(Bun.inspect(new Blob([]))).not.toContain('[Blob detached]');
});

releaseTest('Bun 1.3.14 reads a small Bun.file stream without double-closing it', async () => {
  const source = Bun.file(new URL('../package.json', import.meta.url));
  const streamed = await new Response(source.stream()).bytes();
  expect(streamed.byteLength).toBe(source.size);
});

releaseTest('Bun 1.3.14 leaves Range unapplied on a Bun.file ReadableStream response', async () => {
  const fixture = Bun.file(new URL('../package.json', import.meta.url));
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    routes: {
      '/stream': () => new Response(fixture.stream()),
    },
    fetch: () => new Response('not found', { status: 404 }),
  });

  try {
    const response = await fetch(new URL('/stream', server.url), {
      headers: { Range: 'bytes=0-9' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Range')).toBeNull();
    expect((await response.bytes()).byteLength).toBe(fixture.size);
  } finally {
    server.stop(true);
  }
});

releaseTest('Bun 1.3.14 omits permessage-deflate when the WebSocket client opts out', async () => {
  let offeredExtensions: string | null | undefined;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request, server) {
      offeredExtensions = request.headers.get('Sec-WebSocket-Extensions');
      if (server.upgrade(request)) return;
      return new Response('upgrade required', { status: 426 });
    },
    websocket: {
      open(socket) {
        socket.close(1000, 'probe complete');
      },
      message() {},
    },
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const url = server.url.href.replace(/^http/, 'ws');
      const socket = new WebSocket(url, { perMessageDeflate: false });
      const timeout = setTimeout(() => reject(new Error('WebSocket probe timed out')), 2_000);
      socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket probe failed'));
      });
      socket.addEventListener('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    expect(offeredExtensions).toBeNull();
  } finally {
    server.stop(true);
  }
});

releaseTest('Bun 1.3.14 closes a WebSocket during CONNECTING', async () => {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => new Response('not upgraded', { status: 426 }),
  });

  try {
    const result = await new Promise<{ code: number; wasClean: boolean; events: string[] }>(
      (resolve, reject) => {
        const socket = new WebSocket(server.url.href.replace(/^http/, 'ws'));
        const events: string[] = [];
        const timeout = setTimeout(() => reject(new Error('CONNECTING close timed out')), 2_000);
        socket.addEventListener('error', () => events.push('error'));
        socket.addEventListener('close', event => {
          clearTimeout(timeout);
          events.push('close');
          resolve({ code: event.code, wasClean: event.wasClean, events });
        });
        expect(socket.readyState).toBe(WebSocket.CONNECTING);
        socket.close();
      }
    );

    expect(result.events).toEqual(['error', 'close']);
    expect(result.code).toBe(1006);
    expect(result.wasClean).toBe(false);
  } finally {
    server.stop(true);
  }
});
