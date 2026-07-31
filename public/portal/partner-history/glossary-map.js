/**
 * Canonical glossary ownership for Partner Limit History chrome.
 *
 * Related labels intentionally collapse onto existing concepts. Raises,
 * decreases, and direction are presentations of ops.limits.change_direction;
 * CSV, JSON, and export are presentations of a registry artifact. Keeping the
 * aliases here prevents parallel ops.filter.*, ops.metric.*, and ops.table.*
 * vocabularies from drifting away from the domain glossary.
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
  proofCoverage: 'ops.limits.data_coverage',
  highWater: 'ops.limits.limit_delta',
  deltas: 'ops.limits.limit_delta',
  activeFilters: 'ui.action.filter',

  recentChanges: 'section.recentLimitChanges',
  perAccount: 'section.perNodeBreakdown',
  openingBaseline: 'section.openingBaseline',
  limitChanges: 'section.recentLimitChanges',

  refresh: 'ui.action.filter',
  reset: 'ui.action.reset',
  export: 'ui.semantic.artifact',
  csv: 'ui.semantic.artifact',
  json: 'ui.semantic.artifact',
});

export function partnerHistoryGlossaryHref(concept) {
  return `/portal/glossary/#glossary:${encodeURIComponent(concept)}`;
}
