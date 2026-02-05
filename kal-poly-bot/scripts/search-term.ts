#!/usr/bin/env bun
// scripts/search-term.ts - Quick lightning search utility
import { SuperRipgrep } from '../utils/super-ripgrep.ts';

async function quickSearch() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: bun scripts/search-term.ts <query> [path]');
    console.log('Examples:');
    console.log('  bun scripts/search-term.ts "Bun.Terminal"');
    console.log('  bun scripts/search-term.ts "HistoryCLI" operation_surgical_precision/');
    process.exit(1);
  }

  const query = args[0];
  const path = args[1] || '.';

  console.log(`🔍 Searching: "${query}" in ${path}`);

  const rg = new SuperRipgrep();
  const result = await rg.lightningSearch(query, path);

  console.log(`\n⚡ Results:`);
  console.log(`   Matches: ${result.matches}`);
  console.log(`   Files: ${result.files}`);
  console.log(`   Time: ${result.durationMs.toFixed(1)}ms`);
  console.log(`   Throughput: ${result.throughput.toFixed(0)} matches/sec`);

  if (result.speedup) {
    console.log(`   Speedup: ${result.speedup}x faster than grep`);
  }

  if (result.matches === 0) {
    console.log('\n❌ No matches found');
  } else {
    console.log('\n✅ Search completed successfully!');
  }
}

// Run if called directly
if (import.meta.main) {
  quickSearch().catch(console.error);
}