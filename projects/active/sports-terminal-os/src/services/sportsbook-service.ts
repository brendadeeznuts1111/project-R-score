/**
 * Sportsbook Data Service — Zone 1 (Ocean Depths)
 *
 * Provides data access and business logic for the sportsbook grid:
 *   - Book health monitoring
 *   - Best line calculation (lowest vig / best price)
 *   - Line movement tracking with directional arrows
 *   - Book status management
 *   - Odds CRUD operations
 *
 * All errors logged via tableLogger with [SportEvent] or [MarketDepth] prefix.
 */

import { Database } from "bun:sqlite";
import { getDb } from "@db/index";
import { logSportEvent, logMarketDepth } from "@utils/tableLogger";
import { createLogger } from "@utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BookStatus = "healthy" | "degraded" | "down";
export type MarketType = "spread" | "ml" | "total" | "parlay" | "teaser" | "prop";
export type LineDirection = "up" | "down" | "steady";
export type OddsSource = "api" | "scraper" | "manual";

/** Single odds entry from a sportsbook */
export interface SportsbookOdds {
  id: string;
  bookId: string;
  sport: string;
  eventId: string;
  market: MarketType;
  odds: number;
  line?: number;
  overUnder?: "over" | "under";
  timestamp: number;
  source: OddsSource;
  isBestLine: boolean;
  vig?: number;
  createdAt: number;
  updatedAt: number;
}

/** Health status for a single sportsbook */
export interface BookHealth {
  bookId: string;
  status: BookStatus;
  lastCheck: number;
  latencyMs: number;
  errorRate: number;
  uptimePct: number;
  avgLatencyMs: number;
  successCount: number;
  failureCount: number;
  lastError?: string;
  updatedAt: number;
}

/** A recorded line movement */
export interface LineMovement {
  id: string;
  bookId: string;
  sport: string;
  eventId: string;
  market: MarketType;
  oldOdds: number;
  newOdds: number;
  oldLine?: number;
  newLine?: number;
  direction: LineDirection;
  movementPct?: number;
  timestamp: number;
}

/** Best line across all books for a specific market */
export interface BestLine {
  eventId: string;
  sport: string;
  market: MarketType;
  overUnder?: "over" | "under";
  bestBookId: string;
  bestOdds: number;
  bestLine?: number;
  vig: number;
  timestamp: number;
  allBooks: Array<{
    bookId: string;
    odds: number;
    line?: number;
    isBest: boolean;
  }>;
}

/** Filter options for odds queries */
export interface OddsFilter {
  sport?: string;
  bookId?: string;
  market?: MarketType;
  eventId?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("SportsbookService");

// ---------------------------------------------------------------------------
// SQL Queries (prepared for performance)
// ---------------------------------------------------------------------------

function getDbInstance(): Database {
  return getDb();
}

// ---------------------------------------------------------------------------
// Odds CRUD
// ---------------------------------------------------------------------------

/**
 * Insert or update odds data. Records a line movement if the odds changed.
 */
export function updateBookOdds(odds: Omit<SportsbookOdds, "id" | "createdAt" | "updatedAt" | "isBestLine"> & { id?: string }): SportsbookOdds {
  const db = getDbInstance();
  const now = Date.now();
  const id = odds.id || `${odds.bookId}_${odds.eventId}_${odds.market}_${odds.overUnder || "none"}_${now}`;

  try {
    // Check for existing odds to detect movement
    const existing = db.query(
      `SELECT odds, line FROM sportsbook_odds WHERE book_id = ?1 AND event_id = ?2 AND market = ?3 AND over_under = ?4`
    ).get(odds.bookId, odds.eventId, odds.market, odds.overUnder || null) as { odds: number; line: number | null } | null;

    const isUpdate = existing !== null;

    // Calculate vig (simplified: for -110/-110, vig ~4.55%)
    const vig = calculateVig(odds.odds);

    if (isUpdate) {
      // Update existing
      db.run(
        `UPDATE sportsbook_odds
         SET odds = ?1, line = ?2, timestamp = ?3, source = ?4, vig = ?5, updated_at = ?6
         WHERE book_id = ?7 AND event_id = ?8 AND market = ?9 AND over_under = ?10`,
        [odds.odds, odds.line || null, odds.timestamp, odds.source, vig, now,
         odds.bookId, odds.eventId, odds.market, odds.overUnder || null]
      );

      // Record line movement if odds changed
      if (existing.odds !== odds.odds || existing.line !== (odds.line ?? null)) {
        const direction = determineDirection(existing.odds, odds.odds);
        const movementPct = calculateMovementPct(existing.odds, odds.odds);

        db.run(
          `INSERT INTO line_movements
           (id, book_id, sport, event_id, market, old_odds, new_odds, old_line, new_line, direction, movement_pct, timestamp, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
          [`mv_${id}_${now}`, odds.bookId, odds.sport, odds.eventId, odds.market,
           existing.odds, odds.odds, existing.line, odds.line || null,
           direction, movementPct, now, now]
        );

        logMarketDepth({
          eventId: odds.eventId,
          market: odds.market,
          book: odds.bookId,
          homeOdds: odds.odds,
          lastUpdated: new Date(now).toISOString(),
        });
      }
    } else {
      // Insert new
      db.run(
        `INSERT INTO sportsbook_odds
         (id, book_id, sport, event_id, market, odds, line, over_under, timestamp, source, is_best_line, vig, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
        [id, odds.bookId, odds.sport, odds.eventId, odds.market, odds.odds,
         odds.line || null, odds.overUnder || null, odds.timestamp, odds.source,
         0, vig, now, now]
      );
    }

    // Recalculate best lines for this event+market
    recalculateBestLines(odds.eventId, odds.market, odds.overUnder);

    logSportEvent({
      eventId: odds.eventId,
      sport: odds.sport,
      marketCount: 1,
      status: isUpdate ? "odds_updated" : "odds_inserted",
    });

    return {
      ...odds,
      id,
      isBestLine: false,
      vig,
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[SportEvent] updateBookOdds failed: ${msg}`);
    logSportEvent({ eventId: odds.eventId, sport: odds.sport, status: "odds_error", error: msg });
    throw err;
  }
}

/**
 * List all odds with optional filters.
 */
export function listOdds(filter: OddsFilter = {}): { items: SportsbookOdds[]; total: number } {
  const db = getDbInstance();
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (filter.sport) {
    conditions.push("sport = ?");
    params.push(filter.sport);
  }
  if (filter.bookId) {
    conditions.push("book_id = ?");
    params.push(filter.bookId);
  }
  if (filter.market) {
    conditions.push("market = ?");
    params.push(filter.market);
  }
  if (filter.eventId) {
    conditions.push("event_id = ?");
    params.push(filter.eventId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(filter.limit || 100, 500);
  const offset = filter.offset || 0;

  try {
    const totalRow = db.query(`SELECT COUNT(*) as total FROM sportsbook_odds ${whereClause}`).get(...params) as { total: number };

    const query = `SELECT
      id, book_id, sport, event_id, market, odds, line, over_under,
      timestamp, source, is_best_line, vig, created_at, updated_at
    FROM sportsbook_odds
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?`;

    const rows = db.query(query).all(...params, limit, offset) as Array<{
      id: string; book_id: string; sport: string; event_id: string; market: MarketType;
      odds: number; line: number | null; over_under: "over" | "under" | null;
      timestamp: number; source: OddsSource; is_best_line: number; vig: number | null;
      created_at: number; updated_at: number;
    }>;

    const items = rows.map((r) => ({
      id: r.id,
      bookId: r.book_id,
      sport: r.sport,
      eventId: r.event_id,
      market: r.market,
      odds: r.odds,
      line: r.line ?? undefined,
      overUnder: r.over_under ?? undefined,
      timestamp: r.timestamp,
      source: r.source,
      isBestLine: r.is_best_line === 1,
      vig: r.vig ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { items, total: totalRow.total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] listOdds failed: ${msg}`);
    logMarketDepth({ eventId: filter.eventId || "all", market: filter.market || "all", book: filter.bookId || "all", lastUpdated: new Date().toISOString() });
    throw err;
  }
}

/**
 * Get a single odds entry by ID.
 */
export function getOddsById(id: string): SportsbookOdds | null {
  const db = getDbInstance();

  try {
    const r = db.query(
      `SELECT id, book_id, sport, event_id, market, odds, line, over_under,
              timestamp, source, is_best_line, vig, created_at, updated_at
       FROM sportsbook_odds WHERE id = ?`
    ).get(id) as {
      id: string; book_id: string; sport: string; event_id: string; market: MarketType;
      odds: number; line: number | null; over_under: "over" | "under" | null;
      timestamp: number; source: OddsSource; is_best_line: number; vig: number | null;
      created_at: number; updated_at: number;
    } | null;

    if (!r) return null;

    return {
      id: r.id,
      bookId: r.book_id,
      sport: r.sport,
      eventId: r.event_id,
      market: r.market,
      odds: r.odds,
      line: r.line ?? undefined,
      overUnder: r.over_under ?? undefined,
      timestamp: r.timestamp,
      source: r.source,
      isBestLine: r.is_best_line === 1,
      vig: r.vig ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] getOddsById failed for ${id}: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Best Lines
// ---------------------------------------------------------------------------

/**
 * Recalculate which odds entries are best lines for a given event+market.
 * Best line = lowest vig / best price for bettor (least negative / most positive odds).
 */
function recalculateBestLines(eventId: string, market: string, overUnder?: "over" | "under"): void {
  const db = getDbInstance();

  try {
    // Reset all best line flags for this event+market
    db.run(
      `UPDATE sportsbook_odds SET is_best_line = 0 WHERE event_id = ? AND market = ? AND over_under = ?`,
      [eventId, market, overUnder || null]
    );

    // Find the best odds (most favorable to bettor: highest value)
    // For negative odds: -105 is better than -110
    // For positive odds: +150 is better than +140
    const bestRow = db.query(
      `SELECT id FROM sportsbook_odds
       WHERE event_id = ? AND market = ? AND over_under = ?
       ORDER BY odds DESC
       LIMIT 1`
    ).get(eventId, market, overUnder || null) as { id: string } | null;

    if (bestRow) {
      db.run(
        `UPDATE sportsbook_odds SET is_best_line = 1 WHERE id = ?`,
        [bestRow.id]
      );
    }

    logMarketDepth({
      eventId,
      market,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] recalculateBestLines failed: ${msg}`);
  }
}

/**
 * Get best lines across all books for each unique event+market combination.
 */
export function getBestLines(filter: { sport?: string; eventId?: string; market?: MarketType } = {}): BestLine[] {
  const db = getDbInstance();

  try {
    const conditions: string[] = ["is_best_line = 1"];
    const params: (string | number)[] = [];

    if (filter.sport) {
      conditions.push("sport = ?");
      params.push(filter.sport);
    }
    if (filter.eventId) {
      conditions.push("event_id = ?");
      params.push(filter.eventId);
    }
    if (filter.market) {
      conditions.push("market = ?");
      params.push(filter.market);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const bestRows = db.query(
      `SELECT id, book_id, sport, event_id, market, odds, line, over_under, timestamp, vig
       FROM sportsbook_odds
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT 200`
    ).all(...params) as Array<{
      id: string; book_id: string; sport: string; event_id: string; market: MarketType;
      odds: number; line: number | null; over_under: "over" | "under" | null;
      timestamp: number; vig: number | null;
    }>;

    const results: BestLine[] = [];

    for (const best of bestRows) {
      // Get all books for this event+market to show comparison
      const allBooks = db.query(
        `SELECT book_id, odds, line, is_best_line
         FROM sportsbook_odds
         WHERE event_id = ? AND market = ? AND over_under = ?
         ORDER BY odds DESC`
      ).all(best.event_id, best.market, best.over_under || null) as Array<{
        book_id: string; odds: number; line: number | null; is_best_line: number;
      }>;

      results.push({
        eventId: best.event_id,
        sport: best.sport,
        market: best.market,
        overUnder: best.over_under ?? undefined,
        bestBookId: best.book_id,
        bestOdds: best.odds,
        bestLine: best.line ?? undefined,
        vig: best.vig ?? 0,
        timestamp: best.timestamp,
        allBooks: allBooks.map((b) => ({
          bookId: b.book_id,
          odds: b.odds,
          line: b.line ?? undefined,
          isBest: b.is_best_line === 1,
        })),
      });
    }

    return results;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] getBestLines failed: ${msg}`);
    logMarketDepth({ eventId: filter.eventId || "all", market: filter.market || "all", lastUpdated: new Date().toISOString() });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Line Movements
// ---------------------------------------------------------------------------

/**
 * Get recent line movements with directional arrows data.
 */
export function getLineMovements(filter: { sport?: string; bookId?: string; eventId?: string; limit?: number } = {}): LineMovement[] {
  const db = getDbInstance();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter.sport) {
    conditions.push("sport = ?");
    params.push(filter.sport);
  }
  if (filter.bookId) {
    conditions.push("book_id = ?");
    params.push(filter.bookId);
  }
  if (filter.eventId) {
    conditions.push("event_id = ?");
    params.push(filter.eventId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(filter.limit || 50, 200);

  try {
    const rows = db.query(
      `SELECT id, book_id, sport, event_id, market, old_odds, new_odds,
              old_line, new_line, direction, movement_pct, timestamp
       FROM line_movements
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT ?`
    ).all(...params, limit) as Array<{
      id: string; book_id: string; sport: string; event_id: string; market: MarketType;
      old_odds: number; new_odds: number; old_line: number | null; new_line: number | null;
      direction: LineDirection; movement_pct: number | null; timestamp: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      bookId: r.book_id,
      sport: r.sport,
      eventId: r.event_id,
      market: r.market,
      oldOdds: r.old_odds,
      newOdds: r.new_odds,
      oldLine: r.old_line ?? undefined,
      newLine: r.new_line ?? undefined,
      direction: r.direction,
      movementPct: r.movement_pct ?? undefined,
      timestamp: r.timestamp,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] getLineMovements failed: ${msg}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Book Health
// ---------------------------------------------------------------------------

/**
 * Get health status for all sportsbooks.
 */
export function fetchBookHealth(): BookHealth[] {
  const db = getDbInstance();

  try {
    const rows = db.query(
      `SELECT book_id, status, last_check, latency_ms, error_rate, uptime_pct,
              avg_latency_ms, success_count, failure_count, last_error, updated_at
       FROM sportsbook_health
       ORDER BY updated_at DESC`
    ).all() as Array<{
      book_id: string; status: BookStatus; last_check: number; latency_ms: number;
      error_rate: number; uptime_pct: number; avg_latency_ms: number;
      success_count: number; failure_count: number; last_error: string | null;
      updated_at: number;
    }>;

    return rows.map((r) => ({
      bookId: r.book_id,
      status: r.status,
      lastCheck: r.last_check,
      latencyMs: r.latency_ms,
      errorRate: r.error_rate,
      uptimePct: r.uptime_pct,
      avgLatencyMs: r.avg_latency_ms,
      successCount: r.success_count,
      failureCount: r.failure_count,
      lastError: r.last_error ?? undefined,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[SportEvent] fetchBookHealth failed: ${msg}`);
    logSportEvent({ sport: "all", status: "health_check_error", error: msg });
    throw err;
  }
}

/**
 * Get status for a specific book, or 'down' if not tracked.
 */
export function getBookStatus(bookId: string): BookHealth {
  const db = getDbInstance();

  try {
    const row = db.query(
      `SELECT book_id, status, last_check, latency_ms, error_rate, uptime_pct,
              avg_latency_ms, success_count, failure_count, last_error, updated_at
       FROM sportsbook_health WHERE book_id = ?`
    ).get(bookId) as {
      book_id: string; status: BookStatus; last_check: number; latency_ms: number;
      error_rate: number; uptime_pct: number; avg_latency_ms: number;
      success_count: number; failure_count: number; last_error: string | null;
      updated_at: number;
    } | null;

    if (row) {
      return {
        bookId: row.book_id,
        status: row.status,
        lastCheck: row.last_check,
        latencyMs: row.latency_ms,
        errorRate: row.error_rate,
        uptimePct: row.uptime_pct,
        avgLatencyMs: row.avg_latency_ms,
        successCount: row.success_count,
        failureCount: row.failure_count,
        lastError: row.last_error ?? undefined,
        updatedAt: row.updated_at,
      };
    }

    // Return default 'down' status for untracked books
    return {
      bookId,
      status: "down",
      lastCheck: 0,
      latencyMs: 0,
      errorRate: 0,
      uptimePct: 0,
      avgLatencyMs: 0,
      successCount: 0,
      failureCount: 0,
      updatedAt: Date.now(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[SportEvent] getBookStatus failed for ${bookId}: ${msg}`);
    throw err;
  }
}

/**
 * Update health check result for a book. Called by the health check cron.
 */
export function updateBookHealth(bookId: string, result: { latencyMs: number; success: boolean; error?: string }): void {
  const db = getDbInstance();
  const now = Date.now();

  try {
    const existing = db.query(`SELECT success_count, failure_count FROM sportsbook_health WHERE book_id = ?`).get(bookId) as {
      success_count: number; failure_count: number;
    } | null;

    const successCount = (existing?.success_count || 0) + (result.success ? 1 : 0);
    const failureCount = (existing?.failure_count || 0) + (result.success ? 0 : 1);
    const total = successCount + failureCount;
    const errorRate = total > 0 ? failureCount / total : 0;
    const uptimePct = total > 0 ? (successCount / total) * 100 : 0;

    let status: BookStatus = "healthy";
    if (!result.success || errorRate > 0.2) {
      status = "down";
    } else if (result.latencyMs > 2000 || errorRate > 0.05) {
      status = "degraded";
    }

    db.run(
      `INSERT INTO sportsbook_health (book_id, status, last_check, latency_ms, error_rate, uptime_pct,
                                     avg_latency_ms, success_count, failure_count, last_error, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT (book_id) DO UPDATE SET
         status = excluded.status,
         last_check = excluded.last_check,
         latency_ms = excluded.latency_ms,
         error_rate = excluded.error_rate,
         uptime_pct = excluded.uptime_pct,
         avg_latency_ms = excluded.avg_latency_ms,
         success_count = excluded.success_count,
         failure_count = excluded.failure_count,
         last_error = excluded.last_error,
         updated_at = excluded.updated_at`,
      [bookId, status, now, result.latencyMs, errorRate, uptimePct,
       result.latencyMs, successCount, failureCount, result.error || null, now]
    );

    logSportEvent({
      sport: bookId,
      status: `health_${status}`,
      marketCount: result.latencyMs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[SportEvent] updateBookHealth failed for ${bookId}: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Batch Operations
// ---------------------------------------------------------------------------

/**
 * Refresh all odds from upstream sources (Pinnacle API).
 * Delegates to the Pinnacle feed (src/feeds/pinnacle.ts). Falls back to timestamp-only
 * refresh if the feed is not configured.
 *
 * Returns count of markets updated.
 */
export async function refreshAllOdds(): Promise<number> {
  try {
    // Use real Pinnacle feed if configured
    const { refreshOddsFeed } = await import("../feeds/pinnacle");
    const result = await refreshOddsFeed();

    logSportEvent({
      sport: "all",
      status: "refresh_complete",
      marketCount: result.fetched,
      details: `${result.inserted} new, ${result.updated} updated, ${result.errors.length} errors`,
    });

    return result.fetched;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    // Fallback: bump timestamps for existing odds (backward compatible)
    const db = getDbInstance();
    const now = Date.now();
    const combos = db.query(
      `SELECT DISTINCT book_id, sport, event_id, market, over_under FROM sportsbook_odds`
    ).all() as Array<{
      book_id: string; sport: string; event_id: string; market: MarketType; over_under: "over" | "under" | null;
    }>;

    let updated = 0;
    for (const combo of combos) {
      db.run(
        `UPDATE sportsbook_odds SET updated_at = ? WHERE book_id = ? AND event_id = ? AND market = ? AND over_under = ?`,
        [now, combo.book_id, combo.event_id, combo.market, combo.over_under]
      );
      updated++;
    }

    logger.warn(`[MarketDepth] Odds feed unavailable (${msg}), bumped ${updated} timestamps`);
    return updated;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate vig percentage from American odds (simplified) */
function calculateVig(odds: number): number {
  // Convert American odds to implied probability
  const toProb = (o: number): number => (o > 0 ? 100 / (o + 100) : -o / (-o + 100));
  const prob = toProb(odds);
  // Vig is roughly the excess over 100% for both sides
  // Single-side approximation: standard line of -110 = ~4.55% vig
  return Math.round((prob * 100 - 50) * 100) / 100;
}

/** Determine line direction: up = moved in favor of bettor, down = against */
function determineDirection(oldOdds: number, newOdds: number): LineDirection {
  if (newOdds > oldOdds) return "up";     // Odds improved (e.g., -110 -> -105, or +140 -> +150)
  if (newOdds < oldOdds) return "down";   // Odds worsened
  return "steady";
}

/** Calculate percentage movement between odds */
function calculateMovementPct(oldOdds: number, newOdds: number): number {
  if (oldOdds === 0) return 0;
  const pct = ((newOdds - oldOdds) / Math.abs(oldOdds)) * 100;
  return Math.round(pct * 100) / 100;
}

// ---------------------------------------------------------------------------
// CLV (Closing Line Value) Calculator
// ---------------------------------------------------------------------------

const CLV_WINDOW_MS = 300_000; // 5 minutes

export interface CLVResult {
  eventId: string;
  sport: string;
  market: string;
  bookId: string;
  openingOdds: number;
  closingOdds: number;
  clv: number;
  timestamp: number;
}

/**
 * Calculate Closing Line Value for recent line movements.
 * CLV = (closing_odds - opening_odds) / opening_odds × 100
 *
 * Positive CLV = you beat the market.
 * Scans line_movements from the last 5 minutes.
 */
export function calculateCLV(): CLVResult[] {
  const db = getDbInstance();
  const now = Date.now();
  const windowStart = now - CLV_WINDOW_MS;

  try {
    const rows = db
      .query(
        `SELECT event_id, sport, market, book_id,
                MIN(old_odds) as first_old, MAX(new_odds) as last_new,
                MIN(timestamp) as first_ts, MAX(timestamp) as last_ts
         FROM line_movements
         WHERE timestamp >= ? AND timestamp <= ?
         GROUP BY event_id, sport, market, book_id
         HAVING first_old != last_new
         ORDER BY last_ts DESC
         LIMIT 100`
      )
      .all(windowStart, now) as Array<{
        event_id: string; sport: string; market: string; book_id: string;
        first_old: number; last_new: number;
        first_ts: number; last_ts: number;
      }>;

    return rows.map((r) => {
      const clv = r.first_old !== 0
        ? ((r.last_new - r.first_old) / Math.abs(r.first_old)) * 100
        : 0;

      return {
        eventId: r.event_id,
        sport: r.sport,
        market: r.market,
        bookId: r.book_id,
        openingOdds: r.first_old,
        closingOdds: r.last_new,
        clv: Math.round(clv * 100) / 100,
        timestamp: r.last_ts,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Steam Move Detector
// ---------------------------------------------------------------------------

const STEAM_WINDOW_MS = 60_000;
const STEAM_BOOK_THRESHOLD = 3;

export interface SteamMove {
  sport: string;
  eventId: string;
  market: string;
  direction: "up" | "down";
  bookCount: number;
  books: string[];
  timestamp: number;
}

/**
 * Detect steam moves: 3+ sportsbooks moving the same line
 * in the same direction within 60 seconds.
 */
export function detectSteamMoves(): SteamMove[] {
  const db = getDbInstance();
  const now = Date.now();
  const windowStart = now - STEAM_WINDOW_MS;

  try {
    const rows = db
      .query(
        `SELECT event_id, sport, market, direction,
                COUNT(DISTINCT book_id) as book_count,
                GROUP_CONCAT(DISTINCT book_id) as books
         FROM line_movements
         WHERE timestamp >= ? AND timestamp <= ?
         GROUP BY event_id, sport, market, direction
         HAVING book_count >= ?
         ORDER BY book_count DESC`
      )
      .all(windowStart, now, STEAM_BOOK_THRESHOLD) as Array<{
        event_id: string; sport: string; market: string;
        direction: "up" | "down"; book_count: number; books: string;
      }>;

    return rows.map((r) => ({
      sport: r.sport,
      eventId: r.event_id,
      market: r.market,
      direction: r.direction,
      bookCount: r.book_count,
      books: r.books.split(","),
      timestamp: now,
    }));
  } catch {
    return [];
  }
}
