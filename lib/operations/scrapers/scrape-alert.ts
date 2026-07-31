// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/api/fetch — fetch
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Tier 4 scrape-agent failure alerts (Slack / generic webhook).
 *
 * Fires once per failure streak when consecutive fails ≥ threshold.
 * Resets on recovery. No-op when webhook unset.
 *
 *   BASELINE_SCRAPE_ALERT_WEBHOOK=https://hooks.slack.com/...
 *   BASELINE_SCRAPE_ALERT_THRESHOLD=3   # default
 *   bun run baseline:scrape-alert
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import { joinPath } from '../../path-bun.ts';
import { sendRegistryAlert } from '../../factory/alerts.ts';
import type { SportsbookId } from './domain.ts';
import {
  healthPath,
  rawLimitsDir,
  readScrapeAgentHealth,
  type ScrapeAgentHealthEntry,
} from './raw-limits-store.ts';
import { trackedScrapeBooks } from './books/registry.ts';

export const SCRAPE_ALERT_STATE_REL = 'artifacts/raw-limits/alert-state.json';

export type ScrapeAlertBookState = {
  consecutiveFails: number;
  lastError: string | null;
  lastAlertedAt: string | null;
  /** True after we alerted for the current streak (suppress spam). */
  alertedForStreak: boolean;
};

export type ScrapeAlertState = {
  generatedAt: string;
  threshold: number;
  books: Record<string, ScrapeAlertBookState>;
};

export type ScrapeAlertEvent = {
  bookId: SportsbookId;
  consecutiveFails: number;
  lastError: string | null;
  action: 'alerted' | 'suppressed' | 'recovered' | 'tracking';
};

export type ScrapeAlertSummary = {
  threshold: number;
  webhookConfigured: boolean;
  events: ScrapeAlertEvent[];
  state: ScrapeAlertState;
};

export function scrapeAlertThreshold(): number {
  const raw = Number(Bun.env.BASELINE_SCRAPE_ALERT_THRESHOLD ?? '3');
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 3;
}

export function scrapeAlertWebhookConfigured(): boolean {
  return Boolean(
    Bun.env.BASELINE_SCRAPE_ALERT_WEBHOOK?.trim() || Bun.env.SLACK_WEBHOOK_URL?.trim()
  );
}

function alertStatePath(root: string): string {
  return joinPath(root, SCRAPE_ALERT_STATE_REL);
}

export async function readScrapeAlertState(root: string): Promise<ScrapeAlertState | null> {
  const path = alertStatePath(root);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as ScrapeAlertState;
  } catch {
    return null;
  }
}

export async function writeScrapeAlertState(
  root: string,
  state: ScrapeAlertState
): Promise<string> {
  await Bun.$`mkdir -p ${rawLimitsDir(root)}`.quiet();
  const path = alertStatePath(root);
  await Bun.write(path, `${JSON.stringify(state, null, 2)}\n`);
  return path;
}

function emptyBookState(): ScrapeAlertBookState {
  return {
    consecutiveFails: 0,
    lastError: null,
    lastAlertedAt: null,
    alertedForStreak: false,
  };
}

function isFailing(entry: ScrapeAgentHealthEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.ok === false) return true;
  return typeof entry.lastError === 'string' && entry.lastError.length > 0 && entry.ok !== true;
}

export type EvaluateScrapeAlertsOptions = {
  threshold?: number;
  notify?: (message: string) => Promise<boolean>;
  dryRun?: boolean;
};

export async function evaluateScrapeAlerts(
  root: string,
  opts: EvaluateScrapeAlertsOptions = {}
): Promise<ScrapeAlertSummary> {
  const threshold = opts.threshold ?? scrapeAlertThreshold();
  const webhookConfigured = scrapeAlertWebhookConfigured();
  const prior = await readScrapeAlertState(root);
  const health = await readScrapeAgentHealth(root);
  const byBook = new Map(
    (health?.books ?? []).map(entry => [entry.bookId ?? entry.sportsbook, entry])
  );

  const books: Record<string, ScrapeAlertBookState> = {};
  const events: ScrapeAlertEvent[] = [];
  const now = new Date().toISOString();

  const notify =
    opts.notify ??
    (async (message: string) => {
      if (opts.dryRun || !webhookConfigured) return false;
      const webhook = Bun.env.BASELINE_SCRAPE_ALERT_WEBHOOK?.trim();
      const result = await sendRegistryAlert(message, 'warning', {
        slackWebhookUrl: webhook || undefined,
      });
      return result.slack || result.telegram;
    });

  for (const bookId of trackedScrapeBooks()) {
    const prev = prior?.books[bookId] ?? emptyBookState();
    const entry = byBook.get(bookId);
    const failing = isFailing(entry);

    if (!failing) {
      if (prev.consecutiveFails > 0) {
        events.push({
          bookId,
          consecutiveFails: 0,
          lastError: null,
          action: 'recovered',
        });
      }
      books[bookId] = emptyBookState();
      continue;
    }

    const consecutiveFails = prev.consecutiveFails + 1;
    const lastError = entry?.lastError ?? 'agent failed';
    let alertedForStreak = prev.alertedForStreak;
    let lastAlertedAt = prev.lastAlertedAt;
    let action: ScrapeAlertEvent['action'] = 'tracking';

    if (consecutiveFails >= threshold) {
      if (alertedForStreak) {
        action = 'suppressed';
      } else {
        const message =
          `Tier 4 scrape agent failed ${consecutiveFails}× consecutive · bookId=${bookId}` +
          ` · error=${lastError}` +
          ` · health=${healthPath(root)}`;
        const sent = await notify(message);
        if (opts.dryRun) {
          alertedForStreak = true;
          lastAlertedAt = now;
          action = 'alerted';
          console.info(`[scrape-alert] dry-run would alert ${bookId}`);
        } else if (!webhookConfigured) {
          alertedForStreak = true;
          lastAlertedAt = now;
          action = 'alerted';
          console.warn(
            `[scrape-alert] threshold hit for ${bookId} but no BASELINE_SCRAPE_ALERT_WEBHOOK / SLACK_WEBHOOK_URL`
          );
        } else if (sent) {
          alertedForStreak = true;
          lastAlertedAt = now;
          action = 'alerted';
          console.info(`[scrape-alert] alerted ${bookId} (${consecutiveFails}×)`);
        } else {
          action = 'suppressed';
          console.warn(`[scrape-alert] webhook delivery failed for ${bookId}`);
        }
      }
    }

    books[bookId] = {
      consecutiveFails,
      lastError,
      lastAlertedAt,
      alertedForStreak,
    };
    events.push({ bookId, consecutiveFails, lastError, action });
  }

  const state: ScrapeAlertState = {
    generatedAt: now,
    threshold,
    books,
  };
  await writeScrapeAlertState(root, state);

  return {
    threshold,
    webhookConfigured,
    events,
    state,
  };
}

export async function scrapeAlertStatusSnapshot(root: string): Promise<{
  threshold: number;
  webhookConfigured: boolean;
  statePath: string;
  books: Array<{
    bookId: SportsbookId;
    consecutiveFails: number;
    alertedForStreak: boolean;
    lastAlertedAt: string | null;
  }>;
}> {
  const state = await readScrapeAlertState(root);
  const threshold = state?.threshold ?? scrapeAlertThreshold();
  return {
    threshold,
    webhookConfigured: scrapeAlertWebhookConfigured(),
    statePath: SCRAPE_ALERT_STATE_REL,
    books: trackedScrapeBooks().map(bookId => {
      const row = state?.books[bookId];
      return {
        bookId,
        consecutiveFails: row?.consecutiveFails ?? 0,
        alertedForStreak: row?.alertedForStreak ?? false,
        lastAlertedAt: row?.lastAlertedAt ?? null,
      };
    }),
  };
}

if (import.meta.main) {
  const root = joinPath(import.meta.dir, '../../..');
  const dryRun = Bun.argv.includes('--dry-run');
  const summary = await evaluateScrapeAlerts(root, { dryRun });
  console.info(
    `scrape-alert · threshold=${summary.threshold} webhook=${summary.webhookConfigured}` +
      ` events=${summary.events.length}`
  );
  for (const event of summary.events) {
    console.info(
      `  ${event.bookId}: ${event.action} fails=${event.consecutiveFails}` +
        (event.lastError ? ` · ${event.lastError}` : '')
    );
  }
}
