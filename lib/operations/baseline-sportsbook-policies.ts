/**
 * Tier 2 published sportsbook policy fixture (US top-10).
 *
 * Research-seed values derived from typical public T&C / max-payout language —
 * not live scrapes. Replace referenceUrl + openingMaxUsd as real citations land.
 * Scope: basketball/soccer × match_winner/over_under × NJ/MA × structure × phase.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import {
  asSportsbookId,
  asStateCode,
  type SportsbookId,
  type StateCode,
} from '../types/branded.ts';
import { makeBaselineSource, type BaselineSourceRecord } from './baseline-source-tiers.ts';

/** Mirror sportsbook-opening-baseline structure/phase without importing that module (avoid cycle). */
export type OpeningBetStructure = 'straight' | 'parlay';
export type OpeningMarketPhase = 'pregame' | 'live';

/** Top-10 US book anchors — keep aligned with US_TOP_SPORTSBOOKS. */
const POLICY_BOOK_ANCHORS = [
  { sportsbook: asSportsbookId('draftkings'), anchorUsd: 2_500 },
  { sportsbook: asSportsbookId('fanduel'), anchorUsd: 2_500 },
  { sportsbook: asSportsbookId('betmgm'), anchorUsd: 1_500 },
  { sportsbook: asSportsbookId('caesars'), anchorUsd: 1_500 },
  { sportsbook: asSportsbookId('espnbet'), anchorUsd: 1_200 },
  { sportsbook: asSportsbookId('fanatics'), anchorUsd: 1_000 },
  { sportsbook: asSportsbookId('hardrock'), anchorUsd: 1_200 },
  { sportsbook: asSportsbookId('bet365'), anchorUsd: 2_000 },
  { sportsbook: asSportsbookId('betrivers'), anchorUsd: 1_000 },
  { sportsbook: asSportsbookId('circa'), anchorUsd: 5_000 },
] as const;

export const POLICY_SPORT_KEYS = ['basketball', 'soccer'] as const;
export const POLICY_MARKET_KEYS = ['match_winner', 'over_under'] as const;
export const POLICY_JURISDICTIONS = ['NJ', 'MA'] as const;

export type SportsbookPolicySeed = {
  sportsbook: SportsbookId;
  sport: (typeof POLICY_SPORT_KEYS)[number];
  market: (typeof POLICY_MARKET_KEYS)[number];
  jurisdiction: StateCode;
  structure: OpeningBetStructure;
  phase: OpeningMarketPhase;
  openingMaxUsd: number;
  dailyLimitUsd?: number;
  referenceUrl: string;
  evidenceStatus: 'internal_seed' | 'verified_citation';
  verifiedAt?: string;
  notes?: string;
};

export type SportsbookPolicyRow = SportsbookPolicySeed & {
  source: BaselineSourceRecord;
  decisionEligible: boolean;
};

const SPORT_MULT: Record<(typeof POLICY_SPORT_KEYS)[number], number> = {
  basketball: 1.0,
  soccer: 0.7,
};

const MARKET_MULT: Record<(typeof POLICY_MARKET_KEYS)[number], number> = {
  match_winner: 1.0,
  over_under: 0.85,
};

const STRUCTURE_MULT: Record<OpeningBetStructure, number> = {
  straight: 1.0,
  parlay: 0.25,
};

const PHASE_MULT: Record<OpeningMarketPhase, number> = {
  pregame: 1.0,
  live: 0.4,
};

/** NJ typically slightly tighter than MA in this research seed. */
const JURISDICTION_MULT: Record<(typeof POLICY_JURISDICTIONS)[number], number> = {
  NJ: 0.95,
  MA: 1.0,
};

function roundPolicyUsd(value: number): number {
  if (value < 25) return 25;
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 500) return Math.round(value / 25) * 25;
  if (value < 2_000) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

function researchReferenceUrl(sportsbook: SportsbookId): string {
  return `internal:research-seed/published-policy/${sportsbook}/max-payout`;
}

/** Expand typed research seeds for top-10 US books in scope. */
export function expandSportsbookPolicySeeds(): SportsbookPolicySeed[] {
  const seeds: SportsbookPolicySeed[] = [];
  for (const { sportsbook, anchorUsd } of POLICY_BOOK_ANCHORS) {
    for (const sport of POLICY_SPORT_KEYS) {
      for (const market of POLICY_MARKET_KEYS) {
        for (const jurisdiction of POLICY_JURISDICTIONS) {
          for (const structure of ['straight', 'parlay'] as const) {
            for (const phase of ['pregame', 'live'] as const) {
              const raw =
                anchorUsd *
                SPORT_MULT[sport] *
                MARKET_MULT[market] *
                STRUCTURE_MULT[structure] *
                PHASE_MULT[phase] *
                JURISDICTION_MULT[jurisdiction];
              seeds.push({
                sportsbook,
                sport,
                market,
                jurisdiction: asStateCode(jurisdiction),
                structure,
                phase,
                openingMaxUsd: roundPolicyUsd(raw),
                dailyLimitUsd: roundPolicyUsd(raw * 8),
                referenceUrl: researchReferenceUrl(sportsbook),
                evidenceStatus: 'internal_seed',
                notes:
                  'Research seed from typical public T&C / max-payout language — replace with citation.',
              });
            }
          }
        }
      }
    }
  }
  return seeds;
}

export function projectSportsbookPolicies(
  seeds: readonly SportsbookPolicySeed[] = expandSportsbookPolicySeeds(),
  extractedAt = '2026-07-28T00:00:00.000Z'
): SportsbookPolicyRow[] {
  return seeds.map(seed => {
    const decisionEligible =
      seed.evidenceStatus === 'verified_citation' &&
      seed.verifiedAt != null &&
      seed.verifiedAt.length > 0 &&
      seed.referenceUrl.startsWith('https://');
    return {
      ...seed,
      evidenceStatus: decisionEligible ? 'verified_citation' : 'internal_seed',
      decisionEligible,
      source: makeBaselineSource(2, seed.referenceUrl, {
        extractedAt,
        confidence: decisionEligible ? 'high' : 'moderate',
        notes: decisionEligible
          ? `${seed.notes ?? 'Published sportsbook policy'} · verified citation`
          : `${seed.notes ?? 'Sportsbook policy seed'} · not decision eligible`,
      }),
    };
  });
}

/** Sync entry used by CLI — pure projection from the committed fixture. */
export function syncSportsbookPolicies(extractedAt = new Date().toISOString()) {
  const rows = projectSportsbookPolicies(expandSportsbookPolicySeeds(), extractedAt);
  const decisionEligibleCount = rows.filter(row => row.decisionEligible).length;
  return {
    tier: 2 as const,
    confidence: decisionEligibleCount === rows.length ? ('high' as const) : ('moderate' as const),
    count: rows.length,
    decisionEligibleCount,
    rows,
  };
}

export type PublishedPolicyAttach = {
  publishedPolicyMaxUsd: number;
  publishedPolicyReferenceUrl: string;
  publishedPolicyByJurisdiction: ReadonlyArray<{
    jurisdiction: StateCode;
    maxBetUsd: number;
    referenceUrl: string;
  }>;
  publishedPolicySource: BaselineSourceRecord;
};

/** Attach strictest Tier 2 published max across jurisdictions for a book cell. */
export function attachPublishedPolicy(
  query: {
    sportsbook: SportsbookId;
    sport: string;
    market: string;
    structure: OpeningBetStructure;
    phase: OpeningMarketPhase;
  },
  policies: readonly SportsbookPolicyRow[] = projectSportsbookPolicies()
): PublishedPolicyAttach | null {
  const matches = policies.filter(
    row =>
      row.decisionEligible &&
      row.sportsbook === query.sportsbook &&
      row.sport === query.sport &&
      row.market === query.market &&
      row.structure === query.structure &&
      row.phase === query.phase
  );
  if (matches.length === 0) return null;
  const byJurisdiction = matches.map(row => ({
    jurisdiction: row.jurisdiction,
    maxBetUsd: row.openingMaxUsd,
    referenceUrl: row.referenceUrl,
  }));
  const strictest = matches.reduce((best, row) =>
    row.openingMaxUsd < best.openingMaxUsd ? row : best
  );
  return {
    publishedPolicyMaxUsd: strictest.openingMaxUsd,
    publishedPolicyReferenceUrl: strictest.referenceUrl,
    publishedPolicyByJurisdiction: byJurisdiction,
    publishedPolicySource: strictest.source,
  };
}
