/**
 * Top-10 US sportsbook opening-limit baseline for new accounts.
 *
 * Schema v3: preview values are separated from citation-backed decision values.
 * Not an external legal citation or live book API.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import { REGULATION_MARKET_KEYS, REGULATION_SPORT_KEYS } from './regulation-policy-catalog.ts';
import {
  attachComplianceCeiling,
  projectRegulatoryBaseline,
  type RegulatoryBaselineRow,
} from './baseline-regulatory-seed.ts';
import {
  attachPublishedPolicy,
  projectSportsbookPolicies,
  type SportsbookPolicyRow,
} from './baseline-sportsbook-policies.ts';
import {
  attachScrapedEstimate,
  projectScrapedLimits,
  type ScrapedLimitRow,
} from './baseline-scraped-limits.ts';
import {
  baselineSourceTiersGlossaryConcepts,
  makeBaselineSource,
  mergeBaselineValues,
  type BaselineSourceRecord,
} from './baseline-source-tiers.ts';
import { partnerApiTierArtifactSlice, syncPartnerApiLimits } from './baseline-partner-api.ts';
import type { RegulationPolicyKey } from './regulation-policy-catalog.ts';
import { asSportsbookId, type SportsbookId, type StateCode } from '../types/branded.ts';

export const SPORTSBOOK_OPENING_BASELINE_KIND = 'sportsbook-opening-baseline' as const;
export const SPORTSBOOK_OPENING_BASELINE_PATH = '/registry/sportsbook-opening-baseline.json';
export const SPORTSBOOK_OPENING_BASELINE_SCHEMA_VERSION = 3 as const;

export type OpeningBetStructure = 'straight' | 'parlay';
export type OpeningMarketPhase = 'pregame' | 'live';

export type SportsbookOpeningBook = {
  id: SportsbookId;
  label: string;
  rank: number;
  /** Anchor: american_football / match_winner / straight / pregame max USD. */
  anchorMaxUsd: number;
  notes?: string;
};

export type SportsbookOpeningLimitRow = {
  sportsbook: SportsbookId;
  sportsbookLabel: string;
  rank: number;
  sport: string;
  market: string;
  structure: OpeningBetStructure;
  phase: OpeningMarketPhase;
  openingMaxUsd: number;
  source: BaselineSourceRecord;
  evidenceStatus: 'internal_seed';
  /** True only when decisionMaxUsd is backed by an eligible commercial source. */
  decisionEligible: boolean;
  /** Commercial winner after merge (Tier 5 > 2 > 4). */
  commercialMaxUsd?: number;
  commercialSourceTier?: BaselineSourceRecord['tier'];
  /** Eligible commercial value after removing internal seeds and unverified estimates. */
  decisionMaxUsd?: number;
  decisionSourceTier?: BaselineSourceRecord['tier'];
  complianceMaxUsd?: number;
  compliancePolicyKey?: RegulationPolicyKey;
  complianceByJurisdiction?: ReadonlyArray<{
    jurisdiction: StateCode;
    maxBetUsd: number;
    policyKey: RegulationPolicyKey;
  }>;
  publishedPolicyMaxUsd?: number;
  publishedPolicyReferenceUrl?: string;
  publishedPolicyByJurisdiction?: ReadonlyArray<{
    jurisdiction: StateCode;
    maxBetUsd: number;
    referenceUrl: string;
  }>;
  scrapedMaxUsd?: number;
  scrapedReferenceUrl?: string | null;
  scrapedByJurisdiction?: ReadonlyArray<{
    jurisdiction: StateCode;
    maxBetUsd: number;
    referenceUrl: string | null;
  }>;
};

/** Top US online sportsbooks by retail footprint (internal ranking). */
export const US_TOP_SPORTSBOOKS = [
  {
    id: asSportsbookId('draftkings'),
    label: 'DraftKings',
    rank: 1,
    anchorMaxUsd: 5_000,
    notes: 'High-volume retail; NFL ML pregame straight is the matrix anchor.',
  },
  {
    id: asSportsbookId('fanduel'),
    label: 'FanDuel',
    rank: 2,
    anchorMaxUsd: 5_000,
    notes: 'Parity with DK on major US markets for new-account baselines.',
  },
  {
    id: asSportsbookId('betmgm'),
    label: 'BetMGM',
    rank: 3,
    anchorMaxUsd: 2_500,
  },
  {
    id: asSportsbookId('caesars'),
    label: 'Caesars',
    rank: 4,
    anchorMaxUsd: 2_500,
  },
  {
    id: asSportsbookId('espnbet'),
    label: 'ESPN BET',
    rank: 5,
    anchorMaxUsd: 2_000,
  },
  {
    id: asSportsbookId('fanatics'),
    label: 'Fanatics',
    rank: 6,
    anchorMaxUsd: 1_500,
  },
  {
    id: asSportsbookId('hardrock'),
    label: 'Hard Rock Bet',
    rank: 7,
    anchorMaxUsd: 2_000,
  },
  {
    id: asSportsbookId('bet365'),
    label: 'bet365',
    rank: 8,
    anchorMaxUsd: 3_000,
  },
  {
    id: asSportsbookId('betrivers'),
    label: 'BetRivers',
    rank: 9,
    anchorMaxUsd: 1_500,
  },
  {
    id: asSportsbookId('circa'),
    label: 'Circa Sports',
    rank: 10,
    anchorMaxUsd: 10_000,
    notes: 'Higher-limit specialist relative to mass-market retail books.',
  },
] as const satisfies readonly SportsbookOpeningBook[];

const SPORT_MULTIPLIER: Record<(typeof REGULATION_SPORT_KEYS)[number], number> = {
  american_football: 1.0,
  basketball: 0.85,
  baseball: 0.7,
  hockey: 0.65,
  soccer: 0.6,
};

const MARKET_MULTIPLIER: Record<(typeof REGULATION_MARKET_KEYS)[number], number> = {
  match_winner: 1.0,
  spread: 0.9,
  over_under: 0.85,
};

const PHASE_MULTIPLIER: Record<OpeningMarketPhase, number> = {
  pregame: 1.0,
  live: 0.35,
};

const STRUCTURE_MULTIPLIER: Record<OpeningBetStructure, number> = {
  straight: 1.0,
  parlay: 0.2,
};

function roundOpeningUsd(value: number): number {
  if (value < 25) return 25;
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 500) return Math.round(value / 25) * 25;
  if (value < 2_000) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

const OPS_MATRIX_SOURCE_REF = 'internal:sportsbook-opening-baseline/ops-matrix';

/** Expand book anchors into the full matrix (Tier 5 + T2/T4 attach + T1 ceiling). */
export function expandSportsbookOpeningLimits(
  books: readonly SportsbookOpeningBook[] = US_TOP_SPORTSBOOKS,
  extractedAt = new Date(0).toISOString(),
  regulatory: readonly RegulatoryBaselineRow[] = projectRegulatoryBaseline(),
  policies: readonly SportsbookPolicyRow[] = projectSportsbookPolicies(undefined, extractedAt),
  scraped: readonly ScrapedLimitRow[] = projectScrapedLimits(undefined, extractedAt)
): SportsbookOpeningLimitRow[] {
  const opsSource = makeBaselineSource(5, OPS_MATRIX_SOURCE_REF, {
    extractedAt,
    confidence: 'moderate',
    notes: 'Synthetic new-account opening matrix (preview only; not decision eligible)',
  });
  const rows: SportsbookOpeningLimitRow[] = [];
  for (const book of books) {
    for (const sport of REGULATION_SPORT_KEYS) {
      for (const market of REGULATION_MARKET_KEYS) {
        for (const structure of ['straight', 'parlay'] as const) {
          for (const phase of ['pregame', 'live'] as const) {
            const raw =
              book.anchorMaxUsd *
              SPORT_MULTIPLIER[sport] *
              MARKET_MULTIPLIER[market] *
              STRUCTURE_MULTIPLIER[structure] *
              PHASE_MULTIPLIER[phase];
            const openingMaxUsd = roundOpeningUsd(raw);
            const compliance = attachComplianceCeiling(sport, market, regulatory);
            const published = attachPublishedPolicy(
              { sportsbook: book.id, sport, market, structure, phase },
              policies
            );
            const estimated = attachScrapedEstimate(
              { sportsbook: book.id, sport, market, structure, phase },
              scraped
            );
            const candidates = [
              { valueUsd: openingMaxUsd, source: opsSource, decisionEligible: false },
              ...(published
                ? [
                    {
                      valueUsd: published.publishedPolicyMaxUsd,
                      source: published.publishedPolicySource,
                      decisionEligible: true,
                    },
                  ]
                : []),
              ...(estimated
                ? [
                    {
                      valueUsd: estimated.scrapedMaxUsd,
                      source: estimated.scrapedSource,
                      decisionEligible: false,
                    },
                  ]
                : []),
              ...(compliance
                ? [
                    {
                      valueUsd: compliance.complianceMaxUsd,
                      source: compliance.complianceSource,
                      decisionEligible: true,
                    },
                  ]
                : []),
            ];
            const merged = mergeBaselineValues(candidates);
            const decision = mergeBaselineValues(
              candidates.filter(candidate => candidate.decisionEligible)
            );
            rows.push({
              sportsbook: book.id,
              sportsbookLabel: book.label,
              rank: book.rank,
              sport,
              market,
              structure,
              phase,
              openingMaxUsd,
              source: opsSource,
              evidenceStatus: 'internal_seed',
              decisionEligible: decision.commercialMaxUsd != null,
              commercialMaxUsd: merged.commercialMaxUsd ?? openingMaxUsd,
              commercialSourceTier: merged.commercialSource?.tier,
              ...(decision.commercialMaxUsd != null
                ? {
                    decisionMaxUsd: decision.commercialMaxUsd,
                    decisionSourceTier: decision.commercialSource?.tier,
                  }
                : {}),
              ...(compliance
                ? {
                    complianceMaxUsd: compliance.complianceMaxUsd,
                    compliancePolicyKey: compliance.compliancePolicyKey,
                    complianceByJurisdiction: compliance.complianceByJurisdiction,
                  }
                : {}),
              ...(published
                ? {
                    publishedPolicyMaxUsd: published.publishedPolicyMaxUsd,
                    publishedPolicyReferenceUrl: published.publishedPolicyReferenceUrl,
                    publishedPolicyByJurisdiction: published.publishedPolicyByJurisdiction,
                  }
                : {}),
              ...(estimated
                ? {
                    scrapedMaxUsd: estimated.scrapedMaxUsd,
                    scrapedReferenceUrl: estimated.scrapedReferenceUrl,
                    scrapedByJurisdiction: estimated.scrapedByJurisdiction,
                  }
                : {}),
            });
          }
        }
      }
    }
  }
  return rows;
}

export function lookupOpeningLimit(
  rows: readonly SportsbookOpeningLimitRow[],
  query: {
    sportsbook: SportsbookId;
    sport: string;
    market: string;
    structure: OpeningBetStructure;
    phase: OpeningMarketPhase;
  }
): SportsbookOpeningLimitRow | undefined {
  return rows.find(
    row =>
      row.sportsbook === query.sportsbook &&
      row.sport === query.sport &&
      row.market === query.market &&
      row.structure === query.structure &&
      row.phase === query.phase
  );
}

/** Stable provenance timestamp for source records (catalog effectiveDate). Bake time stays on generatedAt. */
const BASELINE_SOURCE_EXTRACTED_AT = '2026-07-28T00:00:00.000Z';

export function buildSportsbookOpeningBaselineArtifact(now = new Date()) {
  const books = US_TOP_SPORTSBOOKS.map(book => ({ ...book }));
  const regulatory = projectRegulatoryBaseline(undefined, BASELINE_SOURCE_EXTRACTED_AT);
  const policies = projectSportsbookPolicies(undefined, BASELINE_SOURCE_EXTRACTED_AT);
  const scraped = projectScrapedLimits(undefined, BASELINE_SOURCE_EXTRACTED_AT);
  const limits = expandSportsbookOpeningLimits(
    books,
    BASELINE_SOURCE_EXTRACTED_AT,
    regulatory,
    policies,
    scraped
  );
  const withCompliance = limits.filter(row => row.complianceMaxUsd != null).length;
  const withPublished = limits.filter(row => row.publishedPolicyMaxUsd != null).length;
  const withScraped = limits.filter(row => row.scrapedMaxUsd != null).length;
  const decisionEligibleRows = limits.filter(row => row.decisionMaxUsd != null).length;
  const eligibleRegulatoryRows = regulatory.filter(row => row.decisionEligible).length;
  const eligiblePolicyRows = policies.filter(row => row.decisionEligible).length;
  return {
    schemaVersion: SPORTSBOOK_OPENING_BASELINE_SCHEMA_VERSION,
    kind: SPORTSBOOK_OPENING_BASELINE_KIND,
    path: SPORTSBOOK_OPENING_BASELINE_PATH,
    generatedAt: now.toISOString(),
    disclaimer:
      'Internal Tier 1/Tier 2 seeds, the Tier 4 estimate, and the synthetic Tier 5 matrix are preview evidence only. A value becomes decision eligible only after its external citation is explicitly verified.',
    dimensions: {
      sportsbooks: books.length,
      sports: REGULATION_SPORT_KEYS.length,
      markets: REGULATION_MARKET_KEYS.length,
      structures: ['straight', 'parlay'],
      phases: ['pregame', 'live'],
    },
    sources: {
      tiers: {
        1: {
          count: regulatory.length,
          decisionEligibleCount: eligibleRegulatoryRows,
          label: 'regulatory',
          wired: true,
        },
        2: {
          count: policies.length,
          decisionEligibleCount: eligiblePolicyRows,
          label: 'published_policy',
          wired: true,
        },
        3: partnerApiTierArtifactSlice(syncPartnerApiLimits({ now })),
        4: { count: scraped.length, label: 'public_scrape', wired: true },
        5: {
          count: limits.length,
          decisionEligibleCount: 0,
          label: 'ops_override',
          wired: true,
        },
      },
    },
    summary: {
      books: books.length,
      rows: limits.length,
      regulatoryRows: regulatory.length,
      policyRows: policies.length,
      scrapedRows: scraped.length,
      rowsWithCompliance: withCompliance,
      rowsWithPublishedPolicy: withPublished,
      rowsWithScrapedEstimate: withScraped,
      decisionEligibleRows,
      eligibleRegulatoryRows,
      eligiblePolicyRows,
      anchorSport: 'american_football',
      anchorMarket: 'match_winner',
      anchorStructure: 'straight',
      anchorPhase: 'pregame',
    },
    regulatory,
    policies,
    scraped,
    books,
    limits,
  } as const;
}

export function sportsbookOpeningBaselineGlossaryConcepts() {
  return [
    {
      id: 'ops.limits.opening_baseline',
      label: 'Opening limit baseline',
      description:
        'Multi-tier preview for new-account max wagers with explicit evidence eligibility; internal seeds remain non-decision-eligible until their external citations are verified.',
      category: 'trading' as const,
      kind: 'baseline' as const,
      synonyms: ['new account limits', 'opening max', 'baseline limits'],
      values: null,
      seeAlso: [
        'ops.limits.baseline_tier',
        'ops.limits.effective_limit',
        'ops.limits.market_phase',
        'ops.limits.multi_structure',
        'ops.limits.sport',
      ],
      status: 'active' as const,
      source: 'lib/operations/sportsbook-opening-baseline.ts',
      semanticType: 'resource' as const,
      uiRole: 'heading' as const,
      unit: 'usd',
      format: 'currency:usd',
    },
    ...baselineSourceTiersGlossaryConcepts(),
  ];
}
