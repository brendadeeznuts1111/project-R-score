// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
/**
 * Portal semantic vocabulary.
 *
 * Domain concepts remain owned by Kalshi-bot/src/institutions/glossary.ts.
 * This module owns cross-portal UI field semantics so labels, roles, and
 * operational values do not drift between boards.
 *
 * `PORTAL_SEMANTIC_CONCEPTS` is the SSOT; keys are derived — never edit a
 * parallel key list.
 */

import type { ConceptDomain } from './concept-domains.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from './page-concepts.ts';

export type { ConceptDomain } from './concept-domains.ts';
export {
  CONCEPT_DOMAINS,
  DOMAIN_BY_PREFIX,
  DOMAIN_METADATA,
  domainLabel,
  inferDomain,
  isConceptDomain,
} from './concept-domains.ts';

export const PORTAL_SEMANTIC_TYPES = [
  'classification',
  'location',
  'presentation',
  'resource',
  'state',
  'version',
] as const;

export type PortalSemanticType = (typeof PORTAL_SEMANTIC_TYPES)[number];

export const PORTAL_UI_ROLES = ['badge', 'chip', 'code', 'heading', 'link', 'token'] as const;

export type PortalUiRole = (typeof PORTAL_UI_ROLES)[number];

/**
 * Vocabulary namespace — first dotted segment of the concept id
 * (api · ops · page · section · ui). Distinct from business {@link ConceptDomain}.
 */
export const PORTAL_SEMANTIC_NAMESPACES = ['api', 'ops', 'page', 'section', 'ui'] as const;

export type PortalSemanticNamespace = (typeof PORTAL_SEMANTIC_NAMESPACES)[number];

/** @deprecated Use {@link PortalSemanticNamespace} */
export type PortalSemanticDomain = PortalSemanticNamespace;
/** @deprecated Use {@link PORTAL_SEMANTIC_NAMESPACES} */
export const PORTAL_SEMANTIC_DOMAINS = PORTAL_SEMANTIC_NAMESPACES;

const PORTAL_SEMANTIC_NAMESPACE_SET = new Set<string>(PORTAL_SEMANTIC_NAMESPACES);

/** Infer namespace from concept id (`ops.metric.raises` → `ops`). */
export function inferPortalSemanticNamespace(id: string): PortalSemanticNamespace | undefined {
  // brand-ok — opaque glossary concept key
  const head = id.split('.')[0] ?? '';
  return PORTAL_SEMANTIC_NAMESPACE_SET.has(head) ? (head as PortalSemanticNamespace) : undefined;
}

/** @deprecated Use {@link inferPortalSemanticNamespace} */
export const inferPortalSemanticDomain = inferPortalSemanticNamespace;

export function isPortalSemanticNamespace(value: string): value is PortalSemanticNamespace {
  return PORTAL_SEMANTIC_NAMESPACE_SET.has(value);
}

/** @deprecated Use {@link isPortalSemanticNamespace} */
export const isPortalSemanticDomain = isPortalSemanticNamespace;

/**
 * Shape of a portal semantic concept. Optional provenance fields support
 * concept tracking (`bun run concept:inventory`, `validate:concept-metadata`).
 */
export type PortalSemanticConceptDef = {
  readonly id: string; // brand-ok — glossary concept key (PortalSemanticConceptKey after bake)
  readonly label: string;
  readonly description: string;
  readonly semanticType: PortalSemanticType;
  readonly uiRole: PortalUiRole;
  /** Vocabulary namespace (first id segment): api · ops · page · section · ui. */
  readonly namespace: PortalSemanticNamespace;
  /** Business domain lane — see lib/portal/concept-domains.ts. */
  readonly domain: ConceptDomain;
  readonly synonyms: readonly string[];
  readonly seeAlso: readonly string[];
  /** Upstream concept ids this metric/state is derived from (inventory; wire may echo). */
  readonly derivesFrom?: readonly string[];
  readonly values?: readonly string[];
  readonly unit?: string;
  readonly format?: string;
  /** Work item that introduced/changed this concept (e.g. PR#228, ticket-123). */
  readonly correlationId?: string; // brand-ok — provenance work-item ref, not CorrelationId UUID
  /** ISO date (YYYY-MM-DD) when the concept was added or last materially changed. */
  readonly addedAt?: string;
  /** Concept lifecycle status (default: active). */
  readonly status?: 'active' | 'deprecated' | 'archived';
  /** Concept that supersedes this one when deprecated. */
  readonly replacedBy?: string;
  /** ISO date when deprecated/archived. */
  readonly deprecatedAt?: string;
};

/** Portal concept lifecycle statuses — default when absent is `active`. */
export const PORTAL_CONCEPT_STATUSES = ['active', 'deprecated', 'archived'] as const;

export type PortalConceptStatus = (typeof PORTAL_CONCEPT_STATUSES)[number];

/** Lifecycle status of a concept; missing `status` means `active`. */
export function conceptStatusOf(concept: {
  readonly status?: PortalConceptStatus;
}): PortalConceptStatus {
  return concept.status ?? 'active';
}

/**
 * Portal UI semantic inventory — single source of truth.
 * Keys and {@link PortalSemanticConceptKey} are derived from this array.
 */
export const PORTAL_SEMANTIC_CONCEPTS = [
  ...PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => ({
    id: page.id,
    label: page.label,
    description: page.description,
    semanticType: 'resource' as const,
    uiRole: 'heading' as const,
    namespace: 'page' as const,
    domain: 'portal' as const,
    synonyms: page.synonyms,
    seeAlso: ('seeAlso' in page && Array.isArray(page.seeAlso)
      ? page.seeAlso
      : [
          'ui.semantic.surface',
          'ui.semantic.resources',
          'ui.semantic.artifact',
        ]) as readonly string[],
    correlationId: 'legacy' as const,
    addedAt: '2026-01-01' as const,
  })),
  {
    id: 'ui.semantic.surface',
    namespace: 'ui',
    domain: 'portal',
    label: 'Surface',
    description: 'Named portal, endpoint, board, or artifact being described or checked.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['target', 'endpoint', 'board'],
    seeAlso: ['ui.semantic.source', 'ui.semantic.resources'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.hostname',
    namespace: 'ui',
    domain: 'portal',
    label: 'Hostname',
    description:
      'Network host resolved from a surface URL, without its protocol, port, path, or query.',
    semanticType: 'location',
    uiRole: 'code',
    synonyms: ['host', 'domain'],
    seeAlso: ['ui.semantic.port', 'ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.port',
    namespace: 'ui',
    domain: 'portal',
    label: 'Port',
    description:
      'Network port resolved from a surface URL, using the protocol default when no port is explicit.',
    semanticType: 'location',
    uiRole: 'code',
    synonyms: ['service port'],
    seeAlso: ['ui.semantic.hostname', 'ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.status',
    namespace: 'ui',
    domain: 'portal',
    label: 'Status',
    description:
      'Observed operational outcome reported by a source; status is evidence and does not encode presentation color.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['result', 'health state', 'outcome'],
    values: ['ok', 'active', 'monitored', 'attention', 'blocked', 'fail', 'unavailable', 'pending'],
    seeAlso: ['ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.tone',
    namespace: 'ui',
    domain: 'portal',
    label: 'Tone',
    description:
      'Deprecated: use ui.semantic.status. Former presentation token derived from status and evidence; tone controlled color without replacing status.',
    semanticType: 'presentation',
    uiRole: 'token',
    synonyms: ['color tone', 'severity color'],
    values: ['ok', 'warn', 'bad', 'info', 'skip'],
    seeAlso: ['ui.semantic.status'],
    correlationId: 'PR#248',
    addedAt: '2026-01-01',
    status: 'deprecated',
    replacedBy: 'ui.semantic.status',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ui.semantic.kind',
    namespace: 'ui',
    domain: 'portal',
    label: 'Kind',
    description:
      'Operational classification of a surface or check; distinct from the glossary concept kind used for provenance.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['check kind', 'probe class', 'operational kind'],
    values: ['edge-health', 'registry-bake', 'proof', 'board', 'inventory', 'ops-rollup', 'doctor'],
    seeAlso: ['ui.semantic.plane'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.plane',
    namespace: 'ui',
    domain: 'portal',
    label: 'Plane',
    description:
      'Control-plane ownership boundary responsible for producing or operating a surface.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['control plane', 'owner plane'],
    values: ['edge', 'public', 'document', 'operate', 'harness', 'infra'],
    seeAlso: ['ui.semantic.kind', 'ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.source',
    namespace: 'ui',
    domain: 'portal',
    label: 'Source',
    description: 'Canonical path or location from which the displayed evidence was read.',
    semanticType: 'location',
    uiRole: 'link',
    synonyms: ['source path', 'origin path'],
    seeAlso: ['ui.semantic.hostname', 'ui.semantic.port', 'ui.semantic.artifact'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.version',
    namespace: 'ui',
    domain: 'portal',
    label: 'Version',
    description:
      'Declared schema, runtime, proof, or artifact revision attached to the displayed evidence.',
    semanticType: 'version',
    uiRole: 'badge',
    synonyms: ['schema version', 'revision', 'runtime version'],
    seeAlso: ['ui.semantic.artifact'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.resources',
    namespace: 'ui',
    domain: 'portal',
    label: 'Resources',
    description:
      'Governed links that connect a surface to its artifact, package owner, and human documentation.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['mappings', 'references', 'ownership links'],
    seeAlso: ['ui.semantic.artifact', 'ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.artifact',
    namespace: 'ui',
    domain: 'portal',
    label: 'Artifact',
    description: 'Produced evidence consumed, maintained, delivered, or verified by the portal.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['bake', 'proof', 'output'],
    seeAlso: ['ui.semantic.version', 'ui.semantic.resources'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.package',
    namespace: 'ui',
    domain: 'portal',
    label: 'Package',
    description:
      'Deprecated: use ui.semantic.artifact. Former owning or producing package mapped to a portal surface or artifact.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['package owner', 'producer'],
    seeAlso: ['ui.semantic.artifact'],
    correlationId: 'PR#248',
    addedAt: '2026-01-01',
    status: 'deprecated',
    replacedBy: 'ui.semantic.artifact',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ui.semantic.type',
    namespace: 'ui',
    domain: 'portal',
    label: 'Semantic type',
    description:
      'Deprecated; use the semanticType field or PORTAL_SEMANTIC_TYPES enum directly. Former stable data role of a concept; distinct from operational kind and from its visual UI role.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['data role', 'semantic role', 'type'],
    values: [...PORTAL_SEMANTIC_TYPES],
    seeAlso: [],
    correlationId: 'PR#248',
    addedAt: '2026-01-01',
    status: 'deprecated',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.limits.account',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit account',
    description:
      'Partner-tree account whose observed sportsbook limits, jurisdiction binding, and monitoring evidence are evaluated together. Same subject as ops.limits.node (UI says account; wire says node_id).',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner account', 'tree node', 'limit subject', 'node'],
    seeAlso: [
      'ops.limits.node',
      'ops.limits.role_type',
      'ops.limits.profile',
      'ops.limits.evidence_trace',
      'ops.limits.lifecycle_state',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.node',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Tree node',
    description:
      'One row in tree_nodes identified by TreeNodeId / node_id. Synonym for limit account; not an AI agent and not the Agent API.',
    semanticType: 'resource',
    uiRole: 'code',
    synonyms: ['node_id', 'TreeNodeId', 'tree_nodes row', 'account'],
    seeAlso: ['ops.limits.account', 'ops.limits.tree', 'ops.limits.role_type', 'ops.limits.agent'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.tree',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Partner tree',
    description:
      'Full hierarchy of partner accounts (partner → agent → sub_agent) used for limit, license, and downline context.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner hierarchy', 'account tree', 'tree_nodes'],
    seeAlso: [
      'ops.limits.node',
      'ops.limits.downline',
      'ops.limits.role_type',
      'section.downlineContext',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.downline',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Downline',
    description:
      'Descendant accounts under a partner in the partner tree (agents and sub-agents), excluding the partner root itself.',
    semanticType: 'resource',
    uiRole: 'chip',
    synonyms: ['downline nodes', 'downstream accounts', 'child accounts'],
    seeAlso: [
      'ops.limits.tree',
      'ops.limits.agent',
      'ops.limits.sub_agent',
      'section.downlineContext',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.role_type',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Role type',
    description:
      'Position of a tree node in the partner hierarchy. Wire field node_type: partner, agent, or sub_agent.',
    semanticType: 'classification',
    uiRole: 'chip',
    // ops.limits.roleType: deprecated camelCase id (deep-link alias via synonym)
    synonyms: ['node_type', 'tree role', 'account role', 'ops.limits.roleType', 'roleType'],
    values: ['partner', 'agent', 'sub_agent'],
    seeAlso: ['ops.limits.partner', 'ops.limits.agent', 'ops.limits.sub_agent', 'ops.limits.node'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.partner',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Partner',
    description:
      'Top-of-tree role in the partner hierarchy (node_type partner). Owns downline agents and sub-agents.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['master', 'partner root', 'node_type partner'],
    values: ['partner'],
    seeAlso: ['ops.limits.role_type', 'ops.limits.downline', 'ops.limits.agent', 'ops.limits.tree'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.agent',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Downline agent',
    description:
      'Betting downline role in the partner tree (node_type agent). Not an HTTP Agent API client and not a Cursor/AI automation agent.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['agent', 'node_type agent', 'downline agent'],
    values: ['agent'],
    seeAlso: ['ops.limits.sub_agent', 'ops.limits.partner', 'ops.limits.role_type', 'api.agent'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.sub_agent',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Sub-agent',
    description:
      'Further-downline role under an agent in the partner tree (node_type sub_agent). Still a limit account, not an automation agent.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['sub_agent', 'sub-agent', 'node_type sub_agent'],
    values: ['sub_agent'],
    seeAlso: ['ops.limits.agent', 'ops.limits.downline', 'ops.limits.role_type', 'ops.limits.node'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.profile',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Account limit profile',
    description:
      'Read model joining a limit account to its operating profile, geography, licenses, policies, observations, and trace evidence.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['limit profile', 'account monitoring profile'],
    seeAlso: [
      'ops.limits.account',
      'ops.limits.jurisdiction_policy',
      'ops.limits.monitoring_status',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.jurisdiction_policy',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Jurisdiction policy',
    description:
      'Effective state-scoped or account-scoped wagering rule projected from the regulatory limit authority.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['state limit rule', 'regulatory policy', 'policy binding'],
    seeAlso: ['ops.limits.policy_code', 'ops.limits.effective_limit', 'ops.limits.account'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.policy_code',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Policy code',
    description:
      'Stable internal code identifying a jurisdiction, sport, market, and optional account override without claiming an external legal citation.',
    semanticType: 'classification',
    uiRole: 'code',
    synonyms: ['regulation code', 'limit rule code'],
    seeAlso: ['ops.limits.jurisdiction_policy', 'ui.semantic.source', 'ui.semantic.version'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.monitoring_status',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit monitoring status',
    description:
      'Evidence-derived account state: monitored, attention, blocked, or incomplete; presentation is derived from status separately.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['profile health', 'account limit status'],
    values: ['monitored', 'attention', 'blocked', 'incomplete'],
    seeAlso: ['ops.limits.profile', 'ops.limits.evidence_trace', 'ui.semantic.status'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.evidence_trace',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit evidence trace',
    description:
      'Time-ordered record of profile, license, policy, observed-limit, change, and blocked-wager evidence for one account.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['limit trace', 'monitoring history', 'audit evidence'],
    seeAlso: ['ops.limits.account', 'ops.limits.monitoring_status', 'ui.semantic.artifact'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.lifecycle_state',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit lifecycle state',
    description:
      'Temporal enforceability of a limit (pending, active, expired, superseded). Distinct from monitoring_status (evidence health) and partner onboarding lifecycleStatus.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['limit lifecycle', 'enforceability state', 'limit temporal state'],
    values: ['pending', 'active', 'expired', 'superseded'],
    seeAlso: [
      'ops.limits.account',
      'ops.limits.effective_limit',
      'ops.limits.limit_delta',
      'ops.limits.prediction',
      'ops.limits.monitoring_status',
    ],
    correlationId: 'PR#244',
    addedAt: '2026-08-03',
  },
  {
    id: 'ops.limits.effective_limit',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Effective limit',
    description:
      'Limit value currently applicable at an account, sportsbook, sport, market, bet-type, and jurisdiction intersection.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['current limit', 'applicable limit', 'max wager'],
    unit: 'usd',
    format: 'currency:usd',
    seeAlso: [
      'ops.limits.jurisdiction_policy',
      'ops.limits.profile',
      'ui.semantic.source',
      'ops.limits.lifecycle_state',
      'api.limit_cache',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.pattern_surface',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Partner limit patterns',
    description:
      'Evidence surface grouping recent limit movement by partner tree, sportsbook, jurisdiction, and ZIP prefix.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['limit pattern board', 'partner limit board'],
    seeAlso: ['ops.limits.limit_delta', 'ops.limits.influence_score', 'ops.limits.prediction'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.change_direction',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit change direction',
    description:
      'Observed direction of a sportsbook limit change relative to the immediately previous limit.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['raise direction', 'limit movement'],
    values: ['raised', 'reduced'],
    seeAlso: [
      'ops.limits.limit_delta',
      'ops.limits.effective_limit',
      'ui.semantic.status',
      'api.limit_events',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.market_phase',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Market phase',
    description:
      'Trading phase on a limit observation: pregame or live (in-play). Bet structure is governed separately by ops.limits.multi_structure.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['bet phase', 'wager phase', 'scrape.phase'],
    values: ['pregame', 'live'],
    seeAlso: [
      'ops.limits.effective_limit',
      'ops.limits.change_direction',
      'ops.limits.market_type',
      'ops.limits.multi_structure',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.sport',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Sport',
    description:
      'Hierarchy root for the observed limit row. Values are the competition-catalog / scrape-wire SPORT_KEYS (SSOT with glossary sport.*).',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['sport_id', 'sport key', 'scrape.sport'],
    values: [
      'american_football',
      'baseball',
      'basketball',
      'hockey',
      'soccer',
      'tennis',
      'golf',
      'mma',
    ],
    seeAlso: [
      'ops.limits.league',
      'ops.limits.market_type',
      'ops.limits.effective_limit',
      'api.bookmaker_feed',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.league',
    namespace: 'ops',
    domain: 'compliance',
    label: 'League or tour',
    description:
      'League, tour, or sanctioning body for a limit observation. Values ⊆ competition-catalog LEAGUE_KEYS (audited by schema:audit).',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['league_id', 'tour', 'competition family', 'scrape.league'],
    values: [
      'nba',
      'wnba',
      'nfl',
      'ncaaf',
      'ncaab',
      'mlb',
      'nhl',
      'mls',
      'epl',
      'uefa_champions_league',
      'atp',
      'wta',
      'itf',
      'atp_challenger',
      'wta_125',
      'pga_tour',
      'dp_world_tour',
      'ufc',
    ],
    seeAlso: [
      'ops.limits.sport',
      'ops.limits.competition',
      'ops.limits.event_country',
      'api.bookmaker_feed',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.competition',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Competition tier',
    description:
      'Specific level within a league or tour. Values ⊆ COMPETITION_KEYS (audited by schema:audit).',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['competition_id', 'tournament tier', 'tour level'],
    values: [
      'itf_m15',
      'itf_m25',
      'itf_w15',
      'itf_w35',
      'itf_w50',
      'itf_w75',
      'itf_w100',
      'atp_challenger_50',
      'atp_challenger_75',
      'atp_challenger_100',
      'atp_challenger_125',
      'atp_challenger_175',
      'wta_125',
    ],
    seeAlso: ['ops.limits.sport', 'ops.limits.league', 'ops.limits.event_country'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.event_country',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Event host country',
    description:
      'ISO alpha-2 country where the event is played. This dimension owns the displayed country flag; global tours do not.',
    semanticType: 'location',
    uiRole: 'badge',
    synonyms: ['host country', 'event country', 'country_code'],
    seeAlso: ['ops.limits.sport', 'ops.limits.league', 'ops.limits.competition'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.market_type',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Market type',
    description:
      'Bet market family on the limit row. Values are scrape-wire SCRAPE_MARKET_KEYS (regulation + extended); domain definitions under market.* / scrape.market.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['market_id', 'market key', 'bet market', 'scrape.market'],
    values: ['match_winner', 'over_under', 'spread', 'player_prop', 'team_prop', 'futures'],
    seeAlso: ['ops.limits.sport', 'ops.limits.market_phase', 'ops.limits.multi_structure'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.multi_structure',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Multi / parlay structure',
    description:
      'How selections combine: straight single, or multi (parlay) with legs. Domain definitions live under multi.* in the glossary.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['parlay', 'accumulator', 'multi', 'leg'],
    values: ['straight', 'parlay', 'leg'],
    seeAlso: ['ops.limits.market_type', 'ops.limits.effective_limit', 'ops.limits.market_phase'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.limit_delta',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit delta',
    description:
      'Signed difference between the new sportsbook limit and its immediately previous value in USD.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['limit movement', 'net limit change'],
    unit: 'usd',
    format: 'currency:usd',
    seeAlso: [
      'ops.limits.change_direction',
      'ops.limits.effective_limit',
      'ops.limits.pattern_surface',
      'ops.limits.lifecycle_state',
      'api.limit_events',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.influence_score',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Multi-factor influence',
    description:
      'Normalized contribution score joining activity, profitability, risk, compliance, and sportsbook context for a limit change.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['influence', 'multi-factor score', 'raise score'],
    unit: 'percent',
    format: 'percent:0',
    seeAlso: ['ops.limits.prediction', 'ops.limits.data_coverage', 'ops.limits.evidence_trace'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.data_coverage',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Pattern evidence coverage',
    description:
      'Percentage of expected hierarchy, geography, license, score, and proof connections present in the limit-pattern read model.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['connection coverage', 'pattern coverage'],
    unit: 'percent',
    format: 'percent:0',
    seeAlso: ['ops.limits.evidence_trace', 'ops.limits.influence_score', 'ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.limits.prediction',
    namespace: 'ops',
    domain: 'compliance',
    label: 'Limit raise prediction',
    description:
      'Forecast of the probability and expected magnitude of a future limit raise using frequency, trend, influence, and time-window features.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['raise forecast', 'limit forecast'],
    seeAlso: [
      'ops.limits.influence_score',
      'ops.limits.limit_delta',
      'ops.limits.pattern_surface',
      'ops.limits.lifecycle_state',
      'api.prediction',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'api.agent',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Agent API',
    description:
      'HTTP surface for bots and tools under /api/agents/v1/… (for example limits raises/record). Distinct from ops.limits.agent (partner-tree downline role).',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['/api/agents', 'agent HTTP API', 'limits agent API'],
    seeAlso: [
      'ops.limits.agent',
      'ops.limits.pattern_surface',
      'api.identity',
      'api.partner',
      'ui.semantic.surface',
      'ui.semantic.artifact',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'api.bookmaker_feed',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Bookmaker feed API',
    description:
      'Infrastructure surface for sport/league/event catalog data consumed by ops.limits.sport and ops.limits.league. Distinct from bookmaker registry pages; names the upstream feed dependency in the concept graph.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['bookmaker feed', 'sport feed API', 'league feed'],
    seeAlso: ['ops.limits.sport', 'ops.limits.league'],
    correlationId: 'PR#247',
    addedAt: '2026-08-03',
  },
  {
    id: 'api.limit_events',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Limit event stream',
    description:
      'Infrastructure surface for limit-change events (deltas and direction) that populate ops.limits.change_direction and ops.limits.limit_delta.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['limit events', 'raise event stream', 'limit change stream'],
    seeAlso: ['ops.limits.change_direction', 'ops.limits.limit_delta'],
    correlationId: 'PR#247',
    addedAt: '2026-08-03',
  },
  {
    id: 'api.limit_cache',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Limit cache',
    description:
      'Infrastructure surface for cached high-water marks and effective limits backing ops.metric.high_water and ops.limits.effective_limit.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['limit cache', 'high-water cache', 'effective limit cache'],
    seeAlso: ['ops.limits.effective_limit', 'ops.metric.high_water'],
    correlationId: 'PR#247',
    addedAt: '2026-08-03',
  },
  {
    id: 'api.identity',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Identity API',
    description:
      'Infrastructure surface for authentication, session, lockout, and anomaly identity under /api/identity and related identity routes. Backs page.identity and partner-tree account resolution used by ui.filter.partnerId.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['identity service', 'auth API', 'session API', '/api/identity'],
    seeAlso: [
      'page.identity',
      'ops.limits.partner',
      'ui.filter.partnerId',
      'api.agent',
      'api.partner',
    ],
    correlationId: 'PR#256',
    addedAt: '2026-08-04',
  },
  {
    id: 'api.partner',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Partner registry API',
    description:
      'Infrastructure surface for partner registry, package-group, and seat-desk data consumed by page.partners and partners surface sections (onboard, outs, deposits, book detail).',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['partner API', 'partner registry HTTP', 'package-group API'],
    seeAlso: [
      'page.partners',
      'ops.limits.partner',
      'section.partnersOnboard',
      'ui.filter.partnerId',
      'api.identity',
      'api.agent',
    ],
    correlationId: 'PR#256',
    addedAt: '2026-08-04',
  },
  {
    id: 'api.prediction',
    namespace: 'api',
    domain: 'infrastructure',
    label: 'Prediction API',
    description:
      'Infrastructure surface for ML / forecast services that compute limit-raise probability and magnitude features backing ops.limits.prediction and the prediction report bake.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['prediction service', 'ML forecast API', 'raise prediction API'],
    seeAlso: [
      'ops.limits.prediction',
      'section.limitRaisePrediction',
      'ops.limits.influence_score',
      'api.limit_events',
      'api.limit_cache',
    ],
    correlationId: 'PR#256',
    addedAt: '2026-08-04',
  },
  {
    id: 'section.accountLimitControl',
    namespace: 'section',
    domain: 'portal',
    label: 'Account limit control',
    description:
      'Section for searching, filtering, selecting, and tracing evidence-backed partner-tree account limit profiles.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner limit control', 'account controls'],
    seeAlso: ['page.limitPatterns', 'ops.limits.profile', 'ops.limits.monitoring_status'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.complianceKpis',
    namespace: 'section',
    domain: 'portal',
    label: 'Compliance policy KPIs',
    description:
      'Section presenting governed compliance decision metrics derived from policies and blocked-wager evidence.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['compliance metrics', 'policy KPIs'],
    seeAlso: ['page.limitPatterns', 'ops.limits.jurisdiction_policy', 'ops.limits.evidence_trace'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.jurisdictionCatalog',
    namespace: 'section',
    domain: 'portal',
    label: 'Jurisdiction policy catalog',
    description:
      'Section listing effective state and account policy codes, limits, enforcement actions, and source evidence.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['jurisdiction catalog', 'state policy catalog'],
    seeAlso: ['page.limitPatterns', 'section.limitRaisePrediction', 'section.dataConnectionAudit'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.patternSummary',
    namespace: 'section',
    domain: 'portal',
    label: 'Pattern summary',
    description:
      'Section summarizing selected limit changes, direction, net movement, influence, connected nodes, and evidence coverage.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['limit summary', 'pattern metrics'],
    seeAlso: ['page.limitPatterns', 'ops.limits.pattern_surface', 'ops.limits.data_coverage'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.limitRaisePrediction',
    namespace: 'section',
    domain: 'portal',
    label: 'Limit raise prediction',
    description:
      'Section describing the active raise-probability model, its weighted factors, and available backtest accuracy.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['raise prediction section', 'limit forecast'],
    seeAlso: [
      'ops.limits.prediction',
      'section.jurisdictionCatalog',
      'section.dataConnectionAudit',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.sportsbookPatterns',
    namespace: 'section',
    domain: 'portal',
    label: 'Sportsbook patterns',
    description:
      'Section comparing change volume, direction, net movement, and influence across sportsbook sources.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['book patterns', 'sportsbook movement'],
    seeAlso: ['page.limitPatterns', 'ops.limits.pattern_surface', 'ops.limits.influence_score'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.stateZipPatterns',
    namespace: 'section',
    domain: 'portal',
    label: 'State and ZIP patterns',
    description: 'Section comparing limit movement by jurisdiction and three-digit ZIP prefix.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['state and ZIP patterns', 'geographic limit patterns'],
    seeAlso: ['page.limitPatterns', 'ops.limits.jurisdiction_policy', 'section.downlineContext'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.downlineContext',
    namespace: 'section',
    domain: 'portal',
    label: 'Partner to downline context',
    description:
      'Section preserving the partner-tree lineage, depth, jurisdiction, license, risk, and proof context for every observed node.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner downline context', 'tree context'],
    seeAlso: [
      'ops.limits.downline',
      'ops.limits.tree',
      'ops.limits.role_type',
      'section.stateZipPatterns',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.dataConnectionAudit',
    namespace: 'section',
    domain: 'portal',
    label: 'Data connection audit',
    description:
      'Section reporting hierarchy, geography, license, score, and proof connections in the pattern read model.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['connection audit', 'pattern evidence audit'],
    seeAlso: [
      'ops.limits.data_coverage',
      'section.jurisdictionCatalog',
      'section.limitRaisePrediction',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.recentLimitChanges',
    namespace: 'section',
    domain: 'portal',
    label: 'Recent limit changes',
    description:
      'Section listing observed limit changes with account, geography, sportsbook, market, direction, influence, and time.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['recent changes', 'limit change table'],
    seeAlso: ['ops.limits.limit_delta', 'ops.limits.change_direction', 'section.perNodeBreakdown'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.perNodeBreakdown',
    namespace: 'section',
    domain: 'portal',
    label: 'Per-node breakdown',
    description:
      'Section aggregating movement, influence, sportsbooks, violations, and proof completeness for each selected account node.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['node breakdown', 'account movement breakdown'],
    seeAlso: [
      'ops.limits.node',
      'ops.limits.role_type',
      'ops.limits.influence_score',
      'section.recentLimitChanges',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.openingBaseline',
    namespace: 'section',
    domain: 'portal',
    label: 'Sportsbook opening baseline',
    description:
      'Section showing internal top-10 US sportsbook new-account max wagers by sport, market, parlay/straight, and live/pregame.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['opening limits', 'new account baseline', 'book baseline matrix'],
    seeAlso: [
      'page.partnerHistory',
      'ops.limits.market_phase',
      'ops.limits.multi_structure',
      'ops.limits.sport',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersTelegram',
    namespace: 'section',
    domain: 'portal',
    label: 'Telegram package groups',
    description:
      'Partners board section for package-forum handshake readiness, membership tell, invite, and topic plan.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['package groups', 'telegram forums', 'handshake board'],
    seeAlso: [
      'page.partners',
      'page.accountDossier',
      'section.partnersAccounting',
      'section.partnersAccountsLimits',
      'section.partnersDeposits',
      'section.partnersPartnerMessage',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersAccounting',
    namespace: 'section',
    domain: 'portal',
    label: 'Accounting deals',
    description:
      'Partners board section for deposit/withdraw proof in the Accounting topic and all-accounting house rollup. Dossier #section:accounting keeps this surface id for bookmarks; per-account reporting chrome is ops.view.per_account (cross-plane seeAlso via domain-glossary bake).',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['accounting deals', 'accounting topic', 'fund status'],
    seeAlso: [
      'page.partners',
      'page.accountDossier',
      'page.dodReview',
      'section.partnersTelegram',
      'section.partnersAccountsLimits',
      'section.partnersDeposits',
      'section.partnersPartnerMessage',
      'ops.dod.ingest',
      'ops.dod.reconcile',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersAccountsLimits',
    namespace: 'section',
    domain: 'portal',
    label: 'Accounts and limits',
    description:
      'Partners board section joining account readiness, effective max-bet coverage, accounting activity, and Telegram communication readiness by partner.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner accounts', 'limit tracking', 'communication readiness'],
    seeAlso: [
      'page.partners',
      'page.accountDossier',
      'section.partnersAccounting',
      'section.partnersTelegram',
      'section.partnersOnboard',
      'section.partnersDeposits',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersOnboard',
    namespace: 'section',
    domain: 'portal',
    label: 'Onboard',
    description:
      'Partners board section for partner onboarding checklist and CLI next steps (#section:onboard). Phase vocabulary lives on partner.phase.onboarding (cross-plane seeAlso via domain-glossary bake).',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['onboarding', 'onboard checklist', 'package onboarding'],
    seeAlso: [
      'page.partners',
      'section.partnersAccountsLimits',
      'section.partnersTelegram',
      'section.partnersAccounting',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersDeposits',
    namespace: 'section',
    domain: 'portal',
    label: 'Betting deposits',
    description:
      'Partners board section for seat capital desk deposit rails (book, method, send-to, max bet, freeplay %).',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['deposit rails', 'betting deposits', 'seat desk outs'],
    seeAlso: [
      'page.partners',
      'section.partnersAccounting',
      'section.partnersAccountsLimits',
      'section.partnersTelegram',
      'section.partnersPartnerMessage',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersPartnerMessage',
    namespace: 'section',
    domain: 'portal',
    label: 'Partner messages',
    description:
      'Partners board section for seat-desk partner-message views (confirm / todo / topic templates) baked from intake.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner paste', 'confirm-active', 'seat desk todo'],
    seeAlso: [
      'page.partners',
      'section.partnersAccounting',
      'section.partnersAccountsLimits',
      'section.partnersDeposits',
      'section.partnersTelegram',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.profile',
    namespace: 'ui',
    domain: 'portal',
    label: 'Profile filter',
    description: 'Filter limiting the account-control view to matching profile evidence.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['filter by profile', 'profile selector'],
    seeAlso: ['ops.limits.profile', 'ui.action.searchProfiles', 'section.accountLimitControl'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.jurisdiction',
    namespace: 'ui',
    domain: 'portal',
    label: 'Jurisdiction filter',
    description: 'Filter limiting results to accounts or patterns governed by one jurisdiction.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['filter by jurisdiction', 'state filter'],
    seeAlso: ['ops.limits.jurisdiction_policy', 'ui.filter.state', 'section.jurisdictionCatalog'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.partnerId',
    namespace: 'ui',
    domain: 'portal',
    label: 'Account or partner filter',
    description:
      'Search filter matching account identifiers, partner identifiers, downline names, and profile text.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['filter by partner ID', 'account search'],
    seeAlso: ['ops.limits.account', 'ui.filter.profile', 'ui.action.filter'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.sportsbook',
    namespace: 'ui',
    domain: 'portal',
    label: 'Sportsbook filter',
    description: 'Filter limiting pattern evidence to one sportsbook source.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all sportsbooks', 'book filter'],
    seeAlso: ['section.sportsbookPatterns', 'ui.action.filter', 'ui.filter.partnerId'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.state',
    namespace: 'ui',
    domain: 'portal',
    label: 'State filter',
    description: 'Filter limiting pattern evidence to one state jurisdiction.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all states', 'jurisdiction state filter'],
    seeAlso: ['ui.filter.jurisdiction', 'ui.filter.zipPrefix', 'ui.action.filter'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.zipPrefix',
    namespace: 'ui',
    domain: 'portal',
    label: 'ZIP-prefix filter',
    description: 'Filter limiting pattern evidence to one connected three-digit ZIP prefix.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all ZIP prefixes', 'ZIP cluster filter'],
    seeAlso: ['ui.filter.state', 'section.stateZipPatterns', 'ui.action.filter'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.filter.window',
    namespace: 'ui',
    domain: 'portal',
    label: 'Window filter',
    description:
      'Time-window UI selector for limit-movement and history evidence (SSOT; supersedes ops.filter.window).',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['time window', 'lookback', 'window filter'],
    seeAlso: [
      'ui.action.filter',
      'ui.filter.window.48h',
      'ui.filter.window.7d',
      'ui.filter.window.30d',
    ],
    correlationId: 'PR#228',
    addedAt: '2026-08-03',
  },
  {
    id: 'ui.filter.window.48h',
    namespace: 'ui',
    domain: 'portal',
    label: '48 hours',
    description: 'Window filter value: last 48 hours of movement evidence.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['48h', 'last 48 hours'],
    seeAlso: ['ui.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-03',
  },
  {
    id: 'ui.filter.window.7d',
    namespace: 'ui',
    domain: 'portal',
    label: '7 days',
    description: 'Window filter value: last 7 days of movement evidence.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['7d', 'last week'],
    seeAlso: ['ui.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-03',
  },
  {
    id: 'ui.filter.window.30d',
    namespace: 'ui',
    domain: 'portal',
    label: '30 days',
    description: 'Window filter value: last 30 days of movement evidence.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['30d', 'last month'],
    seeAlso: ['ui.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-03',
  },
  {
    id: 'ui.action.reset',
    namespace: 'ui',
    domain: 'portal',
    label: 'Reset filters',
    description: 'Action clearing the filters owned by the current portal section.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['reset', 'clear filters'],
    seeAlso: ['ui.action.filter', 'ui.filter.profile', 'ui.filter.jurisdiction'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.action.searchProfiles',
    namespace: 'ui',
    domain: 'portal',
    label: 'Search profiles',
    description:
      'Action searching account limit profiles by identity, policy, and sportsbook text.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['profile search', 'find account profile'],
    seeAlso: ['ui.filter.profile', 'ops.limits.profile', 'section.accountLimitControl'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersOuts',
    namespace: 'section',
    domain: 'portal',
    label: 'Partner outs',
    description: 'Partners board section for per-out book, funding, status, balance, and limits.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['out table', 'outs board', 'seat outs'],
    seeAlso: ['page.partners', 'section.partnersDeposits', 'section.partnersBookDetail'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersBookDetail',
    namespace: 'section',
    domain: 'portal',
    label: 'Book detail',
    description:
      'Partners board section for a single book: type, location, max bet, free-roll percent.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['book card', 'book profile'],
    seeAlso: ['page.partners', 'section.partnersOuts'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'section.partnersTags',
    namespace: 'section',
    domain: 'portal',
    label: 'Partner tag filter bar',
    description:
      'Partners board section for phase, book-type, status, funding, and location filter tags.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['tag bar', 'filter taxonomy', 'tag-filter-bar'],
    seeAlso: ['page.partners', 'ui.filter.partnerId'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.route.partnerHash',
    namespace: 'ui',
    domain: 'portal',
    label: 'Partner hash route',
    description:
      'URLPattern hash route for partner deep links: #partners, #partner/:code, #partner/:code/out/:outId, #partner/:code/accounting, #partner/:code/telegram/:topic, #book/:bookId.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['hash router', 'partner deep link', 'URLPattern route'],
    seeAlso: [
      'page.partners',
      'section.partnersOuts',
      'section.partnersAccounting',
      'section.partnersTelegram',
    ],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ops.panel.partner_limit_history',
    namespace: 'ops',
    domain: 'operations',
    label: 'Partner limit history',
    description:
      'Partner Limit History UI chrome: page panel for account-level limit movement traces.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['limit history panel', 'partner limit history page'],
    seeAlso: ['page.partnerHistory', 'section.openingBaseline', 'ops.limits.pattern_surface'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.panel.limit_overview',
    namespace: 'ops',
    domain: 'operations',
    label: 'Limit overview',
    description:
      'Partner Limit History UI chrome: summary panel of current limit state per account.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['overview panel', 'limit summary'],
    seeAlso: ['ops.panel.partner_limit_history', 'ops.limits.effective_limit'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.summary.partner_limit_trace',
    namespace: 'ops',
    domain: 'operations',
    label: 'Partner limit trace',
    description:
      'Partner Limit History UI chrome: trace of account-level limit movement with evidence links.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['limit trace', 'movement trace'],
    seeAlso: ['ops.limits.evidence_trace', 'ops.limits.limit_delta', 'ops.metric.deltas'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.filter.account.all',
    namespace: 'ops',
    domain: 'operations',
    label: 'All accounts',
    description:
      'Deprecated: use ui.filter.partnerId. Former Partner Limit History filter value: no account narrowing (all downline accounts).',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all accounts', 'every account'],
    seeAlso: ['ui.filter.partnerId', 'ui.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
    status: 'deprecated',
    replacedBy: 'ui.filter.partnerId',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.filter.sportsbook.all',
    namespace: 'ops',
    domain: 'operations',
    label: 'All sportsbooks',
    description:
      'Deprecated: use ui.filter.sportsbook. Former Partner Limit History filter value: no sportsbook narrowing.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all books', 'every sportsbook'],
    seeAlso: ['ui.filter.sportsbook', 'ui.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
    status: 'deprecated',
    replacedBy: 'ui.filter.sportsbook',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.filter.window',
    namespace: 'ops',
    domain: 'operations',
    label: 'Window filter',
    description:
      'Deprecated: use ui.filter.window. Partner Limit History filter: time window for limit movement evidence.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['time window', 'lookback'],
    seeAlso: ['ui.filter.window', 'ui.action.filter'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
    status: 'deprecated',
    replacedBy: 'ui.filter.window',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.filter.window.48h',
    namespace: 'ops',
    domain: 'operations',
    label: '48 hours',
    description:
      'Deprecated: use ui.filter.window.48h. Partner Limit History window value: last 48 hours of movement.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['48h', 'last 48 hours'],
    seeAlso: ['ui.filter.window.48h', 'ops.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
    status: 'deprecated',
    replacedBy: 'ui.filter.window.48h',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.filter.window.7d',
    namespace: 'ops',
    domain: 'operations',
    label: '7 days',
    description:
      'Deprecated: use ui.filter.window.7d. Partner Limit History window value: last 7 days of movement.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['7d', 'last week'],
    seeAlso: ['ui.filter.window.7d', 'ops.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
    status: 'deprecated',
    replacedBy: 'ui.filter.window.7d',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.filter.window.30d',
    namespace: 'ops',
    domain: 'operations',
    label: '30 days',
    description:
      'Deprecated: use ui.filter.window.30d. Partner Limit History window value: last 30 days of movement.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['30d', 'last month'],
    seeAlso: ['ui.filter.window.30d', 'ops.filter.window'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
    status: 'deprecated',
    replacedBy: 'ui.filter.window.30d',
    deprecatedAt: '2026-08-03',
  },
  {
    id: 'ops.metric.visible_changes',
    namespace: 'ops',
    domain: 'operations',
    label: 'Visible changes',
    description: 'Partner Limit History metric: count of filtered limit-change rows.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['change count', 'filtered rows'],
    seeAlso: ['ops.limits.limit_delta', 'ops.metric.active_filters'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.raises',
    namespace: 'ops',
    domain: 'operations',
    label: 'Raises',
    description: 'Partner Limit History metric: count of positive limit deltas (raised direction).',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['limit raises', 'increases'],
    seeAlso: ['ops.limits.change_direction', 'ops.limits.limit_delta'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.decreases',
    namespace: 'ops',
    domain: 'operations',
    label: 'Decreases',
    description:
      'Partner Limit History metric: count of negative limit deltas (reduced direction).',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['limit decreases', 'reductions'],
    seeAlso: ['ops.limits.change_direction', 'ops.limits.limit_delta'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.sportsbooks',
    namespace: 'ops',
    domain: 'operations',
    label: 'Sportsbooks',
    description: 'Partner Limit History metric: unique sportsbook count among visible changes.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['book count', 'unique books'],
    seeAlso: ['ui.filter.sportsbook', 'ops.metric.visible_changes'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.high_water',
    namespace: 'ops',
    domain: 'operations',
    label: 'High-water',
    description: 'Partner Limit History metric: prior peak limit for an account within the window.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['prior peak', 'max limit'],
    seeAlso: ['ops.limits.effective_limit', 'ops.limits.limit_delta', 'api.limit_cache'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.deltas',
    namespace: 'ops',
    domain: 'operations',
    label: 'Deltas',
    description: 'Partner Limit History metric: change amounts across visible rows.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['delta amounts', 'change amounts', 'limit deltas'],
    unit: 'usd',
    seeAlso: ['ops.limits.limit_delta', 'ops.metric.visible_changes'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.active_filters',
    namespace: 'ops',
    domain: 'operations',
    label: 'Active filters',
    description: 'Partner Limit History metric: count of applied filters in the filter bar.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['applied filters', 'filter count'],
    seeAlso: ['ui.action.filter', 'ui.action.reset'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.proof_coverage',
    namespace: 'ops',
    domain: 'operations',
    label: 'Proof coverage',
    description:
      'Partner Limit History metric: percent of visible changes with signed evidence context.',
    semanticType: 'state',
    uiRole: 'code',
    unit: 'percent',
    synonyms: ['evidence coverage', 'signed coverage'],
    seeAlso: ['ops.limits.evidence_trace', 'ops.limits.data_coverage'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.dod.ingest',
    namespace: 'ops',
    domain: 'operations',
    label: 'DOD Accounting ingest',
    description:
      'Ops-bot path that downloads package-forum Accounting or house Deposits/Withdrawals/Reconcile photos and enqueues DODVerifier.process (caption CODE, telegram message dedupe, deep-link ack).',
    semanticType: 'resource',
    uiRole: 'code',
    synonyms: [
      'accounting photo ingest',
      'visual proof ingest',
      'telegram DOD ingest',
      'ingestAccountingDodPhoto',
    ],
    seeAlso: [
      'page.dodReview',
      'section.partnersAccounting',
      'ops.dod.reconcile',
      'ops.dod.meta_log',
    ],
    correlationId: 'PR#347',
    addedAt: '2026-08-05',
  },
  {
    id: 'ops.dod.reconcile',
    namespace: 'ops',
    domain: 'operations',
    label: 'DOD amount reconciliation',
    description:
      'Compare OCR/bake accounting_amount against execution expected stake (play_distribution.stake_actual or expected_amount). Mismatch yields portal banner and can flag the queue row.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: [
      'visual proof reconcile',
      'accounting amount mismatch',
      'stake vs OCR',
      'reconcileDodAmounts',
    ],
    seeAlso: [
      'page.dodReview',
      'section.partnersAccounting',
      'ops.dod.ingest',
      'ops.metric.proof_coverage',
    ],
    correlationId: 'PR#347',
    addedAt: '2026-08-05',
  },
  {
    id: 'ops.dod.meta_log',
    namespace: 'ops',
    domain: 'operations',
    label: 'DOD image meta log',
    description:
      'Append-only NDJSON learning log (data/dod_meta.ndjson) of stripped Bun.Image metadata (width/format/EXIF/GPS) for forged-screenshot detection.',
    semanticType: 'resource',
    uiRole: 'code',
    synonyms: ['dod_meta.ndjson', 'image meta learning log', 'appendDodMetaNdjson'],
    seeAlso: ['page.dodReview', 'ops.dod.ingest', 'ui.semantic.artifact'],
    correlationId: 'PR#347',
    addedAt: '2026-08-05',
  },
  {
    id: 'ops.table.recent_changes',
    namespace: 'ops',
    domain: 'operations',
    label: 'Recent changes',
    description: 'Partner Limit History table tab: recent limit-change rows.',
    semanticType: 'presentation',
    uiRole: 'heading',
    synonyms: ['changes tab', 'recent tab'],
    seeAlso: ['section.recentLimitChanges', 'ops.metric.visible_changes'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.table.per_account',
    namespace: 'ops',
    domain: 'operations',
    label: 'Per account',
    description: 'Partner Limit History table tab: limit movement grouped by account.',
    semanticType: 'presentation',
    uiRole: 'heading',
    synonyms: ['account tab', 'per-account view'],
    seeAlso: ['ops.limits.account', 'ops.limits.downline'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.table.limit_changes',
    namespace: 'ops',
    domain: 'operations',
    label: 'Limit changes',
    description: 'Partner Limit History table tab: raw limit-change evidence rows.',
    semanticType: 'presentation',
    uiRole: 'heading',
    synonyms: ['changes table', 'limit movement table'],
    seeAlso: ['ops.limits.limit_delta', 'section.dataConnectionAudit'],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ui.action.refresh',
    namespace: 'ui',
    domain: 'portal',
    label: 'Refresh',
    description: 'Action re-running the current portal section fetch.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['reload', 're-run'],
    seeAlso: ['ui.action.filter', 'ui.semantic.source'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.action.export',
    namespace: 'ui',
    domain: 'portal',
    label: 'Export',
    description: 'Action exporting the current portal section data.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['download', 'export data'],
    seeAlso: ['ui.export.csv', 'ui.export.json'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.export.csv',
    namespace: 'ui',
    domain: 'portal',
    label: 'CSV export',
    description: 'Export format: comma-separated values of the current section.',
    semanticType: 'presentation',
    uiRole: 'code',
    synonyms: ['csv', 'spreadsheet export'],
    seeAlso: ['ui.action.export'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.export.json',
    namespace: 'ui',
    domain: 'portal',
    label: 'JSON export',
    description: 'Export format: JSON payload of the current section.',
    semanticType: 'presentation',
    uiRole: 'code',
    synonyms: ['json', 'api export'],
    seeAlso: ['ui.action.export'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.action.filter',
    namespace: 'ui',
    domain: 'portal',
    label: 'Apply filters',
    description: 'Action applying the current account, sportsbook, state, and ZIP filter state.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['filter', 'apply filter'],
    seeAlso: ['ui.filter.partnerId', 'ui.filter.sportsbook', 'ui.filter.state'],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
] as const satisfies readonly PortalSemanticConceptDef[];

export type PortalSemanticConceptKey = (typeof PORTAL_SEMANTIC_CONCEPTS)[number]['id'];

export type PortalSemanticConcept = (typeof PORTAL_SEMANTIC_CONCEPTS)[number];

/** Derived from {@link PORTAL_SEMANTIC_CONCEPTS} — do not maintain a parallel list. */
export const PORTAL_SEMANTIC_CONCEPT_KEYS: readonly PortalSemanticConceptKey[] =
  PORTAL_SEMANTIC_CONCEPTS.map(concept => concept.id);

export const HEALTH_FIELD_CONCEPTS = {
  surface: 'ui.semantic.surface',
  hostname: 'ui.semantic.hostname',
  port: 'ui.semantic.port',
  status: 'ui.semantic.status',
  kind: 'ui.semantic.kind',
  plane: 'ui.semantic.plane',
  source: 'ui.semantic.source',
  version: 'ui.semantic.version',
  resources: 'ui.semantic.resources',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/**
 * Desk / limit-row field concepts (ops.limits.* and related metrics fields).
 * HTTP infrastructure APIs live in {@link API_INFRA_CONCEPTS}, not here.
 */
export const LIMIT_FIELD_CONCEPTS = {
  account: 'ops.limits.account',
  node: 'ops.limits.node',
  tree: 'ops.limits.tree',
  downline: 'ops.limits.downline',
  roleType: 'ops.limits.role_type',
  partner: 'ops.limits.partner',
  agent: 'ops.limits.agent',
  subAgent: 'ops.limits.sub_agent',
  profile: 'ops.limits.profile',
  jurisdictionPolicy: 'ops.limits.jurisdiction_policy',
  policyCode: 'ops.limits.policy_code',
  monitoringStatus: 'ops.limits.monitoring_status',
  lifecycleState: 'ops.limits.lifecycle_state',
  evidenceTrace: 'ops.limits.evidence_trace',
  effectiveLimit: 'ops.limits.effective_limit',
  patternSurface: 'ops.limits.pattern_surface',
  changeDirection: 'ops.limits.change_direction',
  marketPhase: 'ops.limits.market_phase',
  sport: 'ops.limits.sport',
  league: 'ops.limits.league',
  competition: 'ops.limits.competition',
  eventCountry: 'ops.limits.event_country',
  marketType: 'ops.limits.market_type',
  multiStructure: 'ops.limits.multi_structure',
  limitDelta: 'ops.limits.limit_delta',
  influenceScore: 'ops.limits.influence_score',
  dataCoverage: 'ops.limits.data_coverage',
  prediction: 'ops.limits.prediction',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/**
 * Infrastructure HTTP / feed surfaces (`api.*`).
 * Inventory + surface-map alias keys — not desk field chrome.
 */
export const API_INFRA_CONCEPTS = {
  agentApi: 'api.agent',
  bookmakerFeedApi: 'api.bookmaker_feed',
  limitEventsApi: 'api.limit_events',
  limitCacheApi: 'api.limit_cache',
  identityApi: 'api.identity',
  partnerApi: 'api.partner',
  predictionApi: 'api.prediction',
} as const satisfies Record<string, PortalSemanticConceptKey>;

const TREE_NODE_TYPES = ['partner', 'agent', 'sub_agent'] as const;
type TreeNodeType = (typeof TREE_NODE_TYPES)[number];

function isTreeNodeType(value: string): value is TreeNodeType {
  return (TREE_NODE_TYPES as readonly string[]).includes(value);
}

/**
 * Map wire `node_type` values to glossary role concepts.
 * Returns `null` for missing/unknown wire — callers must handle at the boundary.
 */
export function glossaryConceptForNodeType(
  nodeType: string | null | undefined // brand-ok — wire node_type before parse
): PortalSemanticConceptKey | null {
  if (nodeType == null || nodeType === '') return null;
  if (!isTreeNodeType(nodeType)) return null;
  switch (nodeType) {
    case 'partner':
      return 'ops.limits.partner';
    case 'agent':
      return 'ops.limits.agent';
    case 'sub_agent':
      return 'ops.limits.sub_agent';
  }
}

export const LIMIT_SURFACE_CONCEPTS = {
  page: 'page.limitPatterns',
  accountControl: 'section.accountLimitControl',
  complianceKpis: 'section.complianceKpis',
  jurisdictionCatalog: 'section.jurisdictionCatalog',
  patternSummary: 'section.patternSummary',
  prediction: 'section.limitRaisePrediction',
  sportsbookPatterns: 'section.sportsbookPatterns',
  stateZipPatterns: 'section.stateZipPatterns',
  downlineContext: 'section.downlineContext',
  dataConnectionAudit: 'section.dataConnectionAudit',
  recentLimitChanges: 'section.recentLimitChanges',
  perNodeBreakdown: 'section.perNodeBreakdown',
  profileFilter: 'ui.filter.profile',
  jurisdictionFilter: 'ui.filter.jurisdiction',
  partnerFilter: 'ui.filter.partnerId',
  sportsbookFilter: 'ui.filter.sportsbook',
  stateFilter: 'ui.filter.state',
  zipFilter: 'ui.filter.zipPrefix',
  resetAction: 'ui.action.reset',
  searchProfilesAction: 'ui.action.searchProfiles',
  filterAction: 'ui.action.filter',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/**
 * Partner Limit History board binding surface.
 * Includes section mounts plus UI chrome ids enforced by
 * `partners:integration:validate` (ops.panel/metric/filter/table.*).
 */
export const PARTNER_HISTORY_SURFACE_CONCEPTS = {
  page: 'page.partnerHistory',
  openingBaseline: 'section.openingBaseline',
  recentLimitChanges: 'section.recentLimitChanges',
  perNodeBreakdown: 'section.perNodeBreakdown',
  panelPartnerLimitHistory: 'ops.panel.partner_limit_history',
  panelLimitOverview: 'ops.panel.limit_overview',
  summaryPartnerLimitTrace: 'ops.summary.partner_limit_trace',
  filterAccountAll: 'ui.filter.partnerId',
  filterSportsbookAll: 'ui.filter.sportsbook',
  filterWindow: 'ui.filter.window',
  filterWindow48h: 'ui.filter.window.48h',
  filterWindow7d: 'ui.filter.window.7d',
  filterWindow30d: 'ui.filter.window.30d',
  metricVisibleChanges: 'ops.metric.visible_changes',
  metricRaises: 'ops.metric.raises',
  metricDecreases: 'ops.metric.decreases',
  metricSportsbooks: 'ops.metric.sportsbooks',
  metricHighWater: 'ops.metric.high_water',
  metricDeltas: 'ops.metric.deltas',
  metricActiveFilters: 'ops.metric.active_filters',
  metricProofCoverage: 'ops.metric.proof_coverage',
  lifecycleState: 'ops.limits.lifecycle_state',
  tableRecentChanges: 'ops.table.recent_changes',
  tablePerAccount: 'ops.table.per_account',
  tableLimitChanges: 'ops.table.limit_changes',
  actionRefresh: 'ui.action.refresh',
  actionExport: 'ui.action.export',
  exportCsv: 'ui.export.csv',
  exportJson: 'ui.export.json',
  actionReset: 'ui.action.reset',
  actionFilter: 'ui.action.filter',
  /** Export / betlog presentation collapses onto artifact evidence. */
  artifact: 'ui.semantic.artifact',
  /** Freshness chrome collapses onto status / source. */
  status: 'ui.semantic.status',
  source: 'ui.semantic.source',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/** Account dossier board — sections collapse onto existing ops.limits.* / partners surfaces. */
export const ACCOUNT_DOSSIER_SURFACE_CONCEPTS = {
  page: 'page.accountDossier',
  identity: 'ops.limits.account',
  tree: 'section.downlineContext',
  location: 'ops.limits.jurisdiction_policy',
  traces: 'ops.limits.evidence_trace',
  policies: 'ops.limits.policy_code',
  telemetry: 'ops.limits.pattern_surface',
  changes: 'section.recentLimitChanges',
  outs: 'section.partnersOuts',
  telegram: 'section.partnersTelegram',
  /** Structural #section:accounting anchor — keep section.partnersAccounting for bookmarks. */
  accounting: 'section.partnersAccounting',
  /** Timeline of handshake / ledger / DM signals — collapses onto evidence traces. */
  activity: 'ops.limits.evidence_trace',
  monitoring: 'ops.limits.monitoring_status',
  lifecycle: 'ops.limits.lifecycle_state',
  profile: 'ops.limits.profile',
  window: 'section.recentLimitChanges',
} as const satisfies Record<string, PortalSemanticConceptKey>;

export const PARTNERS_SURFACE_CONCEPTS = {
  page: 'page.partners',
  telegram: 'section.partnersTelegram',
  accounting: 'section.partnersAccounting',
  accountsLimits: 'section.partnersAccountsLimits',
  onboard: 'section.partnersOnboard',
  deposits: 'section.partnersDeposits',
  partnerMessage: 'section.partnersPartnerMessage',
  outs: 'section.partnersOuts',
  bookDetail: 'section.partnersBookDetail',
  tags: 'section.partnersTags',
  partnerHashRoute: 'ui.route.partnerHash',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/**
 * Tennis desk board binding surface.
 * Collapses partner-contracts / agent-auth / runtime evidence onto existing
 * page + api + ui.semantic concepts (no new glossary ids).
 */
export const TENNIS_SURFACE_CONCEPTS = {
  page: 'page.tennis',
  partnerApi: 'api.partner',
  artifact: 'ui.semantic.artifact',
  status: 'ui.semantic.status',
  source: 'ui.semantic.source',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/** Relation fields checked for referential integrity (seeAlso + optional derivesFrom). */
export type PortalSemanticRelationConcept = {
  readonly id: string; // brand-ok — glossary concept key
  readonly seeAlso: readonly string[];
  readonly derivesFrom?: readonly string[];
};

/**
 * Validate seeAlso / derivesFrom point at known concept ids and never self.
 * Injectable for unit tests; production uses {@link validatePortalSemanticVocabulary}.
 */
export function validatePortalSemanticConceptRelations(
  concepts: readonly PortalSemanticRelationConcept[]
): void {
  const keys = new Set<string>();
  for (const concept of concepts) {
    if (keys.has(concept.id)) {
      throw new Error(`Duplicate portal semantic concept: ${concept.id}`);
    }
    keys.add(concept.id);
  }
  for (const concept of concepts) {
    for (const related of concept.seeAlso) {
      if (!keys.has(related)) {
        throw new Error(`Unknown portal semantic relation: ${concept.id} → ${related}`);
      }
      if (related === concept.id) {
        throw new Error(`Portal semantic concept cannot relate to itself: ${concept.id}`);
      }
    }
    for (const upstream of concept.derivesFrom ?? []) {
      if (!keys.has(upstream)) {
        throw new Error(`Unknown portal semantic derivesFrom: ${concept.id} → ${upstream}`);
      }
      if (upstream === concept.id) {
        throw new Error(`Portal semantic concept cannot derive from itself: ${concept.id}`);
      }
    }
  }
}

export function validatePortalSemanticVocabulary(): void {
  validatePortalSemanticConceptRelations(PORTAL_SEMANTIC_CONCEPTS);
}
