/**
 * Portal semantic vocabulary.
 *
 * Domain concepts remain owned by Kalshi-bot/src/institutions/glossary.ts.
 * This module owns cross-portal UI field semantics so labels, roles, and
 * operational values do not drift between boards.
 */

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
  'ops.limits.profile',
  'ops.limits.jurisdiction_policy',
  'ops.limits.policy_code',
  'ops.limits.monitoring_status',
  'ops.limits.evidence_trace',
  'ops.limits.effective_limit',
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
  seeAlso: readonly PortalSemanticConceptKey[];
};

export const PORTAL_SEMANTIC_CONCEPTS = [
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
    values: ['ok', 'attention', 'fail', 'unavailable', 'pending'],
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
    values: ['ok', 'warn', 'bad', 'skip'],
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
      'Partner-tree account whose observed sportsbook limits, jurisdiction binding, and monitoring evidence are evaluated together.',
    semanticType: 'resource',
    uiRole: 'heading',
    synonyms: ['partner account', 'tree node', 'limit subject'],
    seeAlso: ['ops.limits.profile', 'ops.limits.evidence_trace', 'ui.semantic.resources'],
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
    seeAlso: ['ops.limits.jurisdiction_policy', 'ops.limits.profile', 'ui.semantic.source'],
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
  profile: 'ops.limits.profile',
  jurisdictionPolicy: 'ops.limits.jurisdiction_policy',
  policyCode: 'ops.limits.policy_code',
  monitoringStatus: 'ops.limits.monitoring_status',
  evidenceTrace: 'ops.limits.evidence_trace',
  effectiveLimit: 'ops.limits.effective_limit',
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
