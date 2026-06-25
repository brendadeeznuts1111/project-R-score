/**
 * Arbitrage Detection Engine
 *
 * Cross-provider arbitrage scanner for prediction markets.
 * Core formula: if (1/yes_A + 1/no_B) < 1 -> arbitrage exists
 *
 * Zone: 3 (Forest Canopy)
 */

import { getDb } from "@db/index";
import { createLogger } from "@utils/logger";
import { logMarketDepth } from "@utils/tableLogger";
import type {
  PredictionProvider,
  PredictionMarket,
  ArbitrageOpportunity,
  ArbitrageStatus,
} from "@utils/types";

const logger = createLogger("ArbitrageDetector");

// Minimum profit threshold to report (1%)
const MIN_PROFIT_THRESHOLD = 0.01;
// Arbitrage expiry time (15 minutes)
const ARB_EXPIRY_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const SQL = {
  insertArbitrage: `
    INSERT OR REPLACE INTO prediction_arbitrage 
      (id, market_id, market_name, category, provider_a, price_a, side_a, provider_b, price_b, side_b, spread, profit_pct, implied_probability_a, implied_probability_b, detected_at, expires_at, status)
    VALUES 
      (:id, :marketId, :marketName, :category, :providerA, :priceA, :sideA, :providerB, :priceB, :sideB, :spread, :profitPct, :impliedProbA, :impliedProbB, :detectedAt, :expiresAt, 'active')
  `,

  getActiveArbitrage: `
    SELECT * FROM prediction_arbitrage 
    WHERE status = 'active' AND expires_at > :now
    ORDER BY profit_pct DESC
  `,

  getArbitrageByMarket: `
    SELECT * FROM prediction_arbitrage WHERE market_id = ? ORDER BY detected_at DESC
  `,

  getArbitrageHistory: `
    SELECT * FROM prediction_arbitrage 
    WHERE status != 'active' OR expires_at <= :now
    ORDER BY detected_at DESC
    LIMIT :limit
  `,

  expireOldArbitrage: `
    UPDATE prediction_arbitrage 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at <= :now
  `,

  getArbitrageStats: `
    SELECT 
      COUNT(*) as total_detected,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN status = 'executed' THEN 1 ELSE 0 END) as executed_count,
      AVG(CASE WHEN profit_pct > 0 THEN profit_pct END) as avg_profit,
      MAX(profit_pct) as max_profit
    FROM prediction_arbitrage
  `,
};

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function mapArbitrageRow(row: Record<string, unknown>): ArbitrageOpportunity {
  return {
    id: String(row.id),
    marketId: String(row.market_id),
    marketName: row.market_name ? String(row.market_name) : undefined,
    category: row.category ? (String(row.category) as PredictionMarket["category"]) : undefined,
    providerA: String(row.provider_a) as PredictionProvider,
    priceA: Number(row.price_a),
    sideA: String(row.side_a) as "yes" | "no",
    providerB: String(row.provider_b) as PredictionProvider,
    priceB: Number(row.price_b),
    sideB: String(row.side_b) as "yes" | "no",
    spread: Number(row.spread),
    profitPct: Number(row.profit_pct),
    impliedProbabilityA: Number(row.implied_probability_a),
    impliedProbabilityB: Number(row.implied_probability_b),
    detectedAt: Number(row.detected_at),
    expiresAt: Number(row.expires_at),
    status: String(row.status) as ArbitrageStatus,
  };
}

// ---------------------------------------------------------------------------
// Core arbitrage math
// ---------------------------------------------------------------------------

/**
 * Calculate implied probability from a decimal price.
 */
export function calculateImpliedProbability(price: number): number {
  if (price <= 0 || price > 1) return 0;
  return 1 / price;
}

/**
 * Calculate the spread between two implied probabilities.
 */
export function calculateSpread(probA: number, probB: number): number {
  return Math.abs(probA + probB - 1);
}

/**
 * Check if an arbitrage opportunity exists.
 * Formula: if impliedProbA + impliedProbB < 1 -> arbitrage exists
 */
export function checkArbitrage(impliedProbA: number, impliedProbB: number): {
  exists: boolean;
  profitPct: number;
  spread: number;
} {
  const combined = impliedProbA + impliedProbB;
  const exists = combined < 1;
  const profitPct = exists ? (1 - combined) * 100 : 0;
  const spread = Math.abs(combined - 1);

  return { exists, profitPct, spread };
}

/**
 * Find all arbitrage opportunities between two providers' markets.
 */
export function findArbitrageBetweenProviders(
  marketA: PredictionMarket,
  marketB: PredictionMarket,
  marketName?: string,
  category?: PredictionMarket["category"]
): ArbitrageOpportunity | null {
  // Try Yes on A, No on B
  const yesA_implied = calculateImpliedProbability(marketA.outcomeYesPrice);
  const noB_implied = calculateImpliedProbability(marketB.outcomeNoPrice);
  const arb1 = checkArbitrage(yesA_implied, noB_implied);

  if (arb1.exists && arb1.profitPct > MIN_PROFIT_THRESHOLD * 100) {
    return createArbitrageOpportunity(
      marketA.marketId,
      marketName,
      category,
      marketA.provider,
      marketA.outcomeYesPrice,
      "yes",
      marketB.provider,
      marketB.outcomeNoPrice,
      "no",
      arb1.spread,
      arb1.profitPct,
      yesA_implied,
      noB_implied
    );
  }

  // Try No on A, Yes on B
  const noA_implied = calculateImpliedProbability(marketA.outcomeNoPrice);
  const yesB_implied = calculateImpliedProbability(marketB.outcomeYesPrice);
  const arb2 = checkArbitrage(noA_implied, yesB_implied);

  if (arb2.exists && arb2.profitPct > MIN_PROFIT_THRESHOLD * 100) {
    return createArbitrageOpportunity(
      marketA.marketId,
      marketName,
      category,
      marketA.provider,
      marketA.outcomeNoPrice,
      "no",
      marketB.provider,
      marketB.outcomeYesPrice,
      "yes",
      arb2.spread,
      arb2.profitPct,
      noA_implied,
      yesB_implied
    );
  }

  return null;
}

function createArbitrageOpportunity(
  marketId: string,
  marketName: string | undefined,
  category: PredictionMarket["category"] | undefined,
  providerA: PredictionProvider,
  priceA: number,
  sideA: "yes" | "no",
  providerB: PredictionProvider,
  priceB: number,
  sideB: "yes" | "no",
  spread: number,
  profitPct: number,
  impliedProbA: number,
  impliedProbB: number
): ArbitrageOpportunity {
  const now = Date.now();
  return {
    id: `arb_${providerA}_${providerB}_${marketId}_${now}`,
    marketId,
    marketName,
    category,
    providerA,
    priceA,
    sideA,
    providerB,
    priceB,
    sideB,
    spread,
    profitPct,
    impliedProbabilityA: impliedProbA,
    impliedProbabilityB: impliedProbB,
    detectedAt: Math.floor(now / 1000),
    expiresAt: Math.floor((now + ARB_EXPIRY_MS) / 1000),
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Scan all open markets across providers for arbitrage opportunities.
 */
export function scanForArbitrage(): ArbitrageOpportunity[] {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    // First, expire old arbitrage
    db.query(SQL.expireOldArbitrage).run({ now });

    // Get all open markets grouped by market_id
    const rows = db.query(
      `SELECT * FROM prediction_markets WHERE status = 'open' ORDER BY market_id, provider`
    ).all() as Record<string, unknown>[];

    // Group by market_id
    const marketGroups = new Map<string, PredictionMarket[]>();
    for (const row of rows) {
      const m: PredictionMarket = {
        id: String(row.id),
        provider: String(row.provider) as PredictionProvider,
        marketId: String(row.market_id),
        marketName: String(row.market_name),
        category: String(row.category) as PredictionMarket["category"],
        outcomeYesPrice: Number(row.outcome_yes_price),
        outcomeNoPrice: Number(row.outcome_no_price),
        volume: Number(row.volume),
        liquidity: Number(row.liquidity),
        closeDate: Number(row.close_date),
        status: String(row.status) as PredictionMarket["status"],
        fetchedAt: Number(row.fetched_at),
        createdAt: Number(row.created_at),
      };

      const existing = marketGroups.get(m.marketId) || [];
      existing.push(m);
      marketGroups.set(m.marketId, existing);
    }

    const opportunities: ArbitrageOpportunity[] = [];

    // Compare each pair within the same market
    for (const [, group] of marketGroups) {
      if (group.length < 2) continue;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const arb = findArbitrageBetweenProviders(
            group[i],
            group[j],
            group[i].marketName,
            group[i].category
          );
          if (arb) {
            opportunities.push(arb);
          }

          // Also check the reverse direction
          const arbReverse = findArbitrageBetweenProviders(
            group[j],
            group[i],
            group[i].marketName,
            group[i].category
          );
          if (arbReverse) {
            opportunities.push(arbReverse);
          }
        }
      }
    }

    // Persist opportunities to database
    persistArbitrageOpportunities(opportunities);

    // Log summary
    if (opportunities.length > 0) {
      logMarketDepth({
        eventId: "arbitrage_scan",
        spread: opportunities.length,
        total: opportunities.reduce((max, o) => Math.max(max, o.profitPct), 0),
        lastUpdated: new Date().toISOString(),
      });
    }

    logger.info(`[MarketDepth] Arbitrage scan complete: ${opportunities.length} opportunities found`);
    return opportunities;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] Arbitrage scan error: ${msg}`);
    logMarketDepth({ eventId: "arbitrage_scan", error: msg });
    return [];
  }
}

/**
 * Find profitable arbitrage opportunities (positive EV only).
 */
export function findProfitableArb(minProfitPct = 0): ArbitrageOpportunity[] {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const rows = db.query(
    `SELECT * FROM prediction_arbitrage 
     WHERE status = 'active' 
       AND expires_at > :now 
       AND profit_pct >= :minProfit
     ORDER BY profit_pct DESC`
  ).all({ now, minProfit: minProfitPct }) as Record<string, unknown>[];

  return rows.map(mapArbitrageRow);
}

/**
 * Get all active arbitrage opportunities.
 */
export function getActiveArbitrage(): ArbitrageOpportunity[] {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Expire old first
  db.query(SQL.expireOldArbitrage).run({ now });

  const rows = db.query(SQL.getActiveArbitrage).all({ now }) as Record<string, unknown>[];
  return rows.map(mapArbitrageRow);
}

/**
 * Get arbitrage history.
 */
export function getArbitrageHistory(limit = 50): ArbitrageOpportunity[] {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const rows = db.query(SQL.getArbitrageHistory).all({ now, limit }) as Record<string, unknown>[];
  return rows.map(mapArbitrageRow);
}

/**
 * Get arbitrage statistics.
 */
export function getArbitrageStats(): {
  totalDetected: number;
  activeCount: number;
  executedCount: number;
  avgProfit: number;
  maxProfit: number;
} {
  const db = getDb();
  const row = db.query(SQL.getArbitrageStats).get() as Record<string, unknown> | null;

  if (!row) {
    return { totalDetected: 0, activeCount: 0, executedCount: 0, avgProfit: 0, maxProfit: 0 };
  }

  return {
    totalDetected: Number(row.total_detected) || 0,
    activeCount: Number(row.active_count) || 0,
    executedCount: Number(row.executed_count) || 0,
    avgProfit: Math.round((Number(row.avg_profit) || 0) * 100) / 100,
    maxProfit: Math.round((Number(row.max_profit) || 0) * 100) / 100,
  };
}

/**
 * Mark an arbitrage as executed.
 */
export function markArbitrageExecuted(id: string): void {
  const db = getDb();
  db.query("UPDATE prediction_arbitrage SET status = 'executed' WHERE id = ?").run(id);
  logger.info(`[MarketDepth] Arbitrage ${id} marked as executed`);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function persistArbitrageOpportunities(opportunities: ArbitrageOpportunity[]): void {
  const db = getDb();
  const insert = db.query(SQL.insertArbitrage);

  for (const arb of opportunities) {
    try {
      insert.run({
        id: arb.id,
        marketId: arb.marketId,
        marketName: arb.marketName ?? null,
        category: arb.category ?? null,
        providerA: arb.providerA,
        priceA: arb.priceA,
        sideA: arb.sideA,
        providerB: arb.providerB,
        priceB: arb.priceB,
        sideB: arb.sideB,
        spread: arb.spread,
        profitPct: arb.profitPct,
        impliedProbA: arb.impliedProbabilityA,
        impliedProbB: arb.impliedProbabilityB,
        detectedAt: arb.detectedAt,
        expiresAt: arb.expiresAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`[MarketDepth] Failed to persist arbitrage ${arb.id}: ${msg}`);
    }
  }
}
