// @see https://bun.com/docs/test — bun:test
/**
 * DNS / Access lineage invariants — HostId ↔ apex/sub · AccessDomainId path seams.
 * Spec: lib/types/branded/README.md § DNS / Access lineage
 */
import { describe, expect, test } from 'bun:test';
import * as branded from '../lib/types/branded.ts';

describe('surfaces DNS / Access lineage', () => {
  test('@ sentinel composes bare apex HostId', () => {
    const host = branded.hostIdFromParts(
      branded.FACTORY_WAGER_APEX,
      branded.asSubdomainId('@')
    );
    expect(host).toBe(branded.asHostId('factory-wager.com'));
    expect(String(host)).toBe('factory-wager.com');

    const parts = branded.splitHostId(host);
    expect(parts.apex).toBe(branded.FACTORY_WAGER_APEX);
    expect(parts.subdomain).toBe(branded.asSubdomainId('@'));
    expect(branded.hostIdFromParts(parts.apex, parts.subdomain)).toBe(host);
  });

  test('accessDomainFromHost normalizes path; probe URL has no double slash', () => {
    const host = branded.asHostId('score.factory-wager.com');
    const withSlash = branded.accessDomainFromHost(host, '/portal');
    const bare = branded.accessDomainFromHost(host, 'portal');
    expect(withSlash).toBe('score.factory-wager.com/portal');
    expect(bare).toBe('score.factory-wager.com/portal');
    expect(withSlash).toBe(bare);

    const url = branded.httpsUrlForAccessDomain(withSlash);
    expect(url).toBe('https://score.factory-wager.com/portal/');
    expect(url).not.toContain('//portal');
    expect(url.split('://')).toHaveLength(2);

    const whole = branded.accessDomainFromHost(host);
    expect(branded.isPathScopedAccessDomain(whole)).toBeFalse();
    expect(branded.httpsUrlForAccessDomain(whole)).toBe('https://score.factory-wager.com/');
  });

  test('path-bearing values never mint as HostId', () => {
    expect(() => branded.asHostId('score.factory-wager.com/portal')).toThrow();
    expect(branded.tryHostId('score.factory-wager.com/portal')).toBeUndefined();
    expect(branded.BRAND_GUARDS.isHostId('score.factory-wager.com/portal')).toBeFalse();

    const access = branded.asAccessDomainId('score.factory-wager.com/portal');
    expect(branded.hostIdFromAccessDomain(access)).toBe('score.factory-wager.com');
    expect(branded.pathFromAccessDomain(access)).toBe('/portal');
  });
});
