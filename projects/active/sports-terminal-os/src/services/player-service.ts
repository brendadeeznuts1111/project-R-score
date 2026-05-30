/**
 * Player 360 Service — Player Domain (Desert Rose: #d4a5a5)
 *
 * Provides comprehensive player profile management, search, performance
 * analytics, transaction tracking, flag management, staff notes, and
 * account link detection for the Player 360 system.
 *
 * Tables: customers, player_notes, player_transactions, player_flags, player_links
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { createLogger } from "@utils/logger";
import {
  logPlayerNote,
  logTransaction,
  logPlayerFlag,
} from "@utils/tableLogger";
import type {
  RiskTier,
  CustomerArchetype,
  PaginatedResponse,
} from "@utils/types";

const logger = createLogger("PlayerService");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Player {
  id: number;
  customerId: string;
  playerId: string | null;
  agentLogin: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  balance: number;
  lifetimeDeposit: number;
  lifetimeWithdrawal: number;
  lifetimePnl: number;
  riskTier: RiskTier;
  riskScore: number;
  archetype: CustomerArchetype | null;
  archetypeConfidence: number | null;
  kycStatus: string;
  status: string;
  wagerCount: number;
  winRate: number | null;
  avgStake: number | null;
  lastWagerAt: number | null;
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerSearchFilters {
  q?: string;
  sport?: string;
  riskTier?: RiskTier;
  archetype?: CustomerArchetype;
  minBalance?: number;
  maxBalance?: number;
  agentLogin?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: "name" | "balance" | "winRate" | "wagerCount" | "createdAt";
  order?: "asc" | "desc";
}

export interface PlayerPerformance {
  playerId: string;
  winRate: number;
  totalWagers: number;
  totalStaked: number;
  totalWon: number;
  totalLost: number;
  netPnl: number;
  avgWagerSize: number;
  avgOdds: number | null;
  biggestWin: number;
  biggestLoss: number;
  sportBreakdown: Record<string, { wagers: number; wagered: number; pnl: number; winRate: number }>;
  marketBreakdown: Record<string, { wagers: number; wagered: number; pnl: number; winRate: number }>;
  daily: Array<{ date: string; wagers: number; wagered: number; pnl: number; winRate: number }>;
}

export interface PlayerNote {
  id: number;
  playerId: string;
  agentLogin: string;
  noteType: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerFlag {
  id: number;
  playerId: string;
  flagType: string;
  flagSubtype: string | null;
  severity: string;
  title: string;
  description: string | null;
  source: string | null;
  sourceRuleId: string | null;
  isActive: boolean;
  clearedBy: string | null;
  clearedAt: number | null;
  clearReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerTransaction {
  id: number;
  transactionId: string;
  playerId: string;
  agentLogin: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  metadataJson: string | null;
  processedAt: number | null;
  processedBy: string | null;
  createdAt: number;
}

export interface PlayerLink {
  id: number;
  playerId: string;
  linkType: string;
  linkValue: string;
  confidence: number;
  firstSeen: number;
  lastSeen: number;
  occurrenceCount: number;
}

export interface PlayerWager {
  id: number;
  wagerNumber: string;
  playerId: string;
  sport: string;
  eventName: string | null;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  potentialPayout: number | null;
  actualPayout: number | null;
  status: string;
  result: string | null;
  placedAt: number;
  settledAt: number | null;
}

export interface RiskProfile {
  playerId: string;
  riskTier: RiskTier;
  riskScore: number;
  flags: PlayerFlag[];
  violations: Array<{
    id: string;
    violationType: string;
    severity: string;
    description: string;
    createdAt: number;
  }>;
  tierHistory: Array<{
    date: string;
    tier: RiskTier;
    score: number;
  }>;
}

export interface AddNoteInput {
  content: string;
  noteType?: string;
  isPinned?: boolean;
}

export interface AddFlagInput {
  flagType: string;
  severity: string;
  title: string;
  description?: string;
  flagSubtype?: string;
  source?: string;
  sourceRuleId?: string;
}

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

let _db: Database | null = null;

function getDb(): Database {
  if (!_db) {
    const dbPath = process.env.DB_PATH || "/data/terminal.db";
    _db = new Database(dbPath, { create: true });
    _db.exec("PRAGMA foreign_keys = ON;");
    _db.exec("PRAGMA journal_mode = WAL;");
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Player: get / search
// ---------------------------------------------------------------------------

/**
 * Get a full player profile by customer ID.
 */
export function getPlayer(playerId: string): Player | null {
  try {
    const db = getDb();
    const row = db
      .query(
        `SELECT id, customer_id, player_id, agent_login, display_name, email, phone,
                balance, lifetime_deposit, lifetime_withdrawal, lifetime_pnl,
                risk_tier, risk_score, archetype, archetype_confidence,
                kyc_status, status, wager_count, win_rate, avg_stake,
                last_wager_at, last_login_at, created_at, updated_at
         FROM customers WHERE customer_id = ?`
      )
      .get(playerId) as Record<string, unknown> | undefined;

    if (!row) return null;
    return rowToPlayer(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] getPlayer failed for ${playerId}: ${msg}`);
    throw err;
  }
}

/**
 * Full-text search players with filters.
 */
export function searchPlayers(
  filters: PlayerSearchFilters
): PaginatedResponse<Player> {
  try {
    const db = getDb();
    const limit = Math.min(filters.limit ?? 25, 200);
    const offset = ((filters.page ?? 1) - 1) * limit;
    const orderCol = sortColumn(filters.sort ?? "name");
    const orderDir = filters.order === "desc" ? "DESC" : "ASC";

    const conditions: string[] = ["1=1"];
    const params: SQLQueryBindings[] = [];

    if (filters.q) {
      conditions.push(
        "(display_name LIKE ? OR email LIKE ? OR phone LIKE ? OR customer_id LIKE ?)"
      );
      const like = `%${filters.q}%`;
      params.push(like, like, like, like);
    }

    if (filters.sport) {
      // Sport filter uses raw_players join via player_id
      conditions.push(
        "customer_id IN (SELECT player_id FROM raw_wagers WHERE sport = ? GROUP BY player_id)"
      );
      params.push(filters.sport);
    }

    if (filters.riskTier) {
      conditions.push("risk_tier = ?");
      params.push(filters.riskTier);
    }

    if (filters.archetype) {
      conditions.push("archetype = ?");
      params.push(filters.archetype);
    }

    if (filters.minBalance !== undefined) {
      conditions.push("balance >= ?");
      params.push(filters.minBalance);
    }

    if (filters.maxBalance !== undefined) {
      conditions.push("balance <= ?");
      params.push(filters.maxBalance);
    }

    if (filters.agentLogin) {
      conditions.push("agent_login = ?");
      params.push(filters.agentLogin);
    }

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const where = conditions.join(" AND ");

    const countRow = db
      .query(`SELECT COUNT(*) as total FROM customers WHERE ${where}`)
      .get(...params) as { total: number } | undefined;

    const total = countRow?.total ?? 0;

    const rows = db
      .query(
        `SELECT id, customer_id, player_id, agent_login, display_name, email, phone,
                balance, lifetime_deposit, lifetime_withdrawal, lifetime_pnl,
                risk_tier, risk_score, archetype, archetype_confidence,
                kyc_status, status, wager_count, win_rate, avg_stake,
                last_wager_at, last_login_at, created_at, updated_at
         FROM customers WHERE ${where}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Record<string, unknown>[];

    return {
      items: rows.map(rowToPlayer),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] searchPlayers failed: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

/**
 * Get player performance metrics from wager history.
 */
export function getPlayerPerformance(playerId: string): PlayerPerformance | null {
  try {
    const db = getDb();

    // Verify player exists
    const playerExists = db
      .query("SELECT 1 FROM customers WHERE customer_id = ?")
      .get(playerId);
    if (!playerExists) return null;

    // Aggregate stats from wagers table
    const stats = db
      .query(
        `SELECT
          COUNT(*) as total_wagers,
          SUM(stake) as total_staked,
          SUM(CASE WHEN result = 'win' THEN actual_payout ELSE 0 END) as total_won,
          SUM(CASE WHEN result = 'loss' THEN stake ELSE 0 END) as total_lost,
          SUM(CASE WHEN result = 'win' THEN actual_payout - stake ELSE -stake END) as net_pnl,
          AVG(stake) as avg_wager_size,
          AVG(odds) as avg_odds,
          MAX(CASE WHEN result = 'win' THEN actual_payout - stake ELSE 0 END) as biggest_win,
          MAX(CASE WHEN result = 'loss' THEN -stake ELSE 0 END) as biggest_loss,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as win_count,
          SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as loss_count
        FROM wagers WHERE player_id = ?`
      )
      .get(playerId) as Record<string, number | null> | undefined;

    const totalWagers = Number(stats?.total_wagers ?? 0);
    const winCount = Number(stats?.win_count ?? 0);
    const lossCount = Number(stats?.loss_count ?? 0);
    const winRate = totalWagers > 0 ? winCount / totalWagers : 0;

    // Sport breakdown
    const sportRows = db
      .query(
        `SELECT
          sport,
          COUNT(*) as wagers,
          SUM(stake) as wagered,
          SUM(CASE WHEN result = 'win' THEN actual_payout - stake ELSE -stake END) as pnl,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          COUNT(*) as total
        FROM wagers WHERE player_id = ? AND sport IS NOT NULL
        GROUP BY sport`
      )
      .all(playerId) as Array<{
        sport: string;
      wagers: number;
      wagered: number;
      pnl: number;
      wins: number;
      total: number;
    }>;

    const sportBreakdown: PlayerPerformance["sportBreakdown"] = {};
    for (const row of sportRows) {
      sportBreakdown[row.sport] = {
        wagers: Number(row.wagers),
        wagered: Number(row.wagered),
        pnl: Number(row.pnl),
        winRate: row.total > 0 ? Number(row.wins) / Number(row.total) : 0,
      };
    }

    // Market breakdown
    const marketRows = db
      .query(
        `SELECT
          market,
          COUNT(*) as wagers,
          SUM(stake) as wagered,
          SUM(CASE WHEN result = 'win' THEN actual_payout - stake ELSE -stake END) as pnl,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          COUNT(*) as total
        FROM wagers WHERE player_id = ? AND market IS NOT NULL
        GROUP BY market`
      )
      .all(playerId) as Array<{
        market: string;
      wagers: number;
      wagered: number;
      pnl: number;
      wins: number;
      total: number;
    }>;

    const marketBreakdown: PlayerPerformance["marketBreakdown"] = {};
    for (const row of marketRows) {
      marketBreakdown[row.market] = {
        wagers: Number(row.wagers),
        wagered: Number(row.wagered),
        pnl: Number(row.pnl),
        winRate: row.total > 0 ? Number(row.wins) / Number(row.total) : 0,
      };
    }

    // Daily breakdown (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
    const dailyRows = db
      .query(
        `SELECT
          date(placed_at, 'unixepoch', 'localtime') as date,
          COUNT(*) as wagers,
          SUM(stake) as wagered,
          SUM(CASE WHEN result = 'win' THEN actual_payout - stake ELSE -stake END) as pnl,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          COUNT(*) as total
        FROM wagers WHERE player_id = ? AND placed_at >= ?
        GROUP BY date(placed_at, 'unixepoch', 'localtime')
        ORDER BY date DESC`
      )
      .all(playerId, thirtyDaysAgo) as Array<{
        date: string;
      wagers: number;
      wagered: number;
      pnl: number;
      wins: number;
      total: number;
    }>;

    const daily = dailyRows.map((row) => ({
      date: row.date,
      wagers: Number(row.wagers),
      wagered: Number(row.wagered),
      pnl: Number(row.pnl),
      winRate: row.total > 0 ? Number(row.wins) / Number(row.total) : 0,
    }));

    return {
      playerId,
      winRate,
      totalWagers,
      totalStaked: Number(stats?.total_staked ?? 0),
      totalWon: Number(stats?.total_won ?? 0),
      totalLost: Number(stats?.total_lost ?? 0),
      netPnl: Number(stats?.net_pnl ?? 0),
      avgWagerSize: Number(stats?.avg_wager_size ?? 0),
      avgOdds: stats?.avg_odds ?? null,
      biggestWin: Number(stats?.biggest_win ?? 0),
      biggestLoss: Number(stats?.biggest_loss ?? 0),
      sportBreakdown,
      marketBreakdown,
      daily,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] getPlayerPerformance failed for ${playerId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * Get player transaction history.
 */
export function getPlayerTransactions(
  playerId: string,
  limit: number = 50,
  offset: number = 0
): PaginatedResponse<PlayerTransaction> {
  try {
    const db = getDb();

    const countRow = db
      .query("SELECT COUNT(*) as total FROM player_transactions WHERE player_id = ?")
      .get(playerId) as { total: number } | undefined;

    const total = countRow?.total ?? 0;

    const rows = db
      .query(
        `SELECT id, transaction_id, player_id, agent_login, transaction_type,
                amount, currency, status, method, reference, notes, metadata_json,
                processed_at, processed_by, created_at
         FROM player_transactions
         WHERE player_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(playerId, limit, offset) as Record<string, unknown>[];

    return {
      items: rows.map(rowToTransaction),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[Transaction] getPlayerTransactions failed for ${playerId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Wagers
// ---------------------------------------------------------------------------

/**
 * Get player wager history.
 */
export function getPlayerWagers(
  playerId: string,
  limit: number = 50,
  offset: number = 0
): PaginatedResponse<PlayerWager> {
  try {
    const db = getDb();

    const countRow = db
      .query("SELECT COUNT(*) as total FROM wagers WHERE player_id = ?")
      .get(playerId) as { total: number } | undefined;

    const total = countRow?.total ?? 0;

    const rows = db
      .query(
        `SELECT id, wager_number, player_id, sport, event_name, market,
                selection, odds, stake, potential_payout, actual_payout,
                status, result, placed_at, settled_at
         FROM wagers
         WHERE player_id = ?
         ORDER BY placed_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(playerId, limit, offset) as Record<string, unknown>[];

    return {
      items: rows.map(rowToWager),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] getPlayerWagers failed for ${playerId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Risk Profile
// ---------------------------------------------------------------------------

/**
 * Get player risk profile: tier, flags, violations.
 */
export function getPlayerRiskProfile(playerId: string): RiskProfile | null {
  try {
    const db = getDb();

    const player = getPlayer(playerId);
    if (!player) return null;

    const flags = getPlayerFlags(playerId);

    const violationRows = db
      .query(
        `SELECT violation_id, violation_type, severity, description, created_at
         FROM wager_violations
         WHERE player_id = ?
         ORDER BY created_at DESC
         LIMIT 20`
      )
      .all(playerId) as Array<{
        violation_id: string;
        violation_type: string;
        severity: string;
        description: string;
        created_at: number;
      }>;

    const violations = violationRows.map((row) => ({
      id: row.violation_id,
      violationType: row.violation_type,
      severity: row.severity,
      description: row.description,
      createdAt: row.created_at,
    }));

    // Tier history from risk_analytics_snapshots
    const tierRows = db
      .query(
        `SELECT DISTINCT
          date(created_at, 'unixepoch', 'localtime') as date,
          risk_tier as tier,
          avg_risk_score as score
         FROM risk_analytics_snapshots
         WHERE entity_type = 'player' AND entity_id = ?
         ORDER BY date DESC
         LIMIT 30`
      )
      .all(playerId) as Array<{
        date: string;
        tier: RiskTier;
        score: number;
      }>;

    return {
      playerId,
      riskTier: player.riskTier,
      riskScore: player.riskScore,
      flags,
      violations,
      tierHistory: tierRows,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerFlag] getPlayerRiskProfile failed for ${playerId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * Get all active notes for a player.
 */
export function getPlayerNotes(playerId: string): PlayerNote[] {
  try {
    const db = getDb();
    const rows = db
      .query(
        `SELECT id, player_id, agent_login, note_type, content, is_pinned,
                is_active, created_at, updated_at
         FROM player_notes
         WHERE player_id = ? AND is_active = 1
         ORDER BY is_pinned DESC, created_at DESC`
      )
      .all(playerId) as Record<string, unknown>[];

    return rows.map(rowToNote);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] getPlayerNotes failed for ${playerId}: ${msg}`);
    throw err;
  }
}

/**
 * Add a note to a player's profile.
 */
export function addPlayerNote(
  playerId: string,
  input: AddNoteInput,
  agentLogin: string
): PlayerNote {
  try {
    const db = getDb();
    const result = db
      .query(
        `INSERT INTO player_notes (player_id, agent_login, note_type, content, is_pinned, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, strftime('%s','now'), strftime('%s','now'))
         RETURNING *`
      )
      .get(
        playerId,
        agentLogin,
        input.noteType ?? "general",
        input.content,
        input.isPinned ? 1 : 0
      ) as Record<string, unknown>;

    logPlayerNote({
      playerId,
      authorLogin: agentLogin,
      action: "create",
      noteType: input.noteType ?? "general",
    });

    return rowToNote(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] addPlayerNote failed for ${playerId}: ${msg}`);
    throw err;
  }
}

/**
 * Soft-delete a player note.
 */
export function deletePlayerNote(noteId: number, playerId: string): boolean {
  try {
    const db = getDb();
    const result = db
      .query(
        `UPDATE player_notes SET is_active = 0, updated_at = strftime('%s','now')
         WHERE id = ? AND player_id = ?`
      )
      .run(noteId, playerId);

    if (result.changes > 0) {
      logPlayerNote({ noteId: String(noteId), playerId, action: "delete" });
    }

    return result.changes > 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] deletePlayerNote failed for note ${noteId}: ${msg}`);
    throw err;
  }
}

/**
 * Update staff notes for a player (replaces all existing notes).
 */
export function updatePlayerNotes(
  playerId: string,
  notes: string[],
  agentLogin: string
): PlayerNote[] {
  try {
    // Soft-delete existing active notes
    const db = getDb();
    db.query(
      `UPDATE player_notes SET is_active = 0, updated_at = strftime('%s','now')
       WHERE player_id = ? AND is_active = 1`
    ).run(playerId);

    // Insert new notes
    const createdNotes: PlayerNote[] = [];
    for (const content of notes) {
      const note = addPlayerNote(
        playerId,
        { content, noteType: "general" },
        agentLogin
      );
      createdNotes.push(note);
    }

    return createdNotes;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] updatePlayerNotes failed for ${playerId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

/**
 * Get active flags for a player.
 */
export function getPlayerFlags(playerId: string): PlayerFlag[] {
  try {
    const db = getDb();
    const rows = db
      .query(
        `SELECT id, player_id, flag_type, flag_subtype, severity, title,
                description, source, source_rule_id, is_active, cleared_by,
                cleared_at, clear_reason, created_at, updated_at
         FROM player_flags
         WHERE player_id = ? AND is_active = 1
         ORDER BY created_at DESC`
      )
      .all(playerId) as Record<string, unknown>[];

    return rows.map(rowToFlag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerFlag] getPlayerFlags failed for ${playerId}: ${msg}`);
    throw err;
  }
}

/**
 * Add a risk/compliance flag to a player.
 */
export function addPlayerFlag(
  playerId: string,
  input: AddFlagInput
): PlayerFlag {
  try {
    const db = getDb();
    const result = db
      .query(
        `INSERT INTO player_flags
         (player_id, flag_type, flag_subtype, severity, title, description,
          source, source_rule_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, strftime('%s','now'), strftime('%s','now'))
         RETURNING *`
      )
      .get(
        playerId,
        input.flagType,
        input.flagSubtype ?? null,
        input.severity,
        input.title,
        input.description ?? null,
        input.source ?? null,
        input.sourceRuleId ?? null
      ) as Record<string, unknown>;

    logPlayerFlag({
      playerId,
      flagType: input.flagType,
      severity: input.severity,
      reason: input.title,
      action: "create",
      triggeredBy: input.source ?? "manual",
    });

    return rowToFlag(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerFlag] addPlayerFlag failed for ${playerId}: ${msg}`);
    throw err;
  }
}

/**
 * Resolve (clear) a flag.
 */
export function resolveFlag(
  flagId: number,
  resolvedBy: string,
  reason?: string
): PlayerFlag | null {
  try {
    const db = getDb();
    const result = db
      .query(
        `UPDATE player_flags
         SET is_active = 0, cleared_by = ?, cleared_at = strftime('%s','now'),
             clear_reason = ?, updated_at = strftime('%s','now')
         WHERE id = ?
         RETURNING *`
      )
      .get(resolvedBy, reason ?? null, flagId) as Record<string, unknown> | undefined;

    if (!result) return null;

    logPlayerFlag({
      flagId: String(flagId),
      playerId: String(result.player_id),
      action: "resolve",
      triggeredBy: resolvedBy,
    });

    return rowToFlag(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerFlag] resolveFlag failed for flag ${flagId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/**
 * Get linked accounts, devices, and IPs for a player.
 */
export function getPlayerLinks(playerId: string): PlayerLink[] {
  try {
    const db = getDb();
    const rows = db
      .query(
        `SELECT id, player_id, link_type, link_value, confidence,
                first_seen, last_seen, occurrence_count
         FROM player_links
         WHERE player_id = ?
         ORDER BY occurrence_count DESC, last_seen DESC`
      )
      .all(playerId) as Record<string, unknown>[];

    return rows.map(rowToLink);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] getPlayerLinks failed for ${playerId}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Archetype Classification
// ---------------------------------------------------------------------------

/**
 * Classify a player's archetype based on betting behavior.
 * Archetypes: sharp (55%+ win), whale (high balance/volume),
 * chase_gambler (<35% win, escalating), new (low count),
 * recreational (moderate), suspicious (anomalous)
 */
export function classifyArchetype(playerId: string): {
  archetype: CustomerArchetype;
  confidence: number;
  signals: string[];
} | null {
  try {
    const db = getDb();

    const player = getPlayer(playerId);
    if (!player) return null;

    // Fetch wager stats
    const stats = db
      .query(
        `SELECT
          COUNT(*) as total_wagers,
          SUM(stake) as total_staked,
          AVG(stake) as avg_stake,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as win_count,
          SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as loss_count,
          AVG(CASE WHEN placed_at > (strftime('%s','now') - 30*86400) THEN stake END) as avg_stake_30d,
          MAX(stake) as max_stake
        FROM wagers WHERE player_id = ?`
      )
      .get(playerId) as Record<string, number | null> | undefined;

    const totalWagers = Number(stats?.total_wagers ?? 0);
    const winCount = Number(stats?.win_count ?? 0);
    const lossCount = Number(stats?.loss_count ?? 0);
    const winRate = totalWagers > 0 ? winCount / totalWagers : 0;
    const lossRate = totalWagers > 0 ? lossCount / totalWagers : 0;
    const totalStaked = Number(stats?.total_staked ?? 0);
    const avgStake = Number(stats?.avg_stake ?? 0);

    // Check for stake escalation (chase behavior)
    const escalationRow = db
      .query(
        `WITH daily_stakes AS (
          SELECT date(placed_at, 'unixepoch') as day,
                 AVG(stake) as day_avg_stake,
                 SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as day_losses
          FROM wagers WHERE player_id = ?
          GROUP BY date(placed_at, 'unixepoch')
        )
        SELECT COUNT(*) as escalation_days FROM daily_stakes ds1
        JOIN daily_stakes ds2 ON ds2.day > ds1.day
        WHERE ds2.day_avg_stake > ds1.day_avg_stake * 1.5 AND ds1.day_losses > 0`
      )
      .get(playerId) as { escalation_days: number } | undefined;

    const escalationDays = Number(escalationRow?.escalation_days ?? 0);

    // Check for suspicious patterns
    const ipRow = db
      .query(
        `SELECT COUNT(DISTINCT ip_address) as ip_count,
                COUNT(DISTINCT device_hash) as device_count
         FROM wagers WHERE player_id = ?
         AND placed_at >= strftime('%s','now') - 7*86400`
      )
      .get(playerId) as { ip_count: number; device_count: number } | undefined;

    const ipCount = Number(ipRow?.ip_count ?? 0);
    const deviceCount = Number(ipRow?.device_count ?? 0);

    // Decision logic
    const signals: string[] = [];

    // Suspicious: anomalous patterns
    if (ipCount > 5 || deviceCount > 3) {
      signals.push(`Multi-IP: ${ipCount} IPs, ${deviceCount} devices (7d)`);
    }
    if (winRate > 0.65 && totalWagers > 20) {
      signals.push(`Extreme win rate: ${(winRate * 100).toFixed(1)}%`);
    }

    // Sharp: 55%+ win rate with meaningful sample
    if (winRate >= 0.55 && totalWagers >= 30) {
      return { archetype: "sharp", confidence: Math.min(winRate, 0.95), signals };
    }

    // Whale: high balance or high volume
    if (player.balance > 1_000_000 || totalStaked > 10_000_000) {
      return {
        archetype: "whale",
        confidence: Math.min(Math.max(totalStaked / 20_000_000, 0.5), 0.95),
        signals,
      };
    }

    // Chase gambler: <35% win, escalating stakes
    if (lossRate >= 0.65 && totalWagers >= 15) {
      if (escalationDays >= 3) {
        signals.push(`Stake escalation detected: ${escalationDays} days`);
        return { archetype: "chase_gambler", confidence: 0.85, signals };
      }
      return { archetype: "chase_gambler", confidence: 0.7, signals };
    }

    // Suspicious: multi-device, extreme patterns
    if (signals.length > 0) {
      return { archetype: "suspicious", confidence: 0.75, signals };
    }

    // New: low wager count
    if (totalWagers < 20) {
      return { archetype: "new", confidence: 0.9, signals };
    }

    // Default: recreational
    return { archetype: "recreational", confidence: 0.6, signals };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[ArchetypeBatch] classifyArchetype failed for ${playerId}: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Batch Archetype Classification
// ---------------------------------------------------------------------------

/**
 * Classify all players whose archetype is stale (older than 7 days or null).
 * Returns count of players classified.
 */
export function classifyArchetypes(): number {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - 7 * 86400; // 7 days

  try {
    // Find stale or unclassified players
    const rows = db
      .query(
        `SELECT player_id FROM raw_players
         WHERE archetype IS NULL
            OR ingested_at < ?
         ORDER BY ingested_at ASC
         LIMIT 500`
      )
      .all(cutoff) as Array<{ player_id: string }>;

    let classified = 0;
    for (const row of rows) {
      try {
        const result = classifyArchetype(row.player_id);
        if (result) {
          db.run(
            `UPDATE raw_players SET archetype = ?, ingested_at = ? WHERE player_id = ?`,
            [result.archetype, now, row.player_id]
          );
          classified++;
        }
      } catch {
        // Skip individual failures
      }
    }

    if (classified > 0) {
      logger.info(`[ArchetypeBatch] Classified ${classified} players`);
    }
    return classified;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[ArchetypeBatch] Batch classification failed: ${msg}`);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Summary / Aggregations
// ---------------------------------------------------------------------------

/**
 * Get player counts grouped by archetype and risk tier.
 */
export function getPlayerSummary(): {
  byArchetype: Record<string, number>;
  byRiskTier: Record<string, number>;
  total: number;
} {
  try {
    const db = getDb();

    const archetypeRows = db
      .query(
        `SELECT archetype, COUNT(*) as count FROM customers WHERE status = 'active' GROUP BY archetype`
      )
      .all() as Array<{ archetype: string | null; count: number }>;

    const byArchetype: Record<string, number> = {};
    for (const row of archetypeRows) {
      byArchetype[row.archetype ?? "unknown"] = row.count;
    }

    const tierRows = db
      .query(
        `SELECT risk_tier, COUNT(*) as count FROM customers WHERE status = 'active' GROUP BY risk_tier`
      )
      .all() as Array<{ risk_tier: string; count: number }>;

    const byRiskTier: Record<string, number> = {};
    for (const row of tierRows) {
      byRiskTier[row.risk_tier] = row.count;
    }

    const totalRow = db
      .query("SELECT COUNT(*) as total FROM customers WHERE status = 'active'")
      .get() as { total: number } | undefined;

    return {
      byArchetype,
      byRiskTier,
      total: totalRow?.total ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PlayerNote] getPlayerSummary failed: ${msg}`);
    return { byArchetype: {}, byRiskTier: {}, total: 0 };
  }
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Export players to CSV format.
 */
export function exportPlayersToCSV(filters: PlayerSearchFilters): string {
  const result = searchPlayers({ ...filters, limit: 10000 });
  const headers = [
    "customer_id",
    "display_name",
    "email",
    "phone",
    "balance",
    "risk_tier",
    "archetype",
    "win_rate",
    "wager_count",
    "status",
    "agent_login",
    "created_at",
  ];

  const lines = [headers.join(",")];

  for (const p of result.items) {
    const values = [
      p.customerId,
      `"${(p.displayName ?? "").replace(/"/g, '""')}"`,
      p.email ?? "",
      p.phone ?? "",
      p.balance,
      p.riskTier,
      p.archetype ?? "",
      p.winRate ?? "",
      p.wagerCount,
      p.status,
      p.agentLogin,
      new Date(p.createdAt * 1000).toISOString(),
    ];
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortColumn(sort: string): string {
  switch (sort) {
    case "name":
      return "display_name";
    case "balance":
      return "balance";
    case "winRate":
      return "win_rate";
    case "wagerCount":
      return "wager_count";
    case "createdAt":
      return "created_at";
    default:
      return "display_name";
  }
}

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: Number(row.id),
    customerId: String(row.customer_id),
    playerId: row.player_id ? String(row.player_id) : null,
    agentLogin: String(row.agent_login),
    displayName: String(row.display_name ?? ""),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    balance: Number(row.balance ?? 0),
    lifetimeDeposit: Number(row.lifetime_deposit ?? 0),
    lifetimeWithdrawal: Number(row.lifetime_withdrawal ?? 0),
    lifetimePnl: Number(row.lifetime_pnl ?? 0),
    riskTier: String(row.risk_tier ?? "GREEN") as RiskTier,
    riskScore: Number(row.risk_score ?? 0),
    archetype: (row.archetype as CustomerArchetype) ?? null,
    archetypeConfidence: row.archetype_confidence ? Number(row.archetype_confidence) : null,
    kycStatus: String(row.kyc_status ?? "pending"),
    status: String(row.status ?? "active"),
    wagerCount: Number(row.wager_count ?? 0),
    winRate: row.win_rate ? Number(row.win_rate) : null,
    avgStake: row.avg_stake ? Number(row.avg_stake) : null,
    lastWagerAt: row.last_wager_at ? Number(row.last_wager_at) : null,
    lastLoginAt: row.last_login_at ? Number(row.last_login_at) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function rowToNote(row: Record<string, unknown>): PlayerNote {
  return {
    id: Number(row.id),
    playerId: String(row.player_id),
    agentLogin: String(row.agent_login),
    noteType: String(row.note_type ?? "general"),
    content: String(row.content),
    isPinned: Boolean(row.is_pinned),
    isActive: Boolean(row.is_active),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function rowToFlag(row: Record<string, unknown>): PlayerFlag {
  return {
    id: Number(row.id),
    playerId: String(row.player_id),
    flagType: String(row.flag_type),
    flagSubtype: row.flag_subtype ? String(row.flag_subtype) : null,
    severity: String(row.severity),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    source: row.source ? String(row.source) : null,
    sourceRuleId: row.source_rule_id ? String(row.source_rule_id) : null,
    isActive: Boolean(row.is_active),
    clearedBy: row.cleared_by ? String(row.cleared_by) : null,
    clearedAt: row.cleared_at ? Number(row.cleared_at) : null,
    clearReason: row.clear_reason ? String(row.clear_reason) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function rowToTransaction(row: Record<string, unknown>): PlayerTransaction {
  return {
    id: Number(row.id),
    transactionId: String(row.transaction_id),
    playerId: String(row.player_id),
    agentLogin: String(row.agent_login),
    transactionType: String(row.transaction_type),
    amount: Number(row.amount),
    currency: String(row.currency ?? "USD"),
    status: String(row.status ?? "pending"),
    method: row.method ? String(row.method) : null,
    reference: row.reference ? String(row.reference) : null,
    notes: row.notes ? String(row.notes) : null,
    metadataJson: row.metadata_json ? String(row.metadata_json) : null,
    processedAt: row.processed_at ? Number(row.processed_at) : null,
    processedBy: row.processed_by ? String(row.processed_by) : null,
    createdAt: Number(row.created_at),
  };
}

function rowToWager(row: Record<string, unknown>): PlayerWager {
  return {
    id: Number(row.id),
    wagerNumber: String(row.wager_number),
    playerId: String(row.player_id),
    sport: String(row.sport),
    eventName: row.event_name ? String(row.event_name) : null,
    market: String(row.market),
    selection: String(row.selection),
    odds: Number(row.odds),
    stake: Number(row.stake),
    potentialPayout: row.potential_payout ? Number(row.potential_payout) : null,
    actualPayout: row.actual_payout ? Number(row.actual_payout) : null,
    status: String(row.status),
    result: row.result ? String(row.result) : null,
    placedAt: Number(row.placed_at),
    settledAt: row.settled_at ? Number(row.settled_at) : null,
  };
}

function rowToLink(row: Record<string, unknown>): PlayerLink {
  return {
    id: Number(row.id),
    playerId: String(row.player_id),
    linkType: String(row.link_type),
    linkValue: String(row.link_value),
    confidence: Number(row.confidence ?? 0),
    firstSeen: Number(row.first_seen),
    lastSeen: Number(row.last_seen),
    occurrenceCount: Number(row.occurrence_count ?? 1),
  };
}
