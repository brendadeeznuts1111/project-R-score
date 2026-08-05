// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  DATA_SOURCE_HEADER,
  jsonWithDataSource,
  withDataSource,
} from '../lib/http/data-source.ts';

describe('X-Data-Source provenance', () => {
  test('jsonWithDataSource sets live / stale-cache / none', () => {
    const live = jsonWithDataSource({ ok: true }, 'live');
    expect(live.headers.get(DATA_SOURCE_HEADER)).toBe('live');
    expect(live.status).toBe(200);

    const stale = jsonWithDataSource({ ok: true }, 'stale-cache', {
      cache: 'public, max-age=30, must-revalidate',
    });
    expect(stale.headers.get(DATA_SOURCE_HEADER)).toBe('stale-cache');
    expect(stale.headers.get('Cache-Control')).toContain('must-revalidate');

    const none = jsonWithDataSource({ error: 'gone' }, 'none', { status: 503 });
    expect(none.headers.get(DATA_SOURCE_HEADER)).toBe('none');
    expect(none.status).toBe(503);
  });

  test('withDataSource preserves body and sets header', async () => {
    const base = Response.json({ a: 1 }, { status: 200, headers: { 'X-Foo': 'bar' } });
    const next = withDataSource(base, 'stale-cache');
    expect(next.headers.get(DATA_SOURCE_HEADER)).toBe('stale-cache');
    expect(next.headers.get('X-Foo')).toBe('bar');
    expect(await next.json()).toEqual({ a: 1 });
  });
});
