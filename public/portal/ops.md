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
[Limits](./limits/) · [Account](./account/) · [TOC](./toc/) ·
[Compliance](./compliance/) · [Telegram map](./telegram.md) (plays · balances ·
bets · accounting chats) · [DOD](./dod/) / [dod.md](./dod.md) (image proofs ·
R2 · Bun.Image · Accounting confirm).

## Jump sections

Sticky jump strip: Desk · Handshake · Seat · Partners · Limits · Loop · TOC ·
Compliance · Liquidity · Health · Nits · Taxonomy · Weave · Plays.

## CLI

```bash
bun run ops:snapshot --no-seed
bun run telegram:handshake:catalog
bun run telegram:handshake:invite-gap
bun run seat:desk:refresh
bun run partners:validate
bun run ops:limits:demo
bun run portal:doctor
```

## Docs

- [`ops-snapshot.md`](../../docs/harness/tenants/ops-snapshot.md)
- [`ops-loop-throughput.md`](../../docs/harness/tenants/ops-loop-throughput.md)
- [`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md)
- [`seat-capital-desk.md`](../../docs/harness/tenants/seat-capital-desk.md)
- [`portal-foundation.md`](../../docs/portal-foundation.md)

Related MD: [Registry hub](./index.md) · [Partners](./partners.md) ·
[Limits](./limits.md) · [TOC](./toc.md) · [Compliance](./compliance.md).
