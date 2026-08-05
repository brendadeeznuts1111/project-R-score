// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  migrateBookV03,
  migrateCatalogV03ToV04,
  auditPublicCatalog,
  isPublicSecretKey,
} from '../lib/bookmakers/migrate-v03-to-v04.ts';

describe('bookmakers v0.3 → v0.4 migrate', () => {
  test('splits rest secrets into ops and enriches public branding', () => {
    const { public: pub, ops } = migrateBookV03('pinnacle', {
      id: 'pinnacle',
      label: 'Pinnacle',
      domain: 'www.pinnacle.com',
      fetcherType: 'rest',
      restBaseUrl: 'https://api.pinnacle.com/v1',
      restProtocol: 'http2',
      apiKeyEnv: 'PINNACLE_API_KEY',
      envVars: ['PINNACLE_API_KEY'],
      supportedSports: ['tennis'],
      regions: [{ country: 'US' }],
      color: '#f59e0b',
    });
    expect(pub.id).toBe('pinnacle');
    expect(pub.slug).toBe('pinnacle');
    expect(pub.fetcher).toBe('rest');
    expect(pub.sports).toEqual(['tennis']);
    expect(pub.urls.web).toBe('https://www.pinnacle.com');
    expect(pub.urls.api).toBe('https://api.pinnacle.com/v1');
    expect(pub.brandGroup).toBe('Pinnacle');
    expect(pub.lifecycle).toContain('live');
    expect((pub as { restBaseUrl?: string }).restBaseUrl).toBeUndefined();
    expect(ops.restBaseUrl).toBe('https://api.pinnacle.com/v1');
    expect(ops.apiKeyEnv).toBe('PINNACLE_API_KEY');
    expect(ops.health?.status).toBe('unknown');
  });

  test('hard-rock gets skin + brandGroup enrichment', () => {
    const { public: pub } = migrateBookV03('hard-rock-florida', {
      id: 'hard-rock-florida',
      label: 'Hard Rock Florida',
      domain: 'hardrockfl.sportsbook.hardrock.bet',
      fetcherType: 'seat',
      supportedSports: ['basketball'],
      regions: [{ country: 'US', stateCode: 'FL' }],
      color: '#db2777',
      note: 'seat desk',
    });
    expect(pub.skin).toBe('HardRockBet Florida');
    expect(pub.brandGroup).toBe('Hard Rock International');
    expect(pub.limits.liquidityTier).toBe('medium');
    expect(pub.regions).toEqual([{ country: 'US', stateCode: 'FL' }]);
  });

  test('migrateCatalog preserves count and audit', () => {
    const v03 = {
      artifact: { name: '@factorywager/bookmakers', version: '0.3.0', checksum: 'ab' },
      bookmakers: {
        a: {
          id: 'a',
          label: 'A',
          domain: 'a.example',
          fetcherType: 'seat',
          supportedSports: ['tennis'],
          regions: [],
          color: '#000',
        },
      },
    };
    // no enrichment for "a" → brandGroup missing → audit fail unless we only require for known
    // brandGroup is required by audit - enrichment missing will fail. Use known id.
    v03.bookmakers = {
      pinnacle: {
        id: 'pinnacle',
        label: 'Pinnacle',
        domain: 'www.pinnacle.com',
        fetcherType: 'rest',
        supportedSports: ['tennis'],
        regions: [{ country: 'US' }],
        color: '#f59e0b',
        restBaseUrl: 'https://api.pinnacle.com/v1',
        apiKeyEnv: 'PINNACLE_API_KEY',
      },
    };
    const { public: pub, ops } = migrateCatalogV03ToV04(v03, { version: '0.4.0' });
    expect(pub.schemaVersion).toBe(2);
    expect(pub.summary.count).toBe(1);
    expect(pub.audit.ok).toBe(true);
    expect(ops.bookmakers.pinnacle.apiKeyEnv).toBe('PINNACLE_API_KEY');
  });

  test('isPublicSecretKey covers ops-only fields', () => {
    expect(isPublicSecretKey('apiKeyEnv')).toBe(true);
    expect(isPublicSecretKey('label')).toBe(false);
  });

  test('audit rejects id !== slug', () => {
    const audit = auditPublicCatalog({
      x: {
        id: 'x',
        slug: 'y',
        label: 'X',
        brandGroup: 'X',
        fetcher: 'seat',
        lifecycle: ['pre_match'],
        sports: ['tennis'],
        regions: [],
        urls: { web: 'https://x.example', api: null, limitsPage: null, termsPage: null },
        limits: { minBetUsd: null, maxBetUsd: null, liquidityTier: 'low' },
      },
    });
    expect(audit.ok).toBe(false);
    expect(audit.issues.some(i => i.includes('id !== slug'))).toBe(true);
  });
});
