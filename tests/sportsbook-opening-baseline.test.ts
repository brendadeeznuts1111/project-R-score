// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { asSportsbookId } from '../lib/types/branded.ts';
import { REGULATION_POLICY_CATALOG } from '../lib/operations/regulation-policy-catalog.ts';
import {
  attachComplianceCeiling,
  projectRegulatoryBaseline,
} from '../lib/operations/baseline-regulatory-seed.ts';
import {
  SPORTSBOOK_OPENING_BASELINE_PATH,
  US_TOP_SPORTSBOOKS,
  buildSportsbookOpeningBaselineArtifact,
  expandSportsbookOpeningLimits,
  lookupOpeningLimit,
} from '../lib/operations/sportsbook-opening-baseline.ts';

describe('sportsbook opening baseline', () => {
  test('covers top 10 US books and expands the full matrix', () => {
    expect(US_TOP_SPORTSBOOKS).toHaveLength(10);
    expect(new Set(US_TOP_SPORTSBOOKS.map(book => book.rank)).size).toBe(10);
    const rows = expandSportsbookOpeningLimits();
    // 10 books × 5 sports × 3 markets × 2 structures × 2 phases
    expect(rows).toHaveLength(10 * 5 * 3 * 2 * 2);
    expect(rows[0]?.source.tier).toBe(5);
    expect(rows[0]?.source.confidence).toBe('moderate');
    expect(rows[0]?.decisionEligible).toBe(false);
    const nflMl = lookupOpeningLimit(rows, {
      sportsbook: asSportsbookId('draftkings'),
      sport: 'american_football',
      market: 'match_winner',
      structure: 'straight',
      phase: 'pregame',
    });
    expect(nflMl?.openingMaxUsd).toBe(5_000);
    const liveParlay = lookupOpeningLimit(rows, {
      sportsbook: asSportsbookId('draftkings'),
      sport: 'american_football',
      market: 'match_winner',
      structure: 'parlay',
      phase: 'live',
    });
    expect(liveParlay?.openingMaxUsd).toBeLessThan(nflMl!.openingMaxUsd);
  });

  test('internal regulatory seeds stay visible but cannot attach compliance', () => {
    const regulatory = projectRegulatoryBaseline();
    expect(regulatory).toHaveLength(REGULATION_POLICY_CATALOG.length);
    expect(regulatory).toHaveLength(4);
    expect(regulatory.every(row => row.source.tier === 1)).toBe(true);
    expect(regulatory.every(row => row.source.confidence === 'moderate')).toBe(true);
    expect(regulatory.every(row => !row.decisionEligible)).toBe(true);
    expect(attachComplianceCeiling('soccer', 'match_winner', regulatory)).toBeNull();

    const soccer = lookupOpeningLimit(expandSportsbookOpeningLimits(), {
      sportsbook: asSportsbookId('draftkings'),
      sport: 'soccer',
      market: 'match_winner',
      structure: 'straight',
      phase: 'pregame',
    });
    expect(soccer?.complianceMaxUsd).toBeUndefined();
  });

  test('verified regulatory citations promote the strictest eligible ceiling', () => {
    const regulatory = projectRegulatoryBaseline(
      REGULATION_POLICY_CATALOG,
      '2026-07-31T00:00:00.000Z',
      {
        'policy.MA.soccer.match_winner': {
          sourceRef: 'https://example.com/ma/soccer-limit',
          verifiedAt: '2026-07-31T00:00:00.000Z',
        },
        'policy.NJ.soccer.match_winner': {
          sourceRef: 'https://example.com/nj/soccer-limit',
          verifiedAt: '2026-07-31T00:00:00.000Z',
        },
      }
    );
    const compliance = attachComplianceCeiling('soccer', 'match_winner', regulatory);
    expect(compliance).toMatchObject({
      complianceMaxUsd: 5_000,
      compliancePolicyKey: 'policy.MA.soccer.match_winner',
      complianceSource: {
        sourceRef: 'https://example.com/ma/soccer-limit',
        confidence: 'highest',
      },
    });
    expect(compliance?.complianceByJurisdiction).toHaveLength(2);
  });

  test('artifact shape and committed bake stay aligned', async () => {
    const artifact = buildSportsbookOpeningBaselineArtifact(new Date('2026-07-31T00:00:00.000Z'));
    expect(artifact).toMatchObject({
      schemaVersion: 3,
      kind: 'sportsbook-opening-baseline',
      path: SPORTSBOOK_OPENING_BASELINE_PATH,
      summary: {
        books: 10,
        rows: 600,
        regulatoryRows: 4,
        policyRows: 320,
        scrapedRows: 160,
      },
    });
    expect(artifact.sources.tiers[1].count).toBe(4);
    expect(artifact.sources.tiers[1].decisionEligibleCount).toBe(0);
    expect(artifact.sources.tiers[2].count).toBe(320);
    expect(artifact.sources.tiers[2].wired).toBe(true);
    expect(artifact.sources.tiers[2].decisionEligibleCount).toBe(0);
    expect(artifact.sources.tiers[4].count).toBe(160);
    expect(artifact.sources.tiers[4].wired).toBe(true);
    expect(artifact.sources.tiers[5].count).toBe(600);
    expect(artifact.regulatory).toHaveLength(4);
    expect(artifact.policies).toHaveLength(320);
    expect(artifact.scraped).toHaveLength(160);
    expect(artifact.books[0]).toMatchObject({ id: 'draftkings', rank: 1 });
    expect(artifact.summary.rowsWithCompliance).toBe(0);
    expect(artifact.summary.rowsWithPublishedPolicy).toBe(0);
    expect(artifact.summary.decisionEligibleRows).toBe(0);

    const proc = Bun.spawn(['bun', 'tools/bake-sportsbook-opening-baseline.ts', '--check'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(stderr).toBe('');
    expect(exitCode, stdout).toBe(0);
  });

  test('partner-history board exposes provenance and compliance columns', async () => {
    const html = await Bun.file('public/portal/partner-history/index.html').text();
    expect(html).toContain('Compliance ceiling');
    expect(html).toContain('Published policy');
    expect(html).toContain('Est. scrape');
    expect(html).toContain('baseline-sources');
    expect(html).toContain('baseline-tier');
    expect(html).toContain('source-chip');
    expect(html).toContain('ops.limits.baseline_tier');
    expect(html).toContain('baseline:sync-scraped');
  });
});
