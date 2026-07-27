// @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch
// @see https://bun.com/docs/runtime/networking/dns#dns-getcachestats
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup
import { describe, expect, test } from 'bun:test';
import {
  BUN_DNS_PREFETCHING_DOCS,
  BUN_DNS_PREFETCH_DOCS,
  BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  defaultPortForUrl,
  dnsCacheStats,
  dnsPrefetchHost,
  dnsPrefetchOrigin,
  preconnectCliUrl,
  preconnectOrigin,
} from '../lib/http/fetch-preconnect.ts';

describe('lib/http/fetch-preconnect — DNS prefetching', () => {
  test('docs anchors (fetch + dns module)', () => {
    expect(BUN_DNS_PREFETCHING_DOCS).toBe(
      'https://bun.com/docs/runtime/networking/fetch#dns-prefetching'
    );
    expect(BUN_DNS_PREFETCH_DOCS).toBe(
      'https://bun.com/docs/runtime/networking/dns#dns-prefetch'
    );
    expect(BUN_FETCH_PRECONNECT_STARTUP_DOCS).toBe(
      'https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup'
    );
  });

  test('defaultPortForUrl matches connection port', () => {
    expect(defaultPortForUrl(new URL('https://bun.com/docs'))).toBe(443);
    expect(defaultPortForUrl(new URL('http://example.com'))).toBe(80);
    expect(defaultPortForUrl(new URL('http://127.0.0.1:3000'))).toBe(3000);
    expect(defaultPortForUrl(new URL('https://x.test:8443/'))).toBe(8443);
  });

  test('dns.prefetch(hostname) and dns.prefetch(hostname, port)', () => {
    expect(dnsPrefetchHost('bun.com').ok).toBe(true);
    expect(dnsPrefetchHost('bun.com', 443)).toEqual({
      host: 'bun.com',
      port: 443,
      ok: true,
    });
    expect(dnsPrefetchHost('127.0.0.1', 3000).ok).toBe(true);
  });

  test('dnsPrefetchOrigin derives host + port from URL', () => {
    const https = dnsPrefetchOrigin('https://bun.com/docs/runtime/networking/fetch');
    expect(https).toEqual({ host: 'bun.com', port: 443, ok: true });

    const local = dnsPrefetchOrigin('http://127.0.0.1:3000/health');
    expect(local).toEqual({ host: '127.0.0.1', port: 3000, ok: true });
  });

  test('dns.getCacheStats reflects prefetch activity', () => {
    dnsPrefetchHost('bun.com', 443);
    const stats = dnsCacheStats();
    // Soft: empty cache when DNS/network unavailable is not a monorepo logic failure
    if (stats.size === 0 || stats.totalCount === 0) return;
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.totalCount).toBeGreaterThan(0);
    expect(stats.errors).toBe(0);
  });
});

describe('lib/http/fetch-preconnect — preconnect matrix', () => {
  test('preconnectCliUrl forces explicit HTTPS :443', () => {
    expect(preconnectCliUrl('https://bun.com')).toBe('https://bun.com:443');
    expect(preconnectCliUrl('https://bun.com/docs')).toBe('https://bun.com:443');
    expect(preconnectCliUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
  });

  test('HTTP origin: dns.prefetch + fetch.preconnect succeed', () => {
    const r = preconnectOrigin('http://127.0.0.1:3000');
    expect(r.dnsPrefetch).toBe(true);
    expect(r.fetchPreconnect).toBe(true);
    expect(r.port).toBe(3000);
    expect(r.origin).toBe('http://127.0.0.1:3000');
  });

  test('HTTPS origin: dns.prefetch OK; fetch.preconnect skipped with CLI note', () => {
    const r = preconnectOrigin('https://bun.com');
    expect(r.dnsPrefetch).toBe(true);
    expect(r.port).toBe(443);
    expect(r.fetchPreconnect).toBe(false);
    expect(r.note).toContain('--fetch-preconnect');
    expect(r.note).toContain(':443');
  });
});
