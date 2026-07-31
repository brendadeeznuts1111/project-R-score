// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { asSportsbookId } from '../lib/types/branded.ts';

import {
  attachPublishedPolicy,
  expandSportsbookPolicySeeds,
  projectSportsbookPolicies,
  syncSportsbookPolicies,
} from '../lib/operations/baseline-sportsbook-policies.ts';
import { makeBaselineSource, mergeBaselineValues } from '../lib/operations/baseline-source-tiers.ts';
import {
  US_TOP_SPORTSBOOKS,
  buildSportsbookOpeningBaselineArtifact,
  expandSportsbookOpeningLimits,
  lookupOpeningLimit,
} from '../lib/operations/sportsbook-opening-baseline.ts';

describe('baseline sportsbook policies (Tier 2)', () => {
  test('fixture covers top-10 × basketball/soccer × markets × NJ/MA × structure × phase', () => {
    const seeds = expandSportsbookPolicySeeds();
    // 10 books × 2 sports × 2 markets × 2 jurisdictions × 2 structures × 2 phases
    expect(seeds).toHaveLength(10 * 2 * 2 * 2 * 2 * 2);
    const rows = projectSportsbookPolicies(seeds);
    expect(rows.every(row => row.source.tier === 2)).toBe(true);
    expect(rows.every(row => row.source.confidence === 'moderate')).toBe(true);
    expect(rows.every(row => !row.decisionEligible)).toBe(true);
    expect(rows.every(row => row.evidenceStatus === 'internal_seed')).toBe(true);
    expect(syncSportsbookPolicies().count).toBe(seeds.length);
    expect(syncSportsbookPolicies().decisionEligibleCount).toBe(0);
  });

  test('only an explicitly verified external citation promotes a policy row', () => {
    const seed = expandSportsbookPolicySeeds()[0]!;
    const [internal] = projectSportsbookPolicies([
      { ...seed, referenceUrl: 'https://example.com/policy' },
    ]);
    expect(internal?.decisionEligible).toBe(false);

    const [verified] = projectSportsbookPolicies([
      {
        ...seed,
        referenceUrl: 'https://example.com/policy',
        evidenceStatus: 'verified_citation',
        verifiedAt: '2026-07-31T00:00:00.000Z',
      },
    ]);
    expect(verified).toMatchObject({
      decisionEligible: true,
      evidenceStatus: 'verified_citation',
      source: { confidence: 'high' },
    });
    expect(
      attachPublishedPolicy(
        {
          sportsbook: verified!.sportsbook,
          sport: verified!.sport,
          market: verified!.market,
          structure: verified!.structure,
          phase: verified!.phase,
        },
        [verified!]
      )
    ).toMatchObject({ publishedPolicyMaxUsd: verified!.openingMaxUsd });

    const opening = lookupOpeningLimit(
      expandSportsbookOpeningLimits(
        US_TOP_SPORTSBOOKS,
        '2026-07-31T00:00:00.000Z',
        [],
        [verified!],
        []
      ),
      {
        sportsbook: verified!.sportsbook,
        sport: verified!.sport,
        market: verified!.market,
        structure: verified!.structure,
        phase: verified!.phase,
      }
    );
    expect(opening).toMatchObject({
      commercialSourceTier: 5,
      decisionEligible: true,
      decisionMaxUsd: verified!.openingMaxUsd,
      decisionSourceTier: 2,
    });
  });

  test('merge: T1 ceiling; T5 commercial wins over T2; T2 beats T4', () => {
    const merged = mergeBaselineValues([
      { valueUsd: 10_000, source: makeBaselineSource(1, 'policy.NJ.soccer.match_winner') },
      { valueUsd: 1_500, source: makeBaselineSource(2, 'internal:research-seed/dk') },
      { valueUsd: 800, source: makeBaselineSource(4, 'scrape:dk') },
      { valueUsd: 3_000, source: makeBaselineSource(5, 'ops:matrix') },
    ]);
    expect(merged.complianceMaxUsd).toBe(10_000);
    expect(merged.commercialMaxUsd).toBe(3_000);
    expect(merged.commercialSource?.tier).toBe(5);

    const withoutT5 = mergeBaselineValues([
      { valueUsd: 1_500, source: makeBaselineSource(2, 'internal:research-seed/dk') },
      { valueUsd: 800, source: makeBaselineSource(4, 'scrape:dk') },
    ]);
    expect(withoutT5.commercialMaxUsd).toBe(1_500);
    expect(withoutT5.commercialSource?.tier).toBe(2);
  });

  test('opening matrix keeps unverified policy seeds out of decision fields', () => {
    const rows = expandSportsbookOpeningLimits();
    const bb = lookupOpeningLimit(rows, {
      sportsbook: asSportsbookId('draftkings'),
      sport: 'basketball',
      market: 'match_winner',
      structure: 'straight',
      phase: 'pregame',
    });
    expect(bb?.publishedPolicyMaxUsd).toBeUndefined();
    expect(bb?.commercialSourceTier).toBe(5);
    expect(bb?.commercialMaxUsd).toBe(bb?.openingMaxUsd);
    expect(bb?.decisionMaxUsd).toBeUndefined();
    expect(bb?.decisionEligible).toBe(false);

    const nfl = lookupOpeningLimit(rows, {
      sportsbook: asSportsbookId('draftkings'),
      sport: 'american_football',
      market: 'match_winner',
      structure: 'straight',
      phase: 'pregame',
    });
    expect(nfl?.publishedPolicyMaxUsd).toBeUndefined();

    const soccer = lookupOpeningLimit(rows, {
      sportsbook: asSportsbookId('draftkings'),
      sport: 'soccer',
      market: 'match_winner',
      structure: 'straight',
      phase: 'pregame',
    });
    expect(soccer?.complianceMaxUsd).toBeUndefined();
    expect(soccer?.publishedPolicyMaxUsd).toBeUndefined();
  });

  test('artifact marks Tier 2 wired', () => {
    const artifact = buildSportsbookOpeningBaselineArtifact(new Date('2026-07-31T00:00:00.000Z'));
    expect(artifact.sources.tiers[2]).toMatchObject({ wired: true, count: 320 });
    expect(artifact.sources.tiers[2].decisionEligibleCount).toBe(0);
    expect(artifact.summary.policyRows).toBe(320);
    expect(artifact.policies).toHaveLength(320);
    expect(artifact.summary.rowsWithPublishedPolicy).toBe(0);
    expect(artifact.summary.decisionEligibleRows).toBe(0);
  });
});
