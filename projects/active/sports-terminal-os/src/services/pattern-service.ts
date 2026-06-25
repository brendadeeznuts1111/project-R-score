/**
 * Pattern Detection Service — Zone 2 (Golden Hour)
 *
 * Detects wagering patterns from line movements and odds data:
 *   - steam_moves: Sudden line movement across multiple books
 *   - reverse_line: Line moves opposite to public betting
 *   - public_money: Heavy public betting on one side
 *   - sharp_money: Professional money indicators
 *   - line_freeze: Line stays steady despite heavy action
 *   - key_number: Movement around key numbers (3, 7, etc.)
 *
 * All errors logged via tableLogger with [PluginExecution] prefix.
 * Depends on: Zone 1 (line_movements, sportsbook_odds tables)
 */

import { Database } from "bun:sqlite";
import { getDb } from "@db/index";
import { logPlugin, logSportEvent } from "@utils/tableLogger";
import { createLogger } from "@utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternType =
  | "steam_moves"
  | "reverse_line"
  | "public_money"
  | "sharp_money"
  | "line_freeze"
  | "key_number";

export type PatternConfidence = "low" | "medium" | "high";

export interface PatternFactor {
  factor: string;
  weight: number; // 0.0 - 1.0
  description: string;
  value?: number | string;
}

/** A detected wagering pattern */
export interface WageringPattern {
  id: string;
  patternType: PatternType;
  sport: string;
  eventId: string;
  market: string;
  description: string;
  confidence: number; // 0 - 100
  confidenceLabel: PatternConfidence;
  factors: PatternFactor[];
  triggeredByRuleId?: string;
  detectedAt: number;
  expiresAt: number;
}

/** Historical pattern occurrence record */
export interface PatternHistory {
  id: string;
  patternType: PatternType;
  sport: string;
  eventId: string;
  market: string;
  description: string;
  confidence: number;
  factors: PatternFactor[];
  triggeredByRuleId?: string;
  detectedAt: number;
  verified?: boolean;
  outcome?: "hit" | "miss" | "pending";
  outcomeNote?: string;
}

/** Statistics per pattern type */
export interface PatternTypeStats {
  patternType: PatternType;
  totalDetected: number;
  avgConfidence: number;
  hitCount: number;
  missCount: number;
  pendingCount: number;
  hitRate: number; // 0 - 100
  lastDetectedAt?: number;
  frequencyPerDay: number;
}

/** Summary stats for all patterns */
export interface PatternStatsSummary {
  totalPatterns: number;
  byType: PatternTypeStats[];
  overallHitRate: number;
  avgConfidence: number;
  topSport: string;
  timeRange: { from: number; to: number };
}

/** Filter options for pattern queries */
export interface PatternFilter {
  type?: PatternType;
  sport?: string;
  eventId?: string;
  market?: string;
  minConfidence?: number;
  maxConfidence?: number;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("PatternService");

// ---------------------------------------------------------------------------
// Key numbers by sport
// ---------------------------------------------------------------------------

const KEY_NUMBERS: Record<string, number[]> = {
  NFL: [3, 7, 10, 14, 17],
  NBA: [3, 4, 5, 6, 7],
  NCAAF: [3, 7, 10, 14],
  NCAAB: [3, 4, 5, 6, 7],
  MLB: [1, 2, 3],
  NHL: [1, 2, 3],
  default: [3, 7],
};

function getKeyNumbers(sport: string): number[] {
  return KEY_NUMBERS[sport] || KEY_NUMBERS.default;
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function scoreToLabel(score: number): PatternConfidence {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function confidenceColor(confidence: number): string {
  if (confidence >= 70) return "#22c55e"; // green
  if (confidence >= 40) return "#f4a900"; // golden hour
  return "#ef4444"; // red
}

// ---------------------------------------------------------------------------
// Pattern detection algorithms
// ---------------------------------------------------------------------------

/**
 * Detect steam moves — sudden coordinated line movement across multiple books.
 * Trigger: 3+ books move the same direction within 5 minutes.
 */
function detectSteamMoves(db: Database, filter: PatternFilter): WageringPattern[] {
  const patterns: WageringPattern[] = [];
  const since = filter.from || Date.now() - 300000; // 5 min window

  try {
    const rows = db.query(
      `SELECT sport, event_id, market,
              direction, COUNT(DISTINCT book_id) as book_count,
              AVG(movement_pct) as avg_movement,
              MAX(timestamp) as last_move
       FROM line_movements
       WHERE timestamp > ?
         AND (? IS NULL OR sport = ?)
         AND (? IS NULL OR event_id = ?)
       GROUP BY sport, event_id, market, direction
       HAVING book_count >= 3
       ORDER BY last_move DESC
       LIMIT 50`
    ).all(
      since,
      filter.sport ?? null, filter.sport ?? null,
      filter.eventId ?? null, filter.eventId ?? null
    ) as Array<{
      sport: string; event_id: string; market: string;
      direction: string; book_count: number;
      avg_movement: number; last_move: number;
    }>;

    for (const row of rows) {
      const confidence = Math.min(40 + row.book_count * 15 + Math.abs(row.avg_movement) * 2, 100);
      patterns.push({
        id: `pat_steam_${row.event_id}_${row.market}_${row.last_move}`,
        patternType: "steam_moves",
        sport: row.sport,
        eventId: row.event_id,
        market: row.market,
        description: `Steam move: ${row.book_count} books moved ${row.direction} on ${row.market} (${Math.abs(row.avg_movement).toFixed(1)}%)`,
        confidence: Math.round(confidence),
        confidenceLabel: scoreToLabel(confidence),
        factors: [
          { factor: "book_count", weight: 0.4, description: `${row.book_count} books aligned`, value: row.book_count },
          { factor: "avg_movement", weight: 0.35, description: "Average movement magnitude", value: Math.abs(row.avg_movement).toFixed(2) },
          { factor: "direction", weight: 0.25, description: "Consensus direction", value: row.direction },
        ],
        detectedAt: row.last_move,
        expiresAt: row.last_move + 600000, // 10 min TTL
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] detectSteamMoves failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "detectSteamMoves", error: msg });
  }

  return patterns;
}

/**
 * Detect reverse line movement — line moves opposite to public betting.
 * Trigger: Heavy public on one side but line moves the other way.
 */
function detectReverseLine(db: Database, filter: PatternFilter): WageringPattern[] {
  const patterns: WageringPattern[] = [];

  try {
    // Get events with significant line movement
    const rows = db.query(
      `SELECT lm.sport, lm.event_id, lm.market,
              lm.direction, lm.old_odds, lm.new_odds,
              lm.movement_pct, lm.timestamp,
              (SELECT COUNT(*) FROM line_movements lm2
               WHERE lm2.event_id = lm.event_id AND lm2.market = lm.market
               AND lm2.direction = lm.direction AND lm2.timestamp > ?) as align_count
       FROM line_movements lm
       WHERE lm.timestamp > ?
         AND (? IS NULL OR lm.sport = ?)
         AND (? IS NULL OR lm.event_id = ?)
         AND ABS(lm.movement_pct) > 2.0
       ORDER BY lm.timestamp DESC
       LIMIT 50`
    ).all(
      Date.now() - 600000,
      filter.from || Date.now() - 300000,
      filter.sport ?? null, filter.sport ?? null,
      filter.eventId ?? null, filter.eventId ?? null
    ) as Array<{
      sport: string; event_id: string; market: string;
      direction: string; old_odds: number; new_odds: number;
      movement_pct: number; timestamp: number; align_count: number;
    }>;

    for (const row of rows) {
      // Reverse line detected when movement is significant but against public
      // (simplified: movement > 2% with alignment across books)
      const confidence = Math.min(30 + Math.abs(row.movement_pct) * 15 + row.align_count * 10, 100);
      patterns.push({
        id: `pat_rev_${row.event_id}_${row.market}_${row.timestamp}`,
        patternType: "reverse_line",
        sport: row.sport,
        eventId: row.event_id,
        market: row.market,
        description: `Reverse line: ${row.market} moved ${row.direction} from ${row.old_odds} to ${row.new_odds} despite public action`,
        confidence: Math.round(confidence),
        confidenceLabel: scoreToLabel(confidence),
        factors: [
          { factor: "movement_pct", weight: 0.45, description: "Line movement magnitude", value: Math.abs(row.movement_pct).toFixed(2) },
          { factor: "align_count", weight: 0.35, description: "Books aligned against public", value: row.align_count },
          { factor: "odds_shift", weight: 0.2, description: "Odds shifted", value: `${row.old_odds} → ${row.new_odds}` },
        ],
        detectedAt: row.timestamp,
        expiresAt: row.timestamp + 600000,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] detectReverseLine failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "detectReverseLine", error: msg });
  }

  return patterns;
}

/**
 * Detect public money — heavy betting volume on one side.
 * Trigger: Based on line movement direction as proxy for public sentiment.
 */
function detectPublicMoney(db: Database, filter: PatternFilter): WageringPattern[] {
  const patterns: WageringPattern[] = [];

  try {
    // Use odds with high vig as proxy for public-heavy games
    const rows = db.query(
      `SELECT sport, event_id, market, odds, vig, timestamp,
              (SELECT COUNT(*) FROM sportsbook_odds so2
               WHERE so2.event_id = sportsbook_odds.event_id
               AND so2.market = sportsbook_odds.market) as book_count
       FROM sportsbook_odds
       WHERE vig > 5.0
         AND timestamp > ?
         AND (? IS NULL OR sport = ?)
         AND (? IS NULL OR event_id = ?)
       ORDER BY vig DESC
       LIMIT 50`
    ).all(
      filter.from || Date.now() - 300000,
      filter.sport ?? null, filter.sport ?? null,
      filter.eventId ?? null, filter.eventId ?? null
    ) as Array<{
      sport: string; event_id: string; market: string;
      odds: number; vig: number; timestamp: number; book_count: number;
    }>;

    for (const row of rows) {
      const confidence = Math.min(30 + row.vig * 8 + row.book_count * 3, 100);
      patterns.push({
        id: `pat_pub_${row.event_id}_${row.market}_${row.timestamp}`,
        patternType: "public_money",
        sport: row.sport,
        eventId: row.event_id,
        market: row.market,
        description: `Public money: High vig (${row.vig.toFixed(1)}%) on ${row.market} suggests heavy public action`,
        confidence: Math.round(confidence),
        confidenceLabel: scoreToLabel(confidence),
        factors: [
          { factor: "vig", weight: 0.5, description: "Vig percentage (public proxy)", value: row.vig.toFixed(2) },
          { factor: "book_count", weight: 0.3, description: "Number of books offering", value: row.book_count },
          { factor: "odds", weight: 0.2, description: "Current odds", value: row.odds },
        ],
        detectedAt: row.timestamp,
        expiresAt: row.timestamp + 600000,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] detectPublicMoney failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "detectPublicMoney", error: msg });
  }

  return patterns;
}

/**
 * Detect sharp money — indicators of professional betting.
 * Trigger: Best line movement at sharp books followed by market-wide adjustment.
 */
function detectSharpMoney(db: Database, filter: PatternFilter): WageringPattern[] {
  const patterns: WageringPattern[] = [];
  const sharpBooks = ["PINNACLE", "CRIS", "BETFAIR", "BOOKMAKER"];

  try {
    const rows = db.query(
      `SELECT lm.sport, lm.event_id, lm.market, lm.book_id,
              lm.direction, lm.movement_pct, lm.timestamp,
              (SELECT COUNT(*) FROM line_movements lm3
               WHERE lm3.event_id = lm.event_id AND lm3.market = lm.market
               AND lm3.timestamp > lm.timestamp - 300000
               AND lm3.timestamp < lm.timestamp + 300000
               AND lm3.book_id != lm.book_id) as follower_count
       FROM line_movements lm
       WHERE lm.book_id IN (${sharpBooks.map(() => "?").join(",")})
         AND lm.timestamp > ?
         AND (? IS NULL OR lm.sport = ?)
         AND (? IS NULL OR lm.event_id = ?)
       ORDER BY lm.timestamp DESC
       LIMIT 50`
    ).all(
      ...sharpBooks,
      filter.from || Date.now() - 600000,
      filter.sport ?? null, filter.sport ?? null,
      filter.eventId ?? null, filter.eventId ?? null
    ) as Array<{
      sport: string; event_id: string; market: string; book_id: string;
      direction: string; movement_pct: number; timestamp: number; follower_count: number;
    }>;

    for (const row of rows) {
      const confidence = Math.min(35 + Math.abs(row.movement_pct) * 12 + row.follower_count * 8, 100);
      patterns.push({
        id: `pat_sharp_${row.event_id}_${row.market}_${row.timestamp}`,
        patternType: "sharp_money",
        sport: row.sport,
        eventId: row.event_id,
        market: row.market,
        description: `Sharp money: ${row.book_id} moved ${row.market} ${row.direction} (${Math.abs(row.movement_pct).toFixed(1)}%), ${row.follower_count} books followed`,
        confidence: Math.round(confidence),
        confidenceLabel: scoreToLabel(confidence),
        factors: [
          { factor: "sharp_book", weight: 0.35, description: "Sharp book triggered", value: row.book_id },
          { factor: "movement_pct", weight: 0.35, description: "Movement magnitude", value: Math.abs(row.movement_pct).toFixed(2) },
          { factor: "follower_count", weight: 0.3, description: "Market followers", value: row.follower_count },
        ],
        detectedAt: row.timestamp,
        expiresAt: row.timestamp + 900000, // 15 min TTL for sharp
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] detectSharpMoney failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "detectSharpMoney", error: msg });
  }

  return patterns;
}

/**
 * Detect line freeze — line stays steady despite heavy action.
 * Trigger: High wager count but minimal line movement.
 */
function detectLineFreeze(db: Database, filter: PatternFilter): WageringPattern[] {
  const patterns: WageringPattern[] = [];

  try {
    // Find events with many line movement records but small actual changes
    const rows = db.query(
      `SELECT sport, event_id, market,
              COUNT(*) as movement_count,
              AVG(ABS(movement_pct)) as avg_movement,
              MAX(timestamp) as last_activity
       FROM line_movements
       WHERE timestamp > ?
         AND (? IS NULL OR sport = ?)
         AND (? IS NULL OR event_id = ?)
       GROUP BY sport, event_id, market
       HAVING movement_count >= 5 AND avg_movement < 1.5
       ORDER BY last_activity DESC
       LIMIT 50`
    ).all(
      filter.from || Date.now() - 600000,
      filter.sport ?? null, filter.sport ?? null,
      filter.eventId ?? null, filter.eventId ?? null
    ) as Array<{
      sport: string; event_id: string; market: string;
      movement_count: number; avg_movement: number; last_activity: number;
    }>;

    for (const row of rows) {
      const confidence = Math.min(30 + row.movement_count * 5 + (1.5 - row.avg_movement) * 20, 100);
      patterns.push({
        id: `pat_freeze_${row.event_id}_${row.market}_${row.last_activity}`,
        patternType: "line_freeze",
        sport: row.sport,
        eventId: row.event_id,
        market: row.market,
        description: `Line freeze: ${row.movement_count} ticks but only ${row.avg_movement.toFixed(2)}% avg move — books holding firm`,
        confidence: Math.round(confidence),
        confidenceLabel: scoreToLabel(confidence),
        factors: [
          { factor: "tick_count", weight: 0.4, description: "Number of price ticks", value: row.movement_count },
          { factor: "avg_movement", weight: 0.4, description: "Average movement size", value: row.avg_movement.toFixed(2) },
          { factor: "stability", weight: 0.2, description: "Line stability ratio", value: (row.movement_count / (row.avg_movement + 0.1)).toFixed(1) },
        ],
        detectedAt: row.last_activity,
        expiresAt: row.last_activity + 600000,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] detectLineFreeze failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "detectLineFreeze", error: msg });
  }

  return patterns;
}

/**
 * Detect key number movement — line crossing or landing on key numbers.
 * Trigger: Line movement that crosses or lands on sport-specific key numbers.
 */
function detectKeyNumber(db: Database, filter: PatternFilter): WageringPattern[] {
  const patterns: WageringPattern[] = [];

  try {
    const rows = db.query(
      `SELECT sport, event_id, market, old_line, new_line,
              direction, movement_pct, timestamp
       FROM line_movements
       WHERE old_line IS NOT NULL AND new_line IS NOT NULL
         AND timestamp > ?
         AND (? IS NULL OR sport = ?)
         AND (? IS NULL OR event_id = ?)
         AND ABS(new_line - old_line) > 0
       ORDER BY timestamp DESC
       LIMIT 100`
    ).all(
      filter.from || Date.now() - 600000,
      filter.sport ?? null, filter.sport ?? null,
      filter.eventId ?? null, filter.eventId ?? null
    ) as Array<{
      sport: string; event_id: string; market: string;
      old_line: number; new_line: number;
      direction: string; movement_pct: number; timestamp: number;
    }>;

    for (const row of rows) {
      const keyNums = getKeyNumbers(row.sport);
      const crossedKey = keyNums.find(
        (k) => (row.old_line < k && row.new_line >= k) || (row.old_line > k && row.new_line <= k)
      );
      const landedOnKey = keyNums.find((k) => Math.abs(row.new_line - k) < 0.5);

      if (crossedKey || landedOnKey) {
        const keyNum = crossedKey || landedOnKey || 0;
        const confidence = Math.min(50 + Math.abs(row.movement_pct) * 8, 100);
        patterns.push({
          id: `pat_key_${row.event_id}_${row.market}_${row.timestamp}`,
          patternType: "key_number",
          sport: row.sport,
          eventId: row.event_id,
          market: row.market,
          description: `Key number: ${row.market} ${crossedKey ? "crossed" : "landed on"} ${keyNum} (${row.old_line} → ${row.new_line})`,
          confidence: Math.round(confidence),
          confidenceLabel: scoreToLabel(confidence),
          factors: [
            { factor: "key_number", weight: 0.5, description: "Key number involved", value: keyNum },
            { factor: "line_delta", weight: 0.3, description: "Line change", value: `${row.old_line} → ${row.new_line}` },
            { factor: "movement_pct", weight: 0.2, description: "Movement magnitude", value: Math.abs(row.movement_pct).toFixed(2) },
          ],
          detectedAt: row.timestamp,
          expiresAt: row.timestamp + 1200000, // 20 min TTL for key numbers
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] detectKeyNumber failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "detectKeyNumber", error: msg });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all pattern detectors and return combined results.
 * Persists detected patterns to the database.
 */
export function detectPatterns(filter: PatternFilter = {}): WageringPattern[] {
  const db = getDb();
  const allPatterns: WageringPattern[] = [];

  logger.info(`[PluginExecution] Running pattern detection with filter: ${JSON.stringify(filter)}`);

  // Run all detectors
  const detectors: Array<(db: Database, filter: PatternFilter) => WageringPattern[]> = [
    detectSteamMoves,
    detectReverseLine,
    detectPublicMoney,
    detectSharpMoney,
    detectLineFreeze,
    detectKeyNumber,
  ];

  for (const detector of detectors) {
    try {
      const patterns = detector(db, filter);
      allPatterns.push(...patterns);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`[PluginExecution] Pattern detector failed: ${msg}`);
    }
  }

  // Apply confidence filter
  let results = allPatterns;
  if (filter.minConfidence !== undefined) {
    results = results.filter((p) => p.confidence >= filter.minConfidence!);
  }
  if (filter.maxConfidence !== undefined) {
    results = results.filter((p) => p.confidence <= filter.maxConfidence!);
  }

  // Apply type filter
  if (filter.type) {
    results = results.filter((p) => p.patternType === filter.type);
  }

  // Apply market filter
  if (filter.market) {
    results = results.filter((p) => p.market === filter.market);
  }

  // Sort by detectedAt desc
  results.sort((a, b) => b.detectedAt - a.detectedAt);

  // Persist detected patterns
  persistPatterns(results);

  logPlugin({
    plugin: "PatternService",
    method: "detectPatterns",
    detected: results.length,
    filter: JSON.stringify(filter),
  });

  return results;
}

/**
 * Persist patterns to the database for historical tracking.
 */
function persistPatterns(patterns: WageringPattern[]): void {
  const db = getDb();

  for (const pat of patterns) {
    try {
      db.run(
        `INSERT OR IGNORE INTO patterns_detected
         (id, pattern_type, sport, event_id, market, description, confidence,
          factors_json, triggered_by_rule_id, detected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pat.id,
          pat.patternType,
          pat.sport,
          pat.eventId,
          pat.market,
          pat.description,
          pat.confidence,
          JSON.stringify(pat.factors),
          pat.triggeredByRuleId || null,
          pat.detectedAt,
        ]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`[PluginExecution] persistPatterns failed for ${pat.id}: ${msg}`);
    }
  }
}

/**
 * Get patterns from the database with filters.
 */
export function getPatterns(filter: PatternFilter = {}): { items: WageringPattern[]; total: number } {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (filter.type) {
    conditions.push("pattern_type = ?");
    params.push(filter.type);
  }
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
  if (filter.minConfidence !== undefined) {
    conditions.push("confidence >= ?");
    params.push(filter.minConfidence);
  }
  if (filter.from) {
    conditions.push("detected_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("detected_at <= ?");
    params.push(filter.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(filter.limit || 100, 500);
  const offset = filter.offset || 0;

  try {
    const countRow = db.query(`SELECT COUNT(*) as total FROM patterns_detected ${whereClause}`).get(...params) as { total: number };

    const rows = db.query(
      `SELECT id, pattern_type, sport, event_id, market, description, confidence,
              factors_json, triggered_by_rule_id, detected_at
       FROM patterns_detected
       ${whereClause}
       ORDER BY detected_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<{
      id: string; pattern_type: PatternType; sport: string; event_id: string;
      market: string; description: string; confidence: number;
      factors_json: string; triggered_by_rule_id: string | null; detected_at: number;
    }>;

    const items = rows.map((r) => ({
      id: r.id,
      patternType: r.pattern_type,
      sport: r.sport,
      eventId: r.event_id,
      market: r.market,
      description: r.description,
      confidence: r.confidence,
      confidenceLabel: scoreToLabel(r.confidence),
      factors: safeJsonParse<PatternFactor[]>(r.factors_json, []),
      triggeredByRuleId: r.triggered_by_rule_id ?? undefined,
      detectedAt: r.detected_at,
      expiresAt: r.detected_at + 600000,
    }));

    return { items, total: countRow.total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] getPatterns failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "getPatterns", error: msg });
    return { items: [], total: 0 };
  }
}

/**
 * Get a single pattern by ID.
 */
export function getPatternById(id: string): WageringPattern | null {
  const db = getDb();

  try {
    const row = db.query(
      `SELECT id, pattern_type, sport, event_id, market, description, confidence,
              factors_json, triggered_by_rule_id, detected_at
       FROM patterns_detected WHERE id = ?`
    ).get(id) as {
      id: string; pattern_type: PatternType; sport: string; event_id: string;
      market: string; description: string; confidence: number;
      factors_json: string; triggered_by_rule_id: string | null; detected_at: number;
    } | null;

    if (!row) return null;

    return {
      id: row.id,
      patternType: row.pattern_type,
      sport: row.sport,
      eventId: row.event_id,
      market: row.market,
      description: row.description,
      confidence: row.confidence,
      confidenceLabel: scoreToLabel(row.confidence),
      factors: safeJsonParse<PatternFactor[]>(row.factors_json, []),
      triggeredByRuleId: row.triggered_by_rule_id ?? undefined,
      detectedAt: row.detected_at,
      expiresAt: row.detected_at + 600000,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] getPatternById failed for ${id}: ${msg}`);
    return null;
  }
}

/**
 * Get pattern history for a given time range and filters.
 */
export function getPatternHistory(filter: PatternFilter = {}): { items: PatternHistory[]; total: number } {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (filter.type) {
    conditions.push("pattern_type = ?");
    params.push(filter.type);
  }
  if (filter.sport) {
    conditions.push("sport = ?");
    params.push(filter.sport);
  }
  if (filter.eventId) {
    conditions.push("event_id = ?");
    params.push(filter.eventId);
  }
  if (filter.from) {
    conditions.push("detected_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("detected_at <= ?");
    params.push(filter.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(filter.limit || 100, 500);
  const offset = filter.offset || 0;

  try {
    const countRow = db.query(`SELECT COUNT(*) as total FROM patterns_detected ${whereClause}`).get(...params) as { total: number };

    const rows = db.query(
      `SELECT id, pattern_type, sport, event_id, market, description, confidence,
              factors_json, triggered_by_rule_id, detected_at, outcome, outcome_note
       FROM patterns_detected
       ${whereClause}
       ORDER BY detected_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Array<{
      id: string; pattern_type: PatternType; sport: string; event_id: string;
      market: string; description: string; confidence: number;
      factors_json: string; triggered_by_rule_id: string | null;
      detected_at: number; outcome: string | null; outcome_note: string | null;
    }>;

    const items = rows.map((r) => ({
      id: r.id,
      patternType: r.pattern_type,
      sport: r.sport,
      eventId: r.event_id,
      market: r.market,
      description: r.description,
      confidence: r.confidence,
      factors: safeJsonParse<PatternFactor[]>(r.factors_json, []),
      triggeredByRuleId: r.triggered_by_rule_id ?? undefined,
      detectedAt: r.detected_at,
      outcome: (r.outcome as "hit" | "miss" | "pending") ?? "pending",
      outcomeNote: r.outcome_note ?? undefined,
    }));

    return { items, total: countRow.total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] getPatternHistory failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "getPatternHistory", error: msg });
    return { items: [], total: 0 };
  }
}

/**
 * Get pattern statistics summary.
 */
export function getPatternStats(filter: PatternFilter = {}): PatternStatsSummary {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (filter.sport) {
    conditions.push("sport = ?");
    params.push(filter.sport);
  }
  if (filter.from) {
    conditions.push("detected_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("detected_at <= ?");
    params.push(filter.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Total count
    const totalRow = db.query(`SELECT COUNT(*) as total FROM patterns_detected ${whereClause}`).get(...params) as { total: number };

    // Per-type breakdown
    const typeRows = db.query(
      `SELECT pattern_type,
              COUNT(*) as cnt,
              AVG(confidence) as avg_conf,
              SUM(CASE WHEN outcome = 'hit' THEN 1 ELSE 0 END) as hits,
              SUM(CASE WHEN outcome = 'miss' THEN 1 ELSE 0 END) as misses,
              SUM(CASE WHEN outcome = 'pending' OR outcome IS NULL THEN 1 ELSE 0 END) as pending,
              MAX(detected_at) as last_detected
       FROM patterns_detected
       ${whereClause}
       GROUP BY pattern_type`
    ).all(...params) as Array<{
      pattern_type: PatternType; cnt: number; avg_conf: number;
      hits: number; misses: number; pending: number; last_detected: number;
    }>;

    // Top sport
    const sportRow = db.query(
      `SELECT sport, COUNT(*) as cnt FROM patterns_detected ${whereClause} GROUP BY sport ORDER BY cnt DESC LIMIT 1`
    ).get(...params) as { sport: string; cnt: number } | null;

    // Time range
    const rangeRow = db.query(
      `SELECT MIN(detected_at) as min_dt, MAX(detected_at) as max_dt FROM patterns_detected ${whereClause}`
    ).get(...params) as { min_dt: number; max_dt: number } | null;

    const byType: PatternTypeStats[] = typeRows.map((r) => {
      const total = r.cnt;
      const hitRate = total > 0 ? Math.round((r.hits / total) * 1000) / 10 : 0;
      const hours = filter.to && filter.from ? (filter.to - filter.from) / 3600000 : 24;
      return {
        patternType: r.pattern_type,
        totalDetected: r.cnt,
        avgConfidence: Math.round(r.avg_conf * 10) / 10,
        hitCount: r.hits,
        missCount: r.misses,
        pendingCount: r.pending,
        hitRate,
        lastDetectedAt: r.last_detected,
        frequencyPerDay: Math.round((r.cnt / hours) * 24 * 10) / 10,
      };
    });

    const totalHits = byType.reduce((sum, t) => sum + t.hitCount, 0);
    const totalAll = totalRow.total;
    const overallHitRate = totalAll > 0 ? Math.round((totalHits / totalAll) * 1000) / 10 : 0;
    const avgConfidence = byType.length > 0
      ? Math.round(byType.reduce((s, t) => s + t.avgConfidence * t.totalDetected, 0) / totalAll * 10) / 10
      : 0;

    return {
      totalPatterns: totalRow.total,
      byType,
      overallHitRate,
      avgConfidence,
      topSport: sportRow?.sport || "N/A",
      timeRange: {
        from: rangeRow?.min_dt || 0,
        to: rangeRow?.max_dt || Date.now(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] getPatternStats failed: ${msg}`);
    logPlugin({ plugin: "PatternService", method: "getPatternStats", error: msg });
    return {
      totalPatterns: 0,
      byType: [],
      overallHitRate: 0,
      avgConfidence: 0,
      topSport: "N/A",
      timeRange: { from: 0, to: Date.now() },
    };
  }
}

/**
 * Update the outcome of a pattern (hit/miss).
 */
export function updatePatternOutcome(id: string, outcome: "hit" | "miss", note?: string): void {
  const db = getDb();

  try {
    db.run(
      `UPDATE patterns_detected SET outcome = ?, outcome_note = ? WHERE id = ?`,
      [outcome, note || null, id]
    );

    logPlugin({ plugin: "PatternService", method: "updatePatternOutcome", id, outcome });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] updatePatternOutcome failed for ${id}: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Re-export confidence utilities
export { scoreToLabel, confidenceColor };
