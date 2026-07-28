// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';
import { shortFormsForBrand } from '../tools/brand-manifest.ts';

describe('brand-manifest short forms', () => {
  test('derivation covers plain, code, key, and multiword shapes', () => {
    expect(shortFormsForBrand('SessionId')).toEqual({
      shortName: 'sessionId',
      envName: 'SESSION_ID',
    });
    expect(shortFormsForBrand('StateCode')).toEqual({
      shortName: 'stateCode',
      envName: 'STATE_CODE',
    });
    expect(shortFormsForBrand('PartnerProfileKey')).toEqual({
      shortName: 'partnerProfileKey',
      envName: 'PARTNER_PROFILE_KEY',
    });
    expect(shortFormsForBrand('AccessDomainId')).toEqual({
      shortName: 'accessDomainId',
      envName: 'ACCESS_DOMAIN_ID',
    });
  });

  test('single-word and short names stay stable', () => {
    expect(shortFormsForBrand('HostId')).toEqual({ shortName: 'hostId', envName: 'HOST_ID' });
    expect(shortFormsForBrand('ApexDomainId')).toEqual({
      shortName: 'apexDomainId',
      envName: 'APEX_DOMAIN_ID',
    });
    expect(shortFormsForBrand('SubdomainId')).toEqual({
      shortName: 'subdomainId',
      envName: 'SUBDOMAIN_ID',
    });
    expect(shortFormsForBrand('ZipCode')).toEqual({ shortName: 'zipCode', envName: 'ZIP_CODE' });
  });

  test('generated manifest carries shortName/envName on every brand', async () => {
    const manifest = await Bun.file('lib/types/brand-manifest.json').json();
    expect(manifest.brands.length).toBeGreaterThan(0);
    for (const b of manifest.brands) {
      expect(typeof b.shortName, b.name).toBe('string');
      expect(b.shortName.length, b.name).toBeGreaterThan(0);
      expect(b.envName, b.name).toMatch(/^[A-Z0-9_]+$/);
      expect(shortFormsForBrand(b.name), b.name).toEqual({
        shortName: b.shortName,
        envName: b.envName,
      });
    }
  });
});
