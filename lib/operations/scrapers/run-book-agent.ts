/**
 * Run registered book scrape agents → JSONL + health.json.
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import type { LimitObservation } from './limit-observation-wire.ts';
import type { BookScrapeAgent, BookScrapeOptions } from './book-scrape-agent.ts';
import { BOOK_SCRAPE_AGENTS, getBookScrapeAgent, trackedScrapeBooks } from './books/registry.ts';
import {
  appendLimitObservations,
  healthEntryForBook,
  readScrapeAgentHealth,
  writeScrapeAgentHealth,
  type ScrapeAgentHealthEntry,
} from './raw-limits-store.ts';

export type BookAgentRunResult = {
  ok: boolean;
  mode: LimitObservation['mode'];
  observations: LimitObservation[];
  error: string | null;
};

export { BOOK_SCRAPE_AGENTS, getBookScrapeAgent, trackedScrapeBooks };

export async function mergeBookHealth(root: string, entry: ScrapeAgentHealthEntry): Promise<void> {
  const prior = await readScrapeAgentHealth(root);
  const bookIds = trackedScrapeBooks();
  const byBook = new Map<string, ScrapeAgentHealthEntry>();
  for (const book of bookIds) {
    byBook.set(book, await healthEntryForBook(root, book));
  }
  for (const existing of prior?.books ?? []) {
    byBook.set(existing.bookId ?? existing.sportsbook, existing);
  }
  byBook.set(entry.bookId ?? entry.sportsbook, entry);
  const books: ScrapeAgentHealthEntry[] = [];
  for (const book of bookIds) {
    books.push(byBook.get(book) ?? (await healthEntryForBook(root, book)));
  }
  await writeScrapeAgentHealth(root, {
    generatedAt: new Date().toISOString(),
    books,
  });
}

/** Run one registry agent: scrape() → JSONL → health[bookId]. */
export async function runRegisteredAgent(
  root: string,
  agent: BookScrapeAgent,
  opts: BookScrapeOptions = {}
): Promise<{
  ok: boolean;
  appended: number;
  mode: LimitObservation['mode'];
  error: string | null;
}> {
  const label = `${agent.bookId}-agent`;
  try {
    const observations = await agent.scrape(opts);
    const mode = observations[0]?.mode ?? 'fixture';
    const { appended } = await appendLimitObservations(root, agent.bookId, observations);
    await mergeBookHealth(
      root,
      await healthEntryForBook(root, agent.bookId, {
        ok: true,
        mode,
        lastError: null,
      })
    );
    console.info(`✅ ${label} · mode=${mode} · appended ${appended}`);
    return { ok: true, appended, mode, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await mergeBookHealth(
      root,
      await healthEntryForBook(root, agent.bookId, {
        ok: false,
        mode: opts.html ? 'html_stub' : 'fixture',
        lastError: message,
      })
    );
    console.warn(`⚠ ${label} failed: ${message}`);
    return { ok: false, appended: 0, mode: opts.html ? 'html_stub' : 'fixture', error: message };
  }
}

/** Run every registered agent (one line of intent in sync-scraped). */
export async function runAllRegisteredAgents(
  root: string,
  opts: BookScrapeOptions = {}
): Promise<void> {
  for (const agent of BOOK_SCRAPE_AGENTS) {
    await runRegisteredAgent(root, agent, opts);
  }
}

/** @deprecated Prefer runRegisteredAgent — kept for tests that pass a custom runner. */
export async function runBookAgentIntoStore(
  root: string,
  sportsbook: string,
  agentLabel: string,
  run: () => Promise<BookAgentRunResult>
): Promise<{
  ok: boolean;
  appended: number;
  mode: LimitObservation['mode'];
  error: string | null;
}> {
  const result = await run();
  if (!result.ok) {
    await mergeBookHealth(
      root,
      await healthEntryForBook(root, sportsbook, {
        ok: false,
        mode: result.mode,
        lastError: result.error,
      })
    );
    console.warn(`⚠ ${agentLabel} failed: ${result.error}`);
    return { ok: false, appended: 0, mode: result.mode, error: result.error };
  }
  const { appended } = await appendLimitObservations(root, sportsbook, result.observations);
  await mergeBookHealth(
    root,
    await healthEntryForBook(root, sportsbook, {
      ok: true,
      mode: result.mode,
      lastError: result.error,
    })
  );
  console.info(
    `✅ ${agentLabel} · mode=${result.mode} · appended ${appended}` +
      (result.error ? ` · ${result.error}` : '')
  );
  return { ok: true, appended, mode: result.mode, error: result.error };
}
