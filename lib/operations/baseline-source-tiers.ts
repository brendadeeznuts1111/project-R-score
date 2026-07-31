/**
 * Multi-tier baseline provenance: confidence levels and merge win-order.
 *
 * Tier 1 = statutory/regulatory (compliance ceiling).
 * Tier 3 = partner API live comparison.
 * Tiers 2/5 = published policy / ops override for commercial baseline.
 * Tier 4 = public scrape fallback (estimated).
 *
 * @see docs/harness/tenants/partner-limits.md
 */

export type BaselineSourceTier = 1 | 2 | 3 | 4 | 5;

export type BaselineConfidence = 'highest' | 'very_high' | 'high' | 'medium' | 'moderate';

export type BaselineSourceType =
  | 'regulatory'
  | 'published_policy'
  | 'partner_api'
  | 'public_scrape'
  | 'ops_override';

export type BaselineSourceRecord = {
  tier: BaselineSourceTier;
  confidence: BaselineConfidence;
  sourceType: BaselineSourceType;
  sourceRef: string;
  extractedAt: string;
  notes?: string;
};

export type BaselineValueCandidate = {
  valueUsd: number;
  source: BaselineSourceRecord;
};

export type MergedBaselineValue = {
  /** Commercial opening / comparison max (Tiers 2–5). */
  commercialMaxUsd: number | null;
  commercialSource: BaselineSourceRecord | null;
  /** Live book comparison slot (Tier 3 preferred). */
  liveComparisonMaxUsd: number | null;
  liveComparisonSource: BaselineSourceRecord | null;
  /** Hard compliance ceiling (Tier 1). */
  complianceMaxUsd: number | null;
  complianceSource: BaselineSourceRecord | null;
};

const TIER_CONFIDENCE: Record<BaselineSourceTier, BaselineConfidence> = {
  1: 'highest',
  2: 'high',
  3: 'very_high',
  4: 'medium',
  5: 'high',
};

const TIER_SOURCE_TYPE: Record<BaselineSourceTier, BaselineSourceType> = {
  1: 'regulatory',
  2: 'published_policy',
  3: 'partner_api',
  4: 'public_scrape',
  5: 'ops_override',
};

/** Default confidence / sourceType for a tier. */
export function defaultsForBaselineTier(tier: BaselineSourceTier): {
  confidence: BaselineConfidence;
  sourceType: BaselineSourceType;
} {
  return { confidence: TIER_CONFIDENCE[tier], sourceType: TIER_SOURCE_TYPE[tier] };
}

export function makeBaselineSource(
  tier: BaselineSourceTier,
  sourceRef: string,
  opts?: { extractedAt?: string; notes?: string; confidence?: BaselineConfidence }
): BaselineSourceRecord {
  const defaults = defaultsForBaselineTier(tier);
  return {
    tier,
    confidence: opts?.confidence ?? defaults.confidence,
    sourceType: defaults.sourceType,
    sourceRef,
    extractedAt: opts?.extractedAt ?? new Date(0).toISOString(),
    ...(opts?.notes ? { notes: opts.notes } : {}),
  };
}

function pickByTierOrder(
  candidates: readonly BaselineValueCandidate[],
  order: readonly BaselineSourceTier[]
): BaselineValueCandidate | null {
  for (const tier of order) {
    const hit = candidates.find(c => c.source.tier === tier);
    if (hit) return hit;
  }
  return null;
}

/**
 * Merge candidates for one logical cell.
 *
 * - Compliance: Tier 1 wins (hard threshold).
 * - Live comparison: Tier 3 over 2/4/5.
 * - Commercial baseline display: Tier 5 > Tier 2 > Tier 4 (Tier 1 is ceiling only).
 */
export function mergeBaselineValues(
  candidates: readonly BaselineValueCandidate[]
): MergedBaselineValue {
  const compliance = pickByTierOrder(candidates, [1]);
  const live = pickByTierOrder(candidates, [3, 2, 5, 4]);
  const commercial = pickByTierOrder(candidates, [5, 2, 4]);

  return {
    commercialMaxUsd: commercial?.valueUsd ?? null,
    commercialSource: commercial?.source ?? null,
    liveComparisonMaxUsd: live?.valueUsd ?? null,
    liveComparisonSource: live?.source ?? null,
    complianceMaxUsd: compliance?.valueUsd ?? null,
    complianceSource: compliance?.source ?? null,
  };
}

export function baselineTierLabel(tier: BaselineSourceTier): string {
  switch (tier) {
    case 1:
      return 'T1 regulatory';
    case 2:
      return 'T2 policy';
    case 3:
      return 'T3 partner API';
    case 4:
      return 'T4 scrape';
    case 5:
      return 'T5 ops';
  }
}

export function baselineSourceTiersGlossaryConcepts() {
  return [
    {
      id: 'ops.limits.baseline_tier',
      label: 'Baseline source tier',
      description:
        'Provenance tier for opening-limit baselines: 1 regulatory, 2 published policy, 3 partner API, 4 public scrape, 5 ops override.',
      category: 'trading' as const,
      kind: 'baseline' as const,
      synonyms: ['source tier', 'baseline confidence', 'limit provenance'],
      values: ['1', '2', '3', '4', '5'],
      seeAlso: ['ops.limits.opening_baseline', 'ops.limits.effective_limit'],
      status: 'active' as const,
      source: 'lib/operations/baseline-source-tiers.ts',
      semanticType: 'classification' as const,
      uiRole: 'chip' as const,
      unit: null,
      format: null,
    },
  ];
}
