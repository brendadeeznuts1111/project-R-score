// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  runFanDuelAgent,
  loadFanDuelHtmlFixture,
  FANDUEL_HTML_FIXTURE_PATH,
  FANDUEL_SPORTSBOOK,
} from '../lib/operations/scrapers/books/fanduel.ts';
import { parseFanDuelHtml } from '../lib/operations/scrapers/books/fanduel-parse.ts';
import { runDraftKingsAgent } from '../lib/operations/scrapers/books/draftkings.ts';
import { runBookAgentIntoStore } from '../lib/operations/scrapers/run-book-agent.ts';
import { readScrapeAgentHealth } from '../lib/operations/scrapers/raw-limits-store.ts';
import { captureHtmlViaWebView } from '../lib/operations/scrapers/webview-html.ts';

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

  test('HTML fixture parse yields branded LimitObservation rows', async () => {
    const html = await loadFanDuelHtmlFixture();
    const rows = await parseFanDuelHtml(html, {
      observedAt: '2026-08-06T12:00:00.000Z',
      mode: 'html_fixture',
      referenceUrl: `file://${FANDUEL_HTML_FIXTURE_PATH}`,
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every(o => o.sportsbook === FANDUEL_SPORTSBOOK)).toBe(true);
    expect(rows.every(o => o.mode === 'html_fixture')).toBe(true);
    expect(rows.every(o => typeof o.openingMaxUsd === 'number' && o.openingMaxUsd! > 0)).toBe(
      true
    );
  });

  test('empty / malicious HTML fails closed (no rows)', async () => {
    const empty = await parseFanDuelHtml('', {
      observedAt: '2026-08-06T12:00:00.000Z',
      mode: 'html_fixture',
    });
    expect(empty).toEqual([]);
    const junk = await parseFanDuelHtml('<html><body><script>alert(1)</script></body></html>', {
      observedAt: '2026-08-06T12:00:00.000Z',
      mode: 'html_fixture',
    });
    expect(junk).toEqual([]);
  });

  test('--html default uses html_fixture mode', async () => {
    const result = await runFanDuelAgent({
      html: true,
      live: false,
      observedAt: '2026-08-06T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('html_fixture');
    expect(result.observations.length).toBeGreaterThanOrEqual(1);
    expect(result.error).toBeNull();
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
    expect(health?.books.map(b => b.bookId ?? b.sportsbook)).toEqual([...trackedScrapeBooks()]);
    const dkFd = health?.books.filter(
      b => b.sportsbook === 'draftkings' || b.sportsbook === 'fanduel'
    );
    expect(dkFd?.every(b => b.ok)).toBe(true);
  });
});

describe('FanDuel WebView HTML (optional)', () => {
  const enabled =
    Bun.env.OPERATOR_WEBVIEW_SCRAPE === '1' || Bun.env.OPERATOR_WEBVIEW_SCRAPE === 'true';

  test.skipIf(!enabled)(
    'WebView evaluate of fixture file:// yields parseable HTML',
    async () => {
      const fileUrl = Bun.pathToFileURL(FANDUEL_HTML_FIXTURE_PATH).href;
      const html = await captureHtmlViaWebView(fileUrl, {
        timeoutMs: 15_000,
        settleMs: 200,
      });
      expect(html).toContain('data-fw-limit');
      const rows = await parseFanDuelHtml(html, {
        observedAt: '2026-08-06T12:00:00.000Z',
        mode: 'html_live',
        referenceUrl: fileUrl,
      });
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every(o => o.sportsbook === FANDUEL_SPORTSBOOK)).toBe(true);
    },
    30_000
  );
});
