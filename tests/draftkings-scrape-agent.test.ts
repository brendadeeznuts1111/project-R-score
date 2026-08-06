// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
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
  loadDraftKingsHtmlFixture,
  DRAFTKINGS_HTML_FIXTURE_PATH,
  DRAFTKINGS_SPORTSBOOK,
} from '../lib/operations/scrapers/books/draftkings.ts';
import { parseDraftKingsHtml } from '../lib/operations/scrapers/books/draftkings-parse.ts';
import { captureHtmlViaWebView } from '../lib/operations/scrapers/webview-html.ts';

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
      mode: 'html_fixture',
    });
    expect(obs.jurisdiction).toBe('NJ');
    expect(obs.mode).toBe('html_fixture');
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

  test('HTML fixture parse yields branded LimitObservation rows', async () => {
    const html = await loadDraftKingsHtmlFixture();
    const rows = await parseDraftKingsHtml(html, {
      observedAt: '2026-08-06T12:00:00.000Z',
      mode: 'html_fixture',
      referenceUrl: `file://${DRAFTKINGS_HTML_FIXTURE_PATH}`,
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every(o => o.sportsbook === DRAFTKINGS_SPORTSBOOK)).toBe(true);
    expect(rows.every(o => o.mode === 'html_fixture')).toBe(true);
    expect(rows.every(o => typeof o.openingMaxUsd === 'number' && o.openingMaxUsd! > 0)).toBe(
      true
    );
  });

  test('empty / malicious HTML fails closed (no rows)', async () => {
    const empty = await parseDraftKingsHtml('', {
      observedAt: '2026-08-06T12:00:00.000Z',
      mode: 'html_fixture',
    });
    expect(empty).toEqual([]);
    const junk = await parseDraftKingsHtml('<html><body><script>alert(1)</script></body></html>', {
      observedAt: '2026-08-06T12:00:00.000Z',
      mode: 'html_fixture',
    });
    expect(junk).toEqual([]);
    const noMax = await parseDraftKingsHtml(
      '<tr data-fw-limit data-sport="basketball" data-market="match_winner"></tr>',
      {
        observedAt: '2026-08-06T12:00:00.000Z',
        mode: 'html_fixture',
      }
    );
    expect(noMax).toEqual([]);
  });

  test('--html default uses html_fixture mode', async () => {
    const result = await runDraftKingsAgent({
      html: true,
      live: false,
      observedAt: '2026-08-06T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('html_fixture');
    expect(result.observations.length).toBeGreaterThanOrEqual(1);
    expect(result.error).toBeNull();
  });

  test('JSONL append + latest-by-cell + health', async () => {
    const result = await runDraftKingsAgent({
      live: false,
      observedAt: '2026-07-31T12:00:00.000Z',
    });
    const { appended } = await appendLimitObservations(root, 'draftkings', result.observations);
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

describe('DraftKings WebView HTML (optional)', () => {
  const enabled =
    Bun.env.OPERATOR_WEBVIEW_SCRAPE === '1' || Bun.env.OPERATOR_WEBVIEW_SCRAPE === 'true';

  test.skipIf(!enabled)(
    'WebView evaluate of fixture file:// yields parseable HTML',
    async () => {
      const fileUrl = Bun.pathToFileURL(DRAFTKINGS_HTML_FIXTURE_PATH).href;
      const html = await captureHtmlViaWebView(fileUrl, {
        timeoutMs: 15_000,
        settleMs: 200,
      });
      expect(html).toContain('data-fw-limit');
      const rows = await parseDraftKingsHtml(html, {
        observedAt: '2026-08-06T12:00:00.000Z',
        mode: 'html_live',
        referenceUrl: fileUrl,
      });
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every(o => o.sportsbook === DRAFTKINGS_SPORTSBOOK)).toBe(true);
    },
    30_000
  );
});
