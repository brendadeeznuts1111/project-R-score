# Portal surface coverage map

Human-readable view of **board surface inventories** and **HTML/JS usage**
from the same SSOT as `bun run validate:surface-coverage`.

| Generated | `2026-08-05T11:56:03.174Z` |
| --- | --- |
| Boards | partner-history · partners · limits · account |
| Validator | [`scripts/validate-surface-coverage.ts`](../scripts/validate-surface-coverage.ts) |
| Refresh | `bun run surface-coverage:map` |

## Board summary

| Board | Files scanned | Usages | Surface allowlist | Dead allowlist (unused chrome) |
| --- | ---: | ---: | ---: | ---: |
| partner-history | 5 | 244 | 34 | 23 |
| partners | 3 | 86 | 11 | 0 |
| limits | 2 | 101 | 21 | 1 |
| account | 3 | 148 | 14 | 2 |

## Surface inventory (declared dependencies)

Each board declares concept ids via surface maps in
`lib/portal/semantic-vocabulary.ts`. These are **allowlisted** chrome
ids; HTML may bind a subset (partner-history collapses many metrics onto
shared `ui.filter.*` / `ops.limits.*` owners).

### `partner-history`

| Surface key | Concept id |
| --- | --- |
| `lifecycleState` | `ops.limits.lifecycle_state` |
| `metricActiveFilters` | `ops.metric.active_filters` |
| `metricDecreases` | `ops.metric.decreases` |
| `metricDeltas` | `ops.metric.deltas` |
| `metricHighWater` | `ops.metric.high_water` |
| `metricProofCoverage` | `ops.metric.proof_coverage` |
| `metricRaises` | `ops.metric.raises` |
| `metricSportsbooks` | `ops.metric.sportsbooks` |
| `metricVisibleChanges` | `ops.metric.visible_changes` |
| `panelLimitOverview` | `ops.panel.limit_overview` |
| `panelPartnerLimitHistory` | `ops.panel.partner_limit_history` |
| `summaryPartnerLimitTrace` | `ops.summary.partner_limit_trace` |
| `tableLimitChanges` | `ops.table.limit_changes` |
| `tablePerAccount` | `ops.table.per_account` |
| `tableRecentChanges` | `ops.table.recent_changes` |
| `page` | `page.partnerHistory` |
| `openingBaseline` | `section.openingBaseline` |
| `perNodeBreakdown` | `section.perNodeBreakdown` |
| `recentLimitChanges` | `section.recentLimitChanges` |
| `actionExport` | `ui.action.export` |
| `actionFilter` | `ui.action.filter` |
| `actionRefresh` | `ui.action.refresh` |
| `actionReset` | `ui.action.reset` |
| `exportCsv` | `ui.export.csv` |
| `exportJson` | `ui.export.json` |
| `filterAccountAll` | `ui.filter.partnerId` |
| `filterSportsbookAll` | `ui.filter.sportsbook` |
| `filterWindow` | `ui.filter.window` |
| `filterWindow30d` | `ui.filter.window.30d` |
| `filterWindow48h` | `ui.filter.window.48h` |
| `filterWindow7d` | `ui.filter.window.7d` |
| `artifact` | `ui.semantic.artifact` |
| `source` | `ui.semantic.source` |
| `status` | `ui.semantic.status` |

### `partners`

| Surface key | Concept id |
| --- | --- |
| `page` | `page.partners` |
| `accounting` | `section.partnersAccounting` |
| `accountsLimits` | `section.partnersAccountsLimits` |
| `bookDetail` | `section.partnersBookDetail` |
| `deposits` | `section.partnersDeposits` |
| `onboard` | `section.partnersOnboard` |
| `outs` | `section.partnersOuts` |
| `partnerMessage` | `section.partnersPartnerMessage` |
| `tags` | `section.partnersTags` |
| `telegram` | `section.partnersTelegram` |
| `partnerHashRoute` | `ui.route.partnerHash` |

### `limits`

| Surface key | Concept id |
| --- | --- |
| `page` | `page.limitPatterns` |
| `accountControl` | `section.accountLimitControl` |
| `complianceKpis` | `section.complianceKpis` |
| `dataConnectionAudit` | `section.dataConnectionAudit` |
| `downlineContext` | `section.downlineContext` |
| `jurisdictionCatalog` | `section.jurisdictionCatalog` |
| `prediction` | `section.limitRaisePrediction` |
| `patternSummary` | `section.patternSummary` |
| `perNodeBreakdown` | `section.perNodeBreakdown` |
| `recentLimitChanges` | `section.recentLimitChanges` |
| `sportsbookPatterns` | `section.sportsbookPatterns` |
| `stateZipPatterns` | `section.stateZipPatterns` |
| `filterAction` | `ui.action.filter` |
| `resetAction` | `ui.action.reset` |
| `searchProfilesAction` | `ui.action.searchProfiles` |
| `jurisdictionFilter` | `ui.filter.jurisdiction` |
| `partnerFilter` | `ui.filter.partnerId` |
| `profileFilter` | `ui.filter.profile` |
| `sportsbookFilter` | `ui.filter.sportsbook` |
| `stateFilter` | `ui.filter.state` |
| `zipFilter` | `ui.filter.zipPrefix` |

### `account`

| Surface key | Concept id |
| --- | --- |
| `identity` | `ops.limits.account` |
| `traces` | `ops.limits.evidence_trace` |
| `activity` | `ops.limits.evidence_trace` |
| `location` | `ops.limits.jurisdiction_policy` |
| `lifecycle` | `ops.limits.lifecycle_state` |
| `monitoring` | `ops.limits.monitoring_status` |
| `telemetry` | `ops.limits.pattern_surface` |
| `policies` | `ops.limits.policy_code` |
| `profile` | `ops.limits.profile` |
| `page` | `page.accountDossier` |
| `tree` | `section.downlineContext` |
| `accounting` | `section.partnersAccounting` |
| `outs` | `section.partnersOuts` |
| `telegram` | `section.partnersTelegram` |
| `changes` | `section.recentLimitChanges` |
| `window` | `section.recentLimitChanges` |

## Infrastructure API inventory (`API_INFRA_CONCEPTS`)

Shared HTTP / feed surfaces — not desk field chrome. Referenced via
`seeAlso` from domain concepts; included in surface-coverage shared ids.

| Alias | Concept id |
| --- | --- |
| `agentApi` | `api.agent` |
| `bookmakerFeedApi` | `api.bookmaker_feed` |
| `identityApi` | `api.identity` |
| `limitCacheApi` | `api.limit_cache` |
| `limitEventsApi` | `api.limit_events` |
| `partnerApi` | `api.partner` |
| `predictionApi` | `api.prediction` |

## Usage (top concepts per board)

Counted from `data-glossary-concept` attributes and `#glossary:` hrefs
(plus glossary-map template refs).

### `partner-history`

| Concept | Count | Sample files |
| --- | ---: | --- |
| `section.recentLimitChanges` | 41 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ops.limits.change_direction` | 17 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ui.action.filter` | 17 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ops.limits.evidence_trace` | 15 | `public/portal/components/limit-changes-card.js` |
| `ui.semantic.artifact` | 15 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ops.limits.limit_delta` | 14 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ops.limits.influence_score` | 9 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `section.openingBaseline` | 9 | `public/portal/partner-history/index.html` |
| `ops.limits.effective_limit` | 8 | `public/portal/components/limit-changes-card.js` |
| `ops.limits.pattern_surface` | 8 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ops.limits.account` | 7 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ui.filter.sportsbook` | 7 | `public/portal/partner-history/index.html` |
| `ops.limits.market_phase` | 6 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `page.partnerHistory` | 6 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `ops.limits.multi_structure` | 5 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `page.partners` | 5 | `public/portal/partner-history/index.html` |
| `ui.semantic.status` | 5 | `public/portal/partner-history/index.html` |
| `ops.limits.league` | 4 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/sport-league-map.js` |
| `ops.limits.prediction` | 4 | `public/portal/components/limit-changes-card.js` |
| `page.limitPatterns` | 4 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/index.html` |
| `section.perNodeBreakdown` | 4 | `public/portal/partner-history/index.html` |
| `ops.limits.market_type` | 3 | `public/portal/components/limit-changes-card.js` |
| `ops.limits.sport` | 3 | `public/portal/components/limit-changes-card.js`, `public/portal/partner-history/sport-league-map.js` |
| `scrape.book` | 3 | `public/portal/components/limit-changes-card.js` |
| `accounting.deposit` | 2 | `public/portal/components/limit-changes-card.js` |
| `accounting.withdrawal` | 2 | `public/portal/components/limit-changes-card.js` |
| `alert.stale_feed` | 2 | `public/portal/partner-history/index.html` |
| `ops.limits.baseline_tier` | 2 | `public/portal/partner-history/index.html` |
| `ops.limits.data_coverage` | 2 | `public/portal/partner-history/index.html` |
| `page.toc` | 2 | `public/portal/partner-history/index.html` |
| `ui.filter.partnerId` | 2 | `public/portal/partner-history/index.html` |
| `api.agent` | 1 | `public/portal/partner-history/index.html` |
| `multi.parlay` | 1 | `public/portal/partner-history/index.html` |
| `ops.limits.agent` | 1 | `public/portal/partner-history/index.html` |
| `ops.limits.node` | 1 | `public/portal/partner-history/index.html` |
| `ops.limits.opening_baseline` | 1 | `public/portal/partner-history/index.html` |
| `ops.limits.partner` | 1 | `public/portal/partner-history/index.html` |
| `ops.limits.sub_agent` | 1 | `public/portal/partner-history/index.html` |
| `page.accountDossier` | 1 | `public/portal/partner-history/index.html` |
| `section.partnersAccounting` | 1 | `public/portal/partner-history/index.html` |

_…2 more concepts_

**Allowlisted but unused in HTML** (inventory / collapse backlog):

- `ops.limits.lifecycle_state`
- `ops.metric.active_filters`
- `ops.metric.decreases`
- `ops.metric.deltas`
- `ops.metric.high_water`
- `ops.metric.proof_coverage`
- `ops.metric.raises`
- `ops.metric.sportsbooks`
- `ops.metric.visible_changes`
- `ops.panel.limit_overview`
- `ops.panel.partner_limit_history`
- `ops.summary.partner_limit_trace`
- `ops.table.limit_changes`
- `ops.table.per_account`
- `ops.table.recent_changes`
- `ui.action.export`
- `ui.action.refresh`
- `ui.export.csv`
- `ui.export.json`
- `ui.filter.window`
- `ui.filter.window.30d`
- `ui.filter.window.48h`
- `ui.filter.window.7d`

### `partners`

| Concept | Count | Sample files |
| --- | ---: | --- |
| `ops.view.per_play` | 7 | `public/portal/partners/index.html` |
| `out.status.ready` | 5 | `public/portal/partners/index.html` |
| `page.partners` | 5 | `public/portal/partners/index.html` |
| `ops.view.per_book_type` | 4 | `public/portal/partners/index.html` |
| `ops.view.per_week` | 4 | `public/portal/partners/index.html` |
| `telegram.handshake` | 4 | `public/portal/partners/index.html` |
| `telegram.seat_desk` | 4 | `public/portal/partners/index.html` |
| `accounting.free_roll` | 3 | `public/portal/partners/index.html` |
| `ops.limits.effective_limit` | 3 | `public/portal/partners/index.html` |
| `section.partnersAccounting` | 3 | `public/portal/partners/index.html` |
| `section.partnersAccountsLimits` | 3 | `public/portal/partners/index.html` |
| `section.partnersBookDetail` | 3 | `public/portal/partners/index.html` |
| `section.partnersDeposits` | 3 | `public/portal/partners/index.html` |
| `section.partnersOnboard` | 3 | `public/portal/partners/index.html` |
| `section.partnersOuts` | 3 | `public/portal/partners/index.html` |
| `section.partnersPartnerMessage` | 3 | `public/portal/partners/index.html` |
| `section.partnersTags` | 3 | `public/portal/partners/index.html` |
| `section.partnersTelegram` | 3 | `public/portal/partners/index.html` |
| `ui.route.partnerHash` | 3 | `public/portal/partners/index.html` |
| `book.type.legal` | 2 | `public/portal/partners/index.html` |
| `ops.view.per_account` | 2 | `public/portal/partners/index.html` |
| `scrape.book` | 2 | `public/portal/partners/index.html` |
| `telegram.deposit_rail` | 2 | `public/portal/partners/index.html` |
| `telegram.forum.topic.accounting` | 2 | `public/portal/partners/index.html` |
| `telegram.surface.all_accounting` | 2 | `public/portal/partners/index.html` |
| `telegram.wire` | 2 | `public/portal/partners/index.html` |
| `ops.limits.opening_baseline` | 1 | `public/portal/partners/index.html` |
| `ops.view.account_summary` | 1 | `public/portal/partners/index.html` |
| `page.accountDossier` | 1 | `public/portal/partners/index.html` |

### `limits`

| Concept | Count | Sample files |
| --- | ---: | --- |
| `ops.limits.influence_score` | 6 | `public/portal/limits/index.html` |
| `ui.semantic.status` | 6 | `public/portal/limits/index.html`, `public/portal/limits/limit-profiles.js` |
| `ops.limits.account` | 5 | `public/portal/limits/index.html` |
| `ops.limits.baseline_tier` | 5 | `public/portal/limits/index.html` |
| `ops.limits.jurisdiction_policy` | 5 | `public/portal/limits/index.html` |
| `ops.limits.change_direction` | 4 | `public/portal/limits/index.html` |
| `ops.limits.evidence_trace` | 4 | `public/portal/limits/index.html` |
| `ops.limits.market_type` | 4 | `public/portal/limits/index.html`, `public/portal/limits/limit-profiles.js` |
| `ops.limits.sport` | 4 | `public/portal/limits/index.html`, `public/portal/limits/limit-profiles.js` |
| `ops.limits.effective_limit` | 3 | `public/portal/limits/index.html` |
| `ops.limits.limit_delta` | 3 | `public/portal/limits/index.html` |
| `ops.limits.monitoring_status` | 3 | `public/portal/limits/index.html`, `public/portal/limits/limit-profiles.js` |
| `ui.filter.sportsbook` | 3 | `public/portal/limits/index.html` |
| `ops.limits.market_phase` | 2 | `public/portal/limits/index.html` |
| `ops.limits.profile` | 2 | `public/portal/limits/index.html` |
| `section.accountLimitControl` | 2 | `public/portal/limits/index.html` |
| `section.dataConnectionAudit` | 2 | `public/portal/limits/index.html` |
| `section.downlineContext` | 2 | `public/portal/limits/index.html` |
| `section.limitRaisePrediction` | 2 | `public/portal/limits/index.html` |
| `section.patternSummary` | 2 | `public/portal/limits/index.html` |
| `section.perNodeBreakdown` | 2 | `public/portal/limits/index.html` |
| `section.recentLimitChanges` | 2 | `public/portal/limits/index.html` |
| `section.sportsbookPatterns` | 2 | `public/portal/limits/index.html` |
| `section.stateZipPatterns` | 2 | `public/portal/limits/index.html` |
| `ui.action.searchProfiles` | 2 | `public/portal/limits/index.html` |
| `ui.filter.partnerId` | 2 | `public/portal/limits/index.html` |
| `ui.filter.window` | 2 | `public/portal/limits/index.html` |
| `ui.filter.zipPrefix` | 2 | `public/portal/limits/index.html` |
| `ops.limits.data_coverage` | 1 | `public/portal/limits/index.html` |
| `ops.limits.downline` | 1 | `public/portal/limits/index.html` |
| `ops.limits.node` | 1 | `public/portal/limits/index.html` |
| `ops.limits.opening_baseline` | 1 | `public/portal/limits/index.html` |
| `ops.limits.policy_code` | 1 | `public/portal/limits/index.html` |
| `page.limitPatterns` | 1 | `public/portal/limits/index.html` |
| `scrape.book` | 1 | `public/portal/limits/index.html` |
| `scrape.wire` | 1 | `public/portal/limits/index.html` |
| `section.complianceKpis` | 1 | `public/portal/limits/index.html` |
| `section.jurisdictionCatalog` | 1 | `public/portal/limits/index.html` |
| `ui.action.filter` | 1 | `public/portal/limits/index.html` |
| `ui.action.reset` | 1 | `public/portal/limits/index.html` |

_…4 more concepts_

**Allowlisted but unused in HTML** (inventory / collapse backlog):

- `ui.filter.profile`

### `account`

| Concept | Count | Sample files |
| --- | ---: | --- |
| `telegram.handshake` | 10 | `public/portal/account/index.html` |
| `ops.view.per_play` | 9 | `public/portal/account/index.html` |
| `ops.limits.account` | 8 | `public/portal/account/index.html` |
| `section.partnersTelegram` | 8 | `public/portal/account/index.html` |
| `ops.view.account_deposits` | 7 | `public/portal/account/index.html` |
| `ops.view.per_account` | 7 | `public/portal/account/index.html` |
| `ops.view.account_summary` | 6 | `public/portal/account/index.html` |
| `ops.view.per_book_type` | 6 | `public/portal/account/index.html` |
| `ops.view.per_week` | 6 | `public/portal/account/index.html` |
| `section.recentLimitChanges` | 6 | `public/portal/account/index.html` |
| `telegram.wire` | 6 | `public/portal/account/index.html` |
| `ops.limits.evidence_trace` | 5 | `public/portal/account/index.html` |
| `page.partners` | 5 | `public/portal/account/index.html` |
| `section.partnersAccounting` | 4 | `public/portal/account/index.html` |
| `ui.semantic.artifact` | 4 | `public/portal/account/index.html` |
| `ops.limits.pattern_surface` | 3 | `public/portal/account/index.html` |
| `ops.view.account_credit` | 3 | `public/portal/account/index.html` |
| `ops.view.account_freeplay` | 3 | `public/portal/account/index.html` |
| `ops.view.account_net` | 3 | `public/portal/account/index.html` |
| `ops.view.account_settlements` | 3 | `public/portal/account/index.html` |
| `page.accountDossier` | 3 | `public/portal/account/index.html` |
| `page.limitPatterns` | 3 | `public/portal/account/index.html` |
| `page.partnerHistory` | 3 | `public/portal/account/index.html` |
| `partner.ops.event` | 3 | `public/portal/account/index.html` |
| `accounting.deposit` | 2 | `public/portal/account/index.html` |
| `event.deposit.received` | 2 | `public/portal/account/index.html` |
| `ops.limits.jurisdiction_policy` | 2 | `public/portal/account/index.html` |
| `ops.limits.policy_code` | 2 | `public/portal/account/index.html` |
| `section.downlineContext` | 2 | `public/portal/account/index.html` |
| `section.partnersOuts` | 2 | `public/portal/account/index.html` |
| `telegram.message.alert` | 2 | `public/portal/account/index.html` |
| `telegram.message.command` | 2 | `public/portal/account/index.html` |
| `ops.limits.agent` | 1 | `public/portal/account/index.html` |
| `ops.limits.influence_score` | 1 | `public/portal/account/index.html` |
| `ops.limits.limit_delta` | 1 | `public/portal/account/index.html` |
| `ops.limits.partner` | 1 | `public/portal/account/index.html` |
| `ops.limits.profile` | 1 | `public/portal/account/index.html` |
| `ops.limits.role_type` | 1 | `public/portal/account/index.html` |
| `ops.limits.sub_agent` | 1 | `public/portal/account/index.html` |
| `telegram.seat_desk` | 1 | `public/portal/account/index.html` |

**Allowlisted but unused in HTML** (inventory / collapse backlog):

- `ops.limits.lifecycle_state`
- `ops.limits.monitoring_status`

## Related gates

```bash
bun run validate:surface-coverage
bun run validate:surface-coverage -- --report
bun run concept:audit --strict
bun run surface-coverage:map -- --check
```

See also: [`docs/CONCEPT_LIFECYCLE.md`](CONCEPT_LIFECYCLE.md) ·
[`docs/DEVELOPMENT-WORKFLOW.md`](DEVELOPMENT-WORKFLOW.md).
