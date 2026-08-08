/**
 * Business domain mapping for portal / glossary concepts.
 *
 * Distinct from vocabulary **namespace** (first id segment: api · ops · page ·
 * section · ui). `domain` answers "which product lane owns this concept?".
 *
 * @see lib/portal/semantic-vocabulary.ts — PortalSemanticConceptDef.domain
 * @see scripts/concept-domain-backfill.ts
 */

export const CONCEPT_DOMAINS = [
  'accounting',
  'trading',
  'compliance',
  'partners',
  'telegram',
  'portal',
  'registry',
  'operations',
  'analytics',
  'infrastructure',
  'data',
  'research',
  'marketdata',
  'warehouse',
  'tbd',
] as const;

export type ConceptDomain = (typeof CONCEPT_DOMAINS)[number];

export type ConceptDomainMeta = {
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
};

export const DOMAIN_METADATA = {
  accounting: {
    label: 'Accounting',
    emoji: '💰',
    description: 'Ledger, settlements, P&L, deposits/withdrawals',
  },
  trading: {
    label: 'Trading',
    emoji: '📈',
    description: 'Bet execution, order management, pricing',
  },
  compliance: {
    label: 'Compliance',
    emoji: '⚖️',
    description: 'Jurisdiction policies, KYC, limits, AML',
  },
  partners: {
    label: 'Partners',
    emoji: '🤝',
    description: 'Partner onboarding, profiles, outs, seat desks',
  },
  telegram: {
    label: 'Telegram',
    emoji: '✈️',
    description: 'Notifications, bots, forum topics, handshake',
  },
  portal: {
    label: 'Portal',
    emoji: '🌐',
    description: 'UI chrome, navigation, surfaces',
  },
  registry: {
    label: 'Registry',
    emoji: '📦',
    description: 'Artifact registry, packages, proofs',
  },
  operations: {
    label: 'Operations',
    emoji: '🔧',
    description: 'Ops tooling, CI, governance, monitoring',
  },
  analytics: {
    label: 'Analytics',
    emoji: '📊',
    description: 'Metrics, reporting, dashboards',
  },
  infrastructure: {
    label: 'Infrastructure',
    emoji: '🏗️',
    description: 'Deployment, networking, security',
  },
  data: {
    label: 'Data',
    emoji: '🗄️',
    description: 'Data pipelines, warehouses, schemas',
  },
  research: {
    label: 'Research',
    emoji: '🔬',
    description: 'Model training, signals, edge calculations',
  },
  marketdata: {
    label: 'Market Data',
    emoji: '📉',
    description: 'Live odds, price feeds, venue data',
  },
  warehouse: {
    label: 'Warehouse',
    emoji: '🏛️',
    description: 'Archival, snapshots, historical data',
  },
  tbd: {
    label: 'TBD',
    emoji: '❓',
    description: 'Unknown / to be determined',
  },
} as const satisfies Record<ConceptDomain, ConceptDomainMeta>;

/**
 * Prefix → business domain. Longer / more specific prefixes win
 * (`ops.limits.` before `ops.`).
 */
export const DOMAIN_BY_PREFIX: ReadonlyArray<readonly [string, ConceptDomain]> = [
  ['accounting.', 'accounting'],
  ['deposit.', 'accounting'],
  ['ops.limits.', 'compliance'],
  ['limit.', 'compliance'],
  ['jurisdiction.', 'compliance'],
  ['policy.', 'compliance'],
  ['rule.', 'compliance'],
  ['partner.', 'partners'],
  ['out.', 'partners'],
  ['telegram.', 'telegram'],
  ['page.', 'portal'],
  ['section.', 'portal'],
  ['ui.', 'portal'],
  ['action.', 'portal'],
  ['api.', 'infrastructure'],
  ['ops.', 'operations'],
  ['alert.', 'operations'],
  ['command.', 'operations'],
  ['state.', 'operations'],
  ['connector.', 'operations'],
  ['provider.', 'trading'],
  ['sport.', 'trading'],
  ['book.', 'trading'],
  ['region.', 'trading'],
  ['country.', 'trading'],
  ['league.', 'trading'],
  ['competition.', 'trading'],
  ['multi.', 'trading'],
  ['market.', 'marketdata'],
  ['cross_market.', 'marketdata'],
  ['scrape.', 'data'],
  ['event.', 'warehouse'],
  ['evidence.', 'warehouse'],
  ['metric.', 'analytics'],
  ['kpi.', 'analytics'],
  ['model.', 'research'],
  ['composite.', 'research'],
];

const CONCEPT_DOMAIN_SET = new Set<string>(CONCEPT_DOMAINS);

export function isConceptDomain(value: string): value is ConceptDomain {
  return CONCEPT_DOMAIN_SET.has(value);
}

/** Infer business domain from concept id prefix (longest match wins). */
export function inferDomain(conceptId: string): ConceptDomain {
  // brand-ok — opaque glossary concept key
  let best: ConceptDomain | undefined;
  let bestLen = -1;
  for (const [prefix, domain] of DOMAIN_BY_PREFIX) {
    if (conceptId.startsWith(prefix) && prefix.length > bestLen) {
      best = domain;
      bestLen = prefix.length;
    }
  }
  return best ?? 'tbd';
}

export function domainLabel(domain: ConceptDomain): string {
  return DOMAIN_METADATA[domain].label;
}
