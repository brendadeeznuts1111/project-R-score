#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/pm/bunx — bunx (args after bin name; --bun before package)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Write ops portal snapshot for Cloudflare Pages (static `public/`).
 *
 *   bun run ops:snapshot
 *   bun run ops:snapshot --out public/registry/ops-summary.json
 *
 * Local portal (`/portal/ops`) uses `/api/operations/summary` live.
 * Pages has no bun:sqlite — deploy this JSON so the dashboard still loads.
 *
 * @see lib/operations/ops-summary.ts
 * @see functions/api/operations/summary.ts
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { buildBunUtilsProof } from '../lib/bun-utils-proof.ts';
import { collectMonitoring } from '../lib/monitoring/index.ts';
import { writePredictionReport } from '../lib/prediction/index.ts';

const argv = Bun.argv.slice(2);
const outIdx = argv.indexOf('--out');
const outPath =
  (outIdx >= 0 ? argv[outIdx + 1] : undefined) ??
  Bun.env.OPS_SNAPSHOT_PATH ??
  'public/registry/ops-summary.json';
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const withReport = !argv.includes('--no-report');
const withWebView = argv.includes('--webview');

// Ensure parent dirs exist (fresh clones often lack data/)
if (dbPath !== ':memory:') {
  const parent = dbPath.includes('/') ? dbPath.slice(0, dbPath.lastIndexOf('/')) : '.';
  if (parent && parent !== '.') await Bun.$`mkdir -p ${parent}`.quiet();
}
const outParent = outPath.includes('/') ? outPath.slice(0, outPath.lastIndexOf('/')) : '.';
if (outParent && outParent !== '.') await Bun.$`mkdir -p ${outParent}`.quiet();

const db = openOperationsDb({ path: dbPath });
try {
  const payload = buildOpsSummary(db, 'snapshot');
  await Bun.write(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  // Mirror full Bun utils proof for static + /api/registry/@factorywager/* allowlist.
  const bunProof = buildBunUtilsProof();
  const bunDir = 'public/registry/@factorywager/bun-utils-test';
  await Bun.$`mkdir -p ${bunDir}`.quiet();
  await Bun.write(`${bunDir}/latest.json`, `${JSON.stringify(bunProof, null, 2)}\n`);

  const monitoringPath = Bun.env.MONITORING_SNAPSHOT_PATH ?? 'public/registry/monitoring.json';
  const monitoring = await collectMonitoring(db, { source: 'snapshot' });
  await Bun.write(monitoringPath, `${JSON.stringify(monitoring, null, 2)}\n`);

  let report: { svgPath: string; htmlPath: string; pngPath?: string; points: number } | null = null;
  if (withReport) {
    const r = await writePredictionReport(db, {
      outDir: 'public/registry/prediction',
      webview: withWebView,
    });
    report = {
      svgPath: r.svgPath,
      htmlPath: r.htmlPath,
      pngPath: r.pngPath,
      points: r.points,
    };
  }

  console.log(
    JSON.stringify(
      {
        out: outPath,
        monitoring: monitoringPath,
        generated: payload.generated,
        experiments: payload.experiments.active,
        predictionN: payload.prediction.coverage.n,
        growth: {
          period: payload.growth.period,
          playsReceived: payload.growth.playsReceived,
          playsPlaced: payload.growth.playsPlaced,
        },
        bunUtils: {
          proofHash: payload.bunUtils.proofHash.slice(0, 16),
          passed: payload.bunUtils.passed,
          total: payload.bunUtils.total,
          bunVersion: payload.bunUtils.bunVersion,
        },
        dodQueue: monitoring.dodQueue,
        packageCount: monitoring.packageCount,
        liquidity: payload.liquidity.total,
        report,
      },
      null,
      2
    )
  );
} finally {
  db.close();
}
