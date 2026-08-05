# Operations

Control-loop board: **partner desk pulse**, handshake, seat capital, limits,
ops loop / outbox, TOC, compliance, and harness proofs.

| Surface | Path |
|---------|------|
| HTML board | [`/portal/ops/`](./ops/) |
| Ops summary bake | [`/registry/ops-summary.json`](../registry/ops-summary.json) |
| Portal chrome | [`/registry/portal-chrome.json`](../registry/portal-chrome.json) |
| Weave | [`/registry/portal-weave.json`](../registry/portal-weave.json) |

## Partner desk pulse

Top panel KPIs from `ops-summary` (domain-first):

| Metric | Source field |
|--------|----------------|
| Handshake gaps | `telegramHandshake.inviteGaps` |
| Operator ready | `telegramHandshake.operatorReady` / `partners` |
| Seat incomplete | `seatCapitalDesk.incompleteOuts` |
| Limit raises | `limitChanges.length` |
| Partners bound | `partners.bound` |
| Outbox pending | `loop.outboxPending` (tone when high) |

Deep links: [Partners](./partners/) · [Outs](./partners/#section:outs) ·
[Limits](./limits.md) · [Bookmakers](./bookmakers.md) · [Account](./account/) ·
[TOC](./toc/) · [Compliance](./compliance/) · [Telegram map](./telegram.md) ·
[Factory](./factory.md) · [DOD](./dod.md) · [Routing audit](./routing.md).

## Jump sections

Sticky jump strip: Desk · Handshake · Seat · Partners · Limits · Loop · TOC ·
Compliance · Liquidity · Health · Nits · Taxonomy · Weave · Plays.

| Area | Primary bake / board |
|------|----------------------|
| Handshake | `telegram-handshake.json` · [factory.md](./factory.md) · [telegram.md](./telegram.md) |
| Seat capital | `seat-capital-desk.json` · Partners deposits / outs |
| Limits | `limit-raises.json` · [limits.md](./limits.md) |
| Books | `bookmakers.json` · desk coverage · [bookmakers.md](./bookmakers.md) |
| DOD queue | `dod-queue.json` · [dod.md](./dod.md) |
| Loop / outbox | ops-loop throughput · `ops:outbox:requeue` when stuck |
| Soft plays | `soft-accounting-export.json` · Partners Soft tables |

## CLI

```bash
bun run ops:snapshot --no-seed
bun run telegram:handshake:catalog
bun run telegram:handshake:invite-gap
bun run seat:desk:refresh
bun run partners:validate
bun run ops:limits:demo
bun run bookmakers:desk-coverage
bun run bookmakers:bake:check
bun run soft:accounting:bake
bun run portal:doctor
bun run public:audit:verify
bun run check:routes               # see routing.md
```

Day-loop rollup also lives on the [registry hub](./index.md).

## Failure paths

| Symptom | Fix |
|---------|-----|
| Pulse metrics “—” / stale | `ops:snapshot --no-seed` · deploy `ops-summary.json` |
| Handshake gaps high | [telegram.md](./telegram.md) · `telegram:handshake:invite-gap` |
| Seat incomplete | `seat:desk:refresh CALL` · Partners outs inventory |
| Limit raises empty on Pages | Rebake `limit-raises.json` · [limits.md](./limits.md) |
| Book desk unmatched | [bookmakers.md](./bookmakers.md) desk coverage (e.g. Orange777) |
| Outbox pending stuck | `ops:outbox:requeue` · [`ops-loop-throughput.md`](../../docs/harness/tenants/ops-loop-throughput.md) |

## Docs

- [`ops-snapshot.md`](../../docs/harness/tenants/ops-snapshot.md)
- [`ops-loop-throughput.md`](../../docs/harness/tenants/ops-loop-throughput.md)
- [`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md)
- [`seat-capital-desk.md`](../../docs/harness/tenants/seat-capital-desk.md)
- [`portal-foundation.md`](../../docs/portal-foundation.md)

Related MD: [Registry hub](./index.md) · [Partners](./partners.md) ·
[Telegram](./telegram.md) · [Factory](./factory.md) · [DOD](./dod.md) ·
[Limits](./limits.md) · [Bookmakers](./bookmakers.md) · [Routing](./routing.md) ·
[TOC](./toc.md) · [Compliance](./compliance.md).
