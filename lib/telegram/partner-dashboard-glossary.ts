/**
 * Partner dashboard MVP glossary leaves — closes design-plan concept gaps.
 *
 * Baked into public/registry/domain-glossary.json via tools/domain-glossary.ts.
 * Business domains must match partner-dashboard-mvp.toml gap/binding domains
 * (via explicit `domain` or inferDomain prefix).
 *
 * @see docs/design/partner-dashboard-mvp.toml [[concepts.gap]] (retired when empty)
 * @see packages/partners/src/dashboard-plan.ts PARTNER_DASHBOARD_SEMANTIC_GAPS
 */

const SOURCE = 'lib/telegram/partner-dashboard-glossary.ts';

export type PartnerDashboardGlossaryConcept = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string;
  category: 'pipeline' | 'trading' | 'warehouse' | 'ui' | 'ops';
  kind: 'evidence' | 'registry' | 'composite' | 'ui';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: typeof SOURCE;
  semanticType: 'classification' | 'resource' | 'state';
  uiRole: 'badge' | 'chip' | 'code' | 'heading' | 'link' | 'token';
  /** Business domain override when id prefix is ambiguous. */
  domain?:
    | 'partners'
    | 'accounting'
    | 'trading'
    | 'operations'
    | 'portal'
    | 'telegram'
    | 'compliance';
};

function c(
  id: string, // brand-ok
  label: string,
  description: string,
  opts: Partial<
    Omit<PartnerDashboardGlossaryConcept, 'id' | 'label' | 'description' | 'status' | 'source'>
  > = {}
): PartnerDashboardGlossaryConcept {
  return {
    id,
    label,
    description,
    category: opts.category ?? 'ops',
    kind: opts.kind ?? 'composite',
    synonyms: opts.synonyms ?? [],
    values: opts.values ?? null,
    seeAlso: opts.seeAlso ?? ['page.partners'],
    status: 'active',
    source: SOURCE,
    semanticType: opts.semanticType ?? 'classification',
    uiRole: opts.uiRole ?? 'chip',
    ...(opts.domain ? { domain: opts.domain } : {}),
  };
}

/** Fifteen concepts that previously lived only as plan gaps. */
export function partnerDashboardGlossaryConcepts(): PartnerDashboardGlossaryConcept[] {
  return [
    c(
      'partner.lifecycle_state',
      'Partner lifecycle state',
      'Canonical partner relationship lifecycle (active, onboarding, suspended, …) with provenance — not ops.limits.lifecycle_state.',
      {
        domain: 'partners',
        category: 'pipeline',
        semanticType: 'state',
        uiRole: 'badge',
        values: ['prospect', 'onboarding', 'active', 'paused', 'suspended', 'offboarded'],
        seeAlso: ['partner.lifecycle_provenance', 'partner.phase.operator_ready'],
      }
    ),
    c(
      'accounting.funding_status',
      'Out funding status',
      'Account funding completeness for an out: unknown, unfunded, partial, or funded. Distinct from operational out readiness.',
      {
        domain: 'accounting',
        category: 'pipeline',
        semanticType: 'state',
        uiRole: 'badge',
        values: ['unknown', 'unfunded', 'partial', 'funded'],
        seeAlso: ['out.status.funded', 'out.status.partial', 'accounting.deposit'],
      }
    ),
    c(
      'partner.profile',
      'Partner profile',
      'Canonical partner identity document (CODE, call sign, lifecycle, policy) — not an account-limit profile.',
      {
        domain: 'partners',
        category: 'registry',
        semanticType: 'resource',
        uiRole: 'heading',
        seeAlso: ['partner.lifecycle_state', 'section.partnersProfile', 'page.partners'],
      }
    ),
    c(
      'partner.lifecycle_provenance',
      'Lifecycle provenance',
      'Queryable source system, original value, adapter, confidence, and effective time for a lifecycle state fact.',
      {
        domain: 'partners',
        category: 'pipeline',
        semanticType: 'classification',
        uiRole: 'code',
        seeAlso: ['partner.lifecycle_state', 'ui.semantic.source'],
      }
    ),
    c(
      'provider.connection_status',
      'Provider connection status',
      'Provider connectivity for an out (unknown, active, inactive, pending) — distinct from operational readiness and funding.',
      {
        domain: 'trading',
        category: 'pipeline',
        semanticType: 'state',
        uiRole: 'badge',
        values: ['unknown', 'active', 'inactive', 'pending'],
        seeAlso: ['out.status.ready', 'partner.lifecycle_state'],
      }
    ),
    c(
      'connector.data_status',
      'Connector data status',
      'Connector freshness disposition: ok, stale, or unavailable (includes last-known-good windows).',
      {
        domain: 'operations',
        category: 'ops',
        semanticType: 'state',
        uiRole: 'badge',
        values: ['ok', 'stale', 'unavailable'],
        seeAlso: ['ui.semantic.status', 'ui.semantic.source'],
      }
    ),
    c(
      'accounting.scoped_balance',
      'Scoped balance position',
      'Partner balance position with structured AccountScope, integer minor-unit MoneyAmount, and effective time.',
      {
        domain: 'accounting',
        category: 'pipeline',
        semanticType: 'resource',
        uiRole: 'code',
        seeAlso: ['accounting.deposit', 'account.scope.global', 'section.partnersAccounting'],
      }
    ),
    c(
      'partner.source_conflict',
      'Partner source conflict',
      'Cross-adapter disagreement on a partner field path with redacted forensic scalars — not a generic UI status.',
      {
        domain: 'partners',
        category: 'pipeline',
        semanticType: 'classification',
        uiRole: 'badge',
        seeAlso: ['partner.attention_item', 'ui.semantic.source'],
      }
    ),
    c(
      'partner.attention_item',
      'Partner attention item',
      'Deterministic operator action row (reason code, severity, label, optional command/href).',
      {
        domain: 'partners',
        category: 'ops',
        semanticType: 'classification',
        uiRole: 'chip',
        seeAlso: ['section.partnersAttention', 'ops.limits.monitoring_status'],
      }
    ),
    c(
      'ui.filter.partnerCode',
      'Partner CODE filter',
      'UI filter keyed by PartnerCode (not partnerId wire alias). Migrates ui.filter.partnerId meaning without renaming core wire fields.',
      {
        domain: 'portal',
        category: 'ui',
        kind: 'ui',
        semanticType: 'classification',
        uiRole: 'chip',
        seeAlso: ['ui.filter.partnerId', 'page.partners'],
      }
    ),
    c(
      'section.partnersSummary',
      'Partners summary region',
      'Composite partner summary strip (counts, readiness, attention) on /portal/partners/.',
      {
        domain: 'portal',
        category: 'ui',
        kind: 'ui',
        semanticType: 'resource',
        uiRole: 'heading',
        seeAlso: ['page.partners', 'section.partnersRoster'],
      }
    ),
    c(
      'section.partnersRoster',
      'Partners roster region',
      'Cross-domain partner roster table (identity, phase, communication, balances).',
      {
        domain: 'portal',
        category: 'ui',
        kind: 'ui',
        semanticType: 'resource',
        uiRole: 'heading',
        seeAlso: ['page.partners', 'section.partnersSummary'],
      }
    ),
    c(
      'section.partnersProfile',
      'Partners profile region',
      'Per-partner profile and lifecycle panel — broader than onboard or account-limit profile sections.',
      {
        domain: 'portal',
        category: 'ui',
        kind: 'ui',
        semanticType: 'resource',
        uiRole: 'heading',
        seeAlso: ['partner.profile', 'section.partnersOnboard', 'page.partners'],
      }
    ),
    c(
      'section.partnersAttention',
      'Partners attention region',
      'Operator attention queue combining identity, accounting, Telegram, limits, and adapter issues.',
      {
        domain: 'portal',
        category: 'ui',
        kind: 'ui',
        semanticType: 'resource',
        uiRole: 'heading',
        seeAlso: ['partner.attention_item', 'page.partners'],
      }
    ),
    c(
      'section.partnersIntegrations',
      'Partners integrations region',
      'Integration freshness for Tennis, Sports Terminal, and other connectors — broader than compliance data-connection audit.',
      {
        domain: 'portal',
        category: 'ui',
        kind: 'ui',
        semanticType: 'resource',
        uiRole: 'heading',
        seeAlso: ['connector.data_status', 'page.partners'],
      }
    ),
  ];
}
