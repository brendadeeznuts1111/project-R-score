// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BASELINE_SCRAPE_CRON_SCHEDULE,
  BASELINE_SCRAPE_CRON_TITLE,
  registerBaselineScrapeCron,
  runBaselineScrapeCycle,
} from '../lib/operations/scrapers/scrape-cron.ts';
import { trackedScrapeBooks } from '../lib/operations/scrapers/books/registry.ts';
import { readScrapeAgentHealth } from '../lib/operations/scrapers/raw-limits-store.ts';
import { parseCron, scheduleInProcess } from '../lib/harness/cron.ts';

describe('baseline scrape in-process Bun.cron', () => {
  test('schedule is a 5-field cron expression (UTC complement)', () => {
    expect(BASELINE_SCRAPE_CRON_SCHEDULE.split(/\s+/).length).toBe(5);
    expect(BASELINE_SCRAPE_CRON_TITLE).toBe('baseline-scrape');
    expect(parseCron(BASELINE_SCRAPE_CRON_SCHEDULE)).toBeInstanceOf(Date);
  });

  test('registerBaselineScrapeCron uses injectable scheduler (no real timer leak)', () => {
    const calls: string[] = [];
    const job = registerBaselineScrapeCron((schedule, handler) => {
      calls.push(schedule);
      expect(typeof handler).toBe('function');
      return { stop() {}, ref() {}, unref() {}, cron: schedule };
    });
    expect(calls).toEqual([BASELINE_SCRAPE_CRON_SCHEDULE]);
    expect(job).toBeDefined();
  });

  test('scheduleInProcess returns Disposable CronJob', () => {
    using job = scheduleInProcess('@hourly', () => {});
    expect(job.cron).toBe('@hourly');
    job.stop();
  });

  test('runBaselineScrapeCycle appends all registered books + health.bookId', async () => {
    const root = mkdtempSync(join(tmpdir(), 'baseline-scrape-cron-'));
    try {
      const result = await runBaselineScrapeCycle(root, {
        live: false,
        observedAt: '2026-07-31T12:00:00.000Z',
      });
      expect(result.code).toBe(0);
      expect(result.books).toEqual(trackedScrapeBooks());
      const health = await readScrapeAgentHealth(root);
      expect(health?.books.map(b => b.bookId)).toEqual([...trackedScrapeBooks()]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
