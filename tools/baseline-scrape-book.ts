#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Run one registered Tier 4 book agent by bookId.
 *
 *   bun tools/baseline-scrape-book.ts draftkings
 *   bun tools/baseline-scrape-book.ts fanduel --live
 *   bun run baseline:scrape-draftkings
 *   bun run scrape:odds bet365
 *   bun run agent scrape odds --source bet365
 */

import { joinPath } from '../lib/path-bun.ts';
import { parseSportsbookId, type SportsbookId } from '../lib/types/branded.ts';
import {
  getBookScrapeAgent,
  trackedScrapeBooks,
} from '../lib/operations/scrapers/books/registry.ts';
import { runRegisteredAgent } from '../lib/operations/scrapers/run-book-agent.ts';
import { healthEntryForBook } from '../lib/operations/scrapers/raw-limits-store.ts';

const root = joinPath(import.meta.dir, '..');

export async function runBookCli(
  bookId: SportsbookId,
  flags: string[] = Bun.argv.slice(2)
): Promise<void> {
  const agent = getBookScrapeAgent(bookId);
  const outcome = await runRegisteredAgent(root, agent, {
    live: flags.includes('--live'),
    html: flags.includes('--html'),
  });
  if (!outcome.ok) {
    console.error(`❌ ${bookId}-agent: ${outcome.error}`);
    process.exit(1);
  }
  const entry = await healthEntryForBook(root, bookId);
  console.info(
    `   health: bookId=${entry.bookId} observations=${entry.observationCount} latestCells=${entry.latestCount} → artifacts/raw-limits/${bookId}.jsonl`
  );
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('baseline:scrape-bet365', Bun.argv.slice(2)).filter(
    a => !a.startsWith('--')
  );
  const bookId = args[0];
  if (!bookId) {
    console.error(
      `Usage: baseline-scrape-book.ts <bookId> [--live|--html]
   or: bun run scrape:odds <bookId> [--live]
   or: bun run agent scrape odds --source <bookId> [--live]
Registered: ${trackedScrapeBooks().join(', ')}
Sink: artifacts/raw-limits/<bookId>.jsonl`
    );
    process.exit(1);
  }
  await runBookCli(parseSportsbookId(bookId));
}

if (import.meta.main) await main();
