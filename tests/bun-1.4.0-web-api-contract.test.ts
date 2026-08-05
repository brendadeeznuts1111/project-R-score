// @see https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
// Promotion observation captured on 1.4.0-canary.1 revision 3f93daaf0.
import { expect, test } from 'bun:test';

const TARGET_VERSION = '1.4.0';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

releaseTest('Bun 1.4.0 applies a byte range to a Bun.file ReadableStream response', async () => {
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
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe(`bytes 0-9/${fixture.size}`);
    expect((await response.bytes()).byteLength).toBe(10);
  } finally {
    server.stop(true);
  }
});

releaseTest('Bun 1.4.0 retains the 1.3.14 WebKit FormData boundary contract', () => {
  const body = new FormData();
  body.set('partner_code', 'out-ROOT-1');
  const request = new Request('http://partner.test/import', { method: 'POST', body });

  expect(request.headers.get('Content-Type')).toMatch(
    /^multipart\/form-data; boundary=----WebKitFormBoundary[0-9a-f]+$/
  );
});
