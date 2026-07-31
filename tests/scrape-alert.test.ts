// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  evaluateScrapeAlerts,
  scrapeAlertStatusSnapshot,
  writeScrapeAlertState,
} from '../lib/operations/scrapers/scrape-alert.ts';
import { writeScrapeAgentHealth } from '../lib/operations/scrapers/raw-limits-store.ts';
import { trackedScrapeBooks } from '../lib/operations/scrapers/books/registry.ts';

describe('Tier 4 scrape failure alerts', () => {
  test('alerts once after threshold consecutive fails; suppresses until recovery', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scrape-alert-'));
    const notifications: string[] = [];
    try {
      const books = trackedScrapeBooks();
      const failingHealth = (ok: boolean, error: string | null) => ({
        generatedAt: new Date().toISOString(),
        books: books.map(bookId => ({
          bookId,
          sportsbook: bookId,
          ok: bookId === 'draftkings' ? ok : true,
          mode: 'fixture' as const,
          observationCount: ok || bookId !== 'draftkings' ? 16 : 0,
          latestCount: ok || bookId !== 'draftkings' ? 16 : 0,
          lastObservedAt: null,
          lastError: bookId === 'draftkings' ? error : null,
          jsonlPath: `artifacts/raw-limits/${bookId}.jsonl`,
        })),
      });

      await writeScrapeAgentHealth(root, failingHealth(false, 'boom'));
      for (let i = 0; i < 2; i++) {
        const mid = await evaluateScrapeAlerts(root, {
          threshold: 3,
          dryRun: true,
          notify: async msg => {
            notifications.push(msg);
            return true;
          },
        });
        expect(mid.state.books.draftkings?.consecutiveFails).toBe(i + 1);
        expect(notifications).toHaveLength(0);
      }

      const third = await evaluateScrapeAlerts(root, {
        threshold: 3,
        dryRun: true,
        notify: async msg => {
          notifications.push(msg);
          return true;
        },
      });
      expect(third.state.books.draftkings?.consecutiveFails).toBe(3);
      expect(third.events.find(e => e.bookId === 'draftkings')?.action).toBe('alerted');
      expect(notifications).toHaveLength(1);

      const fourth = await evaluateScrapeAlerts(root, {
        threshold: 3,
        dryRun: true,
        notify: async msg => {
          notifications.push(msg);
          return true;
        },
      });
      expect(fourth.events.find(e => e.bookId === 'draftkings')?.action).toBe('suppressed');
      expect(notifications).toHaveLength(1);

      await writeScrapeAgentHealth(root, failingHealth(true, null));
      const recovered = await evaluateScrapeAlerts(root, {
        threshold: 3,
        dryRun: true,
        notify: async msg => {
          notifications.push(msg);
          return true;
        },
      });
      expect(recovered.state.books.draftkings?.consecutiveFails).toBe(0);
      expect(recovered.events.find(e => e.bookId === 'draftkings')?.action).toBe('recovered');

      const snap = await scrapeAlertStatusSnapshot(root);
      expect(snap.threshold).toBe(3);
      expect(snap.books.find(b => b.bookId === 'draftkings')?.consecutiveFails).toBe(0);
      expect(typeof snap.webhookConfigured).toBe('boolean');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('status snapshot never embeds webhook URL', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scrape-alert-status-'));
    try {
      await writeScrapeAlertState(root, {
        generatedAt: new Date().toISOString(),
        threshold: 3,
        books: {},
      });
      const prev = Bun.env.BASELINE_SCRAPE_ALERT_WEBHOOK;
      Bun.env.BASELINE_SCRAPE_ALERT_WEBHOOK = 'https://hooks.example.test/secret';
      try {
        const snap = await scrapeAlertStatusSnapshot(root);
        expect(JSON.stringify(snap)).not.toContain('hooks.example.test');
        expect(snap.webhookConfigured).toBe(true);
      } finally {
        if (prev === undefined) delete Bun.env.BASELINE_SCRAPE_ALERT_WEBHOOK;
        else Bun.env.BASELINE_SCRAPE_ALERT_WEBHOOK = prev;
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
