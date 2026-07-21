#!/usr/bin/env bun

import { buildSymbolIndex } from '../lib/docs/smart-symbol-index';

function usage(): void {
  console.info(`
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
  const parsed = parseArgs(Bun.argv.slice(2));
  if (!parsed) {
    return;
  }

  console.info('Building smart symbol index...');
  const result = await buildSymbolIndex({
    rootDir: parsed.path || '.',
    dbPath: parsed.db,
    rebuild: Boolean(parsed.rebuild),
  });

  console.info(`Root: ${result.rootDir}`);
  console.info(`DB: ${result.dbPath}`);
  console.info(`Files discovered: ${result.totalFiles}`);
  console.info(`Files indexed: ${result.indexedFiles}`);
  console.info(`Files skipped (unchanged): ${result.skippedFiles}`);
  console.info(`Total symbols: ${result.totalSymbols}`);
  console.info(`Total edges: ${result.totalEdges}`);
  console.info(`Completed in ${result.elapsedMs.toFixed(2)}ms`);
}

if (import.meta.main) {
  await main();
}
