import { describe, expect, test } from 'bun:test';
import {
  BRAND_LINK_CROSS_DOMAIN,
  checkBrandLinkingBag,
  collectAllowedBrandLinkDomains,
} from '../lib/docs/partner-surface-brand-check.ts';
import { allPartnerSurfaceRows } from '../lib/docs/partner-surface-inventory.ts';

describe('partner-surface-brand-check', () => {
  test('inventory brands carry linking metadata', () => {
    const brands = allPartnerSurfaceRows().filter(r => r.aspect === 'brand');
    expect(brands.length).toBeGreaterThanOrEqual(8);
    for (const r of brands) {
      expect(r.brand?.domain).toBeTruthy();
      expect(typeof r.brand?.isActive).toBe('boolean');
      expect(r.brand?.category).toBeTruthy();
    }
    const partnerCode = brands.find(r => r.token === 'PartnerCode')!.brand!;
    expect(partnerCode.registryRef).toBe('partners-ops');
    expect(partnerCode.domain).toBe('operations');
    const external = brands.find(r => r.token === 'ExternalPartnerId')!.brand!;
    expect(external.domain).toBe(BRAND_LINK_CROSS_DOMAIN);
    expect(external.registryRef).toBeUndefined();
  });

  test('collectAllowedBrandLinkDomains includes operations + partners + cross-domain', () => {
    const allowed = collectAllowedBrandLinkDomains(
      allPartnerSurfaceRows(),
      new Set(['operations', 'session'])
    );
    expect(allowed.has('operations')).toBe(true);
    expect(allowed.has(BRAND_LINK_CROSS_DOMAIN)).toBe(true);
    expect(allowed.has('partners')).toBe(true); // conceptDomain
    expect(allowed.has('partner')).toBe(true); // chromeDomain
  });

  test('checkBrandLinkingBag rejects unknown registryRef', () => {
    const issues = checkBrandLinkingBag(
      'brand.demo',
      {
        mintAuthority: 'parsePartnerCode',
        module: 'lib/types/branded/operations.ts',
        interiorOnly: false,
        domain: 'operations',
        registryRef: 'not-a-registry',
        isActive: true,
        category: 'identity',
      },
      {
        allowedDomains: new Set(['operations', BRAND_LINK_CROSS_DOMAIN]),
        registryTokens: new Set(['partners-ops']),
        manifestDomain: 'operations',
      }
    );
    expect(issues.some(i => i.level === 'error' && i.message.includes('registryRef'))).toBe(true);
  });

  test('checkBrandLinkingBag accepts PartnerCode shape', () => {
    const issues = checkBrandLinkingBag(
      'brand.PartnerCode',
      {
        pattern: '^[A-Z]{3,6}$',
        mintAuthority: 'parsePartnerCode',
        module: 'lib/types/branded/operations.ts',
        interiorOnly: false,
        domain: 'operations',
        registryRef: 'partners-ops',
        isActive: true,
        category: 'identity',
      },
      {
        allowedDomains: new Set(['operations', BRAND_LINK_CROSS_DOMAIN]),
        registryTokens: new Set(['partners-ops']),
        manifestDomain: 'operations',
      }
    );
    expect(issues.filter(i => i.level === 'error')).toEqual([]);
  });
});
