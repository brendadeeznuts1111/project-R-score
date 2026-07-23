// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see ../operations/platform-coverage.ts — base coverage module (lane-owned)
/**
 * Coverage analytics — predictive coverage, platform risk limits, expert
 * preferences, cost/compliance tracking, and performance metrics.
 *
 * Complements `platform-coverage.ts` (schema guard + summaries). All functions
 * take an open `Database` (see `initSchema` in `./schema.ts` for base tables).
 */

import type { Database } from 'bun:sqlite';

// ── Schema ────────────────────────────────────────────────────────
/** Idempotent analytics tables (base tables live in ./schema.ts). */
export function ensureCoverageAnalyticsSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS platform_risk_limits (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      partner_id TEXT,                -- NULL = global limit for the platform
      max_stake_per_play REAL,
      max_daily_exposure REAL,
      max_weekly_exposure REAL,
      risk_factor REAL DEFAULT 1.0,
      last_updated TEXT,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS platform_costs (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      cost_type TEXT NOT NULL,        -- monthly_fee | deposit_fee | withdrawal_fee | kyc_verification
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      frequency TEXT DEFAULT 'one_time',
      notes TEXT,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compliance_deadlines (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      requirement TEXT NOT NULL,      -- kyc_expiry | tax_form | address_verification
      due_date TEXT NOT NULL,
      completed_date TEXT,
      status TEXT DEFAULT 'pending'   -- pending | completed | overdue
    );

    CREATE TABLE IF NOT EXISTS platform_performance (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_wagers INTEGER DEFAULT 0,
      total_stake REAL DEFAULT 0,
      net_pnl REAL DEFAULT 0,
      win_rate REAL DEFAULT 0,
      UNIQUE(platform_id, date)
    );
  `);
}

// ── Predictive Coverage ──────────────────────────────────────────
export type CoveragePrediction = {
  currentCoverage: number;
  targetCoverage: number;
  dateToReach: string | null; // null = unreachable at current rate
  requiredNewAccounts: number;
  weeklyOnboardingRate: number;
};

/** If onboarding continues at the trailing 4-week rate, when do we hit target%? */
export function predictCoverage(db: Database, target = 80): CoveragePrediction {
  const stats = db
    .query(
      `SELECT
        (SELECT COUNT(*) FROM platforms WHERE status = 'active') AS total,
        (SELECT COUNT(DISTINCT platform_id) FROM partner_platform_accounts WHERE status = 'active') AS covered`
    )
    .get() as { total: number; covered: number };

  const current = stats.total === 0 ? 0 : (stats.covered / stats.total) * 100;
  const needed = Math.max(0, Math.ceil((target / 100) * stats.total - stats.covered));

  const rate = (
    db
      .query(
        `SELECT COUNT(*) / 4.0 AS rate FROM partner_platform_accounts
         WHERE opened_at > date('now', '-28 days')`
      )
      .get() as { rate: number }
  ).rate;

  const weeks = rate > 0 ? Math.ceil(needed / rate) : null;
  return {
    currentCoverage: current,
    targetCoverage: target,
    dateToReach:
      needed === 0
        ? new Date().toISOString().slice(0, 10)
        : weeks == null
          ? null
          : new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10),
    requiredNewAccounts: needed,
    weeklyOnboardingRate: rate,
  };
}

// ── Platform Risk Limits ─────────────────────────────────────────
export type PlatformRiskLimit = {
  maxStakePerPlay?: number;
  maxDailyExposure?: number;
  maxWeeklyExposure?: number;
  riskFactor: number;
};

export function setPlatformLimit(
  db: Database,
  limit: {
    platformId: string; // brand-ok — opaque platform key
    partnerId?: string; // brand-ok — opaque partner key
    maxStakePerPlay?: number;
    maxDailyExposure?: number;
    maxWeeklyExposure?: number;
    riskFactor?: number;
    updatedBy?: string;
  }
): void {
  db.run(
    `INSERT INTO platform_risk_limits
       (id, platform_id, partner_id, max_stake_per_play, max_daily_exposure, max_weekly_exposure, risk_factor, last_updated, updated_by)
     VALUES ($id, $p, $pid, $ms, $md, $mw, $rf, datetime('now'), $by)`,
    {
      $id: Bun.randomUUIDv7(),
      $p: limit.platformId,
      $pid: limit.partnerId ?? null,
      $ms: limit.maxStakePerPlay ?? null,
      $md: limit.maxDailyExposure ?? null,
      $mw: limit.maxWeeklyExposure ?? null,
      $rf: limit.riskFactor ?? 1.0,
      $by: limit.updatedBy ?? 'operations',
    }
  );
}

/** Partner-specific limit wins over the platform-global (partner_id IS NULL) one. */
export function getPlatformLimit(
  db: Database,
  platformId: string, // brand-ok
  partnerId?: string // brand-ok
): PlatformRiskLimit | null {
  const rowToLimit = (r: Record<string, unknown>): PlatformRiskLimit => ({
    maxStakePerPlay: r.max_stake_per_play as number | undefined,
    maxDailyExposure: r.max_daily_exposure as number | undefined,
    maxWeeklyExposure: r.max_weekly_exposure as number | undefined,
    riskFactor: (r.risk_factor as number) ?? 1.0,
  });
  if (partnerId) {
    const specific = db
      .query(
        `SELECT * FROM platform_risk_limits WHERE platform_id = $p AND partner_id = $pid
         ORDER BY last_updated DESC LIMIT 1`
      )
      .get({ $p: platformId, $pid: partnerId });
    if (specific) return rowToLimit(specific as Record<string, unknown>);
  }
  const global = db
    .query(
      `SELECT * FROM platform_risk_limits WHERE platform_id = $p AND partner_id IS NULL
       ORDER BY last_updated DESC LIMIT 1`
    )
    .get({ $p: platformId });
  return global ? rowToLimit(global as Record<string, unknown>) : null;
}

// ── Expert Platform Preferences ──────────────────────────────────
export type ExpertPlatformPref = {
  platformId: string; // brand-ok
  priority: number;
};

/**
 * Preference-ranked platforms for an expert (highest priority first).
 * Reads the `expert_platform_prefs` table from platform-coverage.ts.
 */
export function getExpertPlatformPrefs(
  db: Database,
  expertId: string, // brand-ok
  sport?: string,
  market?: string
): ExpertPlatformPref[] {
  const rows = db
    .query(
      `SELECT platform_id, priority FROM expert_platform_prefs
       WHERE expert_id = $e
         AND (sport = $s OR ($s IS NULL AND sport IS NULL))
         AND (market = $m OR ($m IS NULL AND market IS NULL))
       ORDER BY priority DESC`
    )
    .all({ $e: expertId, $s: sport ?? null, $m: market ?? null }) as {
    platform_id: string; // brand-ok — SQLite row field at the persistence boundary
    priority: number;
  }[];
  return rows.map(r => ({ platformId: r.platform_id, priority: r.priority }));
}

// ── Cost & Compliance ────────────────────────────────────────────
export function recordPlatformCost(
  db: Database,
  cost: {
    platformId: string; // brand-ok
    costType: string;
    amount: number;
    currency?: string;
    frequency?: string;
    notes?: string;
  }
): void {
  db.run(
    `INSERT INTO platform_costs (id, platform_id, cost_type, amount, currency, frequency, notes, recorded_at)
     VALUES ($id, $p, $t, $a, $c, $f, $n, datetime('now'))`,
    {
      $id: Bun.randomUUIDv7(),
      $p: cost.platformId,
      $t: cost.costType,
      $a: cost.amount,
      $c: cost.currency ?? 'USD',
      $f: cost.frequency ?? 'one_time',
      $n: cost.notes ?? null,
    }
  );
}

export type ComplianceItem = {
  id: string; // brand-ok
  platformId: string; // brand-ok
  partnerId: string; // brand-ok
  requirement: string;
  dueDate: string;
};

/** Pending compliance items due within N days (KYC expiry, tax forms, …). */
export function dueCompliance(db: Database, withinDays = 7): ComplianceItem[] {
  const rows = db
    .query(
      `SELECT id, platform_id, partner_id, requirement, due_date FROM compliance_deadlines
       WHERE status = 'pending' AND due_date <= date('now', '+' || $days || ' days')
       ORDER BY due_date`
    )
    .all({ $days: withinDays }) as {
    id: string; // brand-ok — opaque SQLite row primary key
    platform_id: string; // brand-ok — SQLite row field at the persistence boundary
    partner_id: string; // brand-ok — SQLite row field at the persistence boundary
    requirement: string;
    due_date: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    platformId: r.platform_id,
    partnerId: r.partner_id,
    requirement: r.requirement,
    dueDate: r.due_date,
  }));
}

// ── Performance Metrics ──────────────────────────────────────────
export function upsertPlatformPerformance(
  db: Database,
  row: {
    platformId: string; // brand-ok
    date: string; // YYYY-MM-DD
    totalWagers: number;
    totalStake: number;
    netPnl: number;
    winRate: number;
  }
): void {
  db.run(
    `INSERT INTO platform_performance (id, platform_id, date, total_wagers, total_stake, net_pnl, win_rate)
     VALUES ($id, $p, $d, $w, $s, $pnl, $wr)
     ON CONFLICT(platform_id, date) DO UPDATE SET
       total_wagers = $w, total_stake = $s, net_pnl = $pnl, win_rate = $wr`,
    {
      $id: Bun.randomUUIDv7(),
      $p: row.platformId,
      $d: row.date,
      $w: row.totalWagers,
      $s: row.totalStake,
      $pnl: row.netPnl,
      $wr: row.winRate,
    }
  );
}

export type PlatformPerformanceSummary = {
  platformId: string; // brand-ok
  days: number;
  totalWagers: number;
  totalStake: number;
  netPnl: number;
  winRate: number;
};

/** Aggregate performance over the trailing N days. */
export function getPlatformPerformance(
  db: Database,
  platformId: string, // brand-ok
  days = 30
): PlatformPerformanceSummary {
  const row = db
    .query(
      `SELECT
         COALESCE(SUM(total_wagers), 0) AS wagers,
         COALESCE(SUM(total_stake), 0) AS stake,
         COALESCE(SUM(net_pnl), 0) AS pnl,
         COALESCE(AVG(win_rate), 0) AS wr
       FROM platform_performance
       WHERE platform_id = $p AND date > date('now', '-' || $days || ' days')`
    )
    .get({ $p: platformId, $days: days }) as {
    wagers: number;
    stake: number;
    pnl: number;
    wr: number;
  };
  return {
    platformId,
    days,
    totalWagers: row.wagers,
    totalStake: row.stake,
    netPnl: row.pnl,
    winRate: row.wr,
  };
}
