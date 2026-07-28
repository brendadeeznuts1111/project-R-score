// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * Account limit history — per-partner, per-sportsbook, per-sport/market/bet-type.
 *
 * Tracks limit snapshots over time and detects raises (new limit > previous),
 * optionally correlated with gold/platinum CLV movers and short-window line move.
 *
 * Tables: partner_account_limits · partner_players · player_clv_snapshots ·
 *         market_line_movement · account_alerts
 */
import { Database } from 'bun:sqlite';
import { stringWidth } from 'bun';

// ── Schema ────────────────────────────────────────────────────────────────

export function ensureAccountLimitsSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS partner_account_limits (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id       TEXT NOT NULL,
      sportsbook    TEXT NOT NULL,
      sport_id      TEXT NOT NULL,
      market_id     TEXT NOT NULL,
      bet_type      TEXT NOT NULL CHECK(bet_type IN ('pregame', 'live', 'straight')),
      max_wager     REAL NOT NULL,
      effective_from INTEGER NOT NULL DEFAULT (unixepoch()),
      recorded_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_account_limits_lookup
      ON partner_account_limits(node_id, sportsbook, sport_id, market_id, bet_type, effective_from);
    CREATE INDEX IF NOT EXISTS idx_account_limits_node_time
      ON partner_account_limits(node_id, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS account_alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id     TEXT NOT NULL,
      alert_type  TEXT NOT NULL DEFAULT 'limit_increase',
      message     TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_account_alerts_node
      ON account_alerts(node_id, created_at);

    CREATE TABLE IF NOT EXISTS partner_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('bronze','silver','gold','platinum'))
    );
    CREATE INDEX IF NOT EXISTS idx_partner_players_node
      ON partner_players(node_id, tier);

    CREATE TABLE IF NOT EXISTS player_clv_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      node_id TEXT NOT NULL,
      expected_value REAL NOT NULL,
      recorded_at INTEGER NOT NULL,
      FOREIGN KEY (player_id) REFERENCES partner_players(id)
    );
    CREATE INDEX IF NOT EXISTS idx_player_clv_time
      ON player_clv_snapshots(player_id, node_id, recorded_at);

    CREATE TABLE IF NOT EXISTS market_line_movement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      sportsbook TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      market_id TEXT NOT NULL,
      bet_type TEXT NOT NULL,
      move_delta REAL NOT NULL,
      recorded_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mlm_dim_time
      ON market_line_movement(node_id, sportsbook, sport_id, market_id, bet_type, recorded_at);

    -- Multi-factor snapshot at the moment of a limit raise
    CREATE TABLE IF NOT EXISTS limit_raise_context (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id                  TEXT NOT NULL,
      limit_record_id          INTEGER NOT NULL,
      active_players_7d        INTEGER,
      new_players_7d           INTEGER,
      total_handle_7d          REAL,
      avg_clv_7d               REAL,
      top_tier_player_count    INTEGER,
      violation_count_30d      INTEGER,
      chargeback_count_30d     INTEGER,
      kyc_pass_rate            REAL,
      market_volatility_index  REAL,
      peak_betting_hours       TEXT,
      sportsbook_share         REAL,
      partner_profit_30d       REAL,
      partner_roi_30d          REAL,
      snapshot_at              INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (limit_record_id) REFERENCES partner_account_limits(id)
    );
    CREATE INDEX IF NOT EXISTS idx_lrc_node_limit
      ON limit_raise_context(node_id, limit_record_id);
    CREATE INDEX IF NOT EXISTS idx_lrc_snapshot
      ON limit_raise_context(node_id, snapshot_at DESC);
  `);

  // Migrate older DBs that only allowed pregame|live
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS partner_account_limits__mig (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        sportsbook TEXT NOT NULL,
        sport_id TEXT NOT NULL,
        market_id TEXT NOT NULL,
        bet_type TEXT NOT NULL CHECK(bet_type IN ('pregame', 'live', 'straight')),
        max_wager REAL NOT NULL,
        effective_from INTEGER NOT NULL DEFAULT (unixepoch()),
        recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    const info = db.query(`PRAGMA table_info(partner_account_limits)`).all() as Array<{
      name: string;
    }>;
    if (info.length > 0) {
      // Rebuild only when CHECK is too strict — detect by failed insert of 'straight' is heavy;
      // leave dual CHECK via recreate if sql has only pregame|live.
      const sql = (
        db
          .query(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='partner_account_limits'`
          )
          .get() as { sql: string } | null
      )?.sql;
      if (sql && sql.includes("'pregame', 'live')") && !sql.includes('straight')) {
        db.run(`INSERT OR IGNORE INTO partner_account_limits__mig
          SELECT id, node_id, sportsbook, sport_id, market_id, bet_type, max_wager, effective_from, recorded_at
          FROM partner_account_limits`);
        db.run(`DROP TABLE partner_account_limits`);
        db.run(`ALTER TABLE partner_account_limits__mig RENAME TO partner_account_limits`);
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_account_limits_lookup
            ON partner_account_limits(node_id, sportsbook, sport_id, market_id, bet_type, effective_from);
          CREATE INDEX IF NOT EXISTS idx_account_limits_node_time
            ON partner_account_limits(node_id, recorded_at DESC);
        `);
      } else {
        db.run(`DROP TABLE IF EXISTS partner_account_limits__mig`);
      }
    }
  } catch {
    /* best-effort migrate */
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface LimitRecord {
  node_id: string; // brand-ok — partner tree node slug
  sportsbook: string;
  sport_id: string; // brand-ok — sport key (nba, nfl, …)
  market_id: string; // brand-ok — market key (totals, spread, …)
  bet_type: 'pregame' | 'live' | 'straight';
  max_wager: number;
}

export interface LimitRaise {
  /** partner_account_limits.id for the raised row */
  limit_id: number; // brand-ok — limit history row pk
  sportsbook: string;
  sport_id: string; // brand-ok
  market_id: string; // brand-ok
  bet_type: string;
  previous_max: number;
  new_limit: number;
  increased_at: number;
}

export interface ClvMover {
  player_name: string;
  tier: string;
  delta: number;
}

export interface EnrichedLimitRaise extends LimitRaise {
  line_move_5m: number | null;
  top_clv: ClvMover[];
}

/** Latest known max_wager snapshot for a node+sportsbook (any sport/market/bet_type). */
export interface LatestBookLimit {
  /** partner_account_limits.id */
  limit_id: number; // brand-ok — limit history row pk
  sportsbook: string;
  sport_id: string; // brand-ok
  market_id: string; // brand-ok
  bet_type: string;
  max_wager: number;
  recorded_at: number;
  /**
   * Prior high-water on the same dim when the latest row is a raise; null when
   * this is the first snapshot or not higher than history.
   */
  previous_max: number | null;
}

// ── Repository ────────────────────────────────────────────────────────────

export class AccountLimitsRepository {
  constructor(private db: Database) {}

  /** Record a current limit snapshot. */
  recordLimit(limit: LimitRecord): void {
    this.db.run(
      `INSERT INTO partner_account_limits
         (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, effective_from)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
      [
        limit.node_id,
        limit.sportsbook,
        limit.sport_id,
        limit.market_id,
        limit.bet_type,
        limit.max_wager,
      ]
    );
  }

  /**
   * Record a limit and create an alert if it is a raise.
   * Also publishes to the SSE channel for real-time dashboard updates.
   */
  recordLimitWithAlert(limit: LimitRecord): LimitRaise | null {
    this.recordLimit(limit);
    const raise = this.raiseForJustInserted(limit);
    if (raise) {
      this.createAlert(
        limit.node_id,
        `Limit raised on ${raise.sportsbook} ${raise.sport_id}/${raise.market_id} ${raise.bet_type}: $${raise.previous_max} → $${raise.new_limit}`
      );
      // Fire-and-forget SSE channel publish
      try {
        publishLimitAlertToChannel(this.db, {
          ...raise,
          node_id: limit.node_id,
          direction: 'up',
        });
      } catch {}
    }
    return raise;
  }

  /** Find limit raises since a timestamp (default: epoch 0 = all time). */
  detectRaises(nodeId: string, sinceTimestamp: number = 0): LimitRaise[] {
    // brand-ok — TreeNodeId wire
    // brand-ok — nodeId is partner tree node slug
    const rows = this.db
      .query(
        `
      SELECT a.id AS limit_id,
             a.sportsbook, a.sport_id, a.market_id, a.bet_type,
             (SELECT MAX(b.max_wager) FROM partner_account_limits b
              WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
                AND b.sport_id = a.sport_id AND b.market_id = a.market_id
                AND b.bet_type = a.bet_type AND b.id < a.id) as previous_max,
             a.max_wager as new_limit,
             a.recorded_at as increased_at
      FROM partner_account_limits a
      WHERE a.node_id = ?
        AND a.recorded_at > ?
        AND EXISTS (
          SELECT 1 FROM partner_account_limits b
          WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
            AND b.sport_id = a.sport_id AND b.market_id = a.market_id
            AND b.bet_type = a.bet_type AND b.id < a.id
        )
        AND a.max_wager > (
          SELECT MAX(b.max_wager) FROM partner_account_limits b
          WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
            AND b.sport_id = a.sport_id AND b.market_id = a.market_id
            AND b.bet_type = a.bet_type AND b.id < a.id
        )
      ORDER BY a.recorded_at DESC
    `
      )
      .all(nodeId, sinceTimestamp) as LimitRaise[];
    return rows;
  }

  /** Raises + average line move in [t, t+300s] + top gold/platinum CLV deltas. */
  detectRaisesEnriched(nodeId: string, sinceTimestamp: number = 0): EnrichedLimitRaise[] {
    // brand-ok — TreeNodeId wire
    // brand-ok — nodeId partner slug
    const raises = this.detectRaises(nodeId, sinceTimestamp);
    return raises.map(r => ({
      ...r,
      line_move_5m: this.avgLineMove(nodeId, r),
      top_clv: this.topClvMovers(nodeId, r.increased_at),
    }));
  }

  avgLineMove(
    nodeId: string, // brand-ok
    raise: Pick<LimitRaise, 'sportsbook' | 'sport_id' | 'market_id' | 'bet_type' | 'increased_at'>,
    windowSec = 300
  ): number | null {
    const row = this.db
      .query(
        `SELECT AVG(move_delta) AS d5
         FROM market_line_movement
         WHERE node_id = ?
           AND sportsbook = ?
           AND sport_id = ?
           AND market_id = ?
           AND bet_type = ?
           AND recorded_at BETWEEN ? AND ?`
      )
      .get(
        nodeId,
        raise.sportsbook,
        raise.sport_id,
        raise.market_id,
        raise.bet_type,
        raise.increased_at,
        raise.increased_at + windowSec
      ) as { d5: number | null } | null;
    return row?.d5 ?? null;
  }

  topClvMovers(nodeId: string, raiseAt: number, limit = 3): ClvMover[] {
    // brand-ok — TreeNodeId wire
    // brand-ok — nodeId partner slug
    return this.db
      .query(
        `SELECT p.player_name AS player_name,
                p.tier AS tier,
                (
                  SELECT post.expected_value
                  FROM player_clv_snapshots post
                  WHERE post.player_id = p.id AND post.node_id = p.node_id AND post.recorded_at > ?
                  ORDER BY post.recorded_at ASC
                  LIMIT 1
                ) - (
                  SELECT pre.expected_value
                  FROM player_clv_snapshots pre
                  WHERE pre.player_id = p.id AND pre.node_id = p.node_id AND pre.recorded_at < ?
                  ORDER BY pre.recorded_at DESC
                  LIMIT 1
                ) AS delta
         FROM partner_players p
         WHERE p.node_id = ?
           AND p.tier IN ('gold', 'platinum')
         GROUP BY p.id
         HAVING delta IS NOT NULL AND delta > 0
         ORDER BY delta DESC
         LIMIT ?`
      )
      .all(raiseAt, raiseAt, nodeId, limit) as ClvMover[];
  }

  /** Check if the just-inserted row for the given limit is a raise. */
  private raiseForJustInserted(limit: LimitRecord): LimitRaise | null {
    const raise = this.db
      .query(
        `
      SELECT a.id AS limit_id,
             a.sportsbook, a.sport_id, a.market_id, a.bet_type,
             (SELECT MAX(b.max_wager) FROM partner_account_limits b
              WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
                AND b.sport_id = a.sport_id AND b.market_id = a.market_id
                AND b.bet_type = a.bet_type AND b.id < a.id) as previous_max,
             a.max_wager as new_limit,
             a.recorded_at as increased_at
      FROM partner_account_limits a
      WHERE a.node_id = ? AND a.sportsbook = ? AND a.sport_id = ? AND a.market_id = ?
        AND a.bet_type = ?
      ORDER BY a.id DESC
      LIMIT 1
    `
      )
      .get(
        limit.node_id,
        limit.sportsbook,
        limit.sport_id,
        limit.market_id,
        limit.bet_type
      ) as LimitRaise | null;
    if (raise && raise.previous_max != null && raise.new_limit > raise.previous_max) {
      return raise;
    }
    return null;
  }

  /** Commit an alert row (fire-and-forget). */
  createAlert(nodeId: string, message: string): void {
    // brand-ok — TreeNodeId wire
    // brand-ok — nodeId partner slug
    this.db.run(
      `INSERT INTO account_alerts (node_id, alert_type, message) VALUES (?, 'limit_increase', ?)`,
      [nodeId, message]
    );
  }

  /** Read recent alerts for a partner (default 50). */
  readAlerts(
    nodeId: string, // brand-ok
    limit = 50
  ): Array<{
    id: number; // brand-ok — alert row pk
    node_id: string; // brand-ok
    alert_type: string;
    message: string;
    created_at: number;
  }> {
    return this.db
      .query(
        `SELECT id, node_id, alert_type, message, created_at
       FROM account_alerts
       WHERE node_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
      )
      .all(nodeId, limit) as Array<{
      id: number; // brand-ok — alert row pk
      node_id: string; // brand-ok — TreeNodeId wire
      alert_type: string;
      message: string;
      created_at: number;
    }>;
  }

  /** Find limit decreases (max_wager dropped below previous high-water mark). */
  detectDecreases(nodeId: string, sinceTimestamp: number = 0): LimitRaise[] {
    // brand-ok — TreeNodeId wire
    const rows = this.db
      .query(
        `
      SELECT a.id AS limit_id, a.sportsbook, a.sport_id, a.market_id, a.bet_type,
             (SELECT MAX(b.max_wager) FROM partner_account_limits b
              WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
                AND b.sport_id = a.sport_id AND b.market_id = a.market_id
                AND b.bet_type = a.bet_type AND b.id < a.id) as previous_max,
             a.max_wager as new_limit,
             a.recorded_at as increased_at
      FROM partner_account_limits a
      WHERE a.node_id = ?
        AND a.recorded_at > ?
        AND EXISTS (
          SELECT 1 FROM partner_account_limits b
          WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
            AND b.sport_id = a.sport_id AND b.market_id = a.market_id
            AND b.bet_type = a.bet_type AND b.id < a.id
        )
        AND a.max_wager < (
          SELECT MAX(b.max_wager) FROM partner_account_limits b
          WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
            AND b.sport_id = a.sport_id AND b.market_id = a.market_id
            AND b.bet_type = a.bet_type AND b.id < a.id
        )
      ORDER BY a.recorded_at DESC
    `
      )
      .all(nodeId, sinceTimestamp) as LimitRaise[];
    return rows;
  }

  /**
   * Latest recorded max_wager for a node + sportsbook (any sport/market/bet_type).
   * `previous_max` is the prior high-water on the same dim when this row raised, else null.
   * Sportsbook match is case-insensitive exact on `partner_account_limits.sportsbook`.
   */
  latestLimitForSportsbook(
    nodeId: string, // brand-ok — TreeNodeId wire
    sportsbook: string
  ): LatestBookLimit | null {
    const book = sportsbook.trim();
    if (!book) return null;
    const row = this.db
      .query(
        `
      SELECT a.id AS limit_id,
             a.sportsbook,
             a.sport_id,
             a.market_id,
             a.bet_type,
             a.max_wager,
             a.recorded_at,
             (SELECT MAX(b.max_wager) FROM partner_account_limits b
              WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
                AND b.sport_id = a.sport_id AND b.market_id = a.market_id
                AND b.bet_type = a.bet_type AND b.id < a.id) AS previous_max
      FROM partner_account_limits a
      WHERE a.node_id = ?
        AND lower(a.sportsbook) = lower(?)
      ORDER BY a.recorded_at DESC, a.id DESC
      LIMIT 1
    `
      )
      .get(nodeId, book) as {
      limit_id: number; // brand-ok — partner_account_limits.id
      sportsbook: string;
      sport_id: string; // brand-ok
      market_id: string; // brand-ok
      bet_type: string;
      max_wager: number;
      recorded_at: number;
      previous_max: number | null;
    } | null;
    if (!row) return null;
    return {
      limit_id: row.limit_id,
      sportsbook: row.sportsbook,
      sport_id: row.sport_id,
      market_id: row.market_id,
      bet_type: row.bet_type,
      max_wager: row.max_wager,
      recorded_at: row.recorded_at,
      previous_max: row.previous_max ?? null,
    };
  }

  /**
   * One latest-limit row per sportsbook for a node (most recent recorded_at wins).
   * Used by seat capital desk to compare negotiated maxBet vs detected book max.
   */
  latestLimitsPerSportsbook(nodeId: string /* brand-ok — TreeNodeId wire */): LatestBookLimit[] {
    const rows = this.db
      .query(
        `
      SELECT a.id AS limit_id,
             a.sportsbook,
             a.sport_id,
             a.market_id,
             a.bet_type,
             a.max_wager,
             a.recorded_at,
             (SELECT MAX(b.max_wager) FROM partner_account_limits b
              WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
                AND b.sport_id = a.sport_id AND b.market_id = a.market_id
                AND b.bet_type = a.bet_type AND b.id < a.id) AS previous_max
      FROM partner_account_limits a
      WHERE a.node_id = ?
      ORDER BY a.recorded_at DESC, a.id DESC
    `
      )
      .all(nodeId) as Array<{
      limit_id: number; // brand-ok — partner_account_limits.id
      sportsbook: string;
      sport_id: string; // brand-ok
      market_id: string; // brand-ok
      bet_type: string;
      max_wager: number;
      recorded_at: number;
      previous_max: number | null;
    }>;
    const seen = new Set<string>();
    const out: LatestBookLimit[] = [];
    for (const row of rows) {
      const key = row.sportsbook.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        limit_id: row.limit_id,
        sportsbook: row.sportsbook,
        sport_id: row.sport_id,
        market_id: row.market_id,
        bet_type: row.bet_type,
        max_wager: row.max_wager,
        recorded_at: row.recorded_at,
        previous_max: row.previous_max ?? null,
      });
    }
    return out;
  }
}

// ── Demo seed ─────────────────────────────────────────────────────────────

/**
 * Seed partner-42 style demo: DK totals raise $500→$1500, CLV movers, 5m line steam.
 * No-op when limit rows already exist for the node (unless force).
 */
export function seedAccountLimitsDemo(
  db: Database,
  opts?: { nodeId?: string /* brand-ok — TreeNodeId wire */; force?: boolean; nowSec?: number }
): { seeded: boolean; nodeId: string /* brand-ok — TreeNodeId wire */ } {
  const nodeId = opts?.nodeId ?? 'partner-42';
  const now = opts?.nowSec ?? Math.floor(Date.now() / 1000);
  ensureAccountLimitsSchema(db);

  const existing = db
    .query(`SELECT COUNT(*) AS n FROM partner_account_limits WHERE node_id = ?`)
    .get(nodeId) as { n: number };
  if (existing.n > 0 && !opts?.force) {
    return { seeded: false, nodeId };
  }

  if (opts?.force) {
    db.run(
      `DELETE FROM limit_raise_context WHERE node_id = ? OR limit_record_id IN (
         SELECT id FROM partner_account_limits WHERE node_id = ?
       )`,
      [nodeId, nodeId]
    );
    db.run(`DELETE FROM market_line_movement WHERE node_id = ?`, [nodeId]);
    db.run(
      `DELETE FROM player_clv_snapshots WHERE node_id = ? OR player_id IN (SELECT id FROM partner_players WHERE node_id = ?)`,
      [nodeId, nodeId]
    );
    db.run(`DELETE FROM partner_players WHERE node_id = ?`, [nodeId]);
    db.run(`DELETE FROM partner_account_limits WHERE node_id = ?`, [nodeId]);
    db.run(`DELETE FROM account_alerts WHERE node_id = ?`, [nodeId]);
  }

  const t0 = now - 7200;
  const tRaise = now - 1800;

  db.run(
    `INSERT INTO partner_account_limits
      (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
     VALUES (?, 'draftkings', 'nba', 'totals', 'straight', 500, ?, ?)`,
    [nodeId, t0, t0]
  );
  db.run(
    `INSERT INTO partner_account_limits
      (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
     VALUES (?, 'draftkings', 'nba', 'totals', 'straight', 1500, ?, ?)`,
    [nodeId, tRaise, tRaise]
  );
  db.run(
    `INSERT INTO partner_account_limits
      (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
     VALUES (?, 'fanduel', 'nba', 'spread', 'straight', 1000, ?, ?)`,
    [nodeId, tRaise, tRaise]
  );

  db.run(
    `INSERT INTO partner_players (node_id, player_name, tier) VALUES (?, 'Jayson Tatum', 'platinum')`,
    [nodeId]
  );
  db.run(
    `INSERT INTO partner_players (node_id, player_name, tier) VALUES (?, 'Jaylen Brown', 'gold')`,
    [nodeId]
  );
  db.run(
    `INSERT INTO partner_players (node_id, player_name, tier) VALUES (?, 'Derrick White', 'silver')`,
    [nodeId]
  );

  const players = db
    .query(`SELECT id, tier FROM partner_players WHERE node_id = ?`)
    .all(nodeId) as Array<{ id: number; tier: string }>;

  for (const p of players) {
    const preEv = p.tier === 'platinum' ? 120 : p.tier === 'gold' ? 80 : 40;
    const postEv = p.tier === 'platinum' ? 210 : p.tier === 'gold' ? 145 : 42;
    db.run(
      `INSERT INTO player_clv_snapshots (player_id, node_id, expected_value, recorded_at) VALUES (?, ?, ?, ?)`,
      [p.id, nodeId, preEv, tRaise - 600]
    );
    db.run(
      `INSERT INTO player_clv_snapshots (player_id, node_id, expected_value, recorded_at) VALUES (?, ?, ?, ?)`,
      [p.id, nodeId, postEv, tRaise + 120]
    );
  }

  for (let i = 0; i < 5; i++) {
    db.run(
      `INSERT INTO market_line_movement
        (node_id, sportsbook, sport_id, market_id, bet_type, move_delta, recorded_at)
       VALUES (?, 'draftkings', 'nba', 'totals', 'straight', ?, ?)`,
      [nodeId, 0.5 + i * 0.25, tRaise + 30 + i * 45]
    );
  }

  db.run(
    `INSERT INTO account_alerts (node_id, alert_type, message, created_at)
     VALUES (?, 'limit_increase', 'draftkings nba/totals straight: $500 → $1500', ?)`,
    [nodeId, tRaise]
  );

  // Multi-factor context for the raised DK row
  const raiseRow = db
    .query(
      `SELECT id FROM partner_account_limits
       WHERE node_id = ? AND sportsbook = 'draftkings' AND sport_id = 'nba'
         AND market_id = 'totals' AND bet_type = 'straight'
       ORDER BY id DESC LIMIT 1`
    )
    .get(nodeId) as { id: number } | null;
  if (raiseRow) {
    // Lazy import avoided — insert directly so seed stays self-contained
    db.run(
      `INSERT INTO limit_raise_context (
         node_id, limit_record_id, active_players_7d, new_players_7d, total_handle_7d,
         avg_clv_7d, top_tier_player_count, violation_count_30d, chargeback_count_30d,
         kyc_pass_rate, market_volatility_index, peak_betting_hours, sportsbook_share,
         partner_profit_30d, partner_roi_30d, snapshot_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nodeId,
        raiseRow.id,
        42,
        8,
        380_000, // high handle → top multi-factor driver
        120,
        8,
        0,
        0,
        0.97,
        0.85,
        JSON.stringify([18, 19, 20, 21]),
        0.55,
        80_000,
        0.18,
        tRaise,
      ]
    );
  }

  return { seeded: true, nodeId };
}

// ── Full pipeline: record → alert → outbox ──────────────────────────

/**
 * Full limit pipeline: record, detect raise, create local alert, and enqueue
 * to ops_channel_outbox for Telegram/r2 delivery.  No-op when no raise.
 *
 * Returns the raise when detected, or null.
 */
export function enqueueLimitRaiseForPartner(
  db: Database,
  limit: LimitRecord,
  opts?: { telegramId?: string; enqueueOpsChannelEvent?: Function } // brand-ok — TelegramId wire
): LimitRaise | null {
  const repo = new AccountLimitsRepository(db);
  const raise = repo.recordLimitWithAlert(limit);
  if (raise && opts?.enqueueOpsChannelEvent) {
    opts.enqueueOpsChannelEvent(db, {
      treeNodeId: limit.node_id,
      sportsbook: limit.sportsbook,
      sportId: limit.sport_id,
      marketId: limit.market_id,
      betType: limit.bet_type,
      previousMax: raise.previous_max,
      newLimit: raise.new_limit,
      telegramId: opts.telegramId,
    });
  }
  return raise;
}

/** Query recent limit increases for ops summary (across all nodes). */
export function queryRecentLimitChanges(
  db: Database,
  hours = 48
): Array<{
  limit_id: number; // brand-ok — partner_account_limits.id
  node_id: string; // brand-ok — TreeNodeId wire
  sportsbook: string;
  sport_id: string; // brand-ok — SportId wire
  market_id: string; // brand-ok — MarketId wire
  bet_type: string;
  previous_max: number;
  new_limit: number;
  increased_at: number;
  direction: 'up' | 'down';
  message: string;
}> {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const rows = db
    .query(
      `
    SELECT a.id AS limit_id, a.node_id, a.sportsbook, a.sport_id, a.market_id, a.bet_type,
           (SELECT MAX(b.max_wager) FROM partner_account_limits b
            WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
              AND b.sport_id = a.sport_id AND b.market_id = a.market_id
              AND b.bet_type = a.bet_type AND b.id < a.id) as previous_max,
           a.max_wager as new_limit,
           a.recorded_at as increased_at,
           CASE WHEN a.max_wager > (SELECT MAX(b.max_wager) FROM partner_account_limits b
                WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
                  AND b.sport_id = a.sport_id AND b.market_id = a.market_id
                  AND b.bet_type = a.bet_type AND b.id < a.id) THEN 'up' ELSE 'down' END as direction
    FROM partner_account_limits a
    WHERE a.recorded_at > ?
      AND EXISTS (
        SELECT 1 FROM partner_account_limits b
        WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
          AND b.sport_id = a.sport_id AND b.market_id = a.market_id
          AND b.bet_type = a.bet_type AND b.id < a.id
      )
      AND a.max_wager != (
        SELECT MAX(b.max_wager) FROM partner_account_limits b
        WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
          AND b.sport_id = a.sport_id AND b.market_id = a.market_id
          AND b.bet_type = a.bet_type AND b.id < a.id
      )
    ORDER BY a.recorded_at DESC
    LIMIT 40
  `
    )
    .all(since) as Array<{
    limit_id: number; // brand-ok — partner_account_limits.id
    node_id: string; // brand-ok — TreeNodeId wire
    sportsbook: string;
    sport_id: string; // brand-ok — SportId wire
    market_id: string; // brand-ok — MarketId wire
    bet_type: string;
    previous_max: number;
    new_limit: number;
    increased_at: number;
  }>;
  return rows.map(r => ({
    ...r,
    message: `${r.sportsbook} ${r.sport_id}/${r.market_id} ${r.bet_type}: $${r.previous_max} → $${r.new_limit}`,
  }));
}

// ── Deep alert pipeline: detect + multi-factor + channel publish ────

/**
 * Detect raises and decreases, compute multi-factor context, and return
 * enhanced alerts ready for outbox/channel publishing.
 *
 * Returns { raises, decreases } with score from analytics when available.
 * Caller is responsible for outbox enqueue / channel publish.
 */
export function collectDeepLimitAlerts(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId wire
  sinceTimestamp: number = Math.floor(Date.now() / 1000) - 48 * 3600
): {
  raises: Array<LimitRaise & { direction: 'up'; score?: number }>;
  decreases: Array<LimitRaise & { direction: 'down'; score?: number }>;
} {
  const repo = new AccountLimitsRepository(db);
  const raises = repo
    .detectRaises(nodeId, sinceTimestamp)
    .map(r => ({ ...r, direction: 'up' as const }));
  const decreases = repo
    .detectDecreases(nodeId, sinceTimestamp)
    .map(r => ({ ...r, direction: 'down' as const }));

  // Attempt multi-factor enrichment when analytics module available
  try {
    const { PartnerAnalyticsRepository } =
      require('./partner-analytics-repo.ts') as typeof import('./partner-analytics-repo.ts');
    const analytics = new PartnerAnalyticsRepository(db, nodeId);
    for (const r of raises) {
      try {
        const enriched = analytics.getEnrichedRaisesWithContext(sinceTimestamp);
        const match = enriched.find(
          e => e.sportsbook === r.sportsbook && e.sport_id === r.sport_id
        );
        if (match && match.multi_factor_score != null) {
          (r as any).score = match.multi_factor_score;
          (r as any).top_factors = match.top_contributing_factors;
        }
      } catch {}
    }
  } catch {}

  return { raises, decreases };
}

/** Publish a limit alert to the MemoryChannelStore for SSE delivery. */
export function publishLimitAlertToChannel(
  db: Database,
  alert: LimitRaise & { node_id: string; direction?: string; score?: number } // brand-ok — TreeNodeId wire
): void {
  try {
    const { ChannelMessage, publishEvent } =
      require('./channels/channels.ts') as typeof import('./channels/channels.ts');
    const { localOpsChannelStore } =
      require('./channels/outbox.ts') as typeof import('./channels/outbox.ts');
    if (localOpsChannelStore) {
      publishEvent(localOpsChannelStore, 'alerts', {
        kind: alert.direction === 'down' ? 'limit_decrease' : 'limit_raise',
        node_id: alert.node_id,
        sportsbook: alert.sportsbook,
        sport_id: alert.sport_id,
        market_id: alert.market_id,
        bet_type: alert.bet_type,
        previous_max: alert.previous_max,
        new_limit: alert.new_limit,
        score: alert.score,
        ts: Date.now(),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Enhanced table formatter for limit changes (raises + decreases).
 * Safe defaults, locale-aware numbers, direction icons, score bars.
 */
export function formatLimitChangeTable(
  changes: Array<
    LimitRaise & {
      direction?: 'up' | 'down';
      score?: number;
      top_factors?: string[];
      multi_factor_score?: number;
      top_contributing_factors?: string[];
    }
  >
): string {
  if (!changes || changes.length === 0) return '  No limit changes found.';

  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - stringWidth(String(s))));
  const headers = ['Dir', 'Book', 'Sport', 'Market', 'Type', 'Old', 'New', '±$', 'Score', 'When'];
  const rows = changes.map(r => {
    const dir = r.direction === 'down' ? '⬇' : '🚀';
    const oldVal = r.previous_max != null ? `$${Number(r.previous_max).toLocaleString()}` : '—';
    const newVal = r.new_limit != null ? `$${Number(r.new_limit).toLocaleString()}` : '—';
    const delta =
      r.previous_max != null && r.new_limit != null
        ? `${r.new_limit >= r.previous_max ? '+' : ''}$${(r.new_limit - r.previous_max).toLocaleString()}`
        : '—';
    const score = r.multi_factor_score ?? r.score;
    const scoreStr = score != null ? `${(score * 100).toFixed(0)}%` : '···';
    const when =
      r.increased_at != null ? new Date(r.increased_at * 1000).toLocaleDateString() : '—';
    return [
      dir,
      r.sportsbook ?? '—',
      r.sport_id ?? '—',
      r.market_id ?? '—',
      r.bet_type ?? '—',
      oldVal,
      newVal,
      delta,
      scoreStr,
      when,
    ];
  });

  const widths = headers.map((h, i) =>
    Math.max(stringWidth(h), ...rows.map(r => stringWidth(r[i] ?? '')))
  );
  const border = (l: string, j: string, r: string) =>
    l + widths.map(w => '─'.repeat(w + 2)).join(j) + r;
  const line = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c, widths[i]!)).join(' │ ') + ' │';

  return [
    border('┌', '┬', '┐'),
    line(headers),
    border('├', '┼', '┤'),
    ...rows.map(r => line(r)),
    border('└', '┴', '┘'),
  ].join('\n');
}

/** Summary footer: totals, net change, direction breakout. */
export function formatChangeSummary(
  changes: Array<LimitRaise & { direction?: 'up' | 'down' }>
): string {
  if (!changes || changes.length === 0) return '';
  const total = changes.length;
  const raises = changes.filter(r => r.direction !== 'down').length;
  const downs = changes.filter(r => r.direction === 'down').length;
  const netDelta = changes.reduce((s, r) => {
    if (r.previous_max != null && r.new_limit != null) {
      return s + (r.new_limit - r.previous_max);
    }
    return s;
  }, 0);
  const hasScore = changes.some(
    r => (r as any).multi_factor_score != null || (r as any).score != null
  );
  const avgScore = hasScore
    ? changes.reduce((s, r) => s + ((r as any).multi_factor_score ?? (r as any).score ?? 0), 0) /
      total
    : null;
  const parts = [
    `Total: ${total}`,
    `🚀 ${raises}`,
    downs > 0 ? `⬇️ ${downs}` : null,
    netDelta !== 0 ? `Net: ${netDelta >= 0 ? '+' : ''}$${netDelta.toLocaleString()}` : null,
    avgScore != null ? `Avg score: ${(avgScore * 100).toFixed(0)}%` : null,
  ].filter(Boolean);
  return `  ${parts.join('  ·  ')}`;
}

/**
 * Legacy alias. Renders limit raises as a formatted table.
 * Uses Bun.stringWidth for accurate column widths.
 */
export function formatLimitRaisesTable(raises: LimitRaise[]): string {
  if (!raises || raises.length === 0) return '  No limit raises found.';
  return formatLimitChangeTable(raises.map(r => ({ ...r, direction: 'up' as const })));
}

/**
 * Rich human-readable lines for enriched limit changes with multi-factor.
 * Shows CLV movers, line movement, multi-factor score + top factors,
 * direction icons, and driver details.
 */
export function formatEnrichedLimitChanges(
  changes: Array<
    EnrichedLimitRaise & {
      direction?: 'up' | 'down';
      multi_factor_score?: number;
      top_contributing_factors?: string[];
      factor_scores?: Record<string, number>;
      context_available?: boolean;
      context_proof?: { valid?: boolean; signed?: boolean } | null;
    }
  >
): string {
  if (!changes || changes.length === 0) return '  No limit changes found.';
  const out: string[] = [];

  for (const r of changes) {
    const dir = r.direction === 'down' ? '⬇️' : '🚀';
    const oldVal = r.previous_max != null ? `$${Number(r.previous_max).toLocaleString()}` : '—';
    const newVal = r.new_limit != null ? `$${Number(r.new_limit).toLocaleString()}` : '—';
    const delta =
      r.previous_max != null && r.new_limit != null
        ? `${r.new_limit >= r.previous_max ? '+' : ''}$${(r.new_limit - r.previous_max).toLocaleString()}`
        : '—';
    const pct =
      r.previous_max != null && r.previous_max > 0 && r.new_limit != null
        ? ` (${(((r.new_limit - r.previous_max) / r.previous_max) * 100).toFixed(1)}%)`
        : '';

    // Header line
    out.push(
      `${dir} ${r.sportsbook ?? '—'} ${r.sport_id ?? '—'}/${r.market_id ?? '—'} ` +
        `${r.bet_type ?? '—'}: ${oldVal} → ${newVal} ${delta}${pct}`
    );

    // Line move + CLV
    const lineMove =
      r.line_move_5m != null && Number.isFinite(r.line_move_5m)
        ? `📈 5m line ${r.line_move_5m >= 0 ? '+' : ''}${r.line_move_5m.toFixed(3)}`
        : '📈 5m line N/A';
    const clvMovers =
      r.top_clv && r.top_clv.length > 0
        ? `🎯 CLV: ${r.top_clv.map(p => `${p.player_name}(+$${Number(p.delta).toFixed(0)})`).join(', ')}`
        : '🎯 CLV: —';
    out.push(`   ${lineMove}  |  ${clvMovers}`);

    // Multi-factor score with bar visualization
    const score = r.multi_factor_score;
    if (score != null && Number.isFinite(score)) {
      const barLen = Math.round(score * 20);
      const bar = '█'.repeat(Math.max(1, barLen)) + '░'.repeat(Math.max(0, 20 - barLen));
      const pctDisplay = (score * 100).toFixed(0);
      const drivers = (r.top_contributing_factors ?? []).slice(0, 5).join(', ');
      const proof = r.context_proof?.valid
        ? '🔏 verified'
        : r.context_proof?.signed
          ? '🔏 signed'
          : '🔓 pending';
      out.push(`   🧮 Score: ${bar} ${pctDisplay}%  |  Drivers: ${drivers || '—'}  |  ${proof}`);
    }

    // Factor breakdown when available
    if (r.factor_scores && Object.keys(r.factor_scores).length > 0) {
      const topFactors = Object.entries(r.factor_scores)
        .filter(([, v]) => v > 0.01)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topFactors.length > 0) {
        out.push(
          `   📊 Factors: ${topFactors.map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`).join(', ')}`
        );
      }
    }

    out.push(''); // blank line between entries
  }

  return out.join('\n').trimEnd();
}

/** Human lines matching the bun -e demo (raise + line 5m + top CLV). */
export function formatEnrichedLimitRaises(
  raises: Array<
    EnrichedLimitRaise & {
      multi_factor_score?: number;
      top_contributing_factors?: string[];
    }
  >
): string {
  if (!raises || raises.length === 0) return '  No limit raises found.';
  return formatEnrichedLimitChanges(raises.map(r => ({ ...r, direction: 'up' as const })));
}

/**
 * Format limit changes as a compact one-liner per entry.
 * Good for Telegram / Slack messages where tables don't render.
 */
export function formatLimitChangeCompact(
  changes: Array<LimitRaise & { direction?: 'up' | 'down'; score?: number }>
): string {
  if (!changes || changes.length === 0) return 'No changes.';
  return changes
    .map(r => {
      const dir = r.direction === 'down' ? '⬇️' : '🚀';
      const oldVal = r.previous_max != null ? `$${r.previous_max}` : '—';
      const newVal = r.new_limit != null ? `$${r.new_limit}` : '—';
      const score = r.score != null ? ` [${(r.score * 100).toFixed(0)}%]` : '';
      return `${dir} ${r.sportsbook} ${r.sport_id}/${r.market_id}: ${oldVal}→${newVal}${score}`;
    })
    .join('\n');
}

// Preferred modern aliases (keep original exports stable for callers).
export const fetchLimitChanges = queryRecentLimitChanges;
export const recordAndNotifyPartner = enqueueLimitRaiseForPartner;
export const seedDemoLimits = seedAccountLimitsDemo;
export const broadcastLimitEvent = publishLimitAlertToChannel;
export const collectLimitAlerts = collectDeepLimitAlerts;
