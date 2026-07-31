// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  BET365_SPORTSBOOK,
  runBet365Agent,
  scrapeBet365HtmlStub,
} from '../lib/operations/scrapers/books/bet365.ts';
import { getBookScrapeAgent } from '../lib/operations/scrapers/books/registry.ts';
import { asSportsbookId } from '../lib/types/branded.ts';

describe('Bet365 Tier 4 scrape agent', () => {
  test('fixture agent yields bet365-scoped observations', async () => {
    const result = await runBet365Agent({
      live: false,
      observedAt: '2026-07-31T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBe(16);
    expect(result.observations.every(o => o.sportsbook === BET365_SPORTSBOOK)).toBe(true);
  });

  test('HTML stub fails closed without Playwright flag', () => {
    const prev = Bun.env.BET365_PLAYWRIGHT;
    delete Bun.env.BET365_PLAYWRIGHT;
    try {
      const stub = scrapeBet365HtmlStub();
      expect(stub.ok).toBe(false);
      expect(stub.mode).toBe('html_stub');
    } finally {
      if (prev !== undefined) Bun.env.BET365_PLAYWRIGHT = prev;
    }
  });

  test('registry scrape() contract', async () => {
    const agent = getBookScrapeAgent(asSportsbookId('bet365'));
    const rows = await agent.scrape({ live: false, observedAt: '2026-07-31T12:00:00.000Z' });
    expect(agent.bookId).toBe('bet365');
    expect(rows.length).toBe(16);
  });
});
