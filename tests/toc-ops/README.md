# TOC Ops tests

Domain-organized suite for the Pages-safe TOC fixture (`lib/toc-ops/`).

## Layout

| Tier | Path | Covers |
|------|------|--------|
| **Core** | `fixture.test.ts` | Snapshot shape · seed · export · ops-summary embed |
| | `enforcement.test.ts` | Operate-lite Hard Gate bake · Soft journal append-only |
| | `return-efficiency.test.ts` | R_P · CE · LE · ranked actions · buffer throttle |
| | `contract.test.ts` | ops-summary.toc · bake-proof validation |
| | `presence.test.ts` | Geo · ZIP · IPv4/IPv6 · DNS · ASN rollups |
| | `venues.test.ts` | Sportsbook · exchange · crypto · PPH · legal-by-state |
| | `profiles.test.ts` | Partner + agent profiles · liquidity · CLV |
| | `api-edge.test.ts` | Pages `/api/toc` GET envelope · POST 503 |
| **Seed narrative** | `seed/desk-calendar.test.ts` | Soft/play calendar · desk scorecards · agent matrix |
| | `seed/channel-experiments.test.ts` | MessageLog · rotor · experiment outcomes |
| | `seed/capital-buffer.test.ts` | Capital ledger · warm · Gate 12 · buffer history |
| | `seed/accounting-releases.test.ts` | A=L+E sheet · limits · rails · switchback · release cards |
| | `seed/exposure-compliance.test.ts` | Pending exposure · recycle · SLA · audit · net capital |
| | `seed/settlement-wd.test.ts` | WD pipeline · exposure aging · ONB checklist · settlement calendar |
| | `seed/constraint-ops.test.ts` | Constraint focus · exception resolution · play settlement · bot audit |
| | `seed/ops-handoffs.test.ts` | BIC handoffs · warm playbook · phone log · liquidity util |
| | `seed/fund-rails-gates.test.ts` | FUND corridor · task timeline · rail util · drum gates |
| | `seed/soft-desk.test.ts` | Pending deploy · readiness trend · instruction SLA · deal split |

Shared helpers: [`_helpers.ts`](./_helpers.ts) (`DEMO_GENERATED_AT`, `partnerByCode`).

## Commands

```bash
# Full tenant gate (preferred)
bun run test:toc-ops

# Core only (fast smoke)
bun test tests/toc-ops/fixture.test.ts tests/toc-ops/enforcement.test.ts tests/toc-ops/contract.test.ts

# Seed narrative only
bun test tests/toc-ops/seed/

# Single domain
bun test tests/toc-ops/seed/settlement-wd.test.ts
```

## Naming convention

- **Files:** `domain.test.ts` or `seed/<surface>.test.ts` — no pass numbers in filenames.
- **`describe`:** `toc-ops · <domain>` or `toc-ops · seed · <surface>`.
- **`test`:** behavior-first (`partners expose SLA board and audit trail`).

Runbook: [`docs/harness/tenants/toc-ops.md`](../../docs/harness/tenants/toc-ops.md)
