#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Bun DX catalog CLI — discover one-liners and doc links from the harness catalog.
 */
import { BUN_DX_CATALOG, randomCatalogEntry, searchCatalog } from '../config/bun-dx-catalog.ts';
import { jsonOut } from '../lib/console-depth.ts';

function printEntry(entry: (typeof BUN_DX_CATALOG)[number]): void {
  console.info(`\n📌 ${entry.id} — ${entry.summary}`);
  if (entry.bad) console.info(`   ❌ ${entry.bad}`);
  console.info(`   ✅ ${entry.good}`);
  console.info(`   📖 ${entry.docs}`);
  const rules = entry.eslintRules ?? (entry.eslintRule ? [entry.eslintRule] : []);
  if (rules.length) console.info(`   🔧 Rule: ${rules.join(', ')}`);
}

function printTable(): void {
  console.info('Bun DX Catalog');
  console.info('='.repeat(60));
  for (const entry of BUN_DX_CATALOG) {
    console.info(`${entry.id.padEnd(22)} ${entry.summary}`);
  }
  console.info(`\nTotal: ${BUN_DX_CATALOG.length} entries`);
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('dx:catalog', Bun.argv.slice(2));

  if (args.includes('--json')) {
    jsonOut(BUN_DX_CATALOG);
    return;
  }

  if (args.includes('--list') || args[0] === 'list' || args.length === 0) {
    printTable();
    console.info('\nEntry points:');
    console.info('  bun run dx:catalog <entry-id>     # e.g. file.glob');
    console.info('  bun run dx:catalog tip [id]       # random, or tip for id');
    console.info('  bun run dx:catalog search <query>');
    console.info('  bun run dx:catalog list');
    return;
  }

  if (args[0] === 'tip' || args.includes('--random')) {
    const tipId = args[0] === 'tip' ? args[1] : undefined;
    if (tipId) {
      const entry = BUN_DX_CATALOG.find(e => e.id === tipId);
      if (!entry) {
        console.error(`Unknown entry: ${tipId}`);
        process.exit(1);
      }
      printEntry(entry);
      return;
    }
    printEntry(randomCatalogEntry());
    return;
  }

  if (args[0] === 'search' && args[1]) {
    const results = searchCatalog(args.slice(1).join(' '));
    if (results.length === 0) {
      console.info('No catalog entries matched.');
      process.exit(1);
    }
    for (const entry of results) printEntry(entry);
    return;
  }

  const id = args[0];
  const entry = BUN_DX_CATALOG.find(e => e.id === id);
  if (entry) {
    printEntry(entry);
    return;
  }

  const results = searchCatalog(id);
  if (results.length === 1) {
    printEntry(results[0]!);
    return;
  }
  if (results.length > 1) {
    for (const r of results) printEntry(r);
    return;
  }

  console.error(`Unknown entry: ${id}`);
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
