#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Baseline multi-tier sync CLI.
 *
 *   bun run baseline:sync-scraped          # runs every registered scrape() agent
 *   bun tools/baseline-scrape-book.ts <bookId>
 */

import { joinPath } from '../lib/path-bun.ts';
import { logDepth, jsonOut } from '../lib/console-depth.ts';
import {
  SPORTSBOOK_OPENING_BASELINE_PATH,
  buildSportsbookOpeningBaselineArtifact,
} from '../lib/operations/sportsbook-opening-baseline.ts';
import { syncRegulatoryBaseline } from '../lib/operations/baseline-regulatory-seed.ts';
import { syncSportsbookPolicies } from '../lib/operations/baseline-sportsbook-policies.ts';
import {
  SCRAPED_LIMITS_OBSERVED_PATH,
  buildScrapedLimitsObservedArtifact,
  syncScrapedLimits,
} from '../lib/operations/baseline-scraped-limits.ts';
import { scrapeSportsbookLimits } from '../lib/operations/scrapers/sportsbook-limits.ts';
import {
  healthEntryForBook,
  readScrapeAgentHealth,
} from '../lib/operations/scrapers/raw-limits-store.ts';
import {
  getBookScrapeAgent,
  runAllRegisteredAgents,
  runRegisteredAgent,
  trackedScrapeBooks,
} from '../lib/operations/scrapers/run-book-agent.ts';
import {
  evaluateScrapeAlerts,
  scrapeAlertStatusSnapshot,
} from '../lib/operations/scrapers/scrape-alert.ts';

const RELATIVE_PATH = 'public/registry/sportsbook-opening-baseline.json';
const OBSERVED_RELATIVE = 'public/registry/scraped-limits-observed.json';
const root = joinPath(import.meta.dir, '..');
const target = joinPath(root, RELATIVE_PATH);
const observedTarget = joinPath(root, OBSERVED_RELATIVE);

async function bakeBaseline(): Promise<ReturnType<typeof buildSportsbookOpeningBaselineArtifact>> {
  const payload = buildSportsbookOpeningBaselineArtifact();
  await Bun.write(target, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function printStub(name: string): void {
  console.info(`⏸  baseline:${name} — not wired yet`);
}

async function syncRegulatory(): Promise<void> {
  const tier1 = syncRegulatoryBaseline();
  const payload = await bakeBaseline();
  console.info(
    `✅ baseline:sync-regulatory · T1 ${tier1.count} · T2 ${payload.summary.policyRows} · T4 ${payload.summary.scrapedRows} · T5 ${payload.summary.rows} → ${SPORTSBOOK_OPENING_BASELINE_PATH}`
  );
}

async function syncPolicies(): Promise<void> {
  const tier2 = syncSportsbookPolicies();
  const payload = await bakeBaseline();
  console.info(
    `✅ baseline:sync-policies · Tier 2 ${tier2.count} · tagged ${payload.summary.rowsWithPublishedPolicy} → ${SPORTSBOOK_OPENING_BASELINE_PATH}`
  );
}

async function syncScraped(): Promise<void> {
  const live = Bun.env.BASELINE_SCRAPE_LIVE === '1' || Bun.env.BASELINE_SCRAPE_LIVE === 'true';
  const books = trackedScrapeBooks().join('+');
  console.info(
    live
      ? `🕸️  Tier 4: registry agents (${books}) live + merge + bake…`
      : `🕸️  Tier 4: registry agents (${books}) fixture + JSONL merge + bake…`
  );
  // One call — each book is a scrape() line in books/registry.ts
  await runAllRegisteredAgents(root, { live });
  const scrapedLive = await scrapeSportsbookLimits({ live: false });
  const tier4 = await syncScrapedLimits({ root, preferObservations: true });
  const observed = await buildScrapedLimitsObservedArtifact(root);
  await Bun.write(observedTarget, `${JSON.stringify(observed, null, 2)}\n`);
  try {
    const alerts = await evaluateScrapeAlerts(root);
    const fired = alerts.events.filter(e => e.action === 'alerted').length;
    if (fired > 0 || alerts.events.some(e => e.consecutiveFails > 0)) {
      console.info(
        `   alerts · threshold=${alerts.threshold} webhook=${alerts.webhookConfigured} fired=${fired}`
      );
    }
  } catch (alertErr) {
    console.warn('   alerts skipped:', alertErr instanceof Error ? alertErr.message : alertErr);
  }
  // Committed opening baseline stays fixture-stable for bake:check.
  const payload = await bakeBaseline();
  console.info(
    `✅ baseline:sync-scraped · agent+parser ${scrapedLive.length} · merged ${tier4.count} (obs=${tier4.observedCells} override=${tier4.overridden} +${tier4.appended}) → ${SCRAPED_LIMITS_OBSERVED_PATH}`
  );
  console.info(
    `   fixture bake · cells tagged ${payload.summary.rowsWithScrapedEstimate} → ${SPORTSBOOK_OPENING_BASELINE_PATH}`
  );
}

async function status(asJson: boolean): Promise<void> {
  const file = Bun.file(target);
  if (!(await file.exists())) {
    console.error(`❌ missing ${RELATIVE_PATH}; run bun run baseline:sync-all`);
    process.exit(1);
  }
  const committed = (await file.json()) as {
    schemaVersion: number;
    generatedAt: string;
    summary: Record<string, number | string>;
    sources?: { tiers?: Record<string, { count: number; label: string; wired: boolean }> };
  };
  const agents = (await readScrapeAgentHealth(root)) ?? {
    generatedAt: null,
    books: await Promise.all(trackedScrapeBooks().map(bookId => healthEntryForBook(root, bookId))),
  };
  const observedFile = Bun.file(observedTarget);
  const observed = (await observedFile.exists())
    ? ((await observedFile.json()) as {
        mode: string;
        summary: Record<string, number | string | readonly string[]>;
        generatedAt: string;
      })
    : null;
  const report = {
    path: SPORTSBOOK_OPENING_BASELINE_PATH,
    observedPath: SCRAPED_LIMITS_OBSERVED_PATH,
    schemaVersion: committed.schemaVersion,
    generatedAt: committed.generatedAt,
    summary: committed.summary,
    tiers: committed.sources?.tiers ?? null,
    agents,
    observed,
    alerts: await scrapeAlertStatusSnapshot(root),
    phase: {
      tier1: 'wired',
      tier2: 'wired (research seed)',
      tier3: 'stub',
      tier4: `wired (registry scrape() · ${trackedScrapeBooks().join(',')} · JSONL merge → scraped-limits-observed)`,
      tier5: 'wired (ops matrix)',
    },
  };
  if (asJson) {
    jsonOut(report);
    return;
  }
  logDepth(report);
}

async function syncAll(): Promise<void> {
  await syncRegulatory();
  await syncPolicies();
  await syncScraped();
  printStub('apply-overrides');
  console.info('✅ baseline:sync-all · Tier 1+2+4+5 bake complete; Tier 3 stubbed');
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const cmd = args[0] ?? 'status';
  const asJson = args.includes('--json');
  const live = args.includes('--live');

  switch (cmd) {
    case 'sync-regulatory':
      await syncRegulatory();
      break;
    case 'sync-policies':
      await syncPolicies();
      break;
    case 'scrape-public':
    case 'sync-scraped':
      await syncScraped();
      break;
    case 'scrape-draftkings':
    case 'scrape-fanduel':
    case 'scrape-bet365':
    case 'scrape-espnbet':
    case 'scrape-betmgm':
    case 'scrape-caesars': {
      const bookId = cmd.replace('scrape-', '');
      const outcome = await runRegisteredAgent(root, getBookScrapeAgent(bookId), { live });
      if (!outcome.ok) process.exit(1);
      break;
    }
    case 'scrape-alert': {
      const dryRun = args.includes('--dry-run');
      const summary = await evaluateScrapeAlerts(root, { dryRun });
      if (asJson) {
        jsonOut(summary);
      } else {
        console.info(
          `✅ baseline:scrape-alert · threshold=${summary.threshold} webhook=${summary.webhookConfigured}`
        );
        for (const event of summary.events) {
          console.info(`   ${event.bookId}: ${event.action} fails=${event.consecutiveFails}`);
        }
      }
      break;
    }
    case 'sync-all':
      await syncAll();
      break;
    case 'status':
      await status(asJson);
      break;
    case 'apply-overrides':
      printStub('apply-overrides');
      break;
    default:
      console.error(
        `Unknown command: ${cmd}\nUsage: baseline-sync.ts <sync-regulatory|sync-policies|sync-scraped|scrape-<bookId>|sync-all|status> [--json|--live]\nBooks: ${trackedScrapeBooks().join(', ')}`
      );
      process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
