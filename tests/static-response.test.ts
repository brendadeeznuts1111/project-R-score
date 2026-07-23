// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  etagFromBytes,
  etagMatches,
  preloadStatic,
  respondAuto,
  respondFile,
  respondStatic,
} from '../lib/http/static-response.ts';

const dir = join(import.meta.dir, '.tmp-static-response');
const smallPath = join(dir, 'small.json');
const missingPath = join(dir, 'nope.json');

beforeAll(() => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(smallPath, JSON.stringify({ hello: 'world' }));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('static-response', () => {
  test('etagMatches handles lists and weak tags', () => {
    const etag = '"abc"';
    expect(etagMatches('"abc"', etag)).toBe(true);
    expect(etagMatches('W/"abc"', etag)).toBe(true);
    expect(etagMatches('"nope", "abc"', etag)).toBe(true);
    expect(etagMatches('"nope"', etag)).toBe(false);
    expect(etagMatches('*', etag)).toBe(true);
  });

  test('preloadStatic + respondStatic serves bytes and 304', async () => {
    const asset = await preloadStatic(smallPath);
    expect(asset.size).toBeGreaterThan(0);
    expect(asset.etag.startsWith('"')).toBe(true);

    const req = new Request('http://t/small.json');
    const res = respondStatic(asset, req);
    expect(res.status).toBe(200);
    expect(res.headers.get('ETag')).toBe(asset.etag);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json();
    expect(body.hello).toBe('world');

    const res304 = respondStatic(
      asset,
      new Request('http://t/small.json', { headers: { 'If-None-Match': asset.etag } })
    );
    expect(res304.status).toBe(304);
  });

  test('respondFile 404 and Last-Modified 304', async () => {
    const miss = await respondFile(missingPath, new Request('http://t/x'));
    expect(miss.status).toBe(404);

    const ok = await respondFile(smallPath, new Request('http://t/x'));
    expect(ok.status).toBe(200);
    const lm = ok.headers.get('Last-Modified');
    expect(lm).toBeTruthy();

    const res304 = await respondFile(
      smallPath,
      new Request('http://t/x', { headers: { 'If-Modified-Since': lm! } })
    );
    expect(res304.status).toBe(304);
  });

  test('respondAuto uses cache map for second hit', async () => {
    const cache = new Map();
    const r1 = await respondAuto(smallPath, new Request('http://t/a'), { cache });
    expect(r1.status).toBe(200);
    expect(cache.size).toBe(1);
    const etag = r1.headers.get('ETag')!;
    const r2 = await respondAuto(
      smallPath,
      new Request('http://t/a', { headers: { 'If-None-Match': etag } }),
      { cache }
    );
    expect(r2.status).toBe(304);
  });

  test('etagFromBytes is stable for same string', () => {
    expect(etagFromBytes('abc')).toBe(etagFromBytes('abc'));
    expect(etagFromBytes('abc')).not.toBe(etagFromBytes('abd'));
  });
});
