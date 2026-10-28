// @see https://bun.com/docs/runtime/networking/dns#choosing-a-resolver-backend
// @see https://bun.com/blog/bun-v1.4#http/2-&-http/3-in-fetch()-(experimental)
import { describe, expect, test } from 'bun:test';
import {
  assertPublicAuthorityAddresses,
  buildPinnedHttpsPlan,
  classifyAuthorityAddress,
  formatAuthorityHost,
  formatHttpsAuthority,
  normalizeAuthorityHost,
  normalizeRequestPath,
  resolveAuthorityAddresses,
} from '../lib/http/ip-authority.ts';

describe('IP authority boundaries', () => {
  test('brackets IPv6 only when embedding it in URI authority syntax', () => {
    expect(normalizeAuthorityHost('[2001:db8::1]')).toBe('2001:db8::1');
    expect(formatAuthorityHost('2001:db8::1')).toBe('[2001:db8::1]');
    expect(formatHttpsAuthority('2001:db8::1')).toBe('[2001:db8::1]');
    expect(formatHttpsAuthority('2001:db8::1', 8443)).toBe('[2001:db8::1]:8443');
    expect(formatHttpsAuthority('api.example.com', 8443)).toBe('api.example.com:8443');
  });

  test('rejects ambiguous host and request-path inputs', () => {
    expect(() => normalizeAuthorityHost('https://example.com')).toThrow('without scheme');
    expect(() => normalizeAuthorityHost('fe80::1%en0')).toThrow('zone identifiers');
    expect(() => normalizeRequestPath('//attacker.example/path')).toThrow('one slash');
    expect(() => formatHttpsAuthority('example.com', 0)).toThrow('1 through 65535');
  });

  test('keeps connect address, TLS SNI, and HTTP authority separate', () => {
    expect(
      buildPinnedHttpsPlan({
        hostname: 'API.Example.com.',
        address: '2001:db8::1',
        port: 8443,
        path: '/odds?live=1',
        protocol: 'http2',
      })
    ).toEqual({
      hostname: 'api.example.com',
      address: '2001:db8::1',
      family: 6,
      port: 8443,
      path: '/odds?live=1',
      connectUrl: 'https://[2001:db8::1]:8443/odds?live=1',
      httpAuthority: 'api.example.com:8443',
      tlsServerName: 'api.example.com',
      protocol: 'http2',
      redirect: 'manual',
    });
  });

  test('literal resolution is offline and family-aware', async () => {
    expect(await resolveAuthorityAddresses('192.0.2.1', { family: 4 })).toEqual([
      { address: '192.0.2.1', family: 4, ttl: 0, source: 'literal' },
    ]);
    expect(await resolveAuthorityAddresses('2001:db8::1', { family: 4 })).toEqual([]);
    await expect(
      resolveAuthorityAddresses('example.com', { backend: 'system', dnsServer: '1.1.1.1' })
    ).rejects.toThrow('separate resolver modes');
  });

  test('IPv4-only hostname resolution does not require an IPv6 fallback', async () => {
    const rows = await resolveAuthorityAddresses('localhost', {
      family: 4,
      backend: 'system',
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(row => row.family === 4)).toBe(true);
  });

  test('classifies private, metadata, mapped, documentation, and public addresses', () => {
    const classify = (address: string, family: 4 | 6) =>
      classifyAuthorityAddress({ address, family, ttl: 30, source: 'literal' }).scope;
    expect(classify('10.1.2.3', 4)).toBe('private');
    expect(classify('169.254.169.254', 4)).toBe('metadata');
    expect(classify('::ffff:127.0.0.1', 6)).toBe('loopback');
    expect(classify('2001:db8::1', 6)).toBe('documentation');
    expect(classify('2606:4700:4700::1111', 6)).toBe('public');
  });

  test('public authority rejects private-only and mixed DNS answers', () => {
    const row = (address: string, family: 4 | 6) => ({
      address, family, ttl: 30, source: 'bun' as const,
    });
    expect(() => assertPublicAuthorityAddresses('private.test', [row('10.0.0.1', 4)]))
      .toThrow('private');
    expect(() => assertPublicAuthorityAddresses('mixed.test', [
      row('1.1.1.1', 4), row('192.168.1.2', 4),
    ])).toThrow('mixed public/non-public');
    expect(assertPublicAuthorityAddresses('public.test', [row('1.1.1.1', 4)])).toHaveLength(1);
  });
});
