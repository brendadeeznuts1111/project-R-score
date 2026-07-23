#!/usr/bin/env bun
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

const argv = Bun.argv.slice(2);
const outIdx = argv.indexOf('--out');
const outPath =
  (outIdx >= 0 ? argv[outIdx + 1] : undefined) ??
  Bun.env.OPS_SNAPSHOT_PATH ??
  'public/registry/ops-summary.json';
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

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
  console.log(
    JSON.stringify(
      {
        out: outPath,
        generated: payload.generated,
        experiments: payload.experiments.active,
        predictionN: payload.prediction.coverage.n,
        liquidity: payload.liquidity.total,
      },
      null,
      2
    )
  );
} finally {
  db.close();
}
