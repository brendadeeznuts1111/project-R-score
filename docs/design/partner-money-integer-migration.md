# Partner ledger integer-money migration

<!-- REF:ID 0.1.partner-money-integer-migration -->
<a id="0.1.partner-money-integer-migration"></a>

Status: implementation-ready Phase 2 runbook

Owner: root operations database / partner accounting adapter
Command: `bun run partner:money:migrate -- --db <operations.db>`

## Scope and observed state

This migration owns only the root operations database table `partner_ledger`. It
does not mutate similarly named tables in the Kalshi bot, Sports Terminal, TOC
Soft Balance, or other databases. Those are separate adapter/data-owner
migrations and must not share a database path with this command.

The read-only inventory on 2026-08-05 found the root production-shaped
`data/operations.db` table with legacy `amount REAL` and `balance_after REAL`,
and zero ledger rows. The migration remains fully backfill-safe because data can
arrive before deployment.

Canonical storage is:

```text
amount_minor        INTEGER NOT NULL
balance_after_minor INTEGER NOT NULL
currency            TEXT NOT NULL
```

The suffix is `_minor`, not `_cents`: ISO-4217 currencies do not all use two
decimal places. Conversion uses the Bun runtime's ICU currency exponent and
rejects unsupported currencies, excess fractional precision, unsafe integers,
mixed currencies within one partner ledger, and broken running-balance chains.

## Cutover state machine

| Phase          | Database effect                                                                                                                   | Application behavior                                                                                                                                                        | Re-runnable                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `plan`         | None; read-only inspection                                                                                                        | Reports columns, row count, missing values, drift, and balance-chain issues                                                                                                 | Yes                                   |
| `prepare`      | Adds nullable `amount_minor` and `balance_after_minor` when absent                                                                | Legacy columns remain authoritative for old binaries                                                                                                                        | Yes                                   |
| Runtime deploy | None by the command                                                                                                               | New code reads minor units first and falls back only when a legacy row is not backfilled; it dual-writes legacy databases and writes integer-only fresh/finalized databases | Yes                                   |
| `backfill`     | Converts every legacy value using its currency exponent inside `BEGIN IMMEDIATE`                                                  | Conflicting existing minor values abort the whole transaction                                                                                                               | Yes                                   |
| `verify`       | None; read-only verification                                                                                                      | Must report no issue and `readyToFinalize = true`                                                                                                                           | Yes                                   |
| `finalize`     | Creates a verified backup, rebuilds the table with `INTEGER NOT NULL`, copies data, and drops the legacy table in one transaction | Dynamic runtime detection switches writes to minor-only                                                                                                                     | Yes after completion; becomes a no-op |

`insertLedgerEntry` now computes the running balance inside `BEGIN IMMEDIATE`,
closing the prior read-then-insert race across SQLite connections.

## Operator commands

Use an explicit path for every invocation. The command never selects a live
database implicitly.

```bash
# 1. Capture and review the read-only plan.
bun run partner:money:migrate -- --db data/operations.db

# 2. Add the canonical columns, then deploy the dual-read/write runtime.
bun run partner:money:migrate -- --db data/operations.db --phase prepare --apply

# 3. Backfill after all new runtime instances are serving. Re-run once more
#    after the old instances are drained so late legacy writes are included.
bun run partner:money:migrate -- --db data/operations.db --phase backfill --apply

# 4. Verification is read-only and exits non-zero on any issue.
bun run partner:money:migrate -- --db data/operations.db --phase verify

# 5. Finalize only after the verification report says readyToFinalize=true.
#    The backup path must not already exist.
bun run partner:money:migrate -- \
  --db data/operations.db \
  --phase finalize \
  --apply \
  --backup backups/operations-before-money-finalize.db
```

The finalizer checkpoints WAL, creates the backup with SQLite `VACUUM INTO`,
opens that backup read-only, and requires `PRAGMA integrity_check = ok` before
the table rebuild starts.

## Required gates

Before finalization:

- Every runtime instance capable of partner-ledger writes is on the dual-write
  release.
- A final backfill has run after the last legacy instance stopped writing.
- `verify` reports zero missing minor values, zero legacy/minor drift, one
  currency per partner, safe integers, and an unbroken running-balance chain.
- The named backup is on a filesystem with enough free space and does not
  already exist.
- Focused partner-ledger and settlement tests pass.

After finalization:

- Run `verify` again; `legacyColumns` must be false, `minorColumnsNotNull` and
  `migrationComplete` true, and `issues` empty.
- Run `bun run validate:ledger` and the partner governance gate.
- Retain the backup through the agreed rollback window; deletion is a separate,
  explicit operator action.

## Rollback

Prepare and backfill are additive. Before finalization, rollback means deploy
the prior application release and leave the nullable minor columns in place. Do
not remove them; re-running backfill later is safe. Any legacy writes made after
a backfill must be backfilled again before a new finalize attempt.

After finalization, the pre-finalize database backup is the rollback artifact:

1. Stop partner-ledger writers and checkpoint/close the current database.
2. Preserve the failed post-cutover database under a new incident-specific
   filename; do not overwrite it.
3. Open the backup read-only and require `PRAGMA integrity_check = ok`.
4. Restore a copy of the backup to the exact operations database path, including
   its ownership and permissions.
5. Deploy the prior runtime, start writers, and verify ledger row counts, latest
   balances, and `bun run validate:ledger`.

Restoring the backup discards legitimate writes made after finalization. If any
exist, keep writers stopped and reconcile those entries from the preserved
post-cutover database before reopening the ledger. The backup therefore makes
rollback possible; it is not permission to perform an unreviewed overwrite.

## Ownership boundary for later migrations

| Data owner                            | Floating-money finding                                   | This script                                                |
| ------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Root operations DB / `partner_ledger` | `amount`, `balance_after`                                | Owns and migrates                                          |
| Kalshi bot DB / its `partner_ledger`  | `amount`, `secondary_amount`                             | Inventory only; separate adapter migration                 |
| Sports Terminal DB                    | multiple `balance`/operational money columns             | Inventory only; nested project owns migration              |
| TOC and general operations ledgers    | multiple amount/balance columns with different semantics | Excluded until accounting ownership and units are resolved |
