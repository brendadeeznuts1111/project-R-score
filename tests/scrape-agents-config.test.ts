// @see https://bun.com/docs/test/index#run-tests — bun:test
import { afterEach, describe, expect, test } from 'bun:test';
import { join } from 'node:path';

import { parseOperatorToml } from '../lib/operator-research/operators.ts';
import {
  getBookScrapeConfig,
  loadScrapeAgentsConfigSync,
  requireBookScrapeConfig,
  resetScrapeAgentsConfigCache,
  resolveScrapeCronSchedule,
  resolveScrapeCronTitle,
  resolveWebViewOptions,
  SCRAPE_AGENTS_TOML_REL,
} from '../lib/operations/scrapers/scrape-agents-config.ts';
import { DEFAULT_SCRAPE_TARGETS } from '../lib/operations/scrapers/scraper-targets.ts';
import {
  BASELINE_SCRAPE_CRON_SCHEDULE,
  BASELINE_SCRAPE_CRON_TITLE,
} from '../lib/operations/scrapers/scrape-cron.ts';

describe('scrape agents TOML SSOT', () => {
  afterEach(() => {
    resetScrapeAgentsConfigCache();
    delete Bun.env.BASELINE_SCRAPE_CRON_SCHEDULE;
  });

  test('fleet TOML loads cron + webview defaults', () => {
    const cfg = loadScrapeAgentsConfigSync();
    expect(cfg.cron.schedule.split(/\s+/).length).toBe(5);
    expect(cfg.cron.title).toBe('baseline-scrape');
    expect(cfg.webview.timeoutMs).toBe(18_000);
    expect(cfg.webview.settleMs).toBe(800);
    expect(cfg.defaults.jsonTimeoutMs).toBe(10_000);
    expect(cfg.defaults.htmlTimeoutMs).toBe(18_000);
    expect(SCRAPE_AGENTS_TOML_REL).toBe('config/scrape-agents.toml');
  });

  test('DraftKings and FanDuel are html-capable with fixtures', () => {
    const dk = requireBookScrapeConfig('draftkings');
    expect(dk.html).toBe(true);
    expect(dk.liveUrl).toContain('draftkings');
    expect(dk.htmlUrl).toContain('draftkings');
    expect(dk.htmlFixtureAbs).toContain('draftkings-limits.html');
    expect(dk.agentId).toBe('draftkings-agent');

    const fd = requireBookScrapeConfig('fanduel');
    expect(fd.html).toBe(true);
    expect(fd.htmlFixtureAbs).toContain('fanduel-limits.html');
  });

  test('stub books have html=false and live_url', () => {
    for (const id of ['bet365', 'hardrock', 'fanatics', 'circa'] as const) {
      const book = getBookScrapeConfig(id);
      expect(book).toBeDefined();
      expect(book!.html).toBe(false);
      expect(book!.liveUrl.length).toBeGreaterThan(0);
      expect(book!.htmlFixtureAbs).toBeUndefined();
    }
  });

  test('DEFAULT_SCRAPE_TARGETS URLs match operator TOML live_url', () => {
    const byBook = new Map(DEFAULT_SCRAPE_TARGETS.map(t => [String(t.sportsbook), t.url]));
    expect(byBook.get('draftkings')).toBe(requireBookScrapeConfig('draftkings').liveUrl);
    expect(byBook.get('fanduel')).toBe(requireBookScrapeConfig('fanduel').liveUrl);
    expect(byBook.get('caesars')).toBe(requireBookScrapeConfig('caesars').liveUrl);
    expect(DEFAULT_SCRAPE_TARGETS).toHaveLength(10);
  });

  test('cron helpers: env wins over TOML', () => {
    expect(resolveScrapeCronTitle()).toBe('baseline-scrape');
    expect(resolveScrapeCronSchedule()).toBe(BASELINE_SCRAPE_CRON_SCHEDULE);
    expect(BASELINE_SCRAPE_CRON_TITLE).toBe('baseline-scrape');

    Bun.env.BASELINE_SCRAPE_CRON_SCHEDULE = '0 */2 * * *';
    resetScrapeAgentsConfigCache();
    expect(resolveScrapeCronSchedule()).toBe('0 */2 * * *');
  });

  test('resolveWebViewOptions merges overrides', () => {
    const opts = resolveWebViewOptions({ timeoutMs: 5_000 });
    expect(opts.timeoutMs).toBe(5_000);
    expect(opts.settleMs).toBe(800);
    expect(opts.width).toBe(1280);
  });

  test('parseOperatorToml rejects html=true without fixture', () => {
    const bad = `
[operator]
id = "x"
name = "X"
host = "x.example"
url = "https://x.example"

[scrape]
agent_id = "x-agent"
live_url = "https://x.example/api"
html = true
jurisdiction = "NJ"
`;
    expect(() => parseOperatorToml(bad, join('tmp', 'x.toml'))).toThrow(/html_url and html_fixture/);
  });

  test('parseOperatorToml allows missing scrape section', () => {
    const ok = `
[operator]
id = "pinnacle"
name = "Pinnacle"
host = "pinnacle.com"
url = "https://pinnacle.com"
`;
    const op = parseOperatorToml(ok, 'config/operators/pinnacle.toml');
    expect(op.scrape).toBeUndefined();
    expect(op.id).toBe('pinnacle');
  });
});
