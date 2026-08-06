# Partners

Package **Telegram** forums, **Accounting** deals, **betting deposits** (max bet
/ rails), Soft **plays** / weeks / book types, and partner messages.

Full Telegram grammar (house vs package · plays · balances · bets):
[telegram.md](./telegram.md).
DOD image proofs (Bun.Image · R2) + amount confirm: [dod.md](./dod.md) ·
[`/portal/dod/`](./dod/).

| Board                  | Path                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| HTML                   | [`/portal/partners/`](./partners/)                                                                       |
| Handshake bake         | [`/registry/telegram-handshake.json`](../registry/telegram-handshake.json)                               |
| Seat capital desk      | [`/registry/seat-capital-desk.json`](../registry/seat-capital-desk.json)                                 |
| Partners-ops (v2)      | [`/registry/partners-ops.json`](../registry/partners-ops.json)                                           |
| Soft accounting export | [`/registry/soft-accounting-export.json`](../registry/soft-accounting-export.json)                       |
| Handshake catalog      | [`/registry/telegram-handshake-catalog.json`](../registry/telegram-handshake-catalog.json)               |
| DOD queue              | [`/registry/dod-queue.json`](../registry/dod-queue.json) · [`/portal/dod/`](./dod/) · [dod.md](./dod.md) |
| Limit raises           | [`/registry/limit-raises.json`](../registry/limit-raises.json) · [limits.md](./limits.md)                |
| Bookmakers             | [`/registry/bookmakers.json`](../registry/bookmakers.json) · [bookmakers.md](./bookmakers.md)            |
| Desk coverage          | [`/registry/bookmakers-desk-coverage.json`](../registry/bookmakers-desk-coverage.json)                   |
| Routing audit          | [routing.md](./routing.md)                                                                               |

## Sections (HTML board)

1. **Telegram package groups** — CODE · phase · membership · invite · handshake
   verify · bot topics
2. **Outs inventory** — flattened partners-ops seats · status / incomplete
   filters · book · rail · **max bet**
3. **Accounts and limits** — readiness · limit **coverage %** · free-roll ·
   ledger events · Soft play counts
4. **Accounting deals** — fund status · pinned desk · Soft Balance mirror ·
   topic `Accounting`
5. **Soft plays / weeks / book types** — `ops.view.per_play` · `per_week` ·
   `per_book_type` from Soft export
6. **Betting deposits** — per-out deposit method · send-to · max bet · freeplay
   %
7. **Partner messages** — `partnerViews` + templates (`confirm-active` · todo ·
   topic prompts)
8. **Books** — partners-ops book registry cards (prefer public `id === slug`
   from bookmakers bake)

Hash routes: `#partners` · `#partner/CODE` · `#partner/CODE/accounting` ·
`#partner/CODE/telegram/ops` · `#partner/CODE/telegram/accounting` ·
`#partner/CODE/out/out-CODE-N` · `#book/book-…`
([partner-routes.js](./partners/partner-routes.js)).

## Telegram topics → board

| Telegram topic                        | Board section / bake                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Liquidity/Outs (pinned desk)          | Deposits · outs inventory · seat-capital-desk · max bet / FUND          |
| Accounting                            | Accounting deals · Soft tables · bet-slip proof · **DOD confirm** chips |
| Ops / Alerts                          | Package group table · handshake · invite gaps                           |
| Soft plays / balances (house staging) | Soft plays · Soft weeks · soft-accounting-export                        |
| House `hq` outbox `dod`               | [`/portal/dod/`](./dod/) evidence queue (not package Accounting)        |

## CLI

```bash
bun run telegram:handshake:catalog
bun run telegram:handshake:invite-gap
bun run telegram:package-group:accounting
bun run seat:desk:refresh
bun run seat:desk:partner-message CALL --json
bun run partners:build
bun run partners:validate
bun run soft:accounting:bake
# Soft live: bun run soft:accounting:from-ct
bun run bookmakers:desk-coverage   # outs BOOK labels ↔ registry
bun run ops:snapshot --no-seed     # dod-queue + partners embeds
```

## Failure paths

| Symptom                       | Fix                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| Invite / membership gap       | `telegram:handshake:invite-gap` · [factory.md](./factory.md)       |
| Soft tables empty             | `soft:accounting:bake` or `:from-ct` (mutations stay in `ct`)      |
| Max bet wrong / desk stale    | `seat:desk:refresh CALL` · never post passwords                    |
| Book label unmatched on outs  | [bookmakers.md](./bookmakers.md) desk coverage · do not invent ids |
| DOD confirm chip missing CODE | OCR / caption platformHint · [dod.md](./dod.md)                    |
| Limit coverage % incomplete   | [limits.md](./limits.md) · `ops:limits:capture`                    |

## Related mesh

| Concern                                          | Doc                                         |
| ------------------------------------------------ | ------------------------------------------- |
| Chat grammar · house surfaces                    | [telegram.md](./telegram.md)                |
| Bot wire · webhook                               | [factory.md](./factory.md)                  |
| Image proof · amount confirm                     | [dod.md](./dod.md)                          |
| Multi-factor raises                              | [limits.md](./limits.md)                    |
| Books v0.4.1 (`fetcher` · `sports` · `urls.web`) | [bookmakers.md](./bookmakers.md)            |
| Pages vs local                                   | [routing.md](./routing.md)                  |
| Ops pulse                                        | [ops.md](./ops.md) · [index.md](./index.md) |

Docs:
[`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md)
· [`seat-capital-desk.md`](../../docs/harness/tenants/seat-capital-desk.md) ·
[`partner-domain-map.md`](../../docs/harness/tenants/partner-domain-map.md) ·
[`telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md).
