# Fire22 Endpoint Migration Guide

## Endpoints Consolidated

Total endpoints found: 107

### By Category:

- **auth**: 3 endpoints
- **admin**: 10 endpoints
- **other**: 49 endpoints
- **financial**: 14 endpoints
- **manager**: 23 endpoints
- **health**: 7 endpoints
- **customer**: 1 endpoints

### By Source:

- **index.ts**: 99 endpoints
- **server.js**: 8 endpoints

## Endpoint Details

### POST /api/auth/login

- **Category**: auth
- **Source**: index.ts:2601
- **Permissions**: None (Public)

### POST /api/auth/logout

- **Category**: auth
- **Source**: index.ts:2655
- **Permissions**: None (Public)

### GET /api/auth/verify

- **Category**: auth
- **Source**: index.ts:2665
- **Permissions**: None (Public)

### POST /api/admin/settle-wager

- **Category**: admin
- **Source**: index.ts:2738
- **Permissions**: admin.wager.settle

### POST /api/admin/bulk-settle

- **Category**: admin
- **Source**: index.ts:2777
- **Permissions**: admin.wager.settle

### GET /api/admin/pending-settlements

- **Category**: admin
- **Source**: index.ts:2824
- **Permissions**: admin.wager.settle

### GET /api/reports/settlement-history

- **Category**: other
- **Source**: index.ts:2872
- **Permissions**: authenticated

### POST /api/admin/void-wager

- **Category**: admin
- **Source**: index.ts:2949
- **Permissions**: admin.\*

### POST /api/withdrawals/request

- **Category**: financial
- **Source**: index.ts:2993
- **Permissions**: financial.\*

### POST /api/withdrawals/approve

- **Category**: financial
- **Source**: index.ts:3069
- **Permissions**: financial.\*

### POST /api/withdrawals/complete

- **Category**: financial
- **Source**: index.ts:3129
- **Permissions**: financial.\*

### POST /api/withdrawals/reject

- **Category**: financial
- **Source**: index.ts:3191
- **Permissions**: financial.\*

### GET /api/withdrawals/pending

- **Category**: financial
- **Source**: index.ts:3246
- **Permissions**: financial.\*

### GET /api/withdrawals

- **Category**: financial
- **Source**: index.ts:3285
- **Permissions**: financial.\*

### PUT /api/customers/telegram

- **Category**: other
- **Source**: index.ts:3343
- **Permissions**: authenticated

### POST /api/wagers/manual

- **Category**: other
- **Source**: index.ts:3403
- **Permissions**: authenticated

### GET /api/risk/exposure

- **Category**: other
- **Source**: index.ts:3474
- **Permissions**: authenticated

### POST /api/manager/getWeeklyFigureByAgent

- **Category**: manager
- **Source**: index.ts:3712
- **Permissions**: manager.reports.weekly

### POST /api/manager/getPending

- **Category**: manager
- **Source**: index.ts:3782
- **Permissions**: manager.\*

### GET /api/live

- **Category**: other
- **Source**: index.ts:3848
- **Permissions**: authenticated

### GET /api/manager/getTransactions

- **Category**: manager
- **Source**: index.ts:4001
- **Permissions**: manager.\*

### GET /api/manager/getCustomers

- **Category**: manager
- **Source**: index.ts:4071
- **Permissions**: manager.customer.list

### GET /api/manager/getLiveActivity

- **Category**: manager
- **Source**: index.ts:4212
- **Permissions**: manager.\*

### GET /api/analytics/daily

- **Category**: other
- **Source**: index.ts:4313
- **Permissions**: authenticated

### GET /api/analytics/hourly

- **Category**: other
- **Source**: index.ts:4343
- **Permissions**: authenticated

### GET /api/search

- **Category**: other
- **Source**: index.ts:4372
- **Permissions**: authenticated

### POST /api/bulk-approve

- **Category**: other
- **Source**: index.ts:4428
- **Permissions**: authenticated

### POST /api/bulk-reject

- **Category**: other
- **Source**: index.ts:4466
- **Permissions**: authenticated

### POST /api/admin/create-customer

- **Category**: admin
- **Source**: index.ts:4504
- **Permissions**: admin.customer.manage

### POST /api/admin/process-deposit

- **Category**: admin
- **Source**: index.ts:4541
- **Permissions**: admin.financial.deposit

### GET /api/reports/profit-loss

- **Category**: other
- **Source**: index.ts:4654
- **Permissions**: authenticated

### GET /api/reports/customer-activity

- **Category**: other
- **Source**: index.ts:4721
- **Permissions**: authenticated

### GET /api/live-casino/dashboard-data

- **Category**: other
- **Source**: index.ts:5212
- **Permissions**: authenticated

### GET /api/admin/agent-configs-dashboard

- **Category**: admin
- **Source**: index.ts:5286
- **Permissions**: admin.\*

### GET /api/manager/getLiveWagers

- **Category**: manager
- **Source**: index.ts:5387
- **Permissions**: manager.wager.view_live

### GET /api/manager/getAgentPerformance

- **Category**: manager
- **Source**: index.ts:5420
- **Permissions**: manager.agent.performance

### GET /api/manager/getWagerAlerts

- **Category**: manager
- **Source**: index.ts:5450
- **Permissions**: manager.\*

### GET /api/manager/getVIPCustomers

- **Category**: manager
- **Source**: index.ts:5481
- **Permissions**: manager.\*

### GET /api/manager/getBetTicker

- **Category**: manager
- **Source**: index.ts:5524
- **Permissions**: manager.\*

### GET /api/manager/getSportAnalytics

- **Category**: manager
- **Source**: index.ts:5554
- **Permissions**: manager.\*

### GET /api/manager/getCustomerDetails

- **Category**: manager
- **Source**: index.ts:5613
- **Permissions**: manager.\*

### GET /api/test/fire22

- **Category**: health
- **Source**: index.ts:5665
- **Permissions**: None (Public)

### GET /api/fire22/customers

- **Category**: other
- **Source**: index.ts:5692
- **Permissions**: authenticated

### GET /api/fire22/wagers

- **Category**: other
- **Source**: index.ts:5720
- **Permissions**: authenticated

### GET /api/fire22/kpis

- **Category**: other
- **Source**: index.ts:5747
- **Permissions**: authenticated

### GET /api/fire22/agent-performance

- **Category**: other
- **Source**: index.ts:5774
- **Permissions**: authenticated

### GET /api/customer-config

- **Category**: other
- **Source**: index.ts:5801
- **Permissions**: authenticated

### POST /api/customer-config

- **Category**: other
- **Source**: index.ts:5851
- **Permissions**: authenticated

### GET /api/customer-config/list

- **Category**: other
- **Source**: index.ts:5901
- **Permissions**: authenticated

### PUT /api/customer-config/update

- **Category**: other
- **Source**: index.ts:5942
- **Permissions**: authenticated

### GET /api/test-deployment

- **Category**: health
- **Source**: index.ts:6008
- **Permissions**: None (Public)

### GET /api/live-metrics

- **Category**: other
- **Source**: index.ts:6019
- **Permissions**: authenticated

### GET /api/customers

- **Category**: other
- **Source**: index.ts:6057
- **Permissions**: authenticated

### GET /api/health/permissions

- **Category**: health
- **Source**: index.ts:6135
- **Permissions**: None (Public)

### GET /api/health/permissions-matrix

- **Category**: health
- **Source**: index.ts:6358
- **Permissions**: None (Public)

### GET /api/debug/permissions-matrix

- **Category**: other
- **Source**: index.ts:6594
- **Permissions**: authenticated

### GET /api/debug/permissions-matrix/validation

- **Category**: other
- **Source**: index.ts:6670
- **Permissions**: authenticated

### GET /api/debug/permissions-matrix/agents

- **Category**: other
- **Source**: index.ts:6746
- **Permissions**: authenticated

### GET /api/debug/permissions-matrix/performance

- **Category**: other
- **Source**: index.ts:6819
- **Permissions**: authenticated

### GET /api/debug/permissions-matrix/realtime

- **Category**: other
- **Source**: index.ts:6877
- **Permissions**: authenticated

### GET /api/health/system

- **Category**: health
- **Source**: index.ts:6939
- **Permissions**: None (Public)

### GET /api/version/current

- **Category**: other
- **Source**: index.ts:7213
- **Permissions**: authenticated

### POST /api/version/increment

- **Category**: other
- **Source**: index.ts:7231
- **Permissions**: authenticated

### GET /api/version/history

- **Category**: other
- **Source**: index.ts:7261
- **Permissions**: authenticated

### GET /api/version/metrics

- **Category**: other
- **Source**: index.ts:7282
- **Permissions**: authenticated

### PUT /api/version/metrics

- **Category**: other
- **Source**: index.ts:7301
- **Permissions**: authenticated

### GET /api/version/deployment

- **Category**: other
- **Source**: index.ts:7321
- **Permissions**: authenticated

### POST /api/version/rollback

- **Category**: other
- **Source**: index.ts:7341
- **Permissions**: authenticated

### GET /api/version/changelog

- **Category**: other
- **Source**: index.ts:7376
- **Permissions**: authenticated

### POST /api/version/validate

- **Category**: other
- **Source**: index.ts:7402
- **Permissions**: authenticated

### POST /api/admin/import-customers

- **Category**: admin
- **Source**: index.ts:7436
- **Permissions**: admin.customer.manage

### POST /api/admin/sync-fire22

- **Category**: admin
- **Source**: index.ts:7502
- **Permissions**: admin.system.sync

### GET /api/manager/getSettings

- **Category**: manager
- **Source**: index.ts:7587
- **Permissions**: manager.\*

### GET /api/bets

- **Category**: other
- **Source**: index.ts:7612
- **Permissions**: authenticated

### GET /api/agents/hierarchy

- **Category**: other
- **Source**: index.ts:7660
- **Permissions**: authenticated

### GET /api/manager/getAgentKPI

- **Category**: manager
- **Source**: index.ts:7703
- **Permissions**: manager.\*

### GET /api/manager/getCustomersByAgent

- **Category**: manager
- **Source**: index.ts:7751
- **Permissions**: manager.customer.list

### GET /api/manager/getWagersByAgent

- **Category**: manager
- **Source**: index.ts:7791
- **Permissions**: manager.\*

### GET /api/manager/getPending

- **Category**: manager
- **Source**: index.ts:7833
- **Permissions**: manager.\*

### POST /api/sync/fire22-customers

- **Category**: other
- **Source**: index.ts:7879
- **Permissions**: authenticated

### POST /api/sync/background

- **Category**: other
- **Source**: index.ts:7901
- **Permissions**: authenticated

### GET /api/debug/cache-stats

- **Category**: other
- **Source**: index.ts:7925
- **Permissions**: authenticated

### GET /api/admin/debug/cache-stats

- **Category**: admin
- **Source**: index.ts:7946
- **Permissions**: admin.\*

### GET /api/manager/getWeeklyFigureByAgent

- **Category**: manager
- **Source**: index.ts:7991
- **Permissions**: manager.reports.weekly

### POST /api/queue/init

- **Category**: financial
- **Source**: index.ts:8057
- **Permissions**: financial.\*

### POST /api/queue/withdrawal

- **Category**: financial
- **Source**: index.ts:8113
- **Permissions**: financial.\*

### POST /api/queue/deposit

- **Category**: financial
- **Source**: index.ts:8173
- **Permissions**: financial.\*

### GET /api/queue/stats

- **Category**: financial
- **Source**: index.ts:8220
- **Permissions**: financial.\*

### GET /api/queue/items

- **Category**: financial
- **Source**: index.ts:8244
- **Permissions**: financial.\*

### GET /api/queue/opportunities

- **Category**: financial
- **Source**: index.ts:8276
- **Permissions**: financial.\*

### POST /api/queue/process

- **Category**: financial
- **Source**: index.ts:8337
- **Permissions**: financial.\*

### POST /api/queue/complete

- **Category**: financial
- **Source**: index.ts:8361
- **Permissions**: financial.\*

### GET /api/matrix/health

- **Category**: health
- **Source**: index.ts:8394
- **Permissions**: None (Public)

### GET /api/matrix/validate

- **Category**: other
- **Source**: index.ts:8414
- **Permissions**: authenticated

### POST /api/matrix/repair

- **Category**: other
- **Source**: index.ts:8433
- **Permissions**: authenticated

### GET /api/matrix/status

- **Category**: other
- **Source**: index.ts:8452
- **Permissions**: authenticated

### GET /api/matrix/history

- **Category**: other
- **Source**: index.ts:8477
- **Permissions**: authenticated

### GET /api/matrix/configs

- **Category**: other
- **Source**: index.ts:8504
- **Permissions**: authenticated

### GET /api/matrix/score

- **Category**: other
- **Source**: index.ts:8567
- **Permissions**: authenticated

### POST /api/manager/getLiveWagers

- **Category**: manager
- **Source**: server.js:237
- **Permissions**: manager.wager.view_live

### POST /api/manager/getCustomerAdmin

- **Category**: manager
- **Source**: server.js:381
- **Permissions**: manager.\*

### GET /api/manager/getCustomerSummary

- **Category**: manager
- **Source**: server.js:640
- **Permissions**: manager.\*

### GET /api/manager/getBets

- **Category**: manager
- **Source**: server.js:821
- **Permissions**: manager.\*

### POST /api/manager/getAgentPerformance

- **Category**: manager
- **Source**: server.js:903
- **Permissions**: manager.agent.performance

### POST /api/customer/getHeriarchy

- **Category**: customer
- **Source**: server.js:954
- **Permissions**: customer.\*

### GET /dashboard

- **Category**: other
- **Source**: server.js:1079
- **Permissions**: authenticated

### GET /health

- **Category**: health
- **Source**: server.js:1284
- **Permissions**: None (Public)

## Migration Steps

1. Review generated route files in `/src/api/routes/`
2. Implement controllers in `/src/api/controllers/`
3. Copy business logic from source files to controllers
4. Test each endpoint after migration
5. Update main application to use new router

## Testing

Run tests after migration:

```bash
bun test src/api/**/*.test.ts
```

Generated: 2025-08-27T08:05:25.881Z
