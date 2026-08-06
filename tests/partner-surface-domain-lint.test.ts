import { describe, expect, test } from 'bun:test';
import { allPartnerSurfaceRows } from '../lib/docs/partner-surface-inventory.ts';
import {
  brandAllowedInFile,
  buildBrandHomeRules,
  findBrandTypeHits,
  homeGlobsForBrandBag,
} from '../lib/docs/partner-surface-domain-lint.ts';
import { BRAND_LINK_CROSS_DOMAIN } from '../lib/docs/partner-surface-brand-check.ts';
import { main as lintDomainsMain } from '../scripts/validate-partner-domain-isolation.ts';

describe('partner-surface-domain-lint', () => {
  test('buildBrandHomeRules covers inventory brands', () => {
    const rules = buildBrandHomeRules(allPartnerSurfaceRows());
    const byType = new Map(rules.map(r => [r.brandType, r]));
    expect(byType.get('PartnerCode')?.domain).toBe('operations');
    expect(byType.get('ExternalPartnerId')?.domain).toBe(BRAND_LINK_CROSS_DOMAIN);
    expect(byType.get('OutId')?.homeGlobs.some(g => g.includes('lib/operations'))).toBe(true);
    expect(brandAllowedInFile('lib/portal/foo.ts', byType.get('ExternalPartnerId')!)).toBe(true);
    expect(brandAllowedInFile('lib/portal/foo.ts', byType.get('PartnerCode')!)).toBe(false);
    expect(brandAllowedInFile('packages/partners/src/core/types.ts', byType.get('PartnerCode')!)).toBe(
      true
    );
  });

  test('cross-domain home is universal', () => {
    const globs = homeGlobsForBrandBag({
      domain: BRAND_LINK_CROSS_DOMAIN,
      category: 'external',
      module: 'lib/types/branded/operations.ts',
    });
    expect(globs).toEqual(['**']);
  });

  test('findBrandTypeHits ignores comments and strings', () => {
    const rule = buildBrandHomeRules(allPartnerSurfaceRows()).find(r => r.brandType === 'OutId')!;
    const src = [
      '// OutId should not hit',
      'const s = "OutId";',
      'function f(id: OutId) {}',
    ].join('\n');
    const hits = findBrandTypeHits('demo.ts', src, rule);
    expect(hits.length).toBe(1);
    expect(hits[0]?.line).toBe(3);
  });

  test('CLI --hlp / --rules / --scan exit 0', async () => {
    expect(await lintDomainsMain(['bun', 'scripts/validate-partner-domain-isolation.ts', '--hlp'])).toBe(
      0
    );
    expect(
      await lintDomainsMain(['bun', 'scripts/validate-partner-domain-isolation.ts', '--rules'])
    ).toBe(0);
    expect(
      await lintDomainsMain(['bun', 'scripts/validate-partner-domain-isolation.ts', '--scan'])
    ).toBe(0);
  });
});
