import { describe, expect, test } from 'bun:test';
import {
  BRAND_LINK_CROSS_DOMAIN,
  checkBrandLifecycleFields,
  checkBrandLinkingBag,
  checkDeprecatedBrandReferences,
  collectAllowedBrandLinkDomains,
  collectInventoryBrandTokens,
  isBrandLifecycleDate,
} from '../lib/docs/partner-surface-brand-check.ts';
import {
  allPartnerSurfaceRows,
  type PartnerSurfaceRow,
} from '../lib/docs/partner-surface-inventory.ts';

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
        brandTokens: collectInventoryBrandTokens(allPartnerSurfaceRows()),
      }
    );
    expect(issues.filter(i => i.level === 'error')).toEqual([]);
  });

  test('isBrandLifecycleDate accepts ISO dates', () => {
    expect(isBrandLifecycleDate('2026-08-06')).toBe(true);
    expect(isBrandLifecycleDate('2026-08-06T12:00:00Z')).toBe(true);
    expect(isBrandLifecycleDate('not-a-date')).toBe(false);
  });

  test('checkBrandLifecycleFields requires reason when deprecatedAt set', () => {
    const issues = checkBrandLifecycleFields(
      'brand.Legacy',
      {
        mintAuthority: 'parsePartnerCode',
        module: 'lib/types/branded/operations.ts',
        interiorOnly: false,
        domain: 'operations',
        isActive: false,
        category: 'identity',
        deprecatedAt: '2026-08-06',
        replacedBy: 'PartnerCode',
      },
      new Set(['PartnerCode', 'Legacy'])
    );
    expect(issues.some(i => i.message.includes('deprecationReason'))).toBe(true);
    expect(issues.filter(i => i.level === 'error')).toEqual([]);
  });

  test('checkBrandLifecycleFields rejects unknown replacedBy', () => {
    const issues = checkBrandLifecycleFields(
      'brand.Legacy',
      {
        mintAuthority: 'parsePartnerCode',
        module: 'lib/types/branded/operations.ts',
        interiorOnly: false,
        domain: 'operations',
        isActive: false,
        category: 'identity',
        deprecatedAt: '2026-08-06',
        deprecationReason: 'superseded',
        replacedBy: 'NotABrand',
      },
      new Set(['PartnerCode'])
    );
    expect(issues.some(i => i.level === 'error' && i.message.includes('replacedBy'))).toBe(true);
  });

  test('checkDeprecatedBrandReferences warns wire/portal/registry consumers', () => {
    const rows = [
      {
        id: 'brand.LegacyId',
        aspect: 'brand',
        token: 'LegacyId',
        typeOrExport: 'LegacyId',
        repo: 'project-R-score',
        path: 'lib/types/branded/operations.ts',
        properties: [],
        owner: 'test',
        brand: {
          mintAuthority: 'asLegacyId',
          module: 'lib/types/branded/operations.ts',
          interiorOnly: true,
          domain: 'operations',
          registryRef: 'partners-ops',
          isActive: false,
          category: 'identity',
          deprecatedAt: '2026-01-01',
          deprecationReason: 'use PartnerCode',
          replacedBy: 'PartnerCode',
        },
      },
      {
        id: 'wire.legacy',
        aspect: 'wire-field',
        token: 'legacyId',
        typeOrExport: 'LegacyId',
        repo: 'project-R-score',
        path: 'lib/x.ts',
        properties: [],
        owner: 'test',
        wireField: {
          wireName: 'legacyId',
          sourceSystemId: 'test',
          resolvesTo: 'LegacyId',
          brandedType: 'LegacyId',
          quarantineOnFail: true,
        },
      },
      {
        id: 'board.legacy',
        aspect: 'portal-board',
        token: 'legacy-board',
        typeOrExport: 'LegacyId',
        repo: 'project-R-score',
        path: 'public/portal/x/',
        properties: [],
        owner: 'test',
      },
      {
        id: 'registry.partners-ops',
        aspect: 'registry',
        token: 'partners-ops',
        repo: 'project-R-score',
        path: 'public/registry/partners-ops.json',
        properties: [],
        owner: 'test',
        registry: {
          schemaId: 'partners-ops',
          artifactPath: 'public/registry/partners-ops.json',
          omits: [],
          moneyPolicy: 'unset',
        },
      },
    ] as const satisfies readonly PartnerSurfaceRow[];

    const issues = checkDeprecatedBrandReferences(rows);
    expect(issues.some(i => i.message.includes('wire.legacy'))).toBe(true);
    expect(issues.some(i => i.message.includes('board.legacy'))).toBe(true);
    expect(issues.some(i => i.message.includes('registry.partners-ops'))).toBe(true);
    expect(issues.every(i => i.level === 'warn')).toBe(true);
  });
});
