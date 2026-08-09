# `@factorywager/partners`

<!-- REF:ID 0.1.partners-package-readme -->

<a id="0.1.partners-package-readme"></a>

Private workspace authority for parsed partner-domain identifiers, ingress
compatibility, pure observation adapters, multi-source reconciliation, and the
colorless partners-dashboard read-model contract.

## What is implemented now

| Layer                                                                                                  | Status                                                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Brands / parsers (`PartnerCode`, `OutId`, …)                                                           | implemented                                                                     |
| Dashboard artifact boundary + assembler (v2)                                                           | implemented                                                                     |
| Profile coverage + canonical lifecycle adapters                                                        | implemented                                                                     |
| Observation adapters: tennis, telegram, limits, sports-terminal, accounting-ledger, bookmakers catalog | implemented                                                                     |
| Pure reconcile (`reconcilePartnerDashboardFacts`)                                                      | implemented — tennis capacity, ST health, limits coverage, bookmaker validation |
| Bake I/O                                                                                               | `scripts/bake-partners-dashboard.ts` → `/registry/partners-dashboard.json`      |
| Portal consumer                                                                                        | single-artifact load at `/portal/partners/` (legacy compare retired)            |
| Out capability snapshot + execution preflight                                                          | implemented **private** (not public bake)                                       |
| Bookmaker URL→id resolver                                                                              | pure / fail-closed; **does not** load registry files                            |

## Bake pipeline (I/O only at edges)

1. Load registry artifacts (profiles, coverage, ops, telegram, tennis, ledger,
   ST health, limits, bookmakers).
2. Parse via pure adapters.
3. `buildPartnerDashboardRecords` then `reconcilePartnerDashboardFacts`.
4. `assemblePartnerDashboardArtifact` + boundary re-parse.

Commands:

```bash
bun run partner:dashboard:bake
bun run partner:dashboard:bake -- --check
bun run partner:dashboard-plan:validate
```

## Adapters (pure)

- **`./adapters/bookmakers`** — public catalog parse
  (`object key === id === slug`).
- **`./adapters/bookmaker-account`** — resolve a sanitized account URL against
  an **in-memory** catalog; unknown hosts → `manual_review`. Registry file load
  is **not** this module’s job (owned by bookmakers-registry bake / connector
  I/O).
- **`./adapters/tennis-capacity`** — live integer max stake; offline =
  visibility only.
- **`./adapters/telegram-handshake`** — phase / DM linkage; drops invite URLs.
- **`./adapters/limit-changes`** — raise events only; never execution ceiling.
- **`./adapters/sports-terminal`** — integration health; integer-minor /
  money-free wire.
- **`./adapters/accounting-ledger`** — scoped balances as integer minor units.
- **`./adapters/lifecycle`** — canonical lifecycle + ST `frozen` → `suspended`
  map.

## Connector freshness

`evaluateConnectorFreshness` derives snapshot status from bake clock +
observation. Network timeout, circuit breakers, and last-known-good **file**
cache remain connector-resilience follow-ons (bake currently stamps current at
bake time).

## Still planned (domain)

See `docs/design/partner-dashboard-mvp.toml` `[core].planned`:

- private profile policy surface
- lifecycle beyond public bake
- phase derivation enrichment
- book-account **live** resolver (URL path / ops tooling; not pure package)
- risk/SOR · cultivation · commercial terms

## Portal

Browser-neutral `./portal` contract: required input
`/registry/partners-dashboard.json` only. Soft / seat capital may load as
**ancillary** after primary (never finance authority). Canonical load failure
must not fall back to legacy multi-fetch.

## Non-goals (package core)

- Theme / DOM / Pages routing
- `bun:sqlite`, Telegram send, vault crypto
- Mounting Sports Terminal list/detail float-money routes
- Hosted GitHub Actions as merge authority

Squad gap map + agent prompts:
[`docs/design/partner-dashboard-squad.md`](../../docs/design/partner-dashboard-squad.md).
