#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// tools/partner-deposit-import.ts — batch deposit import CLI (Phase 2).
//
//   bun run partner:deposit:import --file deposits.csv [--code <CODE>] \
//     [--source "John (agent)"] [--dry-run]
//   bun run partner:deposit:import --stdin --code SPEN < deposits.jsonl
//
// CSV header: code,amount,currency,description,account_scope,counterparty,
// source,external_id,proof,batch_id   (code/source/batch_id optional per row)
// JSONL row:  {"code"?, "amount", "currency"?, "description"?, "accountScope"?,
//              "counterparty"?, "source"?, "externalId"?, "proof"?, "batchId"?}
//
// Writes a JSONL batch log to data/deposit-imports-<ts>.jsonl and prints an
// inspectTable summary (console-depth policy — no raw Bun.inspect.table).
//
// @see docs/design/settlement-feed.md — deposit provenance

import { joinPath } from '../lib/path-bun';
import { inspectTable } from '../lib/console-depth';
import {
  importDeposits,
  parseDepositFile,
  type ImportDepositsResult,
} from '../lib/partner-profile/deposit-import';

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}

function usage(): never {
  console.log(`Usage:
  bun run partner:deposit:import --file <deposits.csv|jsonl> \\
    [--code <CODE>] [--source <who>] [--dry-run]
  bun run partner:deposit:import --stdin [--code <CODE>] [--source <who>] [--dry-run]

CSV header: code,amount,currency,description,account_scope,counterparty,source,external_id,proof,batch_id
JSONL row:  {"code"?, "amount", "currency"?, "description"?, "accountScope"?, "counterparty"?, "source"?, "externalId"?, "proof"?, "batchId"?}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const filePath = flag(argv, 'file');
  const defaultCode = flag(argv, 'code');
  const defaultSource = flag(argv, 'source');
  const dryRun = argv.includes('--dry-run');

  let text: string;
  if (argv.includes('--stdin')) {
    text = await Bun.stdin.text();
  } else if (filePath) {
    text = await Bun.file(filePath).text();
  } else {
    usage();
  }
  const format = filePath?.endsWith('.csv')
    ? 'csv'
    : filePath?.endsWith('.jsonl')
      ? 'jsonl'
      : 'auto';
  const rows = parseDepositFile(text, format);

  const result = await importDeposits({ rows, defaultCode, defaultSource, dryRun });

  const tableRows = rows.map((row, i) => {
    const fail = result.failed.find(f => f.row === i + 1);
    return {
      row: i + 1,
      partner: (row.code ?? defaultCode ?? '').toUpperCase() || '—',
      amount: row.amount,
      currency: (row.currency ?? 'USD').toUpperCase(),
      scope: row.accountScope ?? 'global',
      status: fail ? `✗ ${fail.error}` : '✓',
    };
  });
  console.log(inspectTable(tableRows, ['row', 'partner', 'amount', 'currency', 'scope', 'status']));
  console.log(
    `${dryRun ? '[dry-run] ' : ''}✓ deposit import: ${result.imported} imported · ${result.skipped} skipped · ${result.failed.length} failed · total ${result.totalAmount} USD · batch ${result.batchId}`
  );

  if (!dryRun) {
    const logPath = joinPath('data', `deposit-imports-${Date.now()}.jsonl`);
    const line = JSON.stringify({
      batchId: result.batchId,
      dryRun: false,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      totalAmount: result.totalAmount,
      balances: result.balances,
      createdAt: new Date().toISOString(),
    });
    await Bun.write(logPath, `${line}\n`);
    console.log(`📄 log: ${logPath}`);
  }

  if (result.failed.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
