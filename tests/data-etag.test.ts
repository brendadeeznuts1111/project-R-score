// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  clearDataETagCache,
  computeDataETag,
  getDataVersion,
  isFresh,
  notModified,
  respondWithSharedETag,
  stableStringify,
} from '../lib/http/data-etag.ts';

describe('data-etag (shared across formats)', () => {
  test('stableStringify sorts keys', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  test('same data → same ETag regardless of key order', () => {
    const a = computeDataETag({ bun: '1.3', status: 'ok' });
    const b = computeDataETag({ status: 'ok', bun: '1.3' });
    expect(a).toBe(b);
  });

  test('JSON and plain share ETag when data matches', () => {
    clearDataETagCache();
    const data = { status: 'ok', packages: 3 };
    const etag = computeDataETag(data);

    const jsonReq = new Request('http://t/health', {
      headers: { Accept: 'application/json' },
    });
    const plainReq = new Request('http://t/health/pre', {
      headers: {
        Accept: 'text/plain',
        'If-None-Match': etag,
      },
    });

    const rJson = respondWithSharedETag(
      jsonReq,
      data,
      { body: JSON.stringify(data), contentType: 'application/json' },
      { etag, vary: 'Accept' }
    );
    expect(rJson.status).toBe(200);
    expect(rJson.headers.get('ETag')).toBe(etag);
    expect(rJson.headers.get('Vary')).toBe('Accept');

    // Same data ETag on plain → 304 even though format differs
    expect(isFresh(plainReq, etag)).toBe(true);
    const r304 = notModified(etag);
    expect(r304.status).toBe(304);
    expect(r304.headers.get('Vary')).toBe('Accept');
  });

  test('getDataVersion reuses when content unchanged', () => {
    clearDataETagCache();
    const v1 = getDataVersion('health', { x: 1 });
    const v2 = getDataVersion('health', { x: 1 });
    expect(v1.contentHash).toBe(v2.contentHash);
    expect(v1.generatedAt).toBe(v2.generatedAt);
    const v3 = getDataVersion('health', { x: 2 });
    expect(v3.contentHash).not.toBe(v1.contentHash);
  });
});
