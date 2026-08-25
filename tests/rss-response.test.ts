import { describe, expect, test } from 'bun:test';
import { buildRSSFanout, type RSSChannelDocument } from '../lib/rss/rss-fanout.ts';
import { respondRSSDocument } from '../lib/rss/rss-response.ts';
import { asFeedId } from '../lib/types/branded.ts';

function fixture(): RSSChannelDocument {
  return buildRSSFanout(
    [
      {
        key: asFeedId('runtime'),
        schemaVersion: 2,
        endpoint: new URL('https://example.test/feeds/v2/runtime.xml'),
        title: 'Runtime',
        site: new URL('https://example.test/'),
        description: 'Runtime updates',
      },
    ],
    [
      {
        guid: asFeedId('item-1'),
        channelKeys: [asFeedId('runtime')],
        title: 'One',
        link: 'https://example.test/one',
        description: 'One update',
        pubDate: '2026-08-24T11:00:00Z',
        revisionDate: '2026-08-24T12:00:00Z',
      },
    ]
  )[0]!;
}

describe('RSS conditional response', () => {
  test('serves exact document bytes with strong validators', async () => {
    const document = fixture();
    const response = respondRSSDocument(document, new Request(document.endpoint));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
    expect(response.headers.get('Content-Length')).toBe(String(document.byteLength));
    expect(response.headers.get('ETag')).toBe(document.etag);
    expect(response.headers.get('Last-Modified')).toBe(document.lastModified);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new TextEncoder().encode(document.xml)
    );
  });

  test('returns 304 for If-None-Match lists and weak comparisons', () => {
    const document = fixture();
    const response = respondRSSDocument(
      document,
      new Request(document.endpoint, {
        headers: { 'If-None-Match': `"other", W/${document.etag}` },
      })
    );

    expect(response.status).toBe(304);
    expect(response.body).toBeNull();
    expect(response.headers.get('ETag')).toBe(document.etag);
    expect(response.headers.get('Last-Modified')).toBe(document.lastModified);
    expect(response.headers.get('Content-Length')).toBeNull();
  });

  test('uses If-Modified-Since only when If-None-Match is absent', () => {
    const document = fixture();
    const freshByDate = respondRSSDocument(
      document,
      new Request(document.endpoint, {
        headers: { 'If-Modified-Since': 'Mon, 24 Aug 2026 12:00:00 GMT' },
      })
    );
    const staleTagWins = respondRSSDocument(
      document,
      new Request(document.endpoint, {
        headers: {
          'If-None-Match': '"stale"',
          'If-Modified-Since': 'Mon, 24 Aug 2026 12:00:00 GMT',
        },
      })
    );

    expect(freshByDate.status).toBe(304);
    expect(staleTagWins.status).toBe(200);
  });

  test('returns 412 for failed strong-tag and modification-time preconditions', () => {
    const document = fixture();
    const staleTag = respondRSSDocument(
      document,
      new Request(document.endpoint, { headers: { 'If-Match': '"stale"' } })
    );
    const weakTag = respondRSSDocument(
      document,
      new Request(document.endpoint, { headers: { 'If-Match': `W/${document.etag}` } })
    );
    const modifiedAfter = respondRSSDocument(
      document,
      new Request(document.endpoint, {
        method: 'HEAD',
        headers: { 'If-Unmodified-Since': 'Mon, 24 Aug 2026 11:59:59 GMT' },
      })
    );

    for (const response of [staleTag, weakTag, modifiedAfter]) {
      expect(response.status).toBe(412);
      expect(response.body).toBeNull();
      expect(response.headers.get('Content-Length')).toBeNull();
      expect(response.headers.get('ETag')).toBe(document.etag);
    }
  });

  test('accepts matching If-Match and ignores If-Unmodified-Since when the tag is present', () => {
    const document = fixture();
    const response = respondRSSDocument(
      document,
      new Request(document.endpoint, {
        headers: {
          'If-Match': document.etag,
          'If-Unmodified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
        },
      })
    );
    expect(response.status).toBe(200);
  });

  test('returns headers without a body for HEAD', async () => {
    const document = fixture();
    const response = respondRSSDocument(
      document,
      new Request(document.endpoint, { method: 'HEAD' })
    );

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get('Content-Length')).toBe(String(document.byteLength));
    expect(await response.text()).toBe('');
  });
});
