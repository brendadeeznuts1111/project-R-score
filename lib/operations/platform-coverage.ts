// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Platform coverage — bridges catalog (platforms / partner_platform_accounts)
 * with liquidity (positions), DOD balance checks, and ops summary.
 *
 * Detection is OCR/text alias matching only (no trained visual hashes).
 */
import type { Database } from 'bun:sqlite';
import { resolveExperimentCoverageFloor } from '../experiments/engine.ts';

/** Minimum agent-coverage % required to offer a play on a platform (override via env). */
export function minCoveragePct(): number {
  const n = Number(Bun.env.OPS_MIN_PLATFORM_COVERAGE ?? 30);
  return Number.isFinite(n) ? n : 30;
}

export type CoverageSummary = {
  total: number;
  covered: number;
  pct: number;
  byCategory: { category: string; total: number; covered: number }[];
};

export type PlatformCapacity = {
  platformId: string; // brand-ok — platforms.id slug
  name: string;
  category: string;
  apiAvailable: boolean;
  totalDeposited: number;
  totalInPlay: number;
  totalAvailable: number;
  agentCount: number;
  totalAgents: number;
  coverageScore: number;
};

export type PlatformRow = {
  id: string; // brand-ok
  name: string;
  category: string;
  sub_category: string | null;
  url: string | null;
  status: string;
  api_available: number;
  launch_date: string | null;
  account_count: number;
};

export type AgentPlatformAccount = {
  platformId: string; // brand-ok
  name: string;
  category: string;
  balance: number;
  status: string;
  lastVerifiedAt: string | null;
  source: 'partner_platform' | 'sb_accounts';
};

/** Normalize display name → stable slug (matches sb_accounts.book where applicable). */
export function platformSlug(name: string): string {
  const raw = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  // Canonical aliases for books already constrained in sb_accounts
  if (raw === 'hardrockbet' || raw === 'hardrock') return 'hardrock';
  if (raw === 'espnbet') return 'espnbet';
  if (raw === 'underdogfantasy') return 'underdog';
  if (raw === 'prophetexchange') return 'prophet';
  return raw;
}

/** Extra OCR / caption aliases → platform id. */
const TEXT_ALIASES: Record<string, string> = {
  dk: 'draftkings',
  draftkings: 'draftkings',
  fanduel: 'fanduel',
  fd: 'fanduel',
  betmgm: 'betmgm',
  mgm: 'betmgm',
  caesars: 'caesars',
  hardrock: 'hardrock',
  'hard rock': 'hardrock',
  kalshi: 'kalshi',
  prizepicks: 'prizepicks',
  underdog: 'underdog',
  stake: 'stake',
  bovada: 'bovada',
};

/** Ensure enhanced platform columns + coverage tables exist (idempotent). */
export function ensurePlatformCoverageSchema(db: Database): void {
  const cols = new Set(
    (db.query('PRAGMA table_info(platforms)').all() as { name: string }[]).map(c => c.name)
  );
  // Fresh DOD-only databases have no platforms table — skip platform column
  // migrations there (canonical schema: lib/operations/schema.ts).
  const platformsExist = cols.size > 0;
  const add = (name: string, def: string) => {
    if (platformsExist && !cols.has(name))
      db.run(`ALTER TABLE platforms ADD COLUMN ${name} ${def}`);
  };
  add('active', 'INTEGER DEFAULT 1');
  add('status', "TEXT DEFAULT 'active'");
  add('api_available', 'INTEGER DEFAULT 0');
  add('requires_geolocation', 'INTEGER DEFAULT 1');
  add('launch_date', 'TEXT');
  add('kyc_tier', 'TEXT');
  add('max_wager_default', 'REAL');
  add('notes', 'TEXT');
  add('updated_at', 'TEXT');

  // Backfill status from legacy `active` integer when present
  if (platformsExist) {
    db.run(
      `UPDATE platforms SET status = CASE WHEN COALESCE(active, 1) = 1 THEN 'active' ELSE 'defunct' END
       WHERE status IS NULL OR status = ''`
    );
  }

  // Migration: credentials_encrypted on partner_platform_accounts
  const ppaCols = new Set(
    (db.query('PRAGMA table_info(partner_platform_accounts)').all() as { name: string }[]).map(
      c => c.name
    )
  );
  if (ppaCols.size > 0 && !ppaCols.has('credentials_encrypted')) {
    db.run('ALTER TABLE partner_platform_accounts ADD COLUMN credentials_encrypted TEXT');
  }
  if (ppaCols.size > 0 && !ppaCols.has('is_test')) {
    db.run('ALTER TABLE partner_platform_accounts ADD COLUMN is_test INTEGER DEFAULT 0');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS coverage_snapshots (
      snapshot_date TEXT PRIMARY KEY,
      total_platforms INTEGER NOT NULL,
      covered_platforms INTEGER NOT NULL,
      coverage_percentage REAL NOT NULL,
      by_category TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expert_platform_prefs (
      expert_id TEXT NOT NULL REFERENCES experts(id),
      platform_id TEXT NOT NULL REFERENCES platforms(id),
      sport TEXT NOT NULL,
      market TEXT NOT NULL,
      priority INTEGER DEFAULT 5,
      PRIMARY KEY (expert_id, platform_id, sport, market)
    );
  `);
}

/** SQL predicate for an active platform row (`alias` optional table prefix). */
function activePlatformSql(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `(${p}status = 'active' OR (${p}status IS NULL AND COALESCE(${p}active, 1) = 1))`;
}

export function getCoverageSummary(db: Database): CoverageSummary {
  ensurePlatformCoverageSchema(db);

  const totals = db
    .query(
      `WITH avail AS (
         SELECT id FROM platforms
         WHERE ${activePlatformSql()}
           AND (launch_date IS NULL OR launch_date <= date('now'))
       ),
       covered AS (
         SELECT DISTINCT platform_id AS id FROM partner_platform_accounts
         WHERE status = 'active' AND COALESCE(is_test, 0) = 0
         UNION
         SELECT DISTINCT book AS id FROM sb_accounts WHERE status = 'active'
       )
       SELECT
         (SELECT COUNT(*) FROM avail) AS total,
         (SELECT COUNT(*) FROM covered c WHERE c.id IN (SELECT id FROM avail)) AS covered`
    )
    .get() as { total: number; covered: number };

  const byCategory = db
    .query(
      `SELECT p.category AS category,
              COUNT(DISTINCT p.id) AS total,
              COUNT(DISTINCT CASE WHEN cov.id IS NOT NULL THEN p.id END) AS covered
       FROM platforms p
       LEFT JOIN (
         SELECT DISTINCT platform_id AS id FROM partner_platform_accounts
         WHERE status = 'active' AND COALESCE(is_test, 0) = 0
         UNION
         SELECT DISTINCT book AS id FROM sb_accounts WHERE status = 'active'
       ) cov ON cov.id = p.id
       WHERE ${activePlatformSql('p')}
         AND (p.launch_date IS NULL OR p.launch_date <= date('now'))
       GROUP BY p.category
       ORDER BY p.category`
    )
    .all() as { category: string; total: number; covered: number }[];

  const total = totals.total ?? 0;
  const covered = totals.covered ?? 0;
  const pct = total > 0 ? Math.round((10000 * covered) / total) / 100 : 0;
  return { total, covered, pct, byCategory };
}

export function getPlatformCapacities(db: Database): PlatformCapacity[] {
  ensurePlatformCoverageSchema(db);

  const totalAgentsRow = db
    .query(
      `SELECT COUNT(*) AS n FROM tree_nodes
       WHERE active = 1 AND status IN ('active', 'partner')`
    )
    .get() as { n: number };
  const totalAgents = Math.max(totalAgentsRow.n, 1);

  const rows = db
    .query(
      `SELECT
         p.id AS platform_id,
         p.name AS name,
         p.category AS category,
         COALESCE(p.api_available, 0) AS api_available,
         COALESCE(SUM(pos.deposited), 0) AS total_deposited,
         COALESCE(SUM(pos.in_play), 0) AS total_in_play,
         COALESCE(SUM(pos.available), 0) AS total_available,
         (
           SELECT COUNT(DISTINCT agent_id) FROM (
             SELECT partner_id AS agent_id FROM partner_platform_accounts
               WHERE platform_id = p.id AND status = 'active' AND COALESCE(is_test, 0) = 0
             UNION
             SELECT agent_id FROM sb_accounts WHERE book = p.id AND status = 'active'
           )
         ) AS agent_count
       FROM platforms p
       LEFT JOIN positions pos ON pos.book = p.id
       WHERE ${activePlatformSql('p')}
       GROUP BY p.id
       ORDER BY total_available DESC, p.name`
    )
    .all() as {
    platform_id: string; // brand-ok — DB column name, not domain type
    name: string;
    category: string;
    api_available: number;
    total_deposited: number;
    total_in_play: number;
    total_available: number;
    agent_count: number;
  }[];

  return rows.map(r => ({
    platformId: r.platform_id,
    name: r.name,
    category: r.category,
    apiAvailable: r.api_available === 1,
    totalDeposited: r.total_deposited,
    totalInPlay: r.total_in_play,
    totalAvailable: r.total_available,
    agentCount: r.agent_count,
    totalAgents,
    coverageScore: Math.round((10000 * r.agent_count) / totalAgents) / 100,
  }));
}

/**
 * Can we offer `stake` on this platform given liquidity + coverage floor?
 * Optional `partnerId` applies active experiment variant floor
 * (`min_coverage_pct` / `coverage_floor`) when set.
 */
export function canOfferOnPlatform(
  db: Database,
  platformId: string, // brand-ok
  stake: number,
  minPct = minCoveragePct(),
  partnerId?: string // brand-ok — TreeNodeId at experiment boundary
): boolean {
  let floor = minPct;
  if (partnerId) {
    const override = resolveExperimentCoverageFloor(db, partnerId);
    if (override !== undefined) floor = override;
  }
  const cap = getPlatformCapacities(db).find(p => p.platformId === platformId);
  if (!cap) return false;
  return cap.totalAvailable >= stake && cap.coverageScore >= floor;
}

export function listPlatforms(db: Database): PlatformRow[] {
  ensurePlatformCoverageSchema(db);
  return db
    .query(
      `SELECT p.id, p.name, p.category, p.sub_category, p.url,
              COALESCE(p.status, 'active') AS status,
              COALESCE(p.api_available, 0) AS api_available,
              p.launch_date,
              (
                SELECT COUNT(*) FROM partner_platform_accounts a
                WHERE a.platform_id = p.id AND a.status = 'active' AND COALESCE(a.is_test, 0) = 0
              ) + (
                SELECT COUNT(*) FROM sb_accounts s
                WHERE s.book = p.id AND s.status = 'active'
              ) AS account_count
       FROM platforms p
       WHERE ${activePlatformSql('p')}
       ORDER BY account_count DESC, p.name`
    )
    .all() as PlatformRow[];
}

export function getAgentPlatformAccounts(db: Database, agentId: string): AgentPlatformAccount[] {
  // brand-ok — tree_nodes.id
  ensurePlatformCoverageSchema(db);
  const fromPpa = db
    .query(
      `SELECT p.id AS platform_id, p.name, p.category, a.balance, a.status, a.last_verified_at
       FROM partner_platform_accounts a
       JOIN platforms p ON p.id = a.platform_id
       WHERE a.partner_id = $id AND a.status != 'closed'
       ORDER BY a.balance DESC`
    )
    .all({ $id: agentId }) as {
    platform_id: string; // brand-ok — DB column name, not domain type
    name: string;
    category: string;
    balance: number;
    status: string;
    last_verified_at: string | null;
  }[];

  const fromSb = db
    .query(
      `SELECT book AS platform_id, book AS name, 'sportsbook' AS category,
              balance, status, last_scraped_at AS last_verified_at
       FROM sb_accounts WHERE agent_id = $id AND status != 'banned'`
    )
    .all({ $id: agentId }) as {
    platform_id: string; // brand-ok — DB column name, not domain type
    name: string;
    category: string;
    balance: number;
    status: string;
    last_verified_at: string | null;
  }[];

  const seen = new Set<string>();
  const out: AgentPlatformAccount[] = [];
  for (const r of fromPpa) {
    seen.add(r.platform_id);
    out.push({
      platformId: r.platform_id,
      name: r.name,
      category: r.category,
      balance: r.balance,
      status: r.status,
      lastVerifiedAt: r.last_verified_at,
      source: 'partner_platform',
    });
  }
  for (const r of fromSb) {
    if (seen.has(r.platform_id)) continue;
    out.push({
      platformId: r.platform_id,
      name: r.name,
      category: r.category,
      balance: r.balance,
      status: r.status,
      lastVerifiedAt: r.last_verified_at,
      source: 'sb_accounts',
    });
  }
  return out;
}

export function agentHasPlatformAccount(
  db: Database,
  agentId: string, // brand-ok // brand-ok
  platformId: string // brand-ok
): boolean {
  const ppa = db
    .query(
      `SELECT 1 AS ok FROM partner_platform_accounts
       WHERE partner_id = $a AND platform_id = $p AND status = 'active' LIMIT 1`
    )
    .get({ $a: agentId, $p: platformId }) as { ok: number } | null;
  if (ppa) return true;
  const sb = db
    .query(
      `SELECT 1 AS ok FROM sb_accounts
       WHERE agent_id = $a AND book = $p AND status = 'active' LIMIT 1`
    )
    .get({ $a: agentId, $p: platformId }) as { ok: number } | null;
  return !!sb;
}

/**
 * Detect platform id from OCR / caption text against catalog names + aliases.
 * Returns null when no confident match.
 */
export function detectPlatformFromText(db: Database, text: string | undefined): string | null {
  if (!text || text.trim().length < 2) return null;
  ensurePlatformCoverageSchema(db);
  const lower = text.toLowerCase();

  for (const [alias, id] of Object.entries(TEXT_ALIASES)) {
    if (lower.includes(alias)) {
      const exists = db
        .query(`SELECT id FROM platforms WHERE id = $id LIMIT 1`)
        .get({ $id: id }) as { id: string } | null; // brand-ok
      if (exists) return exists.id;
    }
  }

  const platforms = db
    .query(`SELECT id, name FROM platforms WHERE ${activePlatformSql()}`)
    .all() as { id: string; name: string }[]; // brand-ok

  // Longer names first to avoid partial collisions
  platforms.sort((a, b) => b.name.length - a.name.length);
  for (const p of platforms) {
    const name = p.name.toLowerCase();
    const compact = name.replace(/\s+/g, '');
    if (lower.includes(name) || lower.includes(compact) || lower.includes(p.id)) {
      return p.id;
    }
  }
  return null;
}

/** Mark partner_platform_accounts last_verified (+ optional balance) after verified balance DOD. */
export function markPlatformVerified(
  db: Database,
  agentId: string, // brand-ok // brand-ok
  platformId: string, // brand-ok
  balance?: number
): void {
  const now = new Date().toISOString();
  if (balance != null && Number.isFinite(balance)) {
    db.run(
      `UPDATE partner_platform_accounts
       SET last_verified_at = $now, balance = $bal
       WHERE partner_id = $a AND platform_id = $p AND status = 'active'`,
      { $now: now, $bal: balance, $a: agentId, $p: platformId }
    );
    db.run(
      `UPDATE sb_accounts SET balance = $bal, last_scraped_at = $now
       WHERE agent_id = $a AND book = $p AND status = 'active'`,
      { $bal: balance, $now: now, $a: agentId, $p: platformId }
    );
  } else {
    db.run(
      `UPDATE partner_platform_accounts SET last_verified_at = $now
       WHERE partner_id = $a AND platform_id = $p AND status = 'active'`,
      { $now: now, $a: agentId, $p: platformId }
    );
  }
}

/** Persist today's coverage snapshot (upsert by date). */
export function recordCoverageSnapshot(db: Database): CoverageSummary {
  const summary = getCoverageSummary(db);
  const day = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO coverage_snapshots
       (snapshot_date, total_platforms, covered_platforms, coverage_percentage, by_category, created_at)
     VALUES ($d, $t, $c, $pct, $cat, $now)
     ON CONFLICT(snapshot_date) DO UPDATE SET
       total_platforms = excluded.total_platforms,
       covered_platforms = excluded.covered_platforms,
       coverage_percentage = excluded.coverage_percentage,
       by_category = excluded.by_category,
       created_at = excluded.created_at`,
    {
      $d: day,
      $t: summary.total,
      $c: summary.covered,
      $pct: summary.pct,
      $cat: JSON.stringify(summary.byCategory),
      $now: now,
    }
  );
  return summary;
}

export function coverageTrend(
  db: Database,
  limit = 30
): { snapshot_date: string; coverage_percentage: number }[] {
  ensurePlatformCoverageSchema(db);
  return db
    .query(
      `SELECT snapshot_date, coverage_percentage FROM coverage_snapshots
       ORDER BY snapshot_date DESC LIMIT $n`
    )
    .all({ $n: limit }) as { snapshot_date: string; coverage_percentage: number }[];
}
