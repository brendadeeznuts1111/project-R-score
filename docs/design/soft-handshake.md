# Soft ↔ Factory accounting handshake

Short design note for Soft↔Factory reporting views. **No new glossary IDs.**
Ops-view MVP is done (`ops.view.*` + per-account builders + shape gate). Soft
export wire v1 + per-play dimension are shipped; week / book-type rows wait on
Soft-tagged dimensions.

Related authority: [`docs/harness/AUTHORITY.md`](../harness/AUTHORITY.md) ·
tenants [`toc-ops.md`](../harness/tenants/toc-ops.md) ·
[`telegram-factory.md`](../harness/tenants/telegram-factory.md) ·
[`partner-domain-map.md`](../harness/tenants/partner-domain-map.md).

## Planes

| Plane | Owns | Does not own |
|-------|------|--------------|
| **Soft / toc-ops (`ct`)** | Soft Balance, MessageLog, play ledgers, rail confirm, Gate 12 / TOC tasks | Factory `ops.view.*` chrome, partners-ops registry bake, dossier glossary chips |
| **Factory (this repo)** | `partners-ops` mirror, `ops.view.*` reporting chrome, dossier/partners boards, `validateOpsAccountingViewShape` | Mutating Soft Balance / play SQLite |

Factory may **read** Soft-exported rows to build views. Soft must not depend on
Factory view concept ids for internal calculations.

## Inputs Soft may eventually export

| Slice | Soft source (conceptual) | Factory consumer (deferred) |
|-------|--------------------------|-----------------------------|
| Per-play | Play / wager ledger rows (stake, odds, result, settledAt) | `buildPerPlayAccountingView` → dimension `ops.view.per_play` |
| Per-week | Time-bucketed rollups (weekStart ISO) | `buildPerWeekAccountingView` → `ops.view.per_week` |
| Per-book-type | Rows tagged with Soft book class | Filter onto shipped `book.type.*` × `accounting.*` |
| Per-account (today) | Soft may enrich; Factory already sums partners-ops deposits/credits/ledger | `buildPerAccountAccountingView` (shipped) |

Wire shape (Factory-side, already gated): `type` + required key
(`partnerCode` / `playId` / `weekStart` / `bookType`) via
[`validateOpsAccountingViewShape`](../../lib/telegram/ops-accounting-view.ts).

## What Factory view builders compute

- **Summaries only** — deposits, withdrawals, settlements, fees, credits,
  freeRollApplied, net — over a filtered event set.
- **Concept tags for UI** — `ops.view.*` for dossier/partners chrome; event
  leaves stay Kalshi `accounting.*` / `event.*`.
- **No Soft mutation** — append to factory-mirror JSONL
  (`partners:ledger:append`) is not Soft Balance.

Deferred field labels (`play_stake`, `weekly_net`, `legal_deposits`, …) stay in
[`OPS_VIEW_COLLAPSE_BACKLOG`](../../lib/telegram/ops-view-glossary.ts) — collapse
onto existing concepts until a Soft bake actually lands.

## Ownership boundary (never cross)

| Soft never sees / needs | Factory never writes into Soft |
|-------------------------|--------------------------------|
| `ops.view.*` concept ids | Soft Balance / MessageLog SQLite |
| Color-kernel hex / chip tokens | Soft play ledger mutations |
| Dossier `#section:*` hash chrome | Soft rail confirm / Gate 12 state |
| Partners portal filter presentation | Soft-internal P&L engines |

Shared vocabulary Soft and Factory **may** both name (Kalshi cores):
`accounting.*`, `event.*`, `book.type.*`, `partner.phase.*`, `out.status.*`.
Presentation chrome (`ops.view.*`, `telegram.message.*`) is Factory-only.

## Factory wire (v1) — ready for Soft to target

| Piece | Path |
|-------|------|
| Types + load/project | [`lib/telegram/soft-accounting-export.ts`](../../lib/telegram/soft-accounting-export.ts) |
| Committed demo bake | `/registry/soft-accounting-export.json` · schema `factorywager.soft-accounting-export.v1` · `bun run soft:accounting:bake` / `:check` |
| Demo projection | `projectSoftAccountingExportFromTocOps` over Pages [`toc-ops.json`](../../public/registry/toc-ops.json) `partners[].recentPlays` |
| Per-play builder (dimension-only) | `buildPerPlayAccountingView` → `ops.view.per_play` |

Committed demo bake uses `source: "toc-ops-fixture"`. Soft live export:

```bash
# in toc-ops-repo
bun run ct soft-accounting-export --out ../public/registry/soft-accounting-export.json
# or from FactoryWager root
bun run soft:accounting:from-ct
```

`partners:governance` → `soft:accounting:check` accepts either exact fixture match
or a schema-valid `source: "soft-ct"` bake. Odds are `0` until Soft stores them.

Week / book-type arrays ship empty in v1 until Soft tags those dimensions.

## Exit criteria for the next build phase

1. Soft (or fixture) exports a versioned, read-only slice with stable keys for
   playId / weekStart / bookType — **Factory wire v1 + Soft `ct soft-accounting-export`
   exist**; promote registry bake with `bun run soft:accounting:from-ct` when Soft DB has plays.
2. Factory builders call `validateOpsAccountingViewShape` and map amounts onto
   existing `accounting.*` / `book.type.*` — **still no new glossary mint**
   unless a chip cannot collapse. Per-play dimension builder is in place;
   week/book builders wait on Soft rows.
3. Local proof: `bun run partners:governance` + lane tests; merge authority
   remains `bun run bun:ci` (GitHub Actions is not a gate).

Until Soft writes `source: "soft-ct"`, park dossier/partners consumer polish on
play/week/book chrome (fixture projection is for tests + future bake only).
