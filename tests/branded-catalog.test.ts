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
  if (name === 'ZipCode') return { input: '02139', expected: '02139' };
  // surfaces domain: format-aware FQDN / inventory key / Access domain
  if (name === 'HostId') return { input: 'Ledger.Factory-Wager.COM', expected: 'ledger.factory-wager.com' };
  if (name === 'SurfaceId') return { input: 'Ledger', expected: 'ledger' };
  if (name === 'AccessDomainId') {
    return {
      input: 'Score.Factory-Wager.COM/Portal',
      expected: 'score.factory-wager.com/portal',
    };
  }
  return { input: `sample-${name.toLowerCase()}`, expected: `sample-${name.toLowerCase()}` };
}

describe('branded domain-value catalog', () => {
  test('catalog is a unique 50-value, 9-domain contract', () => {
    expect(branded.BRAND_CATALOG).toHaveLength(50);

    const names = branded.BRAND_CATALOG.map(spec => spec.name);
    const domains = new Set(branded.BRAND_CATALOG.map(spec => spec.domain));
    const kinds = branded.BRAND_CATALOG.map(spec => branded.brandKindFromName(spec.name));

    expect(new Set(names).size).toBe(names.length);
    expect(domains.size).toBe(9);
    expect(domains.has('surfaces')).toBeTrue();
    expect(kinds.filter(kind => kind === 'id')).toHaveLength(47);
    expect(kinds.filter(kind => kind === 'key')).toHaveLength(1);
    expect(kinds.filter(kind => kind === 'code')).toHaveLength(2);
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
    expect(Object.keys(branded.BRAND_GUARDS)).toHaveLength(50);

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
    expect(branded.httpsUrlForHost(host, '/portal/')).toBe(
      'https://score.factory-wager.com/portal/'
    );
    // path-bearing Access domain must not pass HostId constructors
    expect(() => branded.asHostId('score.factory-wager.com/portal')).toThrow();
    expect(branded.tryHostId('not a host')).toBeUndefined();
  });

  test('generic constructors reject blank values and strip a brand explicitly', () => {
    expect(() => branded.asSessionId('   ')).toThrow();
    expect(branded.trySessionId(null)).toBeUndefined();
    expect(branded.parseSessionId('  session-1  ')).toBe('session-1');

    const plain: string = branded.unbrand(branded.asSessionId('session-2'));
    expect(plain).toBe('session-2');
  });
});
