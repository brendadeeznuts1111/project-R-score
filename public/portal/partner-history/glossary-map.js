/**
 * Canonical glossary ownership for Partner Limit History chrome.
 *
 * Related labels intentionally collapse onto existing concepts. Raises,
 * decreases, and direction are presentations of ops.limits.change_direction;
 * CSV, JSON, and export are presentations of a registry artifact. Table column
 * labels map onto ops.limits.* / scrape.book / accounting.* — never invent
 * parallel ops.field.*, ops.filter.*, ops.metric.*, or ops.table.* vocabularies.
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

  // Table columns (limit-changes-card)
  accountColumn: 'ops.limits.account',
  directionColumn: 'ops.limits.change_direction',
  sportsbookColumn: 'scrape.book',
  sportColumn: 'ops.limits.sport',
  leagueColumn: 'ops.limits.league',
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

  // Account activity (joined from growth / partner-ops)
  depositsColumn: 'accounting.deposit',
  withdrawsColumn: 'accounting.withdrawal',
  betVolumeColumn: 'ops.limits.pattern_surface',
  betsPlacedColumn: 'ops.limits.pattern_surface',
  betsWonColumn: 'ops.limits.pattern_surface',
  avgWagerColumn: 'ops.limits.effective_limit',

  refresh: 'ui.action.filter',
  reset: 'ui.action.reset',
  export: 'ui.semantic.artifact',
  csv: 'ui.semantic.artifact',
  json: 'ui.semantic.artifact',

  // Account-scoped pattern / betlog download (raises + factors — not Soft ticker)
  betlog: 'ops.limits.pattern_surface',
  betlogCsv: 'ui.semantic.artifact',
  betlogJsonl: 'ui.semantic.artifact',
});

export function partnerHistoryGlossaryHref(concept) {
  return `/portal/glossary/#glossary:${encodeURIComponent(concept)}`;
}
