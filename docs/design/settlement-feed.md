# Settlement feed (Phase 3 design)

Status: **design** · owner: partner accounting lane · updated 2026-08-03

## Current state (merged)

| Piece | Where | Status |
|-------|-------|--------|
| Accounting capture on `partner:onboard` | `tools/partner-onboard.ts` flags → profile `settlement.*` / `balance.*` | ✅ merged (#212) |
| Ledger table + stub | `lib/partner-profile/ledger.ts` (`partner_ledger`) + `accounting-stub.ts` (`initLedgerForPartner`) | ✅ merged (#212) |
| Partners-ops projection | `loadSqliteLedgerSnapshots` → `accounting.balance/initialCapital/sqlLedgerCount` | ✅ merged (#212) |
| Board display | `/portal/partners/` Balance column + Initial cap tiles | ✅ merged + deployed (#216) |
| **Desk-entry settlement** | `partner:settlement:post` (`tools/partner-settlement.ts`) — manual win/loss posting | ✅ merged (#217) |

The manual CLI is live today: a desk posts `--code --amount` (negative = payout/loss) and a `settlement` row lands in `partner_ledger` with a running `balance_after`, mirrored into the profile TOML, with a negative-balance warning. That is the **data path** — this design automates the same path.

## Goal

A scheduled job that posts `settlement` entries **without a human keying them** — computed from actual bet/win data per partner per period, applying the profile's `settlement.*` terms, and refreshing `fundStatus` / capital-requirement state when thresholds are hit.

## Data source options

The hard constraint: the partner PPH desks are `fetcherType: "seat"` (credentials in `partner_vault`, **no** fetch pipeline) — see `@factorywager/bookmakers` 0.3.0. There is no automated win/loss feed for them today.

| Option | What | Fit |
|--------|------|-----|
| **A — Bookmaker API** | Fetch bet/win data for desks that have `fetcherType: "rest"`/`"webview"` fetch integration (e.g. pinnacle via `restBaseUrl` + `apiKeyEnv`) | Works only for the 5 legal-US books in the registry; the seat desks have no integration |
| **B — Accumulated desk entry** | The engine reads the desk-entry history (`partner_ledger` `settlement` rows + deposits/credits) and computes period settlement from the running trail | Zero new data plumbing; but it's still operator-fed — not truly "automated" |
| **C — File import** | `partner:settlement:import --file <csv|jsonl>` — bulk desk entry from a bookmaker's export (win/loss per period), feeding the same `postSettlement` path | Fast to build; matches how PPH desks actually report today |

**Recommended path: C first (file import), then A for integrated books when a partner actually has one.** B is a reporting aid, not a settlement source. The cron then runs over the imported ledger.

## Implementation outline

### 1. Bulk import (extends the desk-entry path)

`tools/partner-settlement.ts` gains an `import` mode:

```bash
bun run partner:settlement:import --file settlements-2026w32.jsonl --dry-run
# rows: { "code": "SPEN", "amount": 1240.5, "currency": "USD", "period": "2026-W32", "note": "..." }
```

- Same validation + `insertLedgerEntry` plumbing as `postSettlement`.
- **Idempotency:** `partner_ledger` has no unique constraint on settlements (only `initial_capital` is unique per partner). The engine must not double-post. Decision point: add a `reference TEXT` column (unique per `(partner_code, reference)`) vs. dedupe by `description = period key`. **Recommendation: add `reference`** — a migration (`ALTER TABLE … ADD COLUMN reference TEXT` + unique index, matching `migrateSchema`'s pattern) is cheap and makes the cron re-runs safe.
- Update the TOML mirror + `fundStatus` per row (reuse `mirrorLedgerEntryToProfile`).

### 2. Cron (Bun.cron — see `docs/BUN_NATIVE_CAPABILITIES.md`)

A `Bun.cron` job (daily/weekly per `settlement.payoutFrequency` when set, default weekly) that:

1. Loads all profiles (`loadAllProfiles` in `lib/partner-profile/bake.ts`).
2. For each partner with `accounting.fundStatus !== 'blocked'`:
   - Pull the period's bets/wins from the chosen source:
     - **C**: imported rows staged in a `settlement_imports` table (or the `reference`-tagged ledger rows pending finalization).
     - **A** (future, integrated desks only): fetch from the bookmaker API; map to `settlement` entries via the profile's `books.<bookKey>` + registry fetcher config.
   - Compute the settlement from `settlement.*` terms (`commissionPct` / `commissionStructure`, `holdTargetPct`) applied to gross win/loss.
   - Post via the same `insertLedgerEntry` path (type `settlement`, `reference` = period key, description = `"period settlement <period>"`).
3. Refresh state:
   - `accounting.fundStatus` per `balance.marginCallAction` (`notify|pause|block`) when `balance < marginCallThreshold`.
   - `balance.initialCapitalRequirement` when the settlement crosses a top-up trigger (future: `autoInject`).
4. Re-bake: `partner-profile:bake` (registry) + `partners:build` (board balances) so the portal reflects the run.

### 3. Wiring

- Script: `partner:settlement:run [--dry-run]` for the manual trigger; the `Bun.cron` entry in the harness scheduler for the automated cadence (see `lib/harness/cron.ts` for the repo's cron contract).
- The engine posts through the **same** `insertLedgerEntry` / `mirrorLedgerEntryToProfile` plumbing — no new ledger model.

## Open decisions

1. ~~**`reference` column** for settlement idempotency~~ — **resolved**: `partner_ledger.reference TEXT` + unique partial index shipped with `partner:settlement:import`. Rows whose reference already exists are skipped on re-import.
2. **Import format** (JSONL + CSV shipped; CSV values must not contain commas) and whether the import lands directly in `partner_ledger` or a staged table with a finalize step. (Current: direct to `partner_ledger` with `reference` idempotency.)
3. **Commission math source of truth**: apply `settlement.commissionPct` at import time vs. store gross and compute on the board. (Recommend: store the net settlement amount, compute gross→net at import, mirror both in the description.)
4. **Cron cadence + window**: align to `settlement.payoutFrequency` (default weekly, week boundaries UTC).

## Out of scope (for now)

- Real bookmaker API settlement for seat desks (needs fetch integration first — registry `fetcherType: "seat"`).
- `autoInject` funding automation.
- Balance chart / transaction history UI on `/portal/partners/` (the data is ready via the projection; rendering is a follow-up).

## Related

- `docs/design/unified-partner-profile.md` — `settlement.*`, `balance.*`, `accounting.*` model
- `lib/partner-profile/ledger.ts` · `lib/partner-profile/accounting-stub.ts` · `tools/partner-settlement.ts`
- Registry: `@factorywager/bookmakers` 0.3.0 (`fetcherType: "seat"`)
