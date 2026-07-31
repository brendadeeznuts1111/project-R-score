// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  HARDROCK_SPORTSBOOK,
  runHardRockAgent,
  scrapeHardRockHtmlStub,
} from '../lib/operations/scrapers/books/hardrock.ts';
import {
  FANATICS_SPORTSBOOK,
  runFanaticsAgent,
  scrapeFanaticsHtmlStub,
} from '../lib/operations/scrapers/books/fanatics.ts';
import {
  BETRIVERS_SPORTSBOOK,
  runBetRiversAgent,
  scrapeBetRiversHtmlStub,
} from '../lib/operations/scrapers/books/betrivers.ts';
import {
  CIRCA_SPORTSBOOK,
  runCircaAgent,
  scrapeCircaHtmlStub,
} from '../lib/operations/scrapers/books/circa.ts';
import { getBookScrapeAgent } from '../lib/operations/scrapers/books/registry.ts';
import { asSportsbookId } from '../lib/types/branded.ts';

const OBSERVED_AT = '2026-07-31T12:00:00.000Z';

describe('US top-10 remaining Tier 4 scrape agents', () => {
  test('Hard Rock fixture agent yields hardrock-scoped observations', async () => {
    const result = await runHardRockAgent({ live: false, observedAt: OBSERVED_AT });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBe(16);
    expect(result.observations.every(o => o.sportsbook === HARDROCK_SPORTSBOOK)).toBe(true);
    expect(result.observations.every(o => o.agent === 'hardrock-agent')).toBe(true);
  });

  test('Fanatics fixture agent yields fanatics-scoped observations', async () => {
    const result = await runFanaticsAgent({ live: false, observedAt: OBSERVED_AT });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBe(16);
    expect(result.observations.every(o => o.sportsbook === FANATICS_SPORTSBOOK)).toBe(true);
    expect(result.observations.every(o => o.agent === 'fanatics-agent')).toBe(true);
  });

  test('BetRivers fixture agent yields betrivers-scoped observations', async () => {
    const result = await runBetRiversAgent({ live: false, observedAt: OBSERVED_AT });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBe(16);
    expect(result.observations.every(o => o.sportsbook === BETRIVERS_SPORTSBOOK)).toBe(true);
    expect(result.observations.every(o => o.agent === 'betrivers-agent')).toBe(true);
  });

  test('Circa fixture agent yields circa-scoped observations', async () => {
    const result = await runCircaAgent({ live: false, observedAt: OBSERVED_AT });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBe(16);
    expect(result.observations.every(o => o.sportsbook === CIRCA_SPORTSBOOK)).toBe(true);
    expect(result.observations.every(o => o.agent === 'circa-agent')).toBe(true);
  });

  test('HTML stubs fail closed', () => {
    expect(scrapeHardRockHtmlStub()).toMatchObject({ ok: false, mode: 'html_stub' });
    expect(scrapeFanaticsHtmlStub()).toMatchObject({ ok: false, mode: 'html_stub' });
    expect(scrapeBetRiversHtmlStub()).toMatchObject({ ok: false, mode: 'html_stub' });
    expect(scrapeCircaHtmlStub()).toMatchObject({ ok: false, mode: 'html_stub' });
  });

  test('registry scrape() contract for all four books', async () => {
    for (const bookId of ['hardrock', 'fanatics', 'betrivers', 'circa'] as const) {
      const agent = getBookScrapeAgent(asSportsbookId(bookId));
      const rows = await agent.scrape({ live: false, observedAt: OBSERVED_AT });
      expect(agent.bookId).toBe(bookId);
      expect(rows.length).toBe(16);
      expect(rows.every(row => row.sportsbook === bookId)).toBe(true);
    }
  });
});
