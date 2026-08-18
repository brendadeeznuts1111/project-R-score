// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
// @see https://bun.com/docs/guides/http/stream-file
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

const fixtureUrl = new URL('../package.json', import.meta.url);

let server: Bun.Server<undefined>;
let fixtureBytes: Uint8Array;

function endpoint(path: string): URL {
  return new URL(path, server.url);
}

beforeAll(async () => {
  // A file: URL is a first-class Bun.file input, alongside paths and file descriptors.
  fixtureBytes = await Bun.file(fixtureUrl).bytes();
  const arrayBuffer = new Uint8Array(fixtureBytes).buffer;
  const nodeBuffer = Buffer.from(fixtureBytes);

  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    routes: {
      '/direct': Bun.file(fixtureUrl),
      '/wrapped': new Response(Bun.file(fixtureUrl)),
      '/uint8array': new Response(fixtureBytes),
      '/array-buffer': new Response(arrayBuffer),
      '/buffer': new Response(nodeBuffer),
      '/stream': () =>
        new Response(Bun.file(fixtureUrl).stream(), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    },
    fetch(req) {
      if (new URL(req.url).pathname === '/dynamic-file') {
        return new Response(Bun.file(fixtureUrl));
      }
      return new Response('fallback', { status: 404 });
    },
  });
});

afterAll(async () => {
  await server.stop(true);
});

describe('Bun file/response runtime contract', () => {
  for (const route of ['/direct', '/wrapped']) {
    test(`${route} preserves native BunFile HTTP behavior`, async () => {
      const response = await fetch(endpoint(route));
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Last-Modified')).toBeTruthy();
      expect(response.headers.get('ETag')).toBeNull();
      expect(response.headers.get('Cache-Control')).toBeNull();
      expect((await response.bytes()).byteLength).toBe(fixtureBytes.byteLength);

      const range = await fetch(endpoint(route), {
        headers: { Range: 'bytes=0-9' },
      });
      expect(range.status).toBe(206);
      expect(range.headers.get('Content-Range')).toBe(
        `bytes 0-9/${fixtureBytes.byteLength}`
      );
      expect((await range.bytes()).byteLength).toBe(10);

      const notModified = await fetch(endpoint(route), {
        headers: { 'If-Modified-Since': response.headers.get('Last-Modified')! },
      });
      expect(notModified.status).toBe(304);
    });
  }

  test('file-backed responses handle suffix, open-ended, invalid, and multi-ranges', async () => {
    const suffix = await fetch(endpoint('/dynamic-file'), {
      headers: { Range: 'bytes=-10' },
    });
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get('Content-Range')).toBe(
      `bytes ${fixtureBytes.byteLength - 10}-${fixtureBytes.byteLength - 1}/${fixtureBytes.byteLength}`
    );
    expect((await suffix.bytes()).byteLength).toBe(10);

    const openEnded = await fetch(endpoint('/dynamic-file'), {
      headers: { Range: 'bytes=10-' },
    });
    expect(openEnded.status).toBe(206);
    expect((await openEnded.bytes()).byteLength).toBe(fixtureBytes.byteLength - 10);

    const invalid = await fetch(endpoint('/dynamic-file'), {
      headers: { Range: `bytes=${fixtureBytes.byteLength}-` },
    });
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get('Content-Range')).toBe(`bytes */${fixtureBytes.byteLength}`);

    const multiple = await fetch(endpoint('/dynamic-file'), {
      headers: { Range: 'bytes=0-1,4-5' },
    });
    expect(multiple.status).toBe(200);
    expect((await multiple.bytes()).byteLength).toBe(fixtureBytes.byteLength);
  });

  for (const route of ['/uint8array', '/array-buffer', '/buffer']) {
    test(`${route} is buffered rather than file-aware`, async () => {
      const response = await fetch(endpoint(route), {
        headers: { Range: 'bytes=0-9' },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('Last-Modified')).toBeNull();
      expect(response.headers.get('ETag')).toBeTruthy();
      expect((await response.bytes()).byteLength).toBe(fixtureBytes.byteLength);
    });
  }

  test('ReadableStream delivers the complete file bytes', async () => {
    const response = await fetch(endpoint('/stream'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Last-Modified')).toBeNull();
    expect(response.headers.get('ETag')).toBeNull();
    expect((await response.bytes()).byteLength).toBe(fixtureBytes.byteLength);
  });

  test('HEAD retains native file metadata without a response body', async () => {
    const response = await fetch(endpoint('/direct'), { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Length')).toBe(String(fixtureBytes.byteLength));
    expect((await response.bytes()).byteLength).toBe(0);
  });

  test.todo('stale If-Range returns the complete 200 response instead of a 206 range');
});
