import { describe, expect, test } from 'bun:test';
import {
  BRAND_LINK_CROSS_DOMAIN,
  checkBrandFitnessFields,
  checkBrandLifecycleFields,
  checkBrandLinkingBag,
  checkDeprecatedBrandReferences,
  checkOutIdArtifactPresence,
  checkOutIdBag,
  checkPartnerCallSignPresence,
  checkPartnerCodeArtifactPresence,
  checkPartnerCodeBag,
  collectAllowedBrandLinkDomains,
  collectBrandBagsByToken,
  collectInventoryBrandTokens,
  isBrandLifecycleDate,
  isPartnerSurfaceFitnessScore,
} from '../lib/docs/partner-surface-brand-check.ts';
import {
  checkBrandMintModuleEvidence,
  checkBrandTestCoverageEvidence,
  mintAuthoritySearchTerms,
} from '../lib/docs/partner-surface-fitness-evidence.ts';
import {
  allPartnerSurfaceRows,
  outIdSurfaceRows,
  partnerCodeSurfaceRows,
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

  test('inventory brands carry fitness metadata', () => {
    const brands = allPartnerSurfaceRows().filter(r => r.aspect === 'brand');
    for (const r of brands) {
      expect(r.brand?.fitnessScore).toBeDefined();
      expect(isPartnerSurfaceFitnessScore(r.brand!.fitnessScore!)).toBe(true);
      expect(typeof r.brand?.hasTestCoverage).toBe('boolean');
    }
    expect(brands.find(r => r.token === 'PartnerCode')!.brand!.fitnessScore).toBe(4);
    expect(brands.find(r => r.token === 'OutId')!.brand!.fitnessScore).toBe(2);
    expect(brands.find(r => r.token === 'ExternalPartnerId')!.brand!.fitnessScore).toBe(1);
  });

  test('checkBrandFitnessFields rejects out-of-range scores', () => {
    const issues = checkBrandFitnessFields('brand.demo', {
      mintAuthority: 'x',
      module: 'lib/types/branded/operations.ts',
      interiorOnly: false,
      domain: 'operations',
      isActive: true,
      category: 'identity',
      fitnessScore: 9 as unknown as 1,
    });
    expect(issues.some(i => i.level === 'error' && i.message.includes('fitnessScore'))).toBe(true);
  });

  test('checkPartnerCodeBag requires active brand with registryRef', () => {
    const rows = allPartnerSurfaceRows({
      livePartnerCodes: [{ code: 'SPEN', phase: 'operator_ready' }],
    });
    const brandByToken = collectBrandBagsByToken(rows);
    const registryTokens = new Set(rows.filter(r => r.aspect === 'registry').map(r => r.token));
    const ok = checkPartnerCodeBag(
      'partner-code.SPEN',
      'SPEN',
      { brandRef: 'PartnerCode', registryRef: 'partners-ops', phase: 'operator_ready' },
      { brandByToken, registryTokens, liveCodes: new Set(['SPEN']) }
    );
    expect(ok.filter(i => i.level === 'error')).toEqual([]);

    const bad = checkPartnerCodeBag(
      'partner-code.ZZZ',
      'ZZZ',
      { brandRef: 'NotABrand', registryRef: 'partners-ops' },
      { brandByToken, registryTokens, liveCodes: new Set(['SPEN']) }
    );
    expect(bad.some(i => i.level === 'error' && i.message.includes('brandRef'))).toBe(true);
    expect(bad.some(i => i.level === 'warn' && i.message.includes('not present'))).toBe(true);
  });

  test('checkPartnerCodeArtifactPresence errors when code missing from ops', () => {
    const rows = partnerCodeSurfaceRows([{ code: 'SPEN', phase: 'operator_ready' }]);
    const missing = checkPartnerCodeArtifactPresence(rows, new Map());
    expect(missing.some(i => i.level === 'error' && i.message.includes('not found'))).toBe(true);
    const ok = checkPartnerCodeArtifactPresence(
      rows,
      new Map([['SPEN', { phase: 'operator_ready' }]])
    );
    expect(ok.filter(i => i.level === 'error')).toEqual([]);
    const phaseDrift = checkPartnerCodeArtifactPresence(
      rows,
      new Map([['SPEN', { phase: 'onboarding' }]])
    );
    expect(phaseDrift.some(i => i.message.includes('phase'))).toBe(true);
  });

  test('checkPartnerCallSignPresence warns on missing or malformed callSign', () => {
    const rows = partnerCodeSurfaceRows([{ code: 'SPEN', phase: 'operator_ready' }]);
    const missing = checkPartnerCallSignPresence(rows, new Map([['SPEN', {}]]));
    expect(missing.some(i => i.message.includes('callSign missing'))).toBe(true);
    const bad = checkPartnerCallSignPresence(
      rows,
      new Map([['SPEN', { callSign: 'SPEN1' }]])
    );
    expect(bad.some(i => i.message.includes('does not match'))).toBe(true);
    const ok = checkPartnerCallSignPresence(
      rows,
      new Map([['SPEN', { callSign: 'SPEN-001' }]])
    );
    expect(ok).toEqual([]);
  });

  test('checkOutIdBag + artifact presence', () => {
    const rows = allPartnerSurfaceRows({
      liveOutIds: [{ outId: 'out-SPEN-1', partnerCode: 'SPEN', status: 'ready' }],
    });
    const brandByToken = collectBrandBagsByToken(rows);
    const registryTokens = new Set(rows.filter(r => r.aspect === 'registry').map(r => r.token));
    const bag = {
      brandRef: 'OutId',
      registryRef: 'partners-ops',
      partnerCode: 'SPEN',
      status: 'ready',
    };
    const ok = checkOutIdBag('out-id.out-SPEN-1', 'out-SPEN-1', bag, {
      brandByToken,
      registryTokens,
      liveCodes: new Set(['SPEN']),
    });
    expect(ok.filter(i => i.level === 'error')).toEqual([]);

    const outRows = outIdSurfaceRows([{ outId: 'out-SPEN-1', partnerCode: 'SPEN', status: 'ready' }]);
    const missing = checkOutIdArtifactPresence(outRows, new Map());
    expect(missing.some(i => i.level === 'error' && i.message.includes('not found'))).toBe(true);
    const present = checkOutIdArtifactPresence(
      outRows,
      new Map([['out-SPEN-1', { partnerCode: 'SPEN', status: 'ready' }]])
    );
    expect(present.filter(i => i.level === 'error')).toEqual([]);
    const statusDrift = checkOutIdArtifactPresence(
      outRows,
      new Map([['out-SPEN-1', { partnerCode: 'SPEN', status: 'deferred' }]])
    );
    expect(statusDrift.some(i => i.message.includes('status'))).toBe(true);
  });

  test('mintAuthoritySearchTerms + test-coverage evidence', () => {
    expect(mintAuthoritySearchTerms('packages/partners parsePartnerCode')).toEqual([
      'parsePartnerCode',
    ]);
    expect(mintAuthoritySearchTerms('asTreeNodeId')).toEqual(['asTreeNodeId']);
    const rows = allPartnerSurfaceRows();
    const partnerCode = rows.find(r => r.token === 'PartnerCode')!;
    const issuesTrue = checkBrandTestCoverageEvidence(
      [partnerCode],
      'expect(parsePartnerCode("SPEN")).toBeDefined()'
    );
    expect(issuesTrue).toEqual([]);
    const issuesMissing = checkBrandTestCoverageEvidence([partnerCode], '// no mint symbols here');
    expect(issuesMissing.some(i => i.message.includes('hasTestCoverage=true'))).toBe(true);
  });

  test('checkBrandMintModuleEvidence requires mint terms in module text', () => {
    const rows = allPartnerSurfaceRows();
    const partnerCode = rows.find(r => r.token === 'PartnerCode')!;
    const ok = checkBrandMintModuleEvidence(
      [partnerCode],
      new Map([['lib/types/branded/operations.ts', 'export const parsePartnerCode = …']])
    );
    expect(ok).toEqual([]);
    const missing = checkBrandMintModuleEvidence(
      [partnerCode],
      new Map([['lib/types/branded/operations.ts', '// no constructors']])
    );
    expect(missing.some(i => i.message.includes('not found in'))).toBe(true);
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
