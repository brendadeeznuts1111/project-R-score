# Partner settlement + Soft weave — product track plan

Separate from the Aug 2026 **authority + honesty** wave (concepts, brands, glossary,
validation). This track lands operator-facing partner ledger, settlement automation,
and Soft accounting UI on `main`.

**Status (Aug 4 2026):** Backend pipeline and substantial portal surfaces are **merged on
`main`**. Remaining work is operational proof documentation, DOM contract tests, and
archiving stale local branches — **not** wholesale rebases of `feat/partner-*` /
`feat/soft-*` branches.

## Goal

Operators can run weekly partner settlement from CLI/cron, import deposits and
settlements with idempotency, see SQLite ledger balances and history on the partners
board, and read Soft week rollups on the accounting/dossier boards — without mixing
product changes into concept/brand hygiene PRs.

## On `main` today (SSOT)

| Capability | SSOT | Status |
| --- | --- | --- |
| `partner_ledger` + provenance | `lib/partner-profile/ledger.ts` | Merged — reference, book_key, tracking_id, account_scope, external_id, per-out |
| Desk post + import + weekly run | `tools/partner-settlement.ts` · `lib/partner-profile/settlement-runner.ts` | Merged |
| Deposit batch import | `lib/partner-profile/deposit-import.ts` · `tools/partner-deposit-import.ts` | Merged |
| Cron worker | `lib/partner-profile/settlement-cron-worker.ts` · `tools/partner-settlement-cron.ts` | Merged |
| Ops DB projection | `lib/telegram/partner-ops-registry.ts` | Merged — `loadSqliteLedgerSnapshots`, `accounting.outs`, `ledgerRows` |
| Partners board | `public/portal/partners/index.html` | Merged — balance, ledger history, per-out, Soft weeks/plays/book types, red-figure |
| Account dossier Soft chrome | `public/portal/account/index.html` · `account-dossier.js` | Merged — week rollup derivation, per_play / per_week / per_book_type |
| Design truth | `docs/design/settlement-feed.md` | Phase 3 backend marked merged |

Package scripts: `partner:deposit:import`, `partner:settlement:post|import|run`,
`partner:settlement:cron:register|remove|preview`, `partners:build`.

## Branch audit (Aug 4 2026 — do not blind rebase)

All listed branches are **1 commit ahead, 89–212 commits behind `main`**. A wholesale
rebase would **regress** schema and portal features (e.g. `feat/partner-ledger-perout`
drops `account_scope`, `external_id`, tracking column, per-out panel, and red-figure
formatting relative to current `main`).

| Branch | Behind main | Verdict | Net-new worth porting |
| --- | --- | --- | --- |
| `feat/partner-ledger-perout` | 92 | **Superseded** | Nothing — main has fuller schema + UI |
| `feat/partner-deposit-import` | 89 | **Superseded** | Nothing — `deposit-import.ts` on main |
| `feat/partner-settlement-cli` | 99 | **Superseded** | Nothing |
| `feat/partner-settlement-import` | 96 | **Superseded** | Nothing |
| `feat/partner-settlement-run` | 95 | **Superseded** | Nothing |
| `feat/partner-settlement-cron` | 93 | **Superseded** | Nothing |
| `feat/partners-board-balances` | 101 | **Superseded** | Nothing — main has balances + more |
| `feat/partners-ledger-history` | 94 | **Superseded** | Nothing — branch removes ledger UI main has |
| `feat/soft-week-dossier-parity` | 212 | **Superseded** | Nothing — main has dossier Soft weeks |
| `feat/soft-accounting-weave` | 205 | **Superseded** | Nothing — main has partners Soft rollups |

**Action:** Archive or delete stale branches after operators confirm no unpushed work.
Treat branches as archaeology only.

## Operational proof (Round 1 — Aug 4 2026)

Commands run on operator machine (`~/Projects`, `main`):

```bash
# Deposit import dry-run (expects profile miss when SPEN.toml absent — validates CLI path)
bun run partner:deposit:import -- --file <fixture.csv> --dry-run

# Desk settlement post
bun run partner:settlement:post -- --code SPEN --amount -500 --dry-run
# → [dry-run] would post settlement -500 USD → SPEN · balance -500

# Weekly commission run
bun run partner:settlement:run -- --dry-run
# → [dry-run] ✓ settlement run: 0 settled · 0 no-commission · 0 failed

# Cron schedule preview
bun run partner:settlement:cron:preview
# → Schedule: 0 0 * * 0 · next fire 2026-08-09T00:00:00.000Z

# Tests + board bake
bun test tests/partner-*.test.ts tests/partners-portal.test.ts tests/account-dossier-portal.test.ts
bun run partners:build
bun run bun:ci
```

Hermetic partner suite: **77 pass** across ledger, settlement, deposit, cron, projection,
partners portal, and account dossier tests (Aug 4 2026).

Cron registration (`partner:settlement:cron:register`) remains **staging-only** until
operators confirm idempotent `period-<weekStart>` references in production ops DB.

## Remaining product follow-ups

| Item | Status |
| --- | --- |
| Ledger balance + history on `/portal/partners/` | **Done on main** — DOM contract tests added |
| Soft week rollup on dossier + partners accounting | **Done on main** — hermetic tests green |
| Balance chart (optional POC) | Out of scope — table-first sufficient |
| Bookmaker API settlement feed | Out of scope — needs `fetcherType: "rest"` |
| E3 limit-row wire | Frozen — vocabulary ready, no wire samples |

## Gates per PR

- `bun run check:brands` / `check:brands:staged` on touched `*Id` fields
- `bun x prettier --write` on touched `lib/**/*.ts` (re-stage)
- Path-gated `bun run quality:concept` only if concept vocabulary / surface maps change
- `bun test tests/partner-*.test.ts` + affected portal tests
- PR body via `.github/pull_request_template.md` (Claim → evidence, Prettier checklist)

## Out of scope for this track

- Concept E3 wire (`derivesFrom` / lifecycle edges) — frozen until real samples exist
- Brand baseline migration — tracked separately; not part of this product lane
- Tournament glossary ownership — completed on `main` (`tournament.setka_cup`)

## Success criteria

- [x] Weekly settlement dry-run + cron preview documented with command output
- [x] `/portal/partners/` ledger balance + transaction history from ops DB projection
- [x] Soft week rollup on accounting/dossier surfaces with hermetic tests green
- [x] Stale partner branches audited and marked superseded (this doc)
- [x] E3 limit-row untouched
