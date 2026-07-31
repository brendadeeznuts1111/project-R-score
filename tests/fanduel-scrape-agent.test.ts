// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  runFanDuelAgent,
  scrapeFanDuelHtmlStub,
} from '../lib/operations/scrapers/books/fanduel.ts';
import { runDraftKingsAgent } from '../lib/operations/scrapers/books/draftkings.ts';
import { runBookAgentIntoStore } from '../lib/operations/scrapers/run-book-agent.ts';
import { readScrapeAgentHealth } from '../lib/operations/scrapers/raw-limits-store.ts';

describe('FanDuel Tier 4 scrape agent', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'fw-fd-limits-'));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('agent fixture mode yields FanDuel observations', async () => {
    const result = await runFanDuelAgent({
      live: false,
      observedAt: '2026-07-31T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBeGreaterThanOrEqual(16);
    expect(result.observations.every(o => o.sportsbook === 'fanduel')).toBe(true);
    expect(result.observations.every(o => o.agent === 'fanduel-agent')).toBe(true);
  });

  test('HTML stub fails closed', () => {
    const stub = scrapeFanDuelHtmlStub();
    expect(stub.ok).toBe(false);
    expect(stub.observations).toHaveLength(0);
  });

  test('health merge keeps DK and FD books among tracked fleet', async () => {
    await runBookAgentIntoStore(root, 'draftkings', 'draftkings-agent', () =>
      runDraftKingsAgent({ live: false, observedAt: '2026-07-31T12:00:00.000Z' })
    );
    await runBookAgentIntoStore(root, 'fanduel', 'fanduel-agent', () =>
      runFanDuelAgent({ live: false, observedAt: '2026-07-31T12:00:00.000Z' })
    );
    const health = await readScrapeAgentHealth(root);
    const { trackedScrapeBooks } = await import(
      '../lib/operations/scrapers/books/registry.ts'
    );
    expect(health?.books.map(b => b.bookId ?? b.sportsbook)).toEqual([
      ...trackedScrapeBooks(),
    ]);
    const dkFd = health?.books.filter(
      b => b.sportsbook === 'draftkings' || b.sportsbook === 'fanduel'
    );
    expect(dkFd?.every(b => b.ok)).toBe(true);
  });
});
