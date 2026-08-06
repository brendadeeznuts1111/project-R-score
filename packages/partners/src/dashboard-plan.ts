/**
 * Typed partner-dashboard planning contract.
 *
 * Business meaning remains in the portal concept registry. This package owns
 * the target package identity and the exact set of unresolved semantic terms
 * declared by docs/design/partner-dashboard-mvp.toml.
 */

export const PARTNERS_PACKAGE_TARGET = {
  target_name: '@factorywager/partners',
  target_workspace: 'packages/partners',
  implementation_status: 'scaffolded',
} as const;

export const PARTNER_DASHBOARD_SEMANTIC_GAPS = [
  {
    key: 'partner.lifecycle_state',
    candidate_concept_id: 'partner.lifecycle_state',
    business_domain: 'partners',
  },
  {
    key: 'out.funding_status',
    candidate_concept_id: 'accounting.funding_status',
    business_domain: 'accounting',
  },
  {
    key: 'partner.profile',
    candidate_concept_id: 'partner.profile',
    business_domain: 'partners',
  },
  {
    key: 'partner.lifecycle_provenance',
    candidate_concept_id: 'partner.lifecycle_provenance',
    business_domain: 'partners',
  },
  {
    key: 'provider.connection_status',
    candidate_concept_id: 'provider.connection_status',
    business_domain: 'trading',
  },
  {
    key: 'connector.data_status',
    candidate_concept_id: 'connector.data_status',
    business_domain: 'operations',
  },
  {
    key: 'accounting.scoped_balance',
    candidate_concept_id: 'accounting.scoped_balance',
    business_domain: 'accounting',
  },
  {
    key: 'partner.source_conflict',
    candidate_concept_id: 'partner.source_conflict',
    business_domain: 'partners',
  },
  {
    key: 'partner.attention_item',
    candidate_concept_id: 'partner.attention_item',
    business_domain: 'partners',
  },
  {
    key: 'ui.filter.partner_code',
    candidate_concept_id: 'ui.filter.partnerCode',
    business_domain: 'portal',
  },
  {
    key: 'section.summary',
    candidate_concept_id: 'section.partnersSummary',
    business_domain: 'portal',
  },
  {
    key: 'section.roster',
    candidate_concept_id: 'section.partnersRoster',
    business_domain: 'portal',
  },
  {
    key: 'section.profile',
    candidate_concept_id: 'section.partnersProfile',
    business_domain: 'portal',
  },
  {
    key: 'section.attention',
    candidate_concept_id: 'section.partnersAttention',
    business_domain: 'portal',
  },
  {
    key: 'section.integrations',
    candidate_concept_id: 'section.partnersIntegrations',
    business_domain: 'portal',
  },
] as const;

export type PartnerDashboardConceptGap = (typeof PARTNER_DASHBOARD_SEMANTIC_GAPS)[number];
export type PartnerDashboardConceptGapId = PartnerDashboardConceptGap['candidate_concept_id'];

/** Bun.TOML.parse-compatible top-level shape for the planning artifact. */
export type PartnerDashboardPlanToml = {
  readonly plan: {
    readonly schema: 'factorywager.partner-dashboard-plan.v2';
    readonly status: 'proposal' | 'implementation-ready';
    readonly last_reviewed: string;
    readonly owner: '@factorywager/partners';
  };
  readonly package: typeof PARTNERS_PACKAGE_TARGET;
  readonly concepts: {
    readonly gap: readonly PartnerDashboardConceptGap[];
    readonly binding: readonly Record<string, unknown>[];
  };
  readonly [section: string]: unknown;
};
