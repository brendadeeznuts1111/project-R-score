// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  makePartnerApiCandidate,
  partnerApiTierArtifactSlice,
  syncPartnerApiLimits,
} from '../lib/operations/baseline-partner-api.ts';
import { buildSportsbookOpeningBaselineArtifact } from '../lib/operations/sportsbook-opening-baseline.ts';
import { makeBaselineSource, mergeBaselineValues } from '../lib/operations/baseline-source-tiers.ts';

describe('baseline partner API (Tier 3)', () => {
  test('syncPartnerApiLimits records unavailable when credentials missing', () => {
    const prevUrl = Bun.env.PARTNER_LIMITS_API_URL;
    const prevToken = Bun.env.PARTNER_LIMITS_API_TOKEN;
    delete Bun.env.PARTNER_LIMITS_API_URL;
    delete Bun.env.PARTNER_LIMITS_API_TOKEN;
    try {
      const prov = syncPartnerApiLimits({ now: new Date('2026-07-31T12:00:00.000Z') });
      expect(prov.wired).toBe(true);
      expect(prov.status).toBe('unavailable');
      expect(prov.count).toBe(0);
      expect(prov.candidates).toEqual([]);
      expect(prov.notes).toContain('PARTNER_LIMITS_API_URL');
      const slice = partnerApiTierArtifactSlice(prov);
      expect(slice.status).toBe('unavailable');
      expect(slice.wired).toBe(true);
    } finally {
      if (prevUrl !== undefined) Bun.env.PARTNER_LIMITS_API_URL = prevUrl;
      if (prevToken !== undefined) Bun.env.PARTNER_LIMITS_API_TOKEN = prevToken;
    }
  });

  test('opening baseline bake exposes Tier 3 as wired unavailable (not stub)', () => {
    const prevUrl = Bun.env.PARTNER_LIMITS_API_URL;
    const prevToken = Bun.env.PARTNER_LIMITS_API_TOKEN;
    delete Bun.env.PARTNER_LIMITS_API_URL;
    delete Bun.env.PARTNER_LIMITS_API_TOKEN;
    try {
      const art = buildSportsbookOpeningBaselineArtifact();
      const t3 = art.sources.tiers[3];
      expect(t3.wired).toBe(true);
      expect(t3.label).toBe('partner_api');
      expect(t3.status).toBe('unavailable');
      expect(t3.count).toBe(0);
      expect(typeof t3.notes).toBe('string');
      expect(typeof t3.checkedAt).toBe('string');
    } finally {
      if (prevUrl !== undefined) Bun.env.PARTNER_LIMITS_API_URL = prevUrl;
      if (prevToken !== undefined) Bun.env.PARTNER_LIMITS_API_TOKEN = prevToken;
    }
  });

  test('makePartnerApiCandidate merges as live comparison winner', () => {
    const merged = mergeBaselineValues([
      makePartnerApiCandidate(9_000, 'api:bet365'),
      { valueUsd: 1_000, source: makeBaselineSource(4, 'scrape:x') },
    ]);
    expect(merged.liveComparisonMaxUsd).toBe(9_000);
    expect(merged.liveComparisonSource?.tier).toBe(3);
  });
});
