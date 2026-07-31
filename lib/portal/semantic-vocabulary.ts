/**
 * Portal semantic vocabulary.
 *
 * Domain concepts remain owned by Kalshi-bot/src/institutions/glossary.ts.
 * This module owns cross-portal UI field semantics so labels, roles, and
 * operational values do not drift between boards.
 */

import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from './page-concepts.ts';

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

export const PORTAL_SEMANTIC_CONCEPT_KEYS = [
  'ui.semantic.surface',
  'ui.semantic.hostname',
  'ui.semantic.port',
  'ui.semantic.status',
  'ui.semantic.tone',
  'ui.semantic.kind',
  'ui.semantic.plane',
  'ui.semantic.source',
  'ui.semantic.version',
  'ui.semantic.resources',
  'ui.semantic.artifact',
  'ui.semantic.package',
  'ui.semantic.type',
  'ops.limits.account',
  'ops.limits.node',
  'ops.limits.tree',
  'ops.limits.downline',
  'ops.limits.roleType',
  'ops.limits.partner',
  'ops.limits.agent',
  'ops.limits.sub_agent',
  'ops.limits.profile',
  'ops.limits.jurisdiction_policy',
  'ops.limits.policy_code',
  'ops.limits.monitoring_status',
  'ops.limits.evidence_trace',
  'ops.limits.effective_limit',
  'ops.limits.pattern_surface',
  'ops.limits.change_direction',
  'ops.limits.market_phase',
  'ops.limits.sport',
  'ops.limits.league',
  'ops.limits.competition',
  'ops.limits.event_country',
  'ops.limits.market_type',
  'ops.limits.multi_structure',
  'ops.limits.limit_delta',
  'ops.limits.influence_score',
  'ops.limits.data_coverage',
  'ops.limits.prediction',
  'api.agent',
  ...PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => page.id),
  'section.accountLimitControl',
  'section.complianceKpis',
  'section.jurisdictionCatalog',
  'section.patternSummary',
  'section.limitRaisePrediction',
  'section.sportsbookPatterns',
  'section.stateZipPatterns',
  'section.downlineContext',
  'section.dataConnectionAudit',
  'section.recentLimitChanges',
  'section.perNodeBreakdown',
  'section.openingBaseline',
  'ui.filter.profile',
  'ui.filter.jurisdiction',
  'ui.filter.partnerId',
  'ui.filter.sportsbook',
  'ui.filter.state',
  'ui.filter.zipPrefix',
  'ui.action.reset',
  'ui.action.searchProfiles',
  'ui.action.filter',
] as const;

export type PortalSemanticConceptKey = (typeof PORTAL_SEMANTIC_CONCEPT_KEYS)[number];

export type PortalSemanticConcept = {
  id: PortalSemanticConceptKey;
  label: string;
  description: string;
  semanticType: PortalSemanticType;
  uiRole: PortalUiRole;
  synonyms: readonly string[];
  values?: readonly string[];
  unit?: string;
  format?: string;
  seeAlso: readonly PortalSemanticConceptKey[];
};

export const PORTAL_SEMANTIC_CONCEPTS = [
  ...PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => ({
    id: page.id,
    label: page.label,
    description: page.description,
    semanticType: 'resource' as const,
    uiRole: 'heading' as const,
    synonyms: page.synonyms,
    seeAlso: ['ui.semantic.surface', 'ui.semantic.resources', 'ui.semantic.artifact'] as const,
  })),
  {
    id: 'ui.semantic.surface',
    label: 'Surface',
    description: 'Named portal, endpoint, board, or artifact being described or checked.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['target', 'endpoint', 'board'],
    seeAlso: ['ui.semantic.source', 'ui.semantic.resources'],
  },
  {
    id: 'ui.semantic.hostname',
    label: 'Hostname',
    description:
      'Network host resolved from a surface URL, without its protocol, port, path, or query.',
    semanticType: 'location',
    uiRole: 'code',
    synonyms: ['host', 'domain'],
    seeAlso: ['ui.semantic.port', 'ui.semantic.source'],
  },
  {
    id: 'ui.semantic.port',
    label: 'Port',
    description:
      'Network port resolved from a surface URL, using the protocol default when no port is explicit.',
    semanticType: 'location',
    uiRole: 'code',
    synonyms: ['service port'],
    seeAlso: ['ui.semantic.hostname', 'ui.semantic.source'],
  },
  {
    id: 'ui.semantic.status',
    label: 'Status',
    description:
      'Observed operational outcome reported by a source; status is evidence and does not encode presentation color.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['result', 'health state', 'outcome'],
    values: ['ok', 'active', 'monitored', 'attention', 'blocked', 'fail', 'unavailable', 'pending'],
    seeAlso: ['ui.semantic.tone', 'ui.semantic.source'],
  },
  {
    id: 'ui.semantic.tone',
    label: 'Tone',
    description:
      'Presentation token derived from status and evidence; tone controls color consistently without replacing status.',
    semanticType: 'presentation',
    uiRole: 'token',
    synonyms: ['color tone', 'severity color'],
    values: ['ok', 'warn', 'bad', 'info', 'skip'],
    seeAlso: ['ui.semantic.status', 'ui.semantic.type'],
  },
  {
    id: 'ui.semantic.kind',
    label: 'Kind',
    description:
      'Operational classification of a surface or check; distinct from the glossary concept kind used for provenance.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['check kind', 'probe class', 'operational kind'],
    values: ['edge-health', 'registry-bake', 'proof', 'board', 'inventory', 'ops-rollup', 'doctor'],
    seeAlso: ['ui.semantic.type', 'ui.semantic.plane'],
  },
  {
    id: 'ui.semantic.plane',
    label: 'Plane',
    description:
      'Control-plane ownership boundary responsible for producing or operating a surface.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['control plane', 'owner plane'],
    values: ['edge', 'public', 'document', 'operate', 'harness', 'infra'],
    seeAlso: ['ui.semantic.kind', 'ui.semantic.source'],
  },
  {
    id: 'ui.semantic.source',
    label: 'Source',
    description: 'Canonical path or location from which the displayed evidence was read.',
    semanticType: 'location',
    uiRole: 'link',
    synonyms: ['source path', 'origin path'],
    seeAlso: ['ui.semantic.hostname', 'ui.semantic.port', 'ui.semantic.artifact'],
  },
  {
    id: 'ui.semantic.version',
    label: 'Version',
    description:
      'Declared schema, runtime, proof, or artifact revision attached to the displayed evidence.',
    semanticType: 'version',
    uiRole: 'badge',
    synonyms: ['schema version', 'revision', 'runtime version'],
    seeAlso: ['ui.semantic.artifact', 'ui.semantic.package'],
  },
  {
    id: 'ui.semantic.resources',
    label: 'Resources',
    description:
      'Governed links that connect a surface to its artifact, package owner, and human documentation.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['mappings', 'references', 'ownership links'],
    seeAlso: ['ui.semantic.artifact', 'ui.semantic.package', 'ui.semantic.source'],
  },
  {
    id: 'ui.semantic.artifact',
    label: 'Artifact',
    description: 'Produced evidence consumed, maintained, delivered, or verified by the portal.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['bake', 'proof', 'output'],
    seeAlso: ['ui.semantic.package', 'ui.semantic.version', 'ui.semantic.resources'],
  },
  {
    id: 'ui.semantic.package',
    label: 'Package',
    description: 'Owning or producing package mapped to a portal surface or artifact.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['package owner', 'producer'],
    seeAlso: ['ui.semantic.artifact', 'ui.semantic.version', 'ui.semantic.resources'],
  },
  {
    id: 'ui.semantic.type',
    label: 'Semantic type',
    description:
      'Stable data role of a concept; distinct from operational kind and from its visual UI role.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['data role', 'semantic role', 'type'],
    values: [...PORTAL_SEMANTIC_TYPES],
    seeAlso: ['ui.semantic.kind', 'ui.semantic.tone'],
  },
  {
    id: 'ops.limits.account',
    label: 'Limit account',
    description:
      'Partner-tree account whose observed sportsbook limits, jurisdiction binding, and monitoring evidence are evaluated together. Same subject as ops.limits.node (UI says account; wire says node_id).',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner account', 'tree node', 'limit subject', 'node'],
    seeAlso: [
      'ops.limits.node',
      'ops.limits.roleType',
      'ops.limits.profile',
      'ops.limits.evidence_trace',
    ],
  },
  {
    id: 'ops.limits.node',
    label: 'Tree node',
    description:
      'One row in tree_nodes identified by TreeNodeId / node_id. Synonym for limit account; not an AI agent and not the Agent API.',
    semanticType: 'resource',
    uiRole: 'code',
    synonyms: ['node_id', 'TreeNodeId', 'tree_nodes row', 'account'],
    seeAlso: ['ops.limits.account', 'ops.limits.tree', 'ops.limits.roleType', 'ops.limits.agent'],
  },
  {
    id: 'ops.limits.tree',
    label: 'Partner tree',
    description:
      'Full hierarchy of partner accounts (partner → agent → sub_agent) used for limit, license, and downline context.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner hierarchy', 'account tree', 'tree_nodes'],
    seeAlso: [
      'ops.limits.node',
      'ops.limits.downline',
      'ops.limits.roleType',
      'section.downlineContext',
    ],
  },
  {
    id: 'ops.limits.downline',
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
  },
  {
    id: 'ops.limits.roleType',
    label: 'Role type',
    description:
      'Position of a tree node in the partner hierarchy. Wire field node_type: partner, agent, or sub_agent.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['node_type', 'tree role', 'account role'],
    values: ['partner', 'agent', 'sub_agent'],
    seeAlso: ['ops.limits.partner', 'ops.limits.agent', 'ops.limits.sub_agent', 'ops.limits.node'],
  },
  {
    id: 'ops.limits.partner',
    label: 'Partner',
    description:
      'Top-of-tree role in the partner hierarchy (node_type partner). Owns downline agents and sub-agents.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['master', 'partner root', 'node_type partner'],
    values: ['partner'],
    seeAlso: ['ops.limits.roleType', 'ops.limits.downline', 'ops.limits.agent', 'ops.limits.tree'],
  },
  {
    id: 'ops.limits.agent',
    label: 'Downline agent',
    description:
      'Betting downline role in the partner tree (node_type agent). Not an HTTP Agent API client and not a Cursor/AI automation agent.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['agent', 'node_type agent', 'downline agent'],
    values: ['agent'],
    seeAlso: ['ops.limits.sub_agent', 'ops.limits.partner', 'ops.limits.roleType', 'api.agent'],
  },
  {
    id: 'ops.limits.sub_agent',
    label: 'Sub-agent',
    description:
      'Further-downline role under an agent in the partner tree (node_type sub_agent). Still a limit account, not an automation agent.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['sub_agent', 'sub-agent', 'node_type sub_agent'],
    values: ['sub_agent'],
    seeAlso: ['ops.limits.agent', 'ops.limits.downline', 'ops.limits.roleType', 'ops.limits.node'],
  },
  {
    id: 'ops.limits.profile',
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
  },
  {
    id: 'ops.limits.jurisdiction_policy',
    label: 'Jurisdiction policy',
    description:
      'Effective state-scoped or account-scoped wagering rule projected from the regulatory limit authority.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['state limit rule', 'regulatory policy', 'policy binding'],
    seeAlso: ['ops.limits.policy_code', 'ops.limits.effective_limit', 'ops.limits.account'],
  },
  {
    id: 'ops.limits.policy_code',
    label: 'Policy code',
    description:
      'Stable internal code identifying a jurisdiction, sport, market, and optional account override without claiming an external legal citation.',
    semanticType: 'classification',
    uiRole: 'code',
    synonyms: ['regulation code', 'limit rule code'],
    seeAlso: ['ops.limits.jurisdiction_policy', 'ui.semantic.source', 'ui.semantic.version'],
  },
  {
    id: 'ops.limits.monitoring_status',
    label: 'Limit monitoring status',
    description:
      'Evidence-derived account state: monitored, attention, blocked, or incomplete; presentation tone is derived separately.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['profile health', 'account limit status'],
    values: ['monitored', 'attention', 'blocked', 'incomplete'],
    seeAlso: ['ops.limits.profile', 'ops.limits.evidence_trace', 'ui.semantic.tone'],
  },
  {
    id: 'ops.limits.evidence_trace',
    label: 'Limit evidence trace',
    description:
      'Time-ordered record of profile, license, policy, observed-limit, change, and blocked-wager evidence for one account.',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['limit trace', 'monitoring history', 'audit evidence'],
    seeAlso: ['ops.limits.account', 'ops.limits.monitoring_status', 'ui.semantic.artifact'],
  },
  {
    id: 'ops.limits.effective_limit',
    label: 'Effective limit',
    description:
      'Limit value currently applicable at an account, sportsbook, sport, market, bet-type, and jurisdiction intersection.',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: ['current limit', 'applicable limit', 'max wager'],
    unit: 'usd',
    format: 'currency:usd',
    seeAlso: ['ops.limits.jurisdiction_policy', 'ops.limits.profile', 'ui.semantic.source'],
  },
  {
    id: 'ops.limits.pattern_surface',
    label: 'Partner limit patterns',
    description:
      'Evidence surface grouping recent limit movement by partner tree, sportsbook, jurisdiction, and ZIP prefix.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['limit pattern board', 'partner limit board'],
    seeAlso: ['ops.limits.limit_delta', 'ops.limits.influence_score', 'ops.limits.prediction'],
  },
  {
    id: 'ops.limits.change_direction',
    label: 'Limit change direction',
    description:
      'Observed direction of a sportsbook limit change relative to the immediately previous limit.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['raise direction', 'limit movement'],
    values: ['raised', 'reduced'],
    seeAlso: ['ops.limits.limit_delta', 'ops.limits.effective_limit', 'ui.semantic.tone'],
  },
  {
    id: 'ops.limits.market_phase',
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
  },
  {
    id: 'ops.limits.sport',
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
    seeAlso: ['ops.limits.league', 'ops.limits.market_type', 'ops.limits.effective_limit'],
  },
  {
    id: 'ops.limits.league',
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
    seeAlso: ['ops.limits.sport', 'ops.limits.competition', 'ops.limits.event_country'],
  },
  {
    id: 'ops.limits.competition',
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
  },
  {
    id: 'ops.limits.event_country',
    label: 'Event host country',
    description:
      'ISO alpha-2 country where the event is played. This dimension owns the displayed country flag; global tours do not.',
    semanticType: 'location',
    uiRole: 'badge',
    synonyms: ['host country', 'event country', 'country_code'],
    seeAlso: ['ops.limits.sport', 'ops.limits.league', 'ops.limits.competition'],
  },
  {
    id: 'ops.limits.market_type',
    label: 'Market type',
    description:
      'Bet market family on the limit row. Values are scrape-wire SCRAPE_MARKET_KEYS (regulation + extended); domain definitions under market.* / scrape.market.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['market_id', 'market key', 'bet market', 'scrape.market'],
    values: ['match_winner', 'over_under', 'spread', 'player_prop', 'team_prop', 'futures'],
    seeAlso: ['ops.limits.sport', 'ops.limits.market_phase', 'ops.limits.multi_structure'],
  },
  {
    id: 'ops.limits.multi_structure',
    label: 'Multi / parlay structure',
    description:
      'How selections combine: straight single, or multi (parlay) with legs. Domain definitions live under multi.* in the glossary.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['parlay', 'accumulator', 'multi', 'leg'],
    values: ['straight', 'parlay', 'leg'],
    seeAlso: ['ops.limits.market_type', 'ops.limits.effective_limit', 'ops.limits.market_phase'],
  },
  {
    id: 'ops.limits.limit_delta',
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
    ],
  },
  {
    id: 'ops.limits.influence_score',
    label: 'Multi-factor influence',
    description:
      'Normalized contribution score joining activity, profitability, risk, compliance, and sportsbook context for a limit change.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['influence', 'multi-factor score', 'raise score'],
    unit: 'percent',
    format: 'percent:0',
    seeAlso: ['ops.limits.prediction', 'ops.limits.data_coverage', 'ops.limits.evidence_trace'],
  },
  {
    id: 'ops.limits.data_coverage',
    label: 'Pattern evidence coverage',
    description:
      'Percentage of expected hierarchy, geography, license, score, and proof connections present in the limit-pattern read model.',
    semanticType: 'state',
    uiRole: 'badge',
    synonyms: ['connection coverage', 'pattern coverage'],
    unit: 'percent',
    format: 'percent:0',
    seeAlso: ['ops.limits.evidence_trace', 'ops.limits.influence_score', 'ui.semantic.source'],
  },
  {
    id: 'ops.limits.prediction',
    label: 'Limit raise prediction',
    description:
      'Forecast of the probability and expected magnitude of a future limit raise using frequency, trend, influence, and time-window features.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['raise forecast', 'limit forecast'],
    seeAlso: ['ops.limits.influence_score', 'ops.limits.limit_delta', 'ops.limits.pattern_surface'],
  },
  {
    id: 'api.agent',
    label: 'Agent API',
    description:
      'HTTP surface for bots and tools under /api/agents/v1/… (for example limits raises/record). Distinct from ops.limits.agent (partner-tree downline role).',
    semanticType: 'resource',
    uiRole: 'link',
    synonyms: ['/api/agents', 'agent HTTP API', 'limits agent API'],
    seeAlso: [
      'ops.limits.agent',
      'ops.limits.pattern_surface',
      'ui.semantic.surface',
      'ui.semantic.artifact',
    ],
  },
  {
    id: 'section.accountLimitControl',
    label: 'Account limit control',
    description:
      'Section for searching, filtering, selecting, and tracing evidence-backed partner-tree account limit profiles.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner limit control', 'account controls'],
    seeAlso: ['page.limitPatterns', 'ops.limits.profile', 'ops.limits.monitoring_status'],
  },
  {
    id: 'section.complianceKpis',
    label: 'Compliance policy KPIs',
    description:
      'Section presenting governed compliance decision metrics derived from policies and blocked-wager evidence.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['compliance metrics', 'policy KPIs'],
    seeAlso: ['page.limitPatterns', 'ops.limits.jurisdiction_policy', 'ops.limits.evidence_trace'],
  },
  {
    id: 'section.jurisdictionCatalog',
    label: 'Jurisdiction policy catalog',
    description:
      'Section listing effective state and account policy codes, limits, enforcement actions, and source evidence.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['jurisdiction catalog', 'state policy catalog'],
    seeAlso: ['page.limitPatterns', 'section.limitRaisePrediction', 'section.dataConnectionAudit'],
  },
  {
    id: 'section.patternSummary',
    label: 'Pattern summary',
    description:
      'Section summarizing selected limit changes, direction, net movement, influence, connected nodes, and evidence coverage.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['limit summary', 'pattern metrics'],
    seeAlso: ['page.limitPatterns', 'ops.limits.pattern_surface', 'ops.limits.data_coverage'],
  },
  {
    id: 'section.limitRaisePrediction',
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
  },
  {
    id: 'section.sportsbookPatterns',
    label: 'Sportsbook patterns',
    description:
      'Section comparing change volume, direction, net movement, and influence across sportsbook sources.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['book patterns', 'sportsbook movement'],
    seeAlso: ['page.limitPatterns', 'ops.limits.pattern_surface', 'ops.limits.influence_score'],
  },
  {
    id: 'section.stateZipPatterns',
    label: 'State and ZIP patterns',
    description: 'Section comparing limit movement by jurisdiction and three-digit ZIP prefix.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['state and ZIP patterns', 'geographic limit patterns'],
    seeAlso: ['page.limitPatterns', 'ops.limits.jurisdiction_policy', 'section.downlineContext'],
  },
  {
    id: 'section.downlineContext',
    label: 'Partner to downline context',
    description:
      'Section preserving the partner-tree lineage, depth, jurisdiction, license, risk, and proof context for every observed node.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner downline context', 'tree context'],
    seeAlso: [
      'ops.limits.downline',
      'ops.limits.tree',
      'ops.limits.roleType',
      'section.stateZipPatterns',
    ],
  },
  {
    id: 'section.dataConnectionAudit',
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
  },
  {
    id: 'section.recentLimitChanges',
    label: 'Recent limit changes',
    description:
      'Section listing observed limit changes with account, geography, sportsbook, market, direction, influence, and time.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['recent changes', 'limit change table'],
    seeAlso: ['ops.limits.limit_delta', 'ops.limits.change_direction', 'section.perNodeBreakdown'],
  },
  {
    id: 'section.perNodeBreakdown',
    label: 'Per-node breakdown',
    description:
      'Section aggregating movement, influence, sportsbooks, violations, and proof completeness for each selected account node.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['node breakdown', 'account movement breakdown'],
    seeAlso: [
      'ops.limits.node',
      'ops.limits.roleType',
      'ops.limits.influence_score',
      'section.recentLimitChanges',
    ],
  },
  {
    id: 'section.openingBaseline',
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
  },
  {
    id: 'ui.filter.profile',
    label: 'Profile filter',
    description: 'Filter limiting the account-control view to matching profile evidence.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['filter by profile', 'profile selector'],
    seeAlso: ['ops.limits.profile', 'ui.action.searchProfiles', 'section.accountLimitControl'],
  },
  {
    id: 'ui.filter.jurisdiction',
    label: 'Jurisdiction filter',
    description: 'Filter limiting results to accounts or patterns governed by one jurisdiction.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['filter by jurisdiction', 'state filter'],
    seeAlso: ['ops.limits.jurisdiction_policy', 'ui.filter.state', 'section.jurisdictionCatalog'],
  },
  {
    id: 'ui.filter.partnerId',
    label: 'Account or partner filter',
    description:
      'Search filter matching account identifiers, partner identifiers, downline names, and profile text.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['filter by partner ID', 'account search'],
    seeAlso: ['ops.limits.account', 'ui.filter.profile', 'ui.action.filter'],
  },
  {
    id: 'ui.filter.sportsbook',
    label: 'Sportsbook filter',
    description: 'Filter limiting pattern evidence to one sportsbook source.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all sportsbooks', 'book filter'],
    seeAlso: ['section.sportsbookPatterns', 'ui.action.filter', 'ui.filter.partnerId'],
  },
  {
    id: 'ui.filter.state',
    label: 'State filter',
    description: 'Filter limiting pattern evidence to one state jurisdiction.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all states', 'jurisdiction state filter'],
    seeAlso: ['ui.filter.jurisdiction', 'ui.filter.zipPrefix', 'ui.action.filter'],
  },
  {
    id: 'ui.filter.zipPrefix',
    label: 'ZIP-prefix filter',
    description: 'Filter limiting pattern evidence to one connected three-digit ZIP prefix.',
    semanticType: 'classification',
    uiRole: 'chip',
    synonyms: ['all ZIP prefixes', 'ZIP cluster filter'],
    seeAlso: ['ui.filter.state', 'section.stateZipPatterns', 'ui.action.filter'],
  },
  {
    id: 'ui.action.reset',
    label: 'Reset filters',
    description: 'Action clearing the filters owned by the current portal section.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['reset', 'clear filters'],
    seeAlso: ['ui.action.filter', 'ui.filter.profile', 'ui.filter.jurisdiction'],
  },
  {
    id: 'ui.action.searchProfiles',
    label: 'Search profiles',
    description:
      'Action searching account limit profiles by identity, policy, and sportsbook text.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['profile search', 'find account profile'],
    seeAlso: ['ui.filter.profile', 'ops.limits.profile', 'section.accountLimitControl'],
  },
  {
    id: 'ui.action.filter',
    label: 'Apply filters',
    description: 'Action applying the current account, sportsbook, state, and ZIP filter state.',
    semanticType: 'presentation',
    uiRole: 'link',
    synonyms: ['filter', 'apply filter'],
    seeAlso: ['ui.filter.partnerId', 'ui.filter.sportsbook', 'ui.filter.state'],
  },
] as const satisfies readonly PortalSemanticConcept[];

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

export const LIMIT_FIELD_CONCEPTS = {
  account: 'ops.limits.account',
  node: 'ops.limits.node',
  tree: 'ops.limits.tree',
  downline: 'ops.limits.downline',
  roleType: 'ops.limits.roleType',
  partner: 'ops.limits.partner',
  agent: 'ops.limits.agent',
  subAgent: 'ops.limits.sub_agent',
  profile: 'ops.limits.profile',
  jurisdictionPolicy: 'ops.limits.jurisdiction_policy',
  policyCode: 'ops.limits.policy_code',
  monitoringStatus: 'ops.limits.monitoring_status',
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
  agentApi: 'api.agent',
} as const satisfies Record<string, PortalSemanticConceptKey>;

/** Map wire node_type values to glossary role concepts. */
export function glossaryConceptForNodeType(
  nodeType: string | null | undefined
): PortalSemanticConceptKey {
  switch (nodeType) {
    case 'partner':
      return 'ops.limits.partner';
    case 'agent':
      return 'ops.limits.agent';
    case 'sub_agent':
      return 'ops.limits.sub_agent';
    default:
      return 'ops.limits.roleType';
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

export const PARTNER_HISTORY_SURFACE_CONCEPTS = {
  page: 'page.partnerHistory',
  openingBaseline: 'section.openingBaseline',
} as const satisfies Record<string, PortalSemanticConceptKey>;

export function validatePortalSemanticVocabulary(): void {
  const keys = new Set<PortalSemanticConceptKey>();
  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    if (keys.has(concept.id)) {
      throw new Error(`Duplicate portal semantic concept: ${concept.id}`);
    }
    keys.add(concept.id);
  }
  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    for (const related of concept.seeAlso) {
      if (!keys.has(related)) {
        throw new Error(`Unknown portal semantic relation: ${concept.id} → ${related}`);
      }
      if (related === concept.id) {
        throw new Error(`Portal semantic concept cannot relate to itself: ${concept.id}`);
      }
    }
  }
}
