/**
 * Canonical glossary ownership for Account dossier chrome.
 *
 * Labels collapse onto existing page.accountDossier / ops.limits.* /
 * section.* / telegram.* concepts — never invent parallel account.* vocabularies.
 *
 * Hash routes (aligned with limits board):
 *   #account:{TreeNodeId}
 *   #section:{identity|tree|location|traces|policies|telemetry|changes|outs|telegram|accounting}
 * Query stays the form SSOT: ?account= · ?hours=
 */
export const ACCOUNT_DOSSIER_GLOSSARY = Object.freeze({
  page: 'page.accountDossier',
  history: 'page.partnerHistory',
  limits: 'page.limitPatterns',
  partners: 'page.partners',

  accountFilter: 'ops.limits.account',
  windowFilter: 'section.recentLimitChanges',

  identity: 'ops.limits.account',
  roleType: 'ops.limits.roleType',
  partner: 'ops.limits.partner',
  agent: 'ops.limits.agent',
  subAgent: 'ops.limits.sub_agent',
  tree: 'section.downlineContext',
  downline: 'ops.limits.downline',
  location: 'ops.limits.jurisdiction_policy',
  policyCode: 'ops.limits.policy_code',
  traces: 'ops.limits.evidence_trace',
  monitoring: 'ops.limits.monitoring_status',
  profile: 'ops.limits.profile',
  telemetry: 'ops.limits.pattern_surface',
  changes: 'section.recentLimitChanges',
  outs: 'section.partnersOuts',
  telegram: 'section.partnersTelegram',
  accounting: 'section.partnersAccounting',
  handshake: 'telegram.handshake',
  wire: 'telegram.wire',
  topicGeneral: 'telegram.topic.general',
  topicOps: 'telegram.topic.ops',
  topicAlerts: 'telegram.topic.alerts',
  topicLiquidity: 'telegram.topic.liquidity',
  topicAccounting: 'telegram.topic.accounting',
  influence: 'ops.limits.influence_score',
  delta: 'ops.limits.limit_delta',
  effectiveLimit: 'ops.limits.effective_limit',

  betlog: 'ops.limits.pattern_surface',
  betlogCsv: 'ui.semantic.artifact',
  betlogJsonl: 'ui.semantic.artifact',
  registry: 'ui.semantic.artifact',
});

/** Section keys for `#section:` hashes — must match id="ad-section-{key}". */
export const ACCOUNT_DOSSIER_SECTIONS = Object.freeze([
  'identity',
  'tree',
  'location',
  'traces',
  'policies',
  'telemetry',
  'changes',
  'outs',
  'telegram',
  'accounting',
]);

/** Forum topic → glossary concept (partner package plan). */
export const ACCOUNT_DOSSIER_TOPIC_CONCEPTS = Object.freeze({
  general: 'telegram.topic.general',
  ops: 'telegram.topic.ops',
  alerts: 'telegram.topic.alerts',
  liquidity: 'telegram.topic.liquidity',
  accounting: 'telegram.topic.accounting',
});

export function accountDossierGlossaryHref(concept) {
  return `/portal/glossary/#glossary:${encodeURIComponent(concept)}`;
}
