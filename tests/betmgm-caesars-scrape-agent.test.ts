// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runBetMgmAgent, scrapeBetMgmHtmlStub } from '../lib/operations/scrapers/books/betmgm.ts';
import { runCaesarsAgent, scrapeCaesarsHtmlStub } from '../lib/operations/scrapers/books/caesars.ts';
import { runFanDuelAgent } from '../lib/operations/scrapers/books/fanduel.ts';
import { runDraftKingsAgent } from '../lib/operations/scrapers/books/draftkings.ts';
import { runBookAgentIntoStore } from '../lib/operations/scrapers/run-book-agent.ts';
import { readScrapeAgentHealth } from '../lib/operations/scrapers/raw-limits-store.ts';

describe('BetMGM + Caesars Tier 4 scrape agents', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'fw-mgm-czr-'));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('fixture agents yield book-scoped observations', async () => {
    const mgm = await runBetMgmAgent({ live: false, observedAt: '2026-07-31T12:00:00.000Z' });
    const czr = await runCaesarsAgent({ live: false, observedAt: '2026-07-31T12:00:00.000Z' });
    expect(mgm.ok && czr.ok).toBe(true);
    expect(mgm.observations.every(o => o.sportsbook === 'betmgm')).toBe(true);
    expect(czr.observations.every(o => o.sportsbook === 'caesars')).toBe(true);
    expect(mgm.observations.length).toBeGreaterThanOrEqual(16);
    expect(czr.observations.length).toBeGreaterThanOrEqual(16);
  });

  test('HTML stubs fail closed', () => {
    expect(scrapeBetMgmHtmlStub().ok).toBe(false);
    expect(scrapeCaesarsHtmlStub().ok).toBe(false);
  });

  test('health tracks registered fleet (incl. espnbet idle until run)', async () => {
    const at = '2026-07-31T12:00:00.000Z';
    await runBookAgentIntoStore(root, 'draftkings', 'draftkings-agent', () =>
      runDraftKingsAgent({ live: false, observedAt: at })
    );
    await runBookAgentIntoStore(root, 'fanduel', 'fanduel-agent', () =>
      runFanDuelAgent({ live: false, observedAt: at })
    );
    await runBookAgentIntoStore(root, 'betmgm', 'betmgm-agent', () =>
      runBetMgmAgent({ live: false, observedAt: at })
    );
    await runBookAgentIntoStore(root, 'caesars', 'caesars-agent', () =>
      runCaesarsAgent({ live: false, observedAt: at })
    );
    const health = await readScrapeAgentHealth(root);
    expect(health?.books.map(b => b.bookId ?? b.sportsbook)).toEqual([
      'draftkings',
      'fanduel',
      'bet365',
      'espnbet',
      'betmgm',
      'caesars',
    ]);
    const runBooks =
      health?.books.filter(b => b.sportsbook === 'draftkings' || b.sportsbook === 'fanduel' || b.sportsbook === 'betmgm' || b.sportsbook === 'caesars') ??
      [];
    expect(runBooks.every(b => b.ok)).toBe(true);
  });
});
