// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BOOK_SCRAPE_AGENTS,
  getBookScrapeAgent,
  trackedScrapeBooks,
} from '../lib/operations/scrapers/books/registry.ts';
import { runAllRegisteredAgents, runRegisteredAgent } from '../lib/operations/scrapers/run-book-agent.ts';
import { readScrapeAgentHealth } from '../lib/operations/scrapers/raw-limits-store.ts';
import { asSportsbookId } from '../lib/types/branded.ts';

describe('book scrape registry contract', () => {
  test('each agent exposes bookId + scrape() → LimitObservation[]', async () => {
    expect(BOOK_SCRAPE_AGENTS.length).toBeGreaterThanOrEqual(4);
    expect(trackedScrapeBooks()).toEqual([
      'draftkings',
      'fanduel',
      'bet365',
      'espnbet',
      'betmgm',
      'caesars',
    ]);

    for (const agent of BOOK_SCRAPE_AGENTS) {
      expect(typeof agent.bookId).toBe('string');
      expect(agent.bookId.length).toBeGreaterThan(0);
      const rows = await agent.scrape({ live: false, observedAt: '2026-07-31T12:00:00.000Z' });
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.sportsbook).toBe(agent.bookId);
        expect(row.mode).toBe('fixture');
        expect(row.agent.length).toBeGreaterThan(0);
      }
    }
  });

  test('sync-scraped path writes health.bookId per registered agent', async () => {
    const root = mkdtempSync(join(tmpdir(), 'book-scrape-registry-'));
    try {
      await runAllRegisteredAgents(root, {
        live: false,
        observedAt: '2026-07-31T12:00:00.000Z',
      });
      const health = await readScrapeAgentHealth(root);
      expect(health).not.toBeNull();
      expect(health!.books.map(b => b.bookId)).toEqual([...trackedScrapeBooks()]);
      for (const entry of health!.books) {
        expect(entry.bookId).toBe(entry.sportsbook);
        expect(entry.ok).toBe(true);
        expect(entry.observationCount).toBeGreaterThan(0);
      }

      const alone = await runRegisteredAgent(root, getBookScrapeAgent(asSportsbookId('draftkings')), {
        live: false,
        observedAt: '2026-07-31T13:00:00.000Z',
      });
      expect(alone.ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
