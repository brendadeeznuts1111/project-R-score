#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Idempotent partner-ledger money migration.
 *
 * The CLI is read-only by default and always requires an explicit database:
 *
 *   bun scripts/migrate-money-to-integers.ts --db data/operations.db
 *   bun scripts/migrate-money-to-integers.ts --db data/operations.db --phase prepare --apply
 *   bun scripts/migrate-money-to-integers.ts --db data/operations.db --phase backfill --apply
 *   bun scripts/migrate-money-to-integers.ts --db data/operations.db --phase verify
 *   bun scripts/migrate-money-to-integers.ts --db data/operations.db --phase finalize --apply \
 *     --backup backups/operations-before-money-finalize.db
 *
 * prepare/backfill are additive. finalize is the only destructive phase and
 * refuses to run without a new SQLite backup made by VACUUM INTO.
 */

import { Database } from 'bun:sqlite';
import { dirnamePath, resolvePath } from '../lib/path-bun.ts';
import {
  PARTNER_LEDGER_DDL,
  partnerLedgerMoneyColumns,
  toMinorUnits,
} from '../lib/partner-profile/ledger.ts';

export type MoneyMigrationPhase = 'plan' | 'prepare' | 'backfill' | 'verify' | 'finalize';

type LegacyMoneyRow = {
  id: string; // brand-ok — opaque ledger entry primary key
  partner_code: string; // brand-ok — canonical partner CODE
  currency: string;
  amount: number;
  balance_after: number;
  amount_minor: number | null;
  balance_after_minor: number | null;
  created_at: string;
};

type CanonicalMoneyRow = {
  id: string; // brand-ok — opaque ledger entry primary key
  partner_code: string; // brand-ok — canonical partner CODE
  currency: string;
  amount_minor: number | null;
  balance_after_minor: number | null;
  created_at: string;
};

export type MoneyMigrationReport = {
  tableExists: boolean;
  legacyColumns: boolean;
  minorColumns: boolean;
  minorColumnsNotNull: boolean;
  rows: number;
  rowsMissingMinorUnits: number;
  issues: string[];
  readyToFinalize: boolean;
  migrationComplete: boolean;
};

const FINALIZE_REQUIRED_COLUMNS = [
  'id',
  'partner_code',
  'type',
  'currency',
  'description',
  'reference',
  'book_key',
  'tracking_id',
  'account_scope',
  'counterparty',
  'source',
  'external_id',
  'proof',
  'batch_id',
  'created_at',
] as const;

function tableExists(db: Database, table: string): boolean {
  return (
    db
      .query(`SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = $table`)
      .get({ $table: table }) !== null
  );
}

function orderedRows(db: Database): Array<LegacyMoneyRow | CanonicalMoneyRow> {
  const columns = partnerLedgerMoneyColumns(db);
  if (columns.legacyAmount && columns.legacyBalanceAfter) {
    return db
      .query(
        `SELECT id, partner_code, currency, amount, balance_after,
                amount_minor, balance_after_minor, created_at
         FROM partner_ledger ORDER BY partner_code, created_at, id`
      )
      .all() as LegacyMoneyRow[];
  }
  return db
    .query(
      `SELECT id, partner_code, currency, amount_minor, balance_after_minor, created_at
       FROM partner_ledger ORDER BY partner_code, created_at, id`
    )
    .all() as CanonicalMoneyRow[];
}

function isLegacyRow(row: LegacyMoneyRow | CanonicalMoneyRow): row is LegacyMoneyRow {
  return 'amount' in row;
}

export function inspectMoneyMigration(db: Database): MoneyMigrationReport {
  if (!tableExists(db, 'partner_ledger')) {
    return {
      tableExists: false,
      legacyColumns: false,
      minorColumns: false,
      minorColumnsNotNull: false,
      rows: 0,
      rowsMissingMinorUnits: 0,
      issues: ['partner_ledger table does not exist'],
      readyToFinalize: false,
      migrationComplete: false,
    };
  }

  const moneyColumns = partnerLedgerMoneyColumns(db);
  const legacyColumns = moneyColumns.legacyAmount && moneyColumns.legacyBalanceAfter;
  const minorColumns = moneyColumns.amountMinor && moneyColumns.balanceAfterMinor;
  const columnInfo = db.query('PRAGMA table_info(partner_ledger)').all() as {
    name: string;
    notnull: number;
    type: string;
  }[];
  const notNull = new Map(columnInfo.map(column => [column.name, column.notnull === 1]));
  const types = new Map(columnInfo.map(column => [column.name, column.type.toUpperCase()]));
  const columnNames = new Set(columnInfo.map(column => column.name));
  const minorColumnsNotNull =
    notNull.get('amount_minor') === true && notNull.get('balance_after_minor') === true;
  const issues: string[] = [];

  const missingFinalizeColumns = FINALIZE_REQUIRED_COLUMNS.filter(name => !columnNames.has(name));
  if (missingFinalizeColumns.length > 0) {
    issues.push(`finalize-required columns are missing: ${missingFinalizeColumns.join(', ')}`);
  }

  if (moneyColumns.legacyAmount !== moneyColumns.legacyBalanceAfter) {
    issues.push('legacy amount/balance_after columns are incomplete');
  }
  if (!minorColumns) {
    issues.push('amount_minor and balance_after_minor have not both been prepared');
    const rows = db.query('SELECT COUNT(*) AS count FROM partner_ledger').get() as {
      count: number;
    };
    return {
      tableExists: true,
      legacyColumns,
      minorColumns: false,
      minorColumnsNotNull: false,
      rows: rows.count,
      rowsMissingMinorUnits: rows.count,
      issues,
      readyToFinalize: false,
      migrationComplete: false,
    };
  }
  if (types.get('amount_minor') !== 'INTEGER' || types.get('balance_after_minor') !== 'INTEGER') {
    issues.push('canonical money columns must both use SQLite INTEGER affinity');
  }
  if (!legacyColumns && !minorColumnsNotNull) {
    issues.push('minor-only schema must enforce NOT NULL on both canonical money columns');
  }

  const rows = orderedRows(db);
  let rowsMissingMinorUnits = 0;
  const currenciesByPartner = new Map<string, Set<string>>();
  const runningByPartner = new Map<string, number>();

  for (const row of rows) {
    const partnerCurrencies = currenciesByPartner.get(row.partner_code) ?? new Set<string>();
    partnerCurrencies.add(row.currency.toUpperCase());
    currenciesByPartner.set(row.partner_code, partnerCurrencies);

    if (row.amount_minor === null || row.balance_after_minor === null) {
      rowsMissingMinorUnits++;
      continue;
    }
    if (!Number.isSafeInteger(row.amount_minor) || !Number.isSafeInteger(row.balance_after_minor)) {
      issues.push(`row ${row.id} has a non-safe-integer minor-unit value`);
      continue;
    }
    if (isLegacyRow(row)) {
      try {
        if (toMinorUnits(row.amount, row.currency) !== row.amount_minor) {
          issues.push(`row ${row.id} amount differs between legacy and minor-unit columns`);
        }
        if (toMinorUnits(row.balance_after, row.currency) !== row.balance_after_minor) {
          issues.push(`row ${row.id} balance differs between legacy and minor-unit columns`);
        }
      } catch (error) {
        issues.push(`row ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const expectedBalance = (runningByPartner.get(row.partner_code) ?? 0) + row.amount_minor;
    if (!Number.isSafeInteger(expectedBalance)) {
      issues.push(`partner ${row.partner_code} running balance exceeds safe integer storage`);
    } else if (expectedBalance !== row.balance_after_minor) {
      issues.push(
        `row ${row.id} breaks the balance chain: expected ${expectedBalance}, stored ${row.balance_after_minor}`
      );
    }
    runningByPartner.set(row.partner_code, row.balance_after_minor);
  }

  for (const [partnerCode, currencies] of currenciesByPartner) {
    if (currencies.size > 1) {
      issues.push(`partner ${partnerCode} mixes currencies: ${[...currencies].sort().join(', ')}`);
    }
  }
  if (rowsMissingMinorUnits > 0) {
    issues.push(`${rowsMissingMinorUnits} row(s) are missing canonical minor-unit values`);
  }

  return {
    tableExists: true,
    legacyColumns,
    minorColumns,
    minorColumnsNotNull,
    rows: rows.length,
    rowsMissingMinorUnits,
    issues,
    readyToFinalize: legacyColumns && rowsMissingMinorUnits === 0 && issues.length === 0,
    migrationComplete:
      !legacyColumns &&
      minorColumns &&
      minorColumnsNotNull &&
      rowsMissingMinorUnits === 0 &&
      issues.length === 0,
  };
}

export function prepareMoneyMigration(db: Database): MoneyMigrationReport {
  if (!tableExists(db, 'partner_ledger')) {
    throw new Error('partner_ledger table does not exist; initialize the operations schema first');
  }
  const columns = partnerLedgerMoneyColumns(db);
  if (!columns.amountMinor) db.run('ALTER TABLE partner_ledger ADD COLUMN amount_minor INTEGER');
  if (!columns.balanceAfterMinor) {
    db.run('ALTER TABLE partner_ledger ADD COLUMN balance_after_minor INTEGER');
  }
  return inspectMoneyMigration(db);
}

export function backfillMoneyMigration(db: Database): MoneyMigrationReport {
  prepareMoneyMigration(db);
  const columns = partnerLedgerMoneyColumns(db);
  if (!columns.legacyAmount || !columns.legacyBalanceAfter) {
    return inspectMoneyMigration(db);
  }

  const rows = orderedRows(db) as LegacyMoneyRow[];
  const planned = rows.map(row => ({
    row,
    amountMinor: toMinorUnits(row.amount, row.currency),
    balanceAfterMinor: toMinorUnits(row.balance_after, row.currency),
  }));
  for (const item of planned) {
    if (item.row.amount_minor !== null && item.row.amount_minor !== item.amountMinor) {
      throw new Error(`row ${item.row.id} already has a conflicting amount_minor`);
    }
    if (
      item.row.balance_after_minor !== null &&
      item.row.balance_after_minor !== item.balanceAfterMinor
    ) {
      throw new Error(`row ${item.row.id} already has a conflicting balance_after_minor`);
    }
  }

  db.run('BEGIN IMMEDIATE');
  try {
    const update = db.query(
      `UPDATE partner_ledger
       SET amount_minor = $amountMinor, balance_after_minor = $balanceAfterMinor
       WHERE id = $id AND (amount_minor IS NULL OR balance_after_minor IS NULL)`
    );
    for (const item of planned) {
      update.run({
        $id: item.row.id,
        $amountMinor: item.amountMinor,
        $balanceAfterMinor: item.balanceAfterMinor,
      });
    }
    const report = inspectMoneyMigration(db);
    if (report.issues.length > 0) {
      throw new Error(`backfill verification failed: ${report.issues.join('; ')}`);
    }
    db.run('COMMIT');
    return report;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

export function finalizeMoneyMigration(db: Database): MoneyMigrationReport {
  const before = inspectMoneyMigration(db);
  if (!before.legacyColumns) return before;
  if (!before.readyToFinalize) {
    throw new Error(`money migration is not ready to finalize: ${before.issues.join('; ')}`);
  }
  if (tableExists(db, 'partner_ledger_legacy_money')) {
    throw new Error(
      'partner_ledger_legacy_money already exists; inspect the interrupted migration'
    );
  }

  db.run('BEGIN IMMEDIATE');
  try {
    db.run('ALTER TABLE partner_ledger RENAME TO partner_ledger_legacy_money');
    db.exec(PARTNER_LEDGER_DDL);
    db.run(`
      INSERT INTO partner_ledger
        (id, partner_code, type, amount_minor, currency, description, reference,
         book_key, tracking_id, account_scope, counterparty, source, external_id,
         proof, batch_id, balance_after_minor, created_at)
      SELECT id, partner_code, type, amount_minor, currency, description, reference,
             book_key, tracking_id, account_scope, counterparty, source, external_id,
             proof, batch_id, balance_after_minor, created_at
      FROM partner_ledger_legacy_money
    `);
    db.run('DROP TABLE partner_ledger_legacy_money');
    // Index names belonged to the renamed table during the first DDL pass.
    // Re-running after its drop creates every canonical index on the new table.
    db.exec(PARTNER_LEDGER_DDL);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
  return inspectMoneyMigration(db);
}

function flag(argv: string[], name: string): string | undefined {
  const equals = argv.find(value => value.startsWith(`--${name}=`));
  if (equals) return equals.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function createBackup(db: Database, backupPath: string): Promise<void> {
  const absolute = resolvePath(backupPath);
  if (await Bun.file(absolute).exists()) throw new Error(`backup already exists: ${absolute}`);
  const mkdir = Bun.spawnSync(['mkdir', '-p', dirnamePath(absolute)], {
    stdout: 'ignore',
    stderr: 'pipe',
  });
  if (mkdir.exitCode !== 0) {
    throw new Error(`could not create backup directory: ${mkdir.stderr.toString().trim()}`);
  }
  db.run('PRAGMA wal_checkpoint(FULL)');
  db.query('VACUUM INTO $backup').run({ $backup: absolute });
  const backup = new Database(absolute, { readonly: true });
  try {
    const result = backup.query('PRAGMA integrity_check').get() as { integrity_check: string };
    if (result.integrity_check !== 'ok')
      throw new Error(`backup integrity check failed: ${absolute}`);
  } finally {
    backup.close();
  }
}

function printReport(
  phase: MoneyMigrationPhase,
  dbPath: string,
  report: MoneyMigrationReport
): void {
  console.log(
    JSON.stringify(
      {
        phase,
        database: dbPath,
        ...report,
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  const dbArg = flag(argv, 'db');
  if (!dbArg) throw new Error('missing required --db <path>; no database is selected implicitly');
  const dbPath = resolvePath(dbArg);
  if (!(await Bun.file(dbPath).exists())) throw new Error(`database does not exist: ${dbPath}`);
  const phase = (flag(argv, 'phase') ?? 'plan') as MoneyMigrationPhase;
  if (!['plan', 'prepare', 'backfill', 'verify', 'finalize'].includes(phase)) {
    throw new Error(`unknown phase "${phase}"`);
  }
  const mutating = phase === 'prepare' || phase === 'backfill' || phase === 'finalize';
  if (mutating && !argv.includes('--apply')) {
    throw new Error(`phase ${phase} is mutating; re-run with --apply after reviewing the plan`);
  }

  const db = new Database(dbPath, mutating ? undefined : { readonly: true });
  try {
    db.run('PRAGMA busy_timeout = 5000');
    let report: MoneyMigrationReport;
    if (phase === 'prepare') report = prepareMoneyMigration(db);
    else if (phase === 'backfill') report = backfillMoneyMigration(db);
    else if (phase === 'finalize') {
      const before = inspectMoneyMigration(db);
      if (!before.legacyColumns) {
        report = before;
      } else {
        const backup = flag(argv, 'backup');
        if (!backup) throw new Error('finalize requires --backup <new-path>');
        await createBackup(db, backup);
        report = finalizeMoneyMigration(db);
      }
    } else {
      report = inspectMoneyMigration(db);
    }
    printReport(phase, dbPath, report);
    if ((phase === 'verify' || phase === 'plan') && report.issues.length > 0) process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
