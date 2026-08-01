# Soft ↔ Factory accounting handshake

Short design note for Soft↔Factory reporting-view weave. **No new glossary IDs.**
Ops-view MVP is done (`ops.view.*` + per-account builders + shape gate). Soft
export wire v1 + Soft `ct soft-accounting-export` + Factory consumer chrome
(dossier / partners Soft plays) are shipped over the fixture bake.

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

## Inputs Soft may export

| Slice | Soft source (conceptual) | Factory consumer |
|-------|--------------------------|------------------|
| Per-play | Play / wager ledger rows (stake, odds, result, settledAt) | `buildPerPlayAccountingView` → `ops.view.per_play` · dossier Soft plays · partners Soft plays table |
| Per-week | Soft `weeks[]` when tagged; else Factory `rollupWeeksFromPlays` | `buildPerWeekAccountingView` → `ops.view.per_week` |
| Per-book-type | Rows tagged with Soft book class | Filter onto shipped `book.type.*` × `accounting.*` (still empty in v1) |
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
onto existing concepts until Soft tags those dimensions.

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

## Factory wire (v1) — Soft target + board consumers

| Piece | Path |
|-------|------|
| Types + load/project | [`lib/telegram/soft-accounting-export.ts`](../../lib/telegram/soft-accounting-export.ts) |
| Partner chrome helper | `buildPartnerSoftPlayChrome` · `playsForPartner` · `rollupWeeksFromPlays` |
| Committed demo bake | `/registry/soft-accounting-export.json` · schema `factorywager.soft-accounting-export.v1` · `bun run soft:accounting:bake` / `:check` |
| Demo projection | `projectSoftAccountingExportFromTocOps` over Pages [`toc-ops.json`](../../public/registry/toc-ops.json) `partners[].recentPlays` |
| Per-play builder | `buildPerPlayAccountingView` → `ops.view.per_play` |
| Per-week builder | `buildPerWeekAccountingView` + `rollupWeeksFromPlays` → `ops.view.per_week` |
| Partner chrome | `buildPartnerSoftPlayChrome` · portal `buildDossierSoftPlays` |
| Dossier consumer | [`public/portal/account/`](../../public/portal/account/) Soft plays + derived Soft weeks |
| Partners consumer | [`public/portal/partners/`](../../public/portal/partners/) Soft plays table + play-count chips |

Committed demo bake uses `source: "toc-ops-fixture"`. Soft live export:

```bash
# in toc-ops-repo (needs DATA_MODEL tip ≥ 2.30 — toc-ops#202)
bun run ct soft-accounting-export --out ../public/registry/soft-accounting-export.json
# or from FactoryWager root / worktree (resolves bun via Bun.which; Soft via TOC_OPS_REPO or git sibling)
bun run soft:accounting:from-ct
# TOC_OPS_REPO=/abs/path/to/toc-ops-repo bun run soft:accounting:from-ct
```

`partners:governance` → `soft:accounting:check` accepts either exact fixture match
or a schema-valid non-empty `source: "soft-ct"` bake (0 plays fails check and
`soft:accounting:from-ct` unless `--force`; restore fixture with
`bun run soft:accounting:bake`). Odds are `0` until Soft stores them (on live Soft
export; fixture may carry odds from toc-ops demo plays).

`weeks[]` / `byBookType[]` may ship empty from Soft; Factory derives week rollups from
plays for chrome (`ops.view.per_week`). Book-type rows wait until Soft tags venues.
Soft DB migrations must match Soft `ct` expectations (schema tip ≥ 2.30) before
`soft:accounting:from-ct` succeeds.

## Exit criteria (remaining)

1. Promote registry bake with `bun run soft:accounting:from-ct` when Soft DB
   has plays (`source: "soft-ct"`, schema tip ≥ 2.30) — wire + Soft `ct` exist.
2. Factory builders call `validateOpsAccountingViewShape` — **still no new
   glossary mint**. Per-play + derived per-week + dossier/partners Soft chrome
   are in place; Soft-authored `byBookType` wait on Soft venue tags.
3. Local proof: `bun run partners:governance` + lane tests; merge authority
   remains `bun run bun:ci` (GitHub Actions is not a gate).
