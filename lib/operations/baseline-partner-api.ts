// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Tier 3 partner API live limits — provenance sync.
 *
 * When partner API credentials / endpoints are not configured, bake records
 * explicit `unavailable` provenance (not a silent stub). Real pulls land here
 * later without changing merge win-order in baseline-source-tiers.
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/operations/baseline-source-tiers.ts
 */

import type { BaselineValueCandidate } from './baseline-source-tiers.ts';
import { makeBaselineSource } from './baseline-source-tiers.ts';

export type PartnerApiTierStatus = 'live' | 'unavailable' | 'error';

export type PartnerApiTierProvenance = {
  tier: 3;
  label: 'partner_api';
  wired: true;
  status: PartnerApiTierStatus;
  count: number;
  checkedAt: string;
  notes: string;
  /** Present when live candidates were pulled. */
  candidates: BaselineValueCandidate[];
};

function partnerApiConfigured(): boolean {
  // Explicit env gates — do not invent a silent pull against unknown hosts.
  const endpoint = Bun.env.PARTNER_LIMITS_API_URL?.trim();
  const token = Bun.env.PARTNER_LIMITS_API_TOKEN?.trim();
  return Boolean(endpoint && token);
}

/**
 * Sync Tier 3 partner API limits.
 * Returns live candidates when configured; otherwise unavailable provenance
 * with zero candidates (merge treats Tier 3 as absent).
 */
export function syncPartnerApiLimits(opts?: { now?: Date }): PartnerApiTierProvenance {
  const checkedAt = (opts?.now ?? new Date()).toISOString();
  if (!partnerApiConfigured()) {
    return {
      tier: 3,
      label: 'partner_api',
      wired: true,
      status: 'unavailable',
      count: 0,
      checkedAt,
      notes:
        'No PARTNER_LIMITS_API_URL + PARTNER_LIMITS_API_TOKEN — Tier 3 live comparison unavailable (explicit provenance, not stub).',
      candidates: [],
    };
  }

  // Credentials present but pull path not yet implemented — fail closed with
  // explicit error provenance rather than claiming live values.
  return {
    tier: 3,
    label: 'partner_api',
    wired: true,
    status: 'error',
    count: 0,
    checkedAt,
    notes:
      'Partner limits API credentials present but syncPartnerApiLimits pull is not implemented yet.',
    candidates: [],
  };
}

/** Build a Tier 3 candidate when a real pull returns a value (future use / tests). */
export function makePartnerApiCandidate(
  valueUsd: number,
  sourceRef: string,
  opts?: { extractedAt?: string; notes?: string }
): BaselineValueCandidate {
  return {
    valueUsd,
    source: makeBaselineSource(3, sourceRef, {
      extractedAt: opts?.extractedAt,
      notes: opts?.notes,
    }),
  };
}

export function partnerApiTierArtifactSlice(
  provenance: PartnerApiTierProvenance = syncPartnerApiLimits()
): {
  count: number;
  label: 'partner_api';
  wired: true;
  status: PartnerApiTierStatus;
  notes: string;
  checkedAt: string;
} {
  return {
    count: provenance.count,
    label: provenance.label,
    wired: true,
    status: provenance.status,
    notes: provenance.notes,
    checkedAt: provenance.checkedAt,
  };
}
