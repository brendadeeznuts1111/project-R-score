#!/usr/bin/env bun
/**
 * Bun DX catalog CLI — discover one-liners and doc links from the harness catalog.
 */
import { BUN_DX_CATALOG, randomCatalogEntry, searchCatalog } from '../config/bun-dx-catalog.ts';

function printEntry(entry: (typeof BUN_DX_CATALOG)[number]): void {
  console.info(`\n📌 ${entry.id} — ${entry.summary}`);
  if (entry.bad) console.info(`   ❌ ${entry.bad}`);
  console.info(`   ✅ ${entry.good}`);
  console.info(`   📖 ${entry.docs}`);
  if (entry.eslintRule) console.info(`   🔧 Rule: ${entry.eslintRule}`);
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
  const args = Bun.argv.slice(2);

  if (args.includes('--json')) {
    console.info(JSON.stringify(BUN_DX_CATALOG, null, 2));
    return;
  }

  if (args.includes('--list') || args[0] === 'list' || args.length === 0) {
    printTable();
    console.info('\nTip: bun run dx:catalog tip | search <query> | <entry-id>');
    return;
  }

  if (args[0] === 'tip' || args.includes('--random')) {
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
