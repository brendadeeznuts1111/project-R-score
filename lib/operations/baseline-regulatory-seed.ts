/**
 * Tier 1 regulatory baseline projection from the governed policy catalog.
 *
 * Projects REGULATION_POLICY_CATALOG — does not fork a second policy SSOT.
 * PDF citation URLs are future Tier 1 upgrades; sourceRef stays internal seed refs.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import {
  REGULATION_POLICY_CATALOG,
  type RegulationPolicyDefinition,
  type RegulationPolicyKey,
} from './regulation-policy-catalog.ts';
import { makeBaselineSource, type BaselineSourceRecord } from './baseline-source-tiers.ts';
import type { StateCode } from '../types/branded.ts';

export type RegulatoryBaselineRow = {
  policyKey: RegulationPolicyKey;
  jurisdiction: StateCode;
  sport: string;
  market: string;
  maxBetUsd: number;
  dailyLimitUsd: number | null;
  source: BaselineSourceRecord;
  evidenceStatus: 'internal_seed' | 'verified_citation';
  decisionEligible: boolean;
  verifiedAt?: string;
};

export type RegulatoryCitationEvidence = {
  sourceRef: string;
  verifiedAt: string;
};

export type ComplianceAttach = {
  complianceMaxUsd: number;
  compliancePolicyKey: RegulationPolicyKey;
  complianceSource: BaselineSourceRecord;
  complianceByJurisdiction: ReadonlyArray<{
    jurisdiction: StateCode;
    maxBetUsd: number;
    policyKey: RegulationPolicyKey;
  }>;
};

/** Project catalog policies into Tier 1 baseline source rows. */
export function projectRegulatoryBaseline(
  policies: readonly RegulationPolicyDefinition[] = REGULATION_POLICY_CATALOG,
  extractedAt = new Date(0).toISOString(),
  citations: Readonly<Partial<Record<RegulationPolicyKey, RegulatoryCitationEvidence>>> = {}
): RegulatoryBaselineRow[] {
  return policies.map(policy => {
    const citation = citations[policy.key];
    const decisionEligible =
      citation != null &&
      citation.verifiedAt.length > 0 &&
      citation.sourceRef.startsWith('https://');
    const sourceRef = decisionEligible ? citation.sourceRef : policy.sourceRef;
    return {
      policyKey: policy.key,
      jurisdiction: policy.jurisdiction,
      sport: policy.sport,
      market: policy.market,
      maxBetUsd: policy.maxBet,
      dailyLimitUsd: policy.dailyLimit ?? null,
      source: makeBaselineSource(1, sourceRef, {
        extractedAt,
        confidence: decisionEligible ? 'highest' : 'moderate',
        notes: decisionEligible
          ? `${policy.label} · verified regulatory citation`
          : `${policy.label} · internal seed (citation deferred; not decision eligible)`,
      }),
      evidenceStatus: decisionEligible ? 'verified_citation' : 'internal_seed',
      decisionEligible,
      ...(decisionEligible ? { verifiedAt: citation.verifiedAt } : {}),
    };
  });
}

/**
 * For a sport×market cell, attach the strictest Tier 1 ceiling across jurisdictions
 * and list each jurisdiction's policy.
 */
export function attachComplianceCeiling(
  sport: string,
  market: string,
  regulatory: readonly RegulatoryBaselineRow[] = projectRegulatoryBaseline()
): ComplianceAttach | null {
  const matches = regulatory.filter(
    row => row.decisionEligible && row.sport === sport && row.market === market
  );
  if (matches.length === 0) return null;
  const byJurisdiction = matches.map(row => ({
    jurisdiction: row.jurisdiction,
    maxBetUsd: row.maxBetUsd,
    policyKey: row.policyKey,
  }));
  const strictest = matches.reduce((best, row) => (row.maxBetUsd < best.maxBetUsd ? row : best));
  return {
    complianceMaxUsd: strictest.maxBetUsd,
    compliancePolicyKey: strictest.policyKey,
    complianceSource: strictest.source,
    complianceByJurisdiction: byJurisdiction,
  };
}

/** Sync entry used by CLI — pure projection (catalog is the SSOT). */
export function syncRegulatoryBaseline(extractedAt = new Date().toISOString()) {
  const rows = projectRegulatoryBaseline(REGULATION_POLICY_CATALOG, extractedAt);
  const decisionEligibleCount = rows.filter(row => row.decisionEligible).length;
  return {
    tier: 1 as const,
    confidence:
      decisionEligibleCount === rows.length ? ('highest' as const) : ('moderate' as const),
    count: rows.length,
    decisionEligibleCount,
    rows,
  };
}
