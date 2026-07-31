// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  ESPNBET_SPORTSBOOK,
  runEspnBetAgent,
  scrapeEspnBetHtmlStub,
} from '../lib/operations/scrapers/books/espnbet.ts';
import { getBookScrapeAgent } from '../lib/operations/scrapers/books/registry.ts';
import { asSportsbookId } from '../lib/types/branded.ts';

describe('ESPN Bet Tier 4 scrape agent', () => {
  test('fixture agent yields espnbet-scoped observations', async () => {
    const result = await runEspnBetAgent({
      live: false,
      observedAt: '2026-07-31T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBe(16);
    expect(result.observations.every(o => o.sportsbook === ESPNBET_SPORTSBOOK)).toBe(true);
    expect(result.observations.every(o => o.agent === 'espnbet-agent')).toBe(true);
  });

  test('HTML stub fails closed', () => {
    const stub = scrapeEspnBetHtmlStub();
    expect(stub.ok).toBe(false);
    expect(stub.mode).toBe('html_stub');
  });

  test('registry scrape() contract', async () => {
    const agent = getBookScrapeAgent(asSportsbookId('espnbet'));
    const rows = await agent.scrape({ live: false, observedAt: '2026-07-31T12:00:00.000Z' });
    expect(agent.bookId).toBe('espnbet');
    expect(rows.length).toBe(16);
  });
});
