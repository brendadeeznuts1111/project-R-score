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
  windowFilter: 'ui.filter.window',
  window24h: 'ui.filter.window',
  window48h: 'ui.filter.window.48h',
  window7d: 'ui.filter.window.7d',
  window30d: 'ui.filter.window.30d',

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

  // P1 chrome — collapse skeletons / ARIA / freshness onto existing owners.
  // Presentation aliases only; do not mint parallel skeleton/aria/freshness IDs.
  skeletonTable: 'section.recentLimitChanges',
  skeletonFilters: 'ui.action.filter',
  skeletonMetrics: 'section.recentLimitChanges',
  skeletonEvidence: 'ops.limits.evidence_trace',
  skeletonBaseline: 'section.openingBaseline',
  skeletonRowField: 'ops.limits.account',
  skeletonRetry: 'ui.action.filter',

  ariaTableCaption: 'section.recentLimitChanges',
  ariaFilterToggle: 'ui.action.filter',
  ariaEvidenceVerified: 'ops.limits.evidence_trace',
  ariaProofMissing: 'ops.limits.evidence_trace',
  ariaExportProgress: 'ui.semantic.artifact',
  ariaLiveUpdate: 'section.recentLimitChanges',

  freshnessLive: 'ui.semantic.status',
  freshnessRecent: 'ui.semantic.status',
  freshnessSyncing: 'ui.semantic.status',
  freshnessStale: 'alert.stale_feed',
  freshnessOffline: 'alert.stale_feed',
  freshnessCached: 'ui.semantic.source',
  freshnessLastUpdated: 'ui.semantic.status',
});

/** Presentation copy for skeleton / freshness chrome (not separate glossary IDs). */
export const PARTNER_HISTORY_COPY = Object.freeze({
  skeletonTable: 'Loading limit history…',
  skeletonFilters: 'Loading filters…',
  skeletonMetrics: 'Calculating aggregates…',
  skeletonEvidence: 'Verifying signatures…',
  skeletonBaseline: 'Loading opening baseline…',
  skeletonRetry: 'Tap to retry',
  freshnessLive: 'Live',
  freshnessRecent: 'Recent',
  freshnessSyncing: 'Syncing',
  freshnessStale: 'Stale',
  freshnessOffline: 'Offline',
  freshnessCached: 'Cached',
});

/**
 * Future P2/P3 chrome aliases → existing owners.
 * Not wired into PARTNER_HISTORY_GLOSSARY until the UI exists (wiring gate).
 * Do not use parallel mint IDs as values.
 */
export const PARTNER_HISTORY_COLLAPSE_BACKLOG = Object.freeze({
  // Audit trail / changelog
  auditLimitDecreased: 'ops.limits.change_direction',
  auditLimitIncreased: 'ops.limits.change_direction',
  auditLimitFrozen: 'ops.limits.influence_score',
  auditEvidenceSigned: 'ops.limits.evidence_trace',
  auditEvidenceRevoked: 'ops.limits.evidence_trace',
  auditExportDownloaded: 'ui.semantic.artifact',
  auditFilterSaved: 'ui.action.filter',
  auditViewedAccount: 'ops.limits.account',
  auditFlaggedReview: 'ops.limits.influence_score',
  auditNoteAdded: 'ops.limits.account',

  // Bulk actions
  bulkSelectAll: 'ui.action.filter',
  bulkSelectPage: 'ui.action.filter',
  bulkDeselectAll: 'ui.action.reset',
  bulkSelectedCount: 'ui.action.filter',
  bulkExportSelected: 'ui.semantic.artifact',
  bulkSignEvidence: 'ops.limits.evidence_trace',
  bulkFreezeLimits: 'ops.limits.effective_limit',
  bulkApplyTag: 'ui.action.filter',
  bulkRemoveTag: 'ui.action.reset',
  bulkCompare: 'ops.limits.limit_delta',

  // Search / query
  searchPlaceholder: 'ui.action.searchProfiles',
  searchSyntaxHelp: 'ui.action.searchProfiles',
  searchNoResults: 'ui.action.filter',
  searchDidYouMean: 'ui.action.searchProfiles',
  searchRecentQuery: 'ui.action.filter',
  searchSavedQuery: 'ui.action.filter',
  searchQueryError: 'ui.action.searchProfiles',

  // Print
  printHeader: 'ui.semantic.artifact',
  printFooter: 'ui.semantic.artifact',
  printPageNumber: 'ui.semantic.artifact',
  printGeneratedAt: 'ui.semantic.status',
  printConfidential: 'ui.semantic.artifact',
  printOperatorId: 'ops.limits.role_type',

  // Alerts (reuse existing alert.* / telegram topic)
  alertSlackLimit: 'alert.severity',
  alertEmailDigest: 'alert.delivery',
  alertTelegramUrgent: 'telegram.topic.alerts',
  alertDashboardBadge: 'alert.severity',
  alertPush: 'alert.delivery',

  // Intelligence badges
  intelUnusualPattern: 'ops.limits.influence_score',
  intelCluster: 'ops.limits.pattern_surface',
  intelVelocity: 'ops.limits.influence_score',
  intelCorrelated: 'ops.limits.influence_score',
  intelManualOverride: 'ops.limits.prediction',
  intelSystemRecommendation: 'ops.limits.prediction',

  // Diff / compare
  diffCompareMode: 'ops.limits.limit_delta',
  diffBefore: 'ops.limits.effective_limit',
  diffAfter: 'ops.limits.effective_limit',
  diffDelta: 'ops.limits.limit_delta',
  diffSideBySide: 'ops.limits.limit_delta',
  diffOverlay: 'ops.limits.limit_delta',

  // Time formatting (presentation of observed window)
  timeNow: 'section.recentLimitChanges',
  timeMinutesAgo: 'section.recentLimitChanges',
  timeHoursAgo: 'section.recentLimitChanges',
  timeDaysAgo: 'section.recentLimitChanges',
  timeAbsoluteShort: 'section.recentLimitChanges',
  timeAbsoluteLong: 'section.recentLimitChanges',
  timeIsoTooltip: 'section.recentLimitChanges',

  // Permission gates
  roleAdmin: 'ops.limits.role_type',
  roleOperator: 'ops.limits.role_type',
  roleAnalyst: 'ops.limits.role_type',
  roleViewer: 'ops.limits.role_type',
  roleSystem: 'ops.limits.role_type',
});

export function partnerHistoryGlossaryHref(concept) {
  return `/portal/glossary/#glossary:${encodeURIComponent(concept)}`;
}

/**
 * Classify snapshot age into a freshness chrome key.
 * @param {number | null | undefined} ageMs
 * @param {{ offline?: boolean; syncing?: boolean; cached?: boolean }} [flags]
 */
export function classifyFreshness(ageMs, flags = {}) {
  if (flags.offline) return 'freshnessOffline';
  if (flags.syncing) return 'freshnessSyncing';
  if (flags.cached) return 'freshnessCached';
  if (ageMs == null || !Number.isFinite(ageMs) || ageMs < 0) return 'freshnessRecent';
  if (ageMs < 5_000) return 'freshnessLive';
  if (ageMs < 60_000) return 'freshnessRecent';
  if (ageMs < 5 * 60_000) return 'freshnessStale';
  return 'freshnessStale';
}
