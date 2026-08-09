# Morning desk

<!-- REF:ID 0.1.desk-portal-source -->

<a id="0.1.desk-portal-source"></a>

Quiet **morning board** for operators: accounts and logins by partner / type /
skin / live, limit totals, balances, soft net (24h / 7d / all), Telegram
handshake signals, freezes, limit raises, money integrity, and bake connectors.

Ops tooling (filters, advanced inventory, deep links) stays on
[`/portal/partners/`](./partners/).

| Board                                   | Path                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| HTML                                    | [`/portal/desk/`](./desk/)                                                             |
| Primary bake                            | [`/registry/partners-dashboard.json`](../registry/partners-dashboard.json)             |
| Soft accounting                         | [`/registry/soft-accounting-export.json`](../registry/soft-accounting-export.json)     |
| Seat capital                            | [`/registry/seat-capital-desk.json`](../registry/seat-capital-desk.json)               |
| Partners-ops (logins · type · freeplay) | [`/registry/partners-ops.json`](../registry/partners-ops.json)                         |
| Bookmakers (skin)                       | [`/registry/bookmakers.json`](../registry/bookmakers.json)                             |
| Telegram handshake                      | [`/registry/telegram-handshake.json`](../registry/telegram-handshake.json)             |
| Limit raises / freezes                  | [`/registry/limit-raises.json`](../registry/limit-raises.json)                         |
| Partner ledger (money integrity)        | [`/registry/partner-ledger.json`](../registry/partner-ledger.json)                     |
| Book desk coverage                      | [`/registry/bookmakers-desk-coverage.json`](../registry/bookmakers-desk-coverage.json) |
| TOC MessageLog (partner chats)          | [`/registry/toc-ops.json`](../registry/toc-ops.json) · `partners[].messageLog`         |
| Partners ops board                      | [partners.md](./partners.md) · [`/portal/partners/`](./partners/)                      |

## What you see

1. **Summary chips** — partners · accounts · live · limits Σ · balances · soft
   24h/7d · freezes · raises · connectors · **msgs 24h** · Telegram
2. **Bake connectors** — `connectorSnapshots` ok / stale / down
3. **Accounts table** — login · book · type · skin · live · status · limit ·
   balance · freeplay %
4. **Money by partner** — balance · **ledger net** · **Δ integrity** · limits Σ
   · soft windows
5. **Limits · freezes · raises** — monitor status · jurisdiction · raises 7d ·
   fleet blocked
6. **Book catalog holes** — unmatched / placeholder seat books
7. **Rollups** — by type · skin · live
8. **Telegram · messages** — package chat · handshake · **MessageLog** rows from
   toc-ops (`summary` + direction + time); 24h/7d tip windows like soft
9. **Freezes · freeroll · attention** — deferred/blocked outs · limit-profile
   blocked · freeplay · freeroll applied

### Soft 24h / 7d windows

| Soft source                   | Window mode                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `soft-ct` (live Soft Balance) | Wall clock only                                                                                                                                             |
| `toc-ops-fixture` (demo)      | If export tip is older than 48h, desk **rebases** play timestamps onto wall clock so morning nets show fixture activity — bake file itself is not rewritten |

### Limit raise windows

Same idea: wall-clock 7d first; if empty and the latest `increased_at` tip is
stale, anchor the 7d window to that tip (`export-tip` mode). Join keys:
`treeNodeId` · `callSign` (ASH-001 → ASH).

### Money integrity

`partner-ledger` sum(`amount_minor`) vs dashboard `accountScope.kind=partner`
balance. Non-zero **Δ** is a mismatch chip (rail balances are tracked
separately).

Import live Soft when available: `bun run soft:accounting:from-ct` (empty Soft
DB keeps the fixture bake).

Pure join: [`desk-board.js`](./desk/desk-board.js). Soft week/window physics
SSOT: [`shared/soft-windows.js`](./shared/soft-windows.js) (also partners
board + account dossier). Bake: `bun run partner:dashboard:bake`.
