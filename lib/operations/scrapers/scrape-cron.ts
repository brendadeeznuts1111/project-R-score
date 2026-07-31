// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron in-process
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/blog/bun-v1.3.12#in-process-bun-cron-scheduler
/**
 * In-process Bun.cron for Tier 4 book scrape agents.
 *
 * Runs every registered scrape() → JSONL + health.json (no registry bake —
 * bake stays deterministic for CI via baseline:sync-scraped).
 *
 *   bun run baseline:scrape-cron:once
 *   bun run baseline:scrape-cron                 # daemon
 *   BASELINE_SCRAPE_CRON=1 bun lib/operations/scrapers/scrape-cron.ts
 *   BASELINE_SCRAPE_CRON_SCHEDULE=<cron>         # override (UTC)
 *   BASELINE_SCRAPE_LIVE=1                       # optional live fetch
 *
 * Default: every 15 minutes UTC (minute-granular; polite for public endpoints).
 *
 * @see docs/harness/tenants/partner-limits.md
 * @see lib/harness/cron.ts
 */

import { joinPath } from '../../path-bun.ts';
import { scheduleInProcess, type InProcessCronJob } from '../../harness/cron.ts';
import { buildScrapedLimitsObservedArtifact } from '../baseline-scraped-limits.ts';
import { trackedScrapeBooks } from './books/registry.ts';
import { runAllRegisteredAgents } from './run-book-agent.ts';
import { evaluateScrapeAlerts } from './scrape-alert.ts';
import type { BookScrapeOptions } from './book-scrape-agent.ts';

/** UTC — every 15 minutes. Override with BASELINE_SCRAPE_CRON_SCHEDULE. */
export const BASELINE_SCRAPE_CRON_SCHEDULE =
  (Bun.env.BASELINE_SCRAPE_CRON_SCHEDULE || '*/15 * * * *').trim() || '*/15 * * * *';

export const BASELINE_SCRAPE_CRON_TITLE = 'baseline-scrape';

export type ScrapeCronScheduler = (
  schedule: string,
  handler: () => void | Promise<void>
) => InProcessCronJob | unknown;

export type ScrapeCronCycleResult = {
  code: number;
  books: readonly string[];
  observedRows?: number;
  observedMode?: 'fixture' | 'merged';
  error?: string;
};

function scrapeOptsFromEnv(): BookScrapeOptions {
  return {
    live: Bun.env.BASELINE_SCRAPE_LIVE === '1' || Bun.env.BASELINE_SCRAPE_LIVE === 'true',
  };
}

function repoRoot(): string {
  return joinPath(import.meta.dir, '../../..');
}

/**
 * One tick: run every registered agent into artifacts/raw-limits/.
 * Errors are caught so unhandledRejection does not kill the daemon.
 */
export async function runBaselineScrapeCycle(
  root: string = repoRoot(),
  opts: BookScrapeOptions = scrapeOptsFromEnv()
): Promise<ScrapeCronCycleResult> {
  const books = trackedScrapeBooks();
  try {
    await runAllRegisteredAgents(root, opts);
    const observed = await buildScrapedLimitsObservedArtifact(root);
    const observedPath = joinPath(root, 'public/registry/scraped-limits-observed.json');
    await Bun.write(observedPath, `${JSON.stringify(observed, null, 2)}\n`);
    try {
      await evaluateScrapeAlerts(root);
    } catch (alertErr) {
      console.warn(
        `[${BASELINE_SCRAPE_CRON_TITLE}] alert eval skipped:`,
        alertErr instanceof Error ? alertErr.message : alertErr
      );
    }
    console.info(
      `[${BASELINE_SCRAPE_CRON_TITLE}] ok · books=${books.join('+')} · live=${opts.live === true}` +
        ` · observed=${observed.summary.mergedRows} (${observed.mode})`
    );
    return {
      code: 0,
      books,
      observedRows: observed.summary.mergedRows,
      observedMode: observed.mode,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[${BASELINE_SCRAPE_CRON_TITLE}] cycle failed:`, error);
    try {
      await evaluateScrapeAlerts(root);
    } catch {
      /* ignore */
    }
    return { code: 1, books, error };
  }
}

/**
 * Register in-process cron (UTC, no-overlap). Injectable for tests.
 */
export function registerBaselineScrapeCron(
  scheduler: ScrapeCronScheduler = scheduleInProcess,
  opts: { root?: string; scrape?: BookScrapeOptions } = {}
): InProcessCronJob | unknown {
  const root = opts.root ?? repoRoot();
  const scrape = opts.scrape ?? scrapeOptsFromEnv();
  return scheduler(BASELINE_SCRAPE_CRON_SCHEDULE, async () => {
    await runBaselineScrapeCycle(root, scrape);
  });
}

if (import.meta.main) {
  process.on('unhandledRejection', err => {
    console.error(`[${BASELINE_SCRAPE_CRON_TITLE}] unhandledRejection:`, err);
  });

  if (Bun.argv.includes('--once')) {
    const { code } = await runBaselineScrapeCycle();
    process.exit(code);
  }

  const job = registerBaselineScrapeCron();
  console.info(
    `⏰ ${BASELINE_SCRAPE_CRON_TITLE} · in-process Bun.cron @ "${BASELINE_SCRAPE_CRON_SCHEDULE}" (UTC, no-overlap)`
  );
  console.info(`   books: ${trackedScrapeBooks().join(', ')}`);
  console.info('   SIGINT/SIGTERM to stop · next fire waits for scrape Promise');

  await new Promise<void>(resolve => {
    const stop = () => {
      try {
        const j = job as { stop?: () => void };
        j.stop?.();
      } catch {
        /* ignore */
      }
      resolve();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
  console.info(`👋 ${BASELINE_SCRAPE_CRON_TITLE} stopped`);
}
