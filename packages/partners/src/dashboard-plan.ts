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
  implementation_status: 'artifact-core-implemented',
} as const;

/**
 * Exact v1 dashboard paths that each connector may author after reconciliation.
 *
 * `provides` in the TOML describes adapter capabilities. This map is narrower:
 * every value must be a real field accepted by PartnerDashboardArtifact v1.
 * Derived summary fields and connectorSnapshots are owned by the assembler, not
 * by an individual source connector.
 */
export const PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS = {
  'canonical-profile-config': [
    'partners[].partnerCode',
    'partners[].callSign',
    'partners[].lifecycle',
    'partners[].identity',
    'partners[].outs[].outId',
    'partners[].outs[].externalAccountRefs',
  ],
  'accounting-ledger': [
    'partners[].accounting.balancePositions',
    'partners[].accounting.recentEntries',
    'partners[].outs[].fundingStatus',
  ],
  'telegram-handshake': ['partners[].communication.handshakeStatus'],
  'limits-registry': [],
  'bookmakers-registry': ['partners[].outs[].sportsbookId'],
  'tennis-contract': [
    'activeOutIds',
    'partners[].outs[].maxBet',
    'partners[].outs[].operationalStatus',
    'partners[].integrations.tennis',
  ],
  'sports-terminal': [],
} as const;

export const PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS = {
  profiles: 'config/partner-profiles/*.toml',
  accounting: 'partner_ledger',
  telegram: '/registry/telegram-handshake.json',
  limits: '/registry/limit-raises.json',
  bookmakers: '/registry/bookmakers.json',
  tennis: '/registry/tennis/partner-contracts.json',
  sportsTerminal: '',
} as const;

export const PARTNER_DASHBOARD_REQUIRED_CONNECTOR_KEYS = ['profiles'] as const;

export type PartnerDashboardConnectorId =
  keyof typeof PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS;
export type PartnerDashboardAuthoritativeFactPath =
  (typeof PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS)[PartnerDashboardConnectorId][number];

/**
 * Unregistered concept gaps for the partner dashboard plan.
 * Empty when every candidate leaf is active in the domain glossary
 * (`lib/telegram/partner-dashboard-glossary.ts` + `bun run glossary:portal`).
 */
export const PARTNER_DASHBOARD_SEMANTIC_GAPS: readonly {
  readonly key: string;
  readonly candidate_concept_id: string;
  readonly business_domain: string;
}[] = [];

export type PartnerDashboardConceptGap = (typeof PARTNER_DASHBOARD_SEMANTIC_GAPS)[number];
export type PartnerDashboardConceptGapId = string;

/** Bun.TOML.parse-compatible top-level shape for the planning artifact. */
export type PartnerDashboardPlanToml = {
  readonly plan: {
    readonly schema: 'factorywager.partner-dashboard-plan.v2';
    readonly status: 'proposal' | 'implementation-ready';
    readonly last_reviewed: string;
    readonly owner: '@factorywager/partners';
  };
  readonly package: typeof PARTNERS_PACKAGE_TARGET;
  readonly documentation: {
    readonly inventory_row_id: 'doc.partner-dashboard-mvp';
    readonly ref_id: '0.1.partner-dashboard-mvp';
    readonly markdown_path: 'docs/design/partner-dashboard-mvp.md';
    readonly concept_domains: readonly string[];
    readonly chrome_domains: readonly string[];
    readonly primary_portal_href: '/portal/partners/';
  };
  readonly concepts: {
    readonly gap: readonly PartnerDashboardConceptGap[];
    readonly binding: readonly Record<string, unknown>[];
  };
  readonly [section: string]: unknown;
};
