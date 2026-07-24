// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Demo seed for coverage prediction — platforms, partner accounts,
 * historical coverage_snapshots, and backtest rows for Pages report.
 *
 * @see tools/ops-seed-prediction.ts
 * @see lib/prediction/tester.ts
 */
import { randomUUIDv7 } from 'bun';
import type { Database } from 'bun:sqlite';
import { ensurePlatformCoverageSchema } from './platform-coverage.ts';
import { ensurePredictionSchema } from '../prediction/schema.ts';
import {
  getPredictionAccuracy,
  runCoverageBacktest,
  simulateCoveragePrediction,
} from '../prediction/tester.ts';

export type SeedPredictionDemoOpts = {
  force?: boolean;
  /** Only seed when coverage_snapshots is empty (default true). */
  ifEmpty?: boolean;
  /** Historical snapshot days to insert (default 30). */
  days?: number;
};

export type SeedPredictionDemoResult = {
  seeded: boolean;
  reason?: string;
  platforms?: number;
  accounts?: number;
  snapshots?: number;
  backtestRows?: number;
  accuracy?: { mae: number; rmse: number; bias: number; n: number };
};

const DEMO_PLATFORMS = [
  { id: 'draftkings', name: 'DraftKings', category: 'sportsbook', launch: '2024-01-01' },
  { id: 'fanduel', name: 'FanDuel', category: 'sportsbook', launch: '2024-01-01' },
  { id: 'betmgm', name: 'BetMGM', category: 'sportsbook', launch: '2024-01-01' },
  { id: 'caesars', name: 'Caesars', category: 'sportsbook', launch: '2024-01-01' },
] as const;

/** Deterministic drift so demo MAE is non-zero but stable in tests. */
const DRIFT = [8, -5, 12, -3, 6, -10, 4, 7, -8, 11, -6, 9, -4, 5, -7];

export function isPredictionDataEmpty(db: Database): boolean {
  try {
    ensurePlatformCoverageSchema(db);
    const row = db.query(`SELECT COUNT(*) AS n FROM coverage_snapshots`).get() as { n: number };
    return (row?.n ?? 0) === 0;
  } catch {
    return true;
  }
}

function upsertPlatforms(db: Database, now: string): number {
  ensurePlatformCoverageSchema(db);
  const insert = db.prepare(`
    INSERT INTO platforms (
      id, name, category, sub_category, url, active, status, api_available,
      launch_date, created_at, updated_at
    ) VALUES ($id, $name, $cat, 'regulated_us', $url, 1, 'active', 1, $launch, $now, $now)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      launch_date = COALESCE(platforms.launch_date, excluded.launch_date),
      status = 'active',
      updated_at = excluded.updated_at
  `);
  for (const p of DEMO_PLATFORMS) {
    insert.run({
      $id: p.id,
      $name: p.name,
      $cat: p.category,
      $url: `https://${p.id}.com`,
      $launch: p.launch,
      $now: now,
    });
  }
  return DEMO_PLATFORMS.length;
}

function seedPartnerAccounts(db: Database, now: string): number {
  const partners = db
    .query(
      `SELECT id FROM tree_nodes WHERE type = 'partner' AND active = 1 ORDER BY created_at LIMIT 2`
    )
    .all() as { id: string }[]; // brand-ok — tree_nodes.id

  if (partners.length === 0) {
    return 0;
  }

  const specs: { partner: string; platform: string; daysAgo: number }[] = [
    { partner: partners[0]!.id, platform: 'fanduel', daysAgo: 90 },
    { partner: partners[0]!.id, platform: 'draftkings', daysAgo: 60 },
    { partner: partners[1]?.id ?? partners[0]!.id, platform: 'betmgm', daysAgo: 45 },
    { partner: partners[1]?.id ?? partners[0]!.id, platform: 'caesars', daysAgo: 30 },
  ];

  let count = 0;
  for (const spec of specs) {
    const exists = db
      .query(
        `SELECT id FROM partner_platform_accounts
         WHERE partner_id = $p AND platform_id = $plat LIMIT 1`
      )
      .get({ $p: spec.partner, $plat: spec.platform }) as { id: string } | null; // brand-ok
    if (exists) continue;

    const opened = new Date(Date.now() - spec.daysAgo * 86_400_000).toISOString();
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, is_test, opened_at, created_at)
       VALUES ($id, $plat, $partner, $ident, $bal, 'active', 0, $opened, $now)`,
      {
        $id: randomUUIDv7(),
        $plat: spec.platform,
        $partner: spec.partner,
        $ident: `demo-${spec.platform}`,
        $bal: 10_000 + count * 2500,
        $opened: opened,
        $now: now,
      }
    );
    count++;
  }
  return count;
}

function seedHistoricalSnapshots(db: Database, days: number, now: string): number {
  ensurePlatformCoverageSchema(db);
  const total = DEMO_PLATFORMS.length;
  let inserted = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const predicted = simulateCoveragePrediction(db, date);
    const drift = DRIFT[(days - 1 - i) % DRIFT.length]!;
    const actual = Math.min(100, Math.max(0, Math.round((predicted + drift) * 100) / 100));
    const covered = Math.max(0, Math.min(total, Math.round((actual / 100) * total)));

    db.run(
      `INSERT INTO coverage_snapshots
         (snapshot_date, total_platforms, covered_platforms, coverage_percentage, by_category, created_at)
       VALUES ($d, $t, $c, $pct, '[]', $now)
       ON CONFLICT(snapshot_date) DO UPDATE SET
         total_platforms = excluded.total_platforms,
         covered_platforms = excluded.covered_platforms,
         coverage_percentage = excluded.coverage_percentage,
         created_at = excluded.created_at`,
      { $d: date, $t: total, $c: covered, $pct: actual, $now: now }
    );
    inserted++;
  }
  return inserted;
}

/** Populate platforms, accounts, snapshots, and run coverage backtest. */
export function seedPredictionDemo(
  db: Database,
  opts?: SeedPredictionDemoOpts
): SeedPredictionDemoResult {
  const ifEmpty = opts?.ifEmpty ?? true;
  const days = opts?.days ?? 30;

  if (!opts?.force && ifEmpty && !isPredictionDataEmpty(db)) {
    return { seeded: false, reason: 'coverage_snapshots already present (use --force)' };
  }

  ensurePredictionSchema(db);
  ensurePlatformCoverageSchema(db);

  const now = new Date().toISOString();
  const platforms = upsertPlatforms(db, now);
  const accounts = seedPartnerAccounts(db, now);
  const snapshots = seedHistoricalSnapshots(db, days, now);

  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - days * 86_400_000);
  const from = fromDate.toISOString().slice(0, 10);
  const backtestRows = runCoverageBacktest(db, from, to);
  const accuracy = getPredictionAccuracy(db, 'coverage');

  return {
    seeded: true,
    platforms,
    accounts,
    snapshots,
    backtestRows: backtestRows.length,
    accuracy,
  };
}
