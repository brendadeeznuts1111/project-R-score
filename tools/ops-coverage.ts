#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Ops coverage health one-liner / CLI.
 *
 *   bun tools/ops-coverage.ts
 *   bun tools/ops-coverage.ts --json
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  getPlatformCapacities,
  recordCoverageSnapshot,
} from '../lib/operations/platform-coverage.ts';

const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const json = process.argv.includes('--json');

const db = openOperationsDb({ path: dbPath });
try {
  db.run(`CREATE TABLE IF NOT EXISTS dod_submissions (
    id TEXT PRIMARY KEY, agent_id TEXT, type TEXT, status TEXT DEFAULT 'pending'
  )`);
} catch {
  /* ignore */
}

const coverage = recordCoverageSnapshot(db);
const capacities = getPlatformCapacities(db);
const liq = db
  .query(
    `SELECT COALESCE(SUM(available), 0) as a, COALESCE(SUM(in_play), 0) as i,
            COALESCE(SUM(deposited), 0) as d FROM positions`
  )
  .get() as { a: number; i: number; d: number };
const dod = db
  .query(`SELECT COUNT(*) as n FROM dod_submissions WHERE status = 'flagged'`)
  .get() as { n: number };
const agents = db
  .query(
    `SELECT COUNT(*) as n FROM tree_nodes WHERE active = 1 AND status IN ('active', 'partner')`
  )
  .get() as { n: number };

const payload = {
  dbPath,
  liquidity: { available: liq.a, inPlay: liq.i, deposited: liq.d },
  coverage,
  flaggedDods: dod.n,
  activeAgents: agents.n,
  topPlatforms: capacities.slice(0, 8).map(p => ({
    id: p.platformId,
    name: p.name,
    available: p.totalAvailable,
    coverageScore: p.coverageScore,
  })),
};

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`
🏢 OPERATIONS HEALTH
💰 Liquidity: $${liq.a?.toLocaleString() ?? 0} available, $${liq.i?.toLocaleString() ?? 0} in-play
📊 Coverage: ${coverage.covered}/${coverage.total} platforms (${coverage.pct}%)
🛡️  Flagged DODs: ${dod.n}
👥 Active agents: ${agents.n}
`);
}

db.close();
