import { describe, expect, test } from 'bun:test';

import * as branded from '../lib/types/branded.ts';

type RuntimeConstructor = (value: unknown) => unknown;

function runtimeConstructor(name: string): RuntimeConstructor {
  const candidate = (branded as unknown as Record<string, unknown>)[name];
  expect(typeof candidate).toBe('function');
  return candidate as RuntimeConstructor;
}

function sampleFor(name: string): { input: string; expected: string } {
  if (name === 'StateCode') return { input: 'ma', expected: 'MA' };
  if (name === 'SportsbookId') return { input: 'DraftKings', expected: 'draftkings' };
  if (name === 'ZipCode') return { input: '02139', expected: '02139' };
  // surfaces domain: format-aware FQDN / shortcodes / Access / type codes
  if (name === 'HostId') return { input: 'Ledger.Factory-Wager.COM', expected: 'ledger.factory-wager.com' };
  if (name === 'ApexDomainId') {
    return { input: 'Factory-Wager.COM', expected: 'factory-wager.com' };
  }
  if (name === 'SubdomainId') return { input: 'Score', expected: 'score' };
  if (name === 'SurfaceId') return { input: 'Ledger', expected: 'ledger' };
  if (name === 'PagesProjectId') {
    return { input: 'Project-R-Score', expected: 'project-r-score' };
  }
  if (name === 'AccessDomainId') {
    return {
      input: 'Score.Factory-Wager.COM/Portal',
      expected: 'score.factory-wager.com/portal',
    };
  }
  if (name === 'SurfaceStatusCode') return { input: 'Live', expected: 'live' };
  if (name === 'SurfaceAccessCode') return { input: 'Applied', expected: 'applied' };
  if (name === 'SurfaceBackendCode') return { input: 'Cloudflare-Pages', expected: 'cloudflare-pages' };
  if (name === 'PublishLaneId') return { input: 'Prod-Write', expected: 'prod-write' };
  return { input: `sample-${name.toLowerCase()}`, expected: `sample-${name.toLowerCase()}` };
}

describe('branded domain-value catalog', () => {
  test('catalog is a unique 67-value, 9-domain contract', () => {
    expect(branded.BRAND_CATALOG).toHaveLength(67);

    const names = branded.BRAND_CATALOG.map(spec => spec.name);
    const domains = new Set(branded.BRAND_CATALOG.map(spec => spec.domain));
    const kinds = branded.BRAND_CATALOG.map(spec => branded.brandKindFromName(spec.name));

    expect(new Set(names).size).toBe(names.length);
    expect(domains.size).toBe(9);
    expect(domains.has('surfaces')).toBeTrue();
    expect(kinds.filter(kind => kind === 'id')).toHaveLength(61);
    expect(kinds.filter(kind => kind === 'key')).toHaveLength(1);
    expect(kinds.filter(kind => kind === 'code')).toHaveLength(5);
  });

  test('entity names and generated symbols are collision-free after normalization', () => {
    const normalizedNames = branded.BRAND_CATALOG.map(spec => spec.name.toLocaleLowerCase('en-US'));
    expect(new Set(normalizedNames).size).toBe(normalizedNames.length);

    const generatedSymbols = branded.BRAND_CATALOG.flatMap(spec => {
      const names = branded.constructorNamesForBrand(spec.name);
      return [names.as, names.try, names.parse, `is${spec.name}`];
    });
    expect(new Set(generatedSymbols).size).toBe(generatedSymbols.length);

    for (const spec of branded.BRAND_CATALOG) {
      expect(new Set(spec.tiers).size).toBe(spec.tiers.length);
      expect(new Set(spec.mint).size).toBe(spec.mint.length);
      expect(spec.description.trim()).toBe(spec.description);
      expect(spec.description.length).toBeGreaterThan(12);
    }
  });

  test('every catalog value exports working as/try/parse constructors', () => {
    for (const spec of branded.BRAND_CATALOG) {
      const names = branded.constructorNamesForBrand(spec.name);
      const asValue = runtimeConstructor(names.as);
      const tryValue = runtimeConstructor(names.try);
      const parseValue = runtimeConstructor(names.parse);
      const sample = sampleFor(spec.name);

      expect(spec.tiers).toEqual(['as', 'try', 'parse']);
      expect(asValue(sample.input)).toBe(sample.expected);
      expect(tryValue(` ${sample.input} `)).toBe(sample.expected);
      expect(parseValue(` ${sample.input} `)).toBe(sample.expected);
      expect(tryValue('   ')).toBeUndefined();
      expect(() => parseValue(42)).toThrow();
    }
  });

  test('generated guards cover every canonical runtime shape', () => {
    expect(Object.keys(branded.BRAND_GUARDS)).toHaveLength(67);

    for (const spec of branded.BRAND_CATALOG) {
      const guardName = `is${spec.name}` as keyof typeof branded.BRAND_GUARDS;
      const guard = branded.BRAND_GUARDS[guardName];
      const sample = sampleFor(spec.name);

      expect(guard(sample.expected)).toBeTrue();
      expect(guard(42)).toBeFalse();
      expect(branded.isBrandedValue(spec.name, sample.expected)).toBeTrue();
    }

    expect(branded.BRAND_GUARDS.isStateCode('MA')).toBeTrue();
    expect(branded.BRAND_GUARDS.isStateCode('ma')).toBeFalse();
    expect(branded.BRAND_GUARDS.isZipCode('02139-1234')).toBeTrue();
    expect(branded.BRAND_GUARDS.isZipCode('2139')).toBeFalse();
    expect(branded.BRAND_GUARDS.isSportsbookId('draftkings')).toBeTrue();
    expect(branded.BRAND_GUARDS.isDomId('section:onboard')).toBeTrue();
    expect(branded.BRAND_GUARDS.isSportsbookId('DraftKings')).toBeFalse();
    expect(branded.BRAND_GUARDS.isHostId('ledger.factory-wager.com')).toBeTrue();
    expect(branded.BRAND_GUARDS.isHostId('score.factory-wager.com/portal')).toBeFalse();
    expect(branded.BRAND_GUARDS.isAccessDomainId('score.factory-wager.com/portal')).toBeTrue();
    expect(branded.BRAND_GUARDS.isSurfaceId('pages_dev')).toBeTrue();
  });

  test('surfaces brands keep HostId separate from path-bearing AccessDomainId', () => {
    const access = branded.asAccessDomainId('score.factory-wager.com/portal');
    const host = branded.hostIdFromAccessDomain(access);
    expect(host).toBe('score.factory-wager.com');
    expect(branded.pathFromAccessDomain(access)).toBe('/portal');
    expect(branded.isPathScopedAccessDomain(access)).toBeTrue();
    expect(branded.httpsUrlForHost(host, '/portal/')).toBe(
      'https://score.factory-wager.com/portal/'
    );
    // compose from HostId + path (never forge AccessDomainId from path-bearing HostId)
    expect(branded.accessDomainFromHost(host, '/portal')).toBe(
      'score.factory-wager.com/portal'
    );
    expect(branded.accessDomainFromHost(host)).toBe('score.factory-wager.com');
    expect(branded.httpsUrlForAccessDomain(access)).toBe(
      'https://score.factory-wager.com/portal/'
    );
    expect(branded.hostIdFromUrl('https://Ledger.Factory-Wager.COM/x')).toBe(
      'ledger.factory-wager.com'
    );
    expect(branded.tryHostIdFromUrl('not a host!!!')).toBeUndefined();
    // path-bearing Access domain must not pass HostId constructors
    expect(() => branded.asHostId('score.factory-wager.com/portal')).toThrow();
    expect(branded.tryHostId('not a host')).toBeUndefined();
  });

  test('surfaces apex/subdomain split prefers known FactoryWager apex', () => {
    const parts = branded.splitHostId(branded.asHostId('score.factory-wager.com'));
    expect(parts.apex).toBe(branded.FACTORY_WAGER_APEX);
    expect(parts.subdomain).toBe(branded.asSubdomainId('score'));
    expect(branded.hostIdFromParts(parts.apex, parts.subdomain)).toBe(
      'score.factory-wager.com'
    );
    expect(branded.BRAND_GUARDS.isApexDomainId('factory-wager.com')).toBeTrue();
    expect(branded.BRAND_GUARDS.isSubdomainId('@')).toBeTrue();
    expect(branded.trySubdomainId('bad/label')).toBeUndefined();
  });

  test('surfaces shortcodes: Pages project ≠ operations ProjectId; status/access codes', () => {
    expect(branded.PROJECT_R_SCORE_PAGES).toBe('project-r-score');
    expect(branded.asPagesProjectId('project-r-score')).toBe(branded.PROJECT_R_SCORE_PAGES);
    expect(
      branded.tryPagesProjectIdFromBackend('cloudflare-pages:project-r-score (vanity CNAME)')
    ).toBe('project-r-score');
    expect(branded.tryPagesProjectIdFromBackend('github-pages')).toBeUndefined();
    // PagesProjectId is not operations ProjectId (distinct brands)
    const pages = branded.asPagesProjectId('project-r-score');
    const ops = branded.asProjectId('project-r-score');
    expect(pages).toBe(ops); // same string
    // but cross-assign is a type error (proven in branded-types.test-d.ts)

    expect(branded.asSurfaceStatusCode('dangling')).toBe('dangling');
    expect(() => branded.asSurfaceStatusCode('unknown')).toThrow();
    expect(branded.asSurfaceAccessCode('bearer (intended)')).toBe('bearer (intended)');
    expect(branded.BRAND_GUARDS.isSurfaceStatusCode('live')).toBeTrue();
    expect(branded.BRAND_GUARDS.isSurfaceAccessCode('public')).toBeTrue();
    expect(branded.BRAND_GUARDS.isSurfaceAccessCode('Bearer (intended)')).toBeFalse();
    expect(branded.surfaceBackendCodeFromBackend('cloudflare-pages:project-r-score')).toBe(
      'cloudflare-pages'
    );
    expect(branded.surfaceBackendCodeFromBackend('cloudflare-worker:tennis-hq')).toBe(
      'cloudflare-worker'
    );
    expect(branded.surfaceBackendCodeFromBackend('none — no tunnel')).toBe('none');
    expect(branded.pagesDevHostForProject(branded.PROJECT_R_SCORE_PAGES)).toBe(
      'project-r-score.pages.dev'
    );
    expect(branded.asPublishLaneId('prod-write')).toBe('prod-write');
  });

  test('generic constructors reject blank values and strip a brand explicitly', () => {
    expect(() => branded.asSessionId('   ')).toThrow();
    expect(branded.trySessionId(null)).toBeUndefined();
    expect(branded.parseSessionId('  session-1  ')).toBe('session-1');

    const plain: string = branded.unbrand(branded.asSessionId('session-2'));
    expect(plain).toBe('session-2');
  });
});
