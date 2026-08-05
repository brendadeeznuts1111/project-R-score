# Tennis HQ · runtime · partners · accounting

Dual-surface Tennis map: **live Market Desk** on the Worker host vs **portal
evidence board** on Pages. Partner capacity and finance contracts join the
Factory partner desk (Telegram · Accounting · Soft · DOD).

| Surface | Path / host |
|---------|-------------|
| Market Desk (interactive) | [tennis.factory-wager.com](https://tennis.factory-wager.com/) |
| Portal evidence board | [`/portal/tennis/`](./tennis/) |
| Agent auth bake | [`/registry/tennis/agent-auth.json`](../registry/tennis/agent-auth.json) |
| Board metrics | [`/registry/tennis/board-metrics.json`](../registry/tennis/board-metrics.json) |
| Tenant packages | [`/registry/tennis/registry.json`](../registry/tennis/registry.json) |
| Partners desk | [`/portal/partners/`](./partners/) |
| Telegram chat map | [`telegram.md`](./telegram.md) |
| DOD proofs | [`/portal/dod/`](./dod/) |
| Tenant runbook | [`docs/harness/tenants/tennis-hq-registry.md`](../../docs/harness/tenants/tennis-hq-registry.md) |
| UI inventory audit | [`docs/harness/tenants/tennis-hq-ui-audit.md`](../../docs/harness/tenants/tennis-hq-ui-audit.md) |
| Producer contribute | [plum-spruce-dawn-dune1 · CONTRIBUTING](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1/blob/main/CONTRIBUTING.md) (Market Desk day loop · gate · partners) |
| Bake inventory | [`/registry/bake-manifest.json`](../registry/bake-manifest.json) (`runtime.runtimeVersion` · per-artifact `bakedAt`) |



## Glossary planes (do not confuse)

| Plane | Host | RPS / Warehouse |
|-------|------|-----------------|
| Live Market Desk | `tennis.factory-wager.com` | RPS = cycle scanner (`kpi.rps_warnings`); Warehouse = `#warehouse` facets |
| Factory portal board | `/portal/tennis/` | Baked metrics + partner-contracts — **not** live RPS counts |
| Domain glossary bake | `/portal/glossary/` | May lag producer desk definitions for overlapping `kpi.*` ids |

Deep links: prefer `#glossary:kpi.rps_warnings` **or** `#warehouse` — not both with text fragments.

## 1. Two surfaces (do not collapse)

| Host | Owner | Role |
|------|-------|------|
| `tennis.factory-wager.com` | Worker `tennis-hq` · producer [`plum-spruce-dawn-dune1`](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1) · [CONTRIBUTING](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1/blob/main/CONTRIBUTING.md) | Live desk SPA · `/api/v1/*` contracts · market feed |
| `factory-wager.com/portal/tennis/` | this monorepo · Pages | Baked metrics · agent-auth · registry · venue board |

There is **no** redirect between them. Board loads registry JSON only (no
`PARTNER_API_TOKEN` in the browser). Runtime service auth is a separate plane
from FactoryWager registry auth (`FACTORY_WAGER_TOKEN`).

## 2. Auth planes

| Plane | Env | Vault | Used for |
|-------|-----|-------|----------|
| Registry (cloud agent) | `FACTORY_WAGER_TOKEN` | FactoryWager Registry Token | `@factorywager/*` / `@tennis-hq/*` install · private publish |
| Producer API | `PARTNER_API_TOKEN` | Tennis HQ Partner API Token | `GET /api/v1/*` on tennis.factory-wager.com |

```bash
# Registry handoff (never print)
set -a && source ~/.reasonix/tennis-hq-registry-token.env && set +a

# Producer contracts (never print)
set -a && source ~/.reasonix/tennis-hq-partner-api-token.env && set +a
curl -fsS -H "Authorization: Bearer $PARTNER_API_TOKEN" \
  https://tennis.factory-wager.com/api/v1/research/status
# Unauth must fail closed: HTTP 401 unauthorized (not 503 when secret is set)
```

## 3. Versioned v1 contracts (bearer)

From `@tennis-hq/ssot` transport manifest (Factory consumes the packed artifact).
**Live tip `30f7c70` wires all five v1 domains** — unauth probes return JSON
**401** when `PARTNER_API_TOKEN` is set (not SPA 404). Desk tip matches
producer `origin/main` (Worker `3847207a`, verified 2026-08-05 via
`/api/version`). Payload emptiness (desk rows / warehouse / edge storage) is
orthogonal to route presence.

| Domain | Path | Live tip | Join to Factory |
|--------|------|----------|-----------------|
| research | `GET /api/v1/research/status` | **wired** (401 unauth) | Phase2 / research strip |
| marketdata | `GET /api/v1/marketdata/desk` | **wired** (401 unauth) | Desk rows · venue mids · live board bake |
| trading | `GET /api/v1/trading/executions` | **wired** (401 unauth) | Edge may report `edge_storage_unavailable` |
| **partners** | `GET /api/v1/partners/capacity` | **wired** (401 unauth) | Outs capacity · CODE → Partners outs inventory |
| **accounting** | `GET /api/v1/accounting/finance` | **wired** (401 unauth) | Finance phase · ledger → Accounting / Soft / DOD |

Partner CODE inventory (**ASH · BIL · NOV · SPEN**) and finance phase labels
also live in Factory bakes (`partners-ops.json` + `telegram-handshake.json`)
for portal join even when authenticated v1 payloads are empty or soft-fail.

Deep links on Partners board:

| CODE | Portal |
|------|--------|
| ASH | [`#partner/ASH`](./partners/#partner/ASH) · [Accounting](./partners/#partner/ASH/accounting) · [telegram/accounting](./partners/#partner/ASH/telegram/accounting) |
| BIL | [`#partner/BIL`](./partners/#partner/BIL) · [Accounting](./partners/#partner/BIL/accounting) |
| NOV | [`#partner/NOV`](./partners/#partner/NOV) |
| SPEN | [`#partner/SPEN`](./partners/#partner/SPEN) |

## 4. Partner desk loop (Factory ↔ Tennis)

```text
Tennis runtime partners/capacity
  → outs (out-CODE-N · bookId · perBetMax)
  → Factory partners-ops outs inventory + seat capital desk
  → Telegram package forum Liquidity/Outs (pinned desk)

Tennis runtime accounting/finance
  → phase + ledger window + capacity
  → Factory Soft export / partners accounting deals
  → Telegram Accounting topic photos → DOD ingest
  → /portal/dod/ amount confirm
```

| Concern | Tennis runtime | Factory portal |
|---------|----------------|----------------|
| Out max bet / capacity | `partners/capacity` | Partners outs · seat desk · `seat:desk:refresh` |
| Phase / FUND readiness | `accounting/finance` phase | handshake · partners-ops phase |
| Bet-slip / deposit proof | (human + Telegram) | Accounting topic → DOD |
| Soft plays / weeks | Soft in `ct` | `soft-accounting-export` on Partners |
| Live markets / mids | marketdata desk | board-metrics · live-matches bake |

## 5. Portal board sections

HTML [`/portal/tennis/`](./tennis/) paints:

1. KPIs from `board-metrics` + agent-auth status  
2. **Runtime probe** — `/api/version` + unauth `/api/v1/research/status` → expect **401**  
3. **Partner desk join** — CODE chips → Partners · Accounting · DOD · Telegram map  
4. Venues · mid distribution · live matches  
5. Tenant registry packages (`@tennis-hq/ssot`, …)

## 6. Telegram Accounting vs partner-contracts bake

| Plane | Path | What it proves |
|-------|------|----------------|
| Telegram → DOD | Accounting topic photo (+ CODE caption) → `@factorywager_bot` / ops long-poll → [`lib/dod/telegram-accounting-ingest.ts`](../../lib/dod/telegram-accounting-ingest.ts) → [`/portal/dod/`](./dod/) | Bet-slip / deposit **photo proof** |
| Partner-contracts bake | `bun run tennis:partner-contracts:bake` → [`/registry/tennis/partner-contracts.json`](../registry/tennis/partner-contracts.json) → this board’s Partner desk table | Capacity / finance join (live token or offline partners-ops ⊕ handshake) |

Telegram photos do **not** write partner-contracts JSON. Handshake bake only
enriches offline partner rows (`handshakeOk`, `fundStatus`).

## 7. CLI day loop

```bash
# Evidence bakes (Pages)
bun run tennis:board:bake
bun run tennis:partner-contracts:bake   # live with PARTNER_API_TOKEN, or --offline
bun run tennis:partner-contracts:check
bun run tennis:agent-auth:check
bun run partners:validate
bun run telegram:handshake:catalog
bun run soft:accounting:bake
bun run ops:snapshot --no-seed

# Runtime release / contracts (producer repo plum-spruce-dawn-dune1)
bun run cloudflare:deploy:verify   # when deploying tennis-hq
bun run verify:weave -- --subdomains
bun run tennis:ssot:release:check

# Producer smoke (token from vault handoff)
curl -fsS -H "Authorization: Bearer $PARTNER_API_TOKEN" \
  https://tennis.factory-wager.com/api/v1/partners/capacity | head -c 200
curl -fsS -H "Authorization: Bearer $PARTNER_API_TOKEN" \
  https://tennis.factory-wager.com/api/v1/accounting/finance | head -c 200
```

## 8. Failure paths

| Symptom | Fix |
|---------|-----|
| v1 returns **401** without token | Expected when `PARTNER_API_TOKEN` is configured — good |
| v1 returns **503** `contract_auth_unconfigured` | Worker missing `PARTNER_API_TOKEN` secret — not release-ready |
| Desk `/api/version` SHA ≠ docs tip | Redeploy producer **or** refresh tip docs + `bun run surfaces:bake` |
| Board registry token “missing” | `bun run tennis:agent-auth:bake` · vault map for `FACTORY_WAGER_TOKEN` |
| Metrics sample / empty | `bun run tennis:board:bake` (needs event-store or `--sample`) |
| Trading executions unavailable | Edge has no local SQLite — use producer host with storage or accept `edge_storage_unavailable` |
| CODE on tennis capacity but not handshake | `telegram:ops link-package-group` · handshake catalog · partners:build |

Bot: `@factorywager_tennis_bot` (tenant telegram) · Factory package forums stay on
`@factorywager_bot`. Never send `FACTORY_WAGER_TOKEN` to the Tennis Worker.
