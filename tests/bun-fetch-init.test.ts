// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling
// @see https://bun.com/docs/runtime/networking/fetch#request-options
// @see https://bun.com/docs/runtime/networking/fetch#connection-pooling-http-keep-alive
import { describe, expect, test } from 'bun:test';
import { buildBunFetchInit } from '../lib/http/fetch-headers.ts';
import { isMultipartContentType } from '../lib/http/content-type.ts';

describe('buildBunFetchInit — Content-Type ownership', () => {
  test('leaves Blob Content-Type to Bun so blob.type reaches the wire', () => {
    const body = new Blob(['payload'], { type: 'application/vnd.factorywager.partner+json' });
    const init = buildBunFetchInit({ method: 'POST', body });

    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
    const request = new Request('http://partner.test/import', init);
    expect(request.headers.get('Content-Type')).toBe(
      'application/vnd.factorywager.partner+json'
    );
  });

  test('explicit MIME overrides Blob type', () => {
    const init = buildBunFetchInit({
      method: 'POST',
      body: new Blob(['payload'], { type: 'application/octet-stream' }),
      explicitMime: 'application/vnd.factorywager.partner+json; version=1',
    });
    const request = new Request('http://partner.test/import', init);

    expect(request.headers.get('Content-Type')).toBe(
      'application/vnd.factorywager.partner+json; version=1'
    );
  });

  test('leaves FormData unset until Bun generates its multipart boundary', () => {
    const body = new FormData();
    body.set('partner_code', 'out-ROOT-1');
    const init = buildBunFetchInit({ method: 'POST', body });

    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
    const request = new Request('http://partner.test/import', init);
    const contentType = request.headers.get('Content-Type');
    expect(isMultipartContentType(contentType)).toBe(true);
    expect(contentType).toContain('boundary=');
  });

  test('rejects explicit or preconfigured Content-Type for FormData', () => {
    const body = new FormData();
    body.set('partner_code', 'out-ROOT-1');

    expect(() =>
      buildBunFetchInit({ method: 'POST', body, explicitMime: 'multipart/form-data' })
    ).toThrow(/generate the multipart boundary/i);
    expect(() =>
      buildBunFetchInit({
        method: 'POST',
        body,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).toThrow(/generate the multipart boundary/i);
  });

  test('rejects conflicting explicit and header MIME contracts', () => {
    expect(() =>
      buildBunFetchInit({
        method: 'POST',
        body: 'payload',
        headers: { 'Content-Type': 'text/plain' },
        explicitMime: 'application/json',
      })
    ).toThrow(/conflicting Content-Type/i);
  });

  test('sends Blob, explicit MIME, and generated multipart MIME over Bun fetch', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        return Response.json({ contentType: request.headers.get('Content-Type') });
      },
    });

    const wireContentType = async (init: ReturnType<typeof buildBunFetchInit>) => {
      const response = await fetch(server.url, init);
      const payload = (await response.json()) as { contentType: string | null };
      return payload.contentType;
    };

    try {
      const blobType = await wireContentType(
        buildBunFetchInit({
          method: 'POST',
          body: new Blob(['payload'], { type: 'application/vnd.factorywager.partner+json' }),
        })
      );
      expect(blobType).toBe('application/vnd.factorywager.partner+json');

      const explicitType = await wireContentType(
        buildBunFetchInit({
          method: 'POST',
          body: new Uint8Array([1, 2, 3]),
          explicitMime: 'application/vnd.factorywager.partner-ledger',
        })
      );
      expect(explicitType).toBe('application/vnd.factorywager.partner-ledger');

      const form = new FormData();
      form.set('partner_code', 'out-ROOT-1');
      const multipartType = await wireContentType(
        buildBunFetchInit({ method: 'POST', body: form })
      );
      expect(isMultipartContentType(multipartType)).toBe(true);
      expect(multipartType).toContain('boundary=');
    } finally {
      server.stop(true);
    }
  });
});

describe('buildBunFetchInit — Bun performance options', () => {
  test('preserves Bun pooling and decompression defaults by omission', () => {
    const init = buildBunFetchInit({ method: 'GET' });
    expect('keepalive' in init).toBe(false);
    expect('decompress' in init).toBe(false);
  });

  test('passes through deliberate per-request opt-outs', () => {
    const init = buildBunFetchInit({
      method: 'GET',
      performance: { keepalive: false, decompress: false },
    });
    expect(init.keepalive).toBe(false);
    expect(init.decompress).toBe(false);
  });

  test('decompress=false preserves encoded bytes and Content-Encoding', async () => {
    const encoded = Bun.gzipSync('partner-payload');
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response(encoded, {
          headers: {
            'Content-Encoding': 'gzip',
            'Content-Type': 'application/octet-stream',
          },
        });
      },
    });

    try {
      const automatic = await fetch(server.url, buildBunFetchInit());
      expect(await automatic.text()).toBe('partner-payload');

      const preserved = await fetch(
        server.url,
        buildBunFetchInit({ performance: { decompress: false } })
      );
      expect(preserved.headers.get('Content-Encoding')).toBe('gzip');
      expect(await preserved.bytes()).toEqual(encoded);
    } finally {
      server.stop(true);
    }
  });
});
