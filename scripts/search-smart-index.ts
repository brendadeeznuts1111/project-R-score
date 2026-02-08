#!/usr/bin/env bun

import { buildSymbolIndex } from '../lib/docs/smart-symbol-index';

function usage(): void {
  console.log(`
Smart Search Index Builder

USAGE:
  bun run scripts/search-smart-index.ts [options]

OPTIONS:
  --path <dir>     Root directory to index (default: .)
  --db <path>      SQLite DB path (default: .cache/smart-search/symbols.sqlite)
  --rebuild        Rebuild index from scratch

EXAMPLES:
  bun run scripts/search-smart-index.ts
  bun run scripts/search-smart-index.ts --path ./lib
`);
}

function parseArgs(argv: string[]): { path?: string; db?: string; rebuild?: boolean } | null {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    return null;
  }

  const result: { path?: string; db?: string; rebuild?: boolean } = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      result.path = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--db') {
      result.db = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--rebuild') {
      result.rebuild = true;
      continue;
    }
  }

  return result;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) {
    return;
  }

  console.log('Building smart symbol index...');
  const result = await buildSymbolIndex({
    rootDir: parsed.path || '.',
    dbPath: parsed.db,
    rebuild: Boolean(parsed.rebuild),
  });

  console.log(`Root: ${result.rootDir}`);
  console.log(`DB: ${result.dbPath}`);
  console.log(`Files discovered: ${result.totalFiles}`);
  console.log(`Files indexed: ${result.indexedFiles}`);
  console.log(`Files skipped (unchanged): ${result.skippedFiles}`);
  console.log(`Total symbols: ${result.totalSymbols}`);
  console.log(`Total edges: ${result.totalEdges}`);
  console.log(`Completed in ${result.elapsedMs.toFixed(2)}ms`);
}

await main();
