#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Build the read-only Limits Forecast Lab artifact.
 *
 * Ingests partner_account_limits + Tier 4 JSONL (artifacts/raw-limits/).
 *
 *   bun run ops:limits:lab
 *   bun run ops:limits:lab:json
 *   bun run ops:limits:lab -- --no-scrape
 */
import { Database } from 'bun:sqlite';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { RAW_LIMITS_DIR_REL } from '../lib/operations/scrapers/raw-limits-store.ts';
import {
  buildLimitForecastLab,
  type LimitSnapshotSample,
} from '../lib/prediction/limit-forecast-lab.ts';
import {
  loadScrapeLabSnapshots,
  mergeLabSnapshots,
} from '../lib/prediction/limit-forecast-scrape-ingest.ts';
import {
  readLimitForecastCalibrationSamples,
  readLimitForecastEvidenceSummary,
  type ForecastCalibrationSample,
  type LimitForecastEvidenceSummary,
} from '../lib/prediction/limit-forecast-evidence.ts';
import { asTreeNodeId, parseSportsbookId } from '../lib/types/branded.ts';

const DEFAULT_OUTPUT = 'public/registry/limit-forecast-lab.json';
const root = joinPath(import.meta.dir, '..');

type WireLimitSnapshot = {
  node_id: string; // brand-ok — parsed at the SQLite boundary
  sportsbook: string;
  sport_id: string; // brand-ok — source wire key, not an entity identity
  market_id: string; // brand-ok — source wire key, not an entity identity
  bet_type: string;
  max_wager: number;
  recorded_at: number;
};

function optionValue(args: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
}

function loadPartnerSnapshots(path: string): {
  snapshots: LimitSnapshotSample[];
  evidence: LimitForecastEvidenceSummary;
  calibrationSamples: ForecastCalibrationSample[];
} {
  const db = new Database(path, { readonly: true });
  try {
    const rows = db
      .query(
        `SELECT node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at
         FROM partner_account_limits
         ORDER BY recorded_at, id`
      )
      .all() as WireLimitSnapshot[];
    return {
      snapshots: rows.map(row => ({
        nodeId: asTreeNodeId(row.node_id),
        sportsbook: parseSportsbookId(row.sportsbook),
        sportKey: row.sport_id,
        marketKey: row.market_id,
        phase: row.bet_type,
        maxWager: row.max_wager,
        recordedAt: row.recorded_at,
        inputClass: 'partner-observation',
        decisionEligible: true,
      })),
      evidence: readLimitForecastEvidenceSummary(db),
      calibrationSamples: readLimitForecastCalibrationSamples(db),
    };
  } finally {
    db.close();
  }
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const databasePath = optionValue(args, 'db') ?? DEFAULT_OPS_DB_PATH;
  const outputPath = optionValue(args, 'out') ?? DEFAULT_OUTPUT;
  const benchmarkIterations = Math.max(1, Number(optionValue(args, 'bench') ?? '1'));
  const write = !args.includes('--no-write');
  const json = args.includes('--json');
  const includeScrape = !args.includes('--no-scrape');

  const partner = loadPartnerSnapshots(databasePath);
  const scrapeSnapshots = includeScrape ? await loadScrapeLabSnapshots(root) : [];
  const snapshots = mergeLabSnapshots(partner.snapshots, scrapeSnapshots);

  const sourceMeta = {
    database: 'data/operations.db',
    table: 'partner_account_limits',
    mode: 'read-only' as const,
    scrapeJsonl: includeScrape ? RAW_LIMITS_DIR_REL : null,
    partnerSnapshots: partner.snapshots.length,
    scrapeSnapshots: scrapeSnapshots.length,
  };

  const started = performance.now();
  let payload = buildLimitForecastLab(
    snapshots,
    undefined,
    partner.evidence,
    sourceMeta,
    partner.calibrationSamples
  );
  for (let iteration = 1; iteration < benchmarkIterations; iteration++) {
    payload = buildLimitForecastLab(
      snapshots,
      payload.generatedAt,
      partner.evidence,
      sourceMeta,
      partner.calibrationSamples
    );
  }
  const elapsedMs = performance.now() - started;

  if (write) {
    await Bun.write(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  const result = {
    ...payload,
    benchmark: {
      iterations: benchmarkIterations,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      averageMs: Number((elapsedMs / benchmarkIterations).toFixed(6)),
    },
    output: write ? outputPath : null,
  };

  if (json) {
    jsonOut(result);
    return;
  }

  logTable(
    [
      { metric: 'partner_snapshots', value: partner.snapshots.length },
      { metric: 'scrape_snapshots', value: scrapeSnapshots.length },
      { metric: 'snapshots', value: payload.dataset.snapshots },
      {
        metric: 'decision_eligible_snapshots',
        value: payload.dataset.decisionEligibleSnapshots,
      },
      { metric: 'research_only_snapshots', value: payload.dataset.researchOnlySnapshots },
      { metric: 'transitions', value: payload.dataset.transitions },
      {
        metric: 'decision_eligible_transitions',
        value: payload.dataset.decisionEligibleTransitions,
      },
      { metric: 'sportsbooks', value: payload.dataset.sportsbooks },
      { metric: 'global_rate', value: `${(payload.model.globalRate * 100).toFixed(1)}%` },
      { metric: 'support', value: payload.dataset.support },
      { metric: 'forecast_eligible', value: payload.dataset.forecastEligible },
      { metric: 'evidence_issues', value: payload.evidence.issues },
      { metric: 'evidence_pending', value: payload.evidence.pending },
      { metric: 'evidence_matured', value: payload.evidence.matured },
      { metric: 'average_ms', value: result.benchmark.averageMs },
    ],
    ['metric', 'value'],
    { colors: true }
  );
  console.log(
    write
      ? `Limits Forecast Lab artifact: ${outputPath}`
      : 'Limits Forecast Lab completed without writing an artifact.'
  );
}

if (import.meta.main) await main();
