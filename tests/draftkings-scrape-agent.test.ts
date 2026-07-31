// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseLimitObservationFromUnknown,
  observationCellKey,
} from '../lib/operations/scrapers/limit-observation-wire.ts';
import {
  appendLimitObservations,
  latestObservationsByCell,
  readLimitObservations,
  healthEntryForBook,
  writeScrapeAgentHealth,
  readScrapeAgentHealth,
} from '../lib/operations/scrapers/raw-limits-store.ts';
import {
  runDraftKingsAgent,
  scrapeDraftKingsHtmlStub,
} from '../lib/operations/scrapers/books/draftkings.ts';

describe('DraftKings Tier 4 scrape agent', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'fw-raw-limits-'));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('wire parse rejects garbage and accepts observation', () => {
    expect(() => parseLimitObservationFromUnknown(null)).toThrow();
    const obs = parseLimitObservationFromUnknown({
      sportsbook: 'draftkings',
      sport: 'basketball',
      market: 'match_winner',
      jurisdiction: 'NJ',
      structure: 'straight',
      phase: 'pregame',
      openingMaxUsd: 1800,
      sourceRef: 'scrape:fixture/dk',
      observedAt: '2026-07-31T00:00:00.000Z',
      agent: 'draftkings-agent',
      mode: 'fixture',
    });
    expect(obs.jurisdiction).toBe('NJ');
    expect(observationCellKey(obs)).toContain('draftkings|basketball');
  });

  test('agent fixture mode yields observations', async () => {
    const result = await runDraftKingsAgent({
      live: false,
      observedAt: '2026-07-31T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('fixture');
    expect(result.observations.length).toBeGreaterThanOrEqual(16);
    expect(result.observations.every(o => o.sportsbook === 'draftkings')).toBe(true);
    expect(result.observations.every(o => o.agent === 'draftkings-agent')).toBe(true);
  });

  test('HTML stub fails closed', () => {
    const stub = scrapeDraftKingsHtmlStub();
    expect(stub.ok).toBe(false);
    expect(stub.observations).toHaveLength(0);
    expect(stub.error).toMatch(/fails closed/i);
  });

  test('JSONL append + latest-by-cell + health', async () => {
    const result = await runDraftKingsAgent({
      live: false,
      observedAt: '2026-07-31T12:00:00.000Z',
    });
    const { appended } = await appendLimitObservations(
      root,
      'draftkings',
      result.observations
    );
    expect(appended).toBe(result.observations.length);

    // Second run with later timestamp — latest cells stay same count
    const later = await runDraftKingsAgent({
      live: false,
      observedAt: '2026-07-31T13:00:00.000Z',
    });
    await appendLimitObservations(root, 'draftkings', later.observations);

    const all = await readLimitObservations(root, 'draftkings');
    expect(all.length).toBe(appended * 2);
    const latest = latestObservationsByCell(all);
    expect(latest).toHaveLength(result.observations.length);
    expect(latest.every(o => o.observedAt === '2026-07-31T13:00:00.000Z')).toBe(true);

    const entry = await healthEntryForBook(root, 'draftkings', {
      ok: true,
      mode: 'fixture',
    });
    expect(entry.ok).toBe(true);
    expect(entry.observationCount).toBe(appended * 2);
    expect(entry.latestCount).toBe(result.observations.length);

    await writeScrapeAgentHealth(root, {
      generatedAt: '2026-07-31T13:00:00.000Z',
      books: [entry],
    });
    const health = await readScrapeAgentHealth(root);
    expect(health?.books[0]?.sportsbook).toBe('draftkings');
  });
});
