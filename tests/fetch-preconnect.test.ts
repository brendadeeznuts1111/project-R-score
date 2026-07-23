// @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch
import { describe, expect, test } from 'bun:test';
import {
  BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  preconnectCliUrl,
  preconnectOrigin,
} from '../lib/http/fetch-preconnect.ts';

describe('lib/http/fetch-preconnect', () => {
  test('startup docs anchor', () => {
    expect(BUN_FETCH_PRECONNECT_STARTUP_DOCS).toBe(
      'https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup'
    );
  });

  test('preconnectCliUrl forces explicit HTTPS :443', () => {
    expect(preconnectCliUrl('https://bun.com')).toBe('https://bun.com:443');
    expect(preconnectCliUrl('https://bun.com/docs')).toBe('https://bun.com:443');
    expect(preconnectCliUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
  });

  test('HTTP origin: dns.prefetch + fetch.preconnect succeed', () => {
    const r = preconnectOrigin('http://127.0.0.1:3000');
    expect(r.dnsPrefetch).toBe(true);
    expect(r.fetchPreconnect).toBe(true);
    expect(r.origin).toBe('http://127.0.0.1:3000');
  });

  test('HTTPS origin: dns.prefetch OK; fetch.preconnect skipped with CLI note', () => {
    const r = preconnectOrigin('https://bun.com');
    expect(r.dnsPrefetch).toBe(true);
    expect(r.fetchPreconnect).toBe(false);
    expect(r.note).toContain('--fetch-preconnect');
    expect(r.note).toContain(':443');
  });
});
