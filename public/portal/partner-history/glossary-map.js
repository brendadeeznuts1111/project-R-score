/**
 * Canonical glossary ownership for Partner Limit History chrome.
 *
 * Related labels intentionally collapse onto existing concepts. Raises,
 * decreases, and direction are presentations of ops.limits.change_direction;
 * CSV, JSON, and export are presentations of a registry artifact. Table column
 * labels map onto ops.limits.* / ui.filter.* — never invent parallel
 * ops.field.*, ops.filter.*, ops.metric.*, or ops.table.* vocabularies.
 *
 * Domain concepts ops.limits.opening_baseline and ops.limits.baseline_tier are
 * owned by lib/operations (baked via tools/domain-glossary.ts), not duplicated here.
 */
export const PARTNER_HISTORY_GLOSSARY = Object.freeze({
  page: 'page.partnerHistory',
  limitOverview: 'page.limitPatterns',
  summary: 'page.partnerHistory',

  accountFilter: 'ops.limits.account',
  allAccounts: 'ui.filter.partnerId',
  sportsbookFilter: 'ui.filter.sportsbook',
  allSportsbooks: 'ui.filter.sportsbook',
  directionFilter: 'ops.limits.change_direction',
  directionIncrease: 'ops.limits.change_direction',
  directionDecrease: 'ops.limits.change_direction',
  windowFilter: 'section.recentLimitChanges',
  window24h: 'section.recentLimitChanges',
  window48h: 'section.recentLimitChanges',
  window7d: 'section.recentLimitChanges',
  window30d: 'section.recentLimitChanges',

  visibleChanges: 'section.recentLimitChanges',
  raises: 'ops.limits.change_direction',
  decreases: 'ops.limits.change_direction',
  netChange: 'ops.limits.limit_delta',
  avgInfluence: 'ops.limits.influence_score',
  sportsbooks: 'ui.filter.sportsbook',
  dataCoverage: 'ops.limits.data_coverage',
  highWater: 'ops.limits.limit_delta',
  deltas: 'ops.limits.limit_delta',
  activeFilters: 'ui.action.filter',

  recentChanges: 'section.recentLimitChanges',
  perAccount: 'section.perNodeBreakdown',
  openingBaseline: 'section.openingBaseline',
  limitChanges: 'section.recentLimitChanges',

  // Table columns (limit-changes-card). Labels must match glossary meaning —
  // never bare "Type" / "Book" / "When". Wire field bet_type is overloaded:
  // straight|parlay → multi_structure; pregame|live → market_phase.
  accountColumn: 'ops.limits.account',
  directionColumn: 'ops.limits.change_direction',
  sportsbookColumn: 'ui.filter.sportsbook',
  sportColumn: 'ops.limits.sport',
  marketTypeColumn: 'ops.limits.market_type',
  structureColumn: 'ops.limits.multi_structure',
  phaseColumn: 'ops.limits.market_phase',
  priorLimitColumn: 'ops.limits.effective_limit',
  newLimitColumn: 'ops.limits.effective_limit',
  deltaColumn: 'ops.limits.limit_delta',
  influenceColumn: 'ops.limits.influence_score',
  factorsColumn: 'ops.limits.influence_score',
  evidenceColumn: 'ops.limits.evidence_trace',
  observedColumn: 'section.recentLimitChanges',
  predictionColumn: 'ops.limits.prediction',

  refresh: 'ui.action.filter',
  reset: 'ui.action.reset',
  export: 'ui.semantic.artifact',
  csv: 'ui.semantic.artifact',
  json: 'ui.semantic.artifact',
});

export function partnerHistoryGlossaryHref(concept) {
  return `/portal/glossary/#glossary:${encodeURIComponent(concept)}`;
}
