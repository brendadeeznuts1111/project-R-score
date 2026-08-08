/**
 * Prediction Market Aggregator Service
 *
 * Multi-provider prediction market data aggregation with support for:
 * - Kalshi, Polymarket, PredictIt, Betfair Exchange
 * - Price fetching and caching
 * - Market depth analysis
 * - Arbitrage opportunity detection
 * - Price history tracking
 *
 * Zone: 3 (Forest Canopy)
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { getDb } from "@db/index";
import { createLogger } from "@utils/logger";
import { logMarketDepth } from "@utils/tableLogger";
import type {
  PredictionProvider,
  PredictionMarket,
  PredictionMarketCategory,
  PredictionMarketStatus,
  PredictionMarketFilter,
  MarketDepth,
  PriceHistoryEntry,
  ProviderConfig,
} from "@utils/types";

const logger = createLogger("PredictionMarket");

// ---------------------------------------------------------------------------
// Provider configurations
// ---------------------------------------------------------------------------

const PROVIDER_CONFIGS: Record<PredictionProvider, ProviderConfig> = {
  kalshi: {
    id: "kalshi",
    name: "Kalshi",
    enabled: true,
    apiEndpoint: "https://api.elections.kalshi.com/trade-api/v2",
    rateLimitPerMinute: 60,
    status: "active",
  },
  polymarket: {
    id: "polymarket",
    name: "Polymarket",
    enabled: true,
    apiEndpoint: "https://clob.polymarket.com",
    rateLimitPerMinute: 120,
    status: "active",
  },
  predictit: {
    id: "predictit",
    name: "PredictIt",
    enabled: true,
    apiEndpoint: "https://www.predictit.org/api/marketdata/all",
    rateLimitPerMinute: 30,
    status: "active",
  },
  betfair: {
    id: "betfair",
    name: "Betfair Exchange",
    enabled: true,
    apiEndpoint: "https://api.betfair.com/exchange/betting/json-rpc/v1",
    rateLimitPerMinute: 60,
    status: "active",
  },
};

// ---------------------------------------------------------------------------
// SQL queries
// ---------------------------------------------------------------------------

const SQL = {
  insertMarket: `
    INSERT OR REPLACE INTO prediction_markets 
      (id, provider, market_id, market_name, category, outcome_yes_price, outcome_no_price, volume, liquidity, close_date, status, fetched_at, created_at)
    VALUES 
      (:id, :provider, :marketId, :marketName, :category, :yesPrice, :noPrice, :volume, :liquidity, :closeDate, :status, :fetchedAt, COALESCE((SELECT created_at FROM prediction_markets WHERE id = :id), :fetchedAt))
  `,

  getMarkets: `
    SELECT * FROM prediction_markets
    WHERE (:provider IS NULL OR provider = :provider)
      AND (:category IS NULL OR category = :category)
      AND (:status IS NULL OR status = :status)
      AND (:search IS NULL OR market_name LIKE :search)
      AND (:minVolume IS NULL OR volume >= :minVolume)
    ORDER BY fetched_at DESC
    LIMIT :limit OFFSET :offset
  `,

  getMarketById: `SELECT * FROM prediction_markets WHERE id = ?`,

  getMarketCount: `
    SELECT COUNT(*) as count FROM prediction_markets
    WHERE (:provider IS NULL OR provider = :provider)
      AND (:category IS NULL OR category = :category)
      AND (:status IS NULL OR status = :status)
  `,

  insertPriceHistory: `
    INSERT INTO prediction_price_history (market_id, provider, yes_price, no_price, volume, timestamp)
    VALUES (:marketId, :provider, :yesPrice, :noPrice, :volume, :timestamp)
  `,

  getPriceHistory: `
    SELECT * FROM prediction_price_history
    WHERE market_id = :marketId
      AND (:provider IS NULL OR provider = :provider)
    ORDER BY timestamp DESC
    LIMIT :limit
  `,

  getRecentMarkets: `
    SELECT * FROM prediction_markets
    WHERE fetched_at >= :since
    ORDER BY fetched_at DESC
  `,

  cleanupOldHistory: `
    DELETE FROM prediction_price_history
    WHERE timestamp < :cutoff
  `,

  getMarketsByProvider: `
    SELECT * FROM prediction_markets WHERE provider = ? ORDER BY fetched_at DESC
  `,

  getActiveMarketIds: `SELECT DISTINCT market_id FROM prediction_markets WHERE status = 'open'`,

  updateMarketStatus: `
    UPDATE prediction_markets SET status = :status, fetched_at = :fetchedAt WHERE id = :id
  `,
};

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapMarketRow(row: Record<string, unknown>): PredictionMarket {
  return {
    id: String(row.id),
    provider: String(row.provider) as PredictionProvider,
    marketId: String(row.market_id),
    marketName: String(row.market_name),
    category: String(row.category) as PredictionMarketCategory,
    outcomeYesPrice: Number(row.outcome_yes_price),
    outcomeNoPrice: Number(row.outcome_no_price),
    volume: Number(row.volume),
    liquidity: Number(row.liquidity),
    closeDate: Number(row.close_date),
    status: String(row.status) as PredictionMarketStatus,
    fetchedAt: Number(row.fetched_at),
    createdAt: Number(row.created_at),
  };
}

function mapPriceHistoryRow(row: Record<string, unknown>): PriceHistoryEntry {
  return {
    id: String(row.id),
    marketId: String(row.market_id),
    provider: String(row.provider) as PredictionProvider,
    yesPrice: Number(row.yes_price),
    noPrice: Number(row.no_price),
    volume: Number(row.volume),
    timestamp: Number(row.timestamp),
  };
}

// ---------------------------------------------------------------------------
// Mock data generators for providers without API keys
// ---------------------------------------------------------------------------

function generateMockMarkets(provider: PredictionProvider): PredictionMarket[] {
  const now = Date.now();
  const markets: PredictionMarket[] = [];

  const mockData: Record<PredictionProvider, Array<{
    name: string;
    category: PredictionMarketCategory;
    yesPrice: number;
    noPrice: number;
    volume: number;
    liquidity: number;
    closeDays: number;
  }>> = {
    kalshi: [
      { name: "Will it rain in NYC tomorrow?", category: "other", yesPrice: 0.35, noPrice: 0.66, volume: 125000, liquidity: 45000, closeDays: 1 },
      { name: "S&P 500 up this week?", category: "economics", yesPrice: 0.52, noPrice: 0.49, volume: 890000, liquidity: 320000, closeDays: 7 },
      { name: "Fed rate cut by June?", category: "economics", yesPrice: 0.28, noPrice: 0.73, volume: 2100000, liquidity: 780000, closeDays: 90 },
      { name: "US GDP growth > 2% in Q2?", category: "economics", yesPrice: 0.61, noPrice: 0.40, volume: 670000, liquidity: 250000, closeDays: 120 },
    ],
    polymarket: [
      { name: "Trump to win 2024?", category: "politics", yesPrice: 0.48, noPrice: 0.53, volume: 45000000, liquidity: 12000000, closeDays: 180 },
      { name: "BTC above $100k by year end?", category: "crypto", yesPrice: 0.42, noPrice: 0.59, volume: 18000000, liquidity: 5400000, closeDays: 300 },
      { name: "Chiefs win Super Bowl LIX?", category: "sports", yesPrice: 0.22, noPrice: 0.79, volume: 3200000, liquidity: 980000, closeDays: 240 },
      { name: "ETH ETF approved in 2025?", category: "crypto", yesPrice: 0.75, noPrice: 0.26, volume: 7600000, liquidity: 2300000, closeDays: 365 },
      { name: "New all-time high for S&P 500?", category: "economics", yesPrice: 0.58, noPrice: 0.43, volume: 5400000, liquidity: 1800000, closeDays: 240 },
    ],
    predictit: [
      { name: "Democrats win 2024 popular vote?", category: "politics", yesPrice: 0.55, noPrice: 0.46, volume: 450000, liquidity: 120000, closeDays: 180 },
      { name: "Republicans take Senate?", category: "politics", yesPrice: 0.62, noPrice: 0.39, volume: 890000, liquidity: 280000, closeDays: 180 },
      { name: "Lakers win Western Conference?", category: "sports", yesPrice: 0.18, noPrice: 0.83, volume: 120000, liquidity: 35000, closeDays: 150 },
    ],
    betfair: [
      { name: "Man City win Premier League?", category: "sports", yesPrice: 0.72, noPrice: 0.30, volume: 2300000, liquidity: 680000, closeDays: 120 },
      { name: "Tesla stock up this month?", category: "economics", yesPrice: 0.45, noPrice: 0.56, volume: 1800000, liquidity: 520000, closeDays: 30 },
      { name: "Eurovision UK top 5?", category: "entertainment", yesPrice: 0.15, noPrice: 0.87, volume: 340000, liquidity: 95000, closeDays: 60 },
      { name: "NASA find life on Mars in 2025?", category: "science", yesPrice: 0.08, noPrice: 0.93, volume: 56000, liquidity: 18000, closeDays: 365 },
    ],
  };

  const providerData = mockData[provider] || [];
  for (let i = 0; i < providerData.length; i++) {
    const d = providerData[i];
    markets.push({
      id: `${provider}_${i}`,
      provider,
      marketId: `${provider}_market_${i}`,
      marketName: d.name,
      category: d.category,
      outcomeYesPrice: d.yesPrice,
      outcomeNoPrice: d.noPrice,
      volume: d.volume,
      liquidity: d.liquidity,
      closeDate: Math.floor((now + d.closeDays * 86400000) / 1000),
      status: "open",
      fetchedAt: Math.floor(now / 1000),
      createdAt: Math.floor(now / 1000),
    });
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Provider fetchers
// ---------------------------------------------------------------------------

async function fetchKalshiMarkets(): Promise<PredictionMarket[]> {
  const config = PROVIDER_CONFIGS.kalshi;
  const apiKey = process.env.KALSHI_API_KEY;

  if (!apiKey) {
    logger.info("No KALSHI_API_KEY, using mock data");
    return generateMockMarkets("kalshi");
  }

  try {
    const response = await fetch(`${config.apiEndpoint}/markets`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data = await response.json();
    const markets: PredictionMarket[] = [];

    for (const m of data.markets || []) {
      markets.push({
        id: `kalshi_${m.ticker}`,
        provider: "kalshi",
        marketId: m.ticker,
        marketName: m.title || m.ticker,
        category: categorizeMarket(m.title || ""),
        outcomeYesPrice: m.yes_ask / 100 || 0.5,
        outcomeNoPrice: m.no_ask / 100 || 0.5,
        volume: m.volume || 0,
        liquidity: m.open_interest || 0,
        closeDate: Math.floor(new Date(m.settlement_date || Date.now()).getTime() / 1000),
        status: m.status === "active" ? "open" : "closed",
        fetchedAt: Math.floor(Date.now() / 1000),
        createdAt: Math.floor(Date.now() / 1000),
      });
    }

    config.lastFetchedAt = Date.now();
    config.status = "active";
    logger.info(`Fetched ${markets.length} markets from Kalshi`);
    return markets;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Kalshi fetch failed: ${msg}, falling back to mock`);
    config.status = "degraded";
    return generateMockMarkets("kalshi");
  }
}

async function fetchPolymarketMarkets(): Promise<PredictionMarket[]> {
  const config = PROVIDER_CONFIGS.polymarket;

  try {
    const response = await fetch(`${config.apiEndpoint}/markets`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    const markets: PredictionMarket[] = [];

    for (const m of data.markets || []) {
      markets.push({
        id: `poly_${m.id || m.condition_id}`,
        provider: "polymarket",
        marketId: m.id || m.condition_id || "",
        marketName: m.question || m.title || "Unknown",
        category: categorizeMarket(m.question || ""),
        outcomeYesPrice: m.best_ask || m.yes_price || 0.5,
        outcomeNoPrice: m.best_bid ? 1 - m.best_bid : 0.5,
        volume: m.volume || 0,
        liquidity: m.liquidity || 0,
        closeDate: Math.floor(new Date(m.end_date || Date.now()).getTime() / 1000),
        status: m.active === false ? "closed" : "open",
        fetchedAt: Math.floor(Date.now() / 1000),
        createdAt: Math.floor(Date.now() / 1000),
      });
    }

    config.lastFetchedAt = Date.now();
    config.status = "active";
    logger.info(`Fetched ${markets.length} markets from Polymarket`);
    return markets;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Polymarket fetch failed: ${msg}, falling back to mock`);
    config.status = "degraded";
    return generateMockMarkets("polymarket");
  }
}

async function fetchPredictItMarkets(): Promise<PredictionMarket[]> {
  const config = PROVIDER_CONFIGS.predictit;

  try {
    const response = await fetch(config.apiEndpoint || "", {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`PredictIt API error: ${response.status}`);
    }

    const data = await response.json();
    const markets: PredictionMarket[] = [];

    for (const m of data.markets || []) {
      const contract = m.contracts?.[0] || {};
      markets.push({
        id: `pi_${m.id}`,
        provider: "predictit",
        marketId: String(m.id),
        marketName: m.name || "Unknown",
        category: categorizeMarket(m.name || ""),
        outcomeYesPrice: (contract.bestBuyYesCost || 50) / 100,
        outcomeNoPrice: (contract.bestBuyNoCost || 50) / 100,
        volume: m.volume || 0,
        liquidity: m.totalSharesTraded || 0,
        closeDate: Math.floor(new Date(m.dateEnd || Date.now()).getTime() / 1000),
        status: m.status === "Open" ? "open" : "closed",
        fetchedAt: Math.floor(Date.now() / 1000),
        createdAt: Math.floor(Date.now() / 1000),
      });
    }

    config.lastFetchedAt = Date.now();
    config.status = "active";
    logger.info(`Fetched ${markets.length} markets from PredictIt`);
    return markets;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`PredictIt fetch failed: ${msg}, falling back to mock`);
    config.status = "degraded";
    return generateMockMarkets("predictit");
  }
}

async function fetchBetfairMarkets(): Promise<PredictionMarket[]> {
  const config = PROVIDER_CONFIGS.betfair;
  const apiKey = process.env.BETFAIR_API_KEY;
  const sessionToken = process.env.BETFAIR_SESSION_TOKEN;

  if (!apiKey || !sessionToken) {
    logger.info("No BETFAIR_API_KEY or BETFAIR_SESSION_TOKEN, using mock data");
    return generateMockMarkets("betfair");
  }

  try {
    const response = await fetch(config.apiEndpoint || "", {
      method: "POST",
      headers: {
        "X-Application": apiKey,
        "X-Authentication": sessionToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "ExchangeAPI/getMarketCatalogue",
        params: {
          filter: { eventTypesIds: ["1", "2"] },
          maxResults: 50,
          sort: "FIRST_TO_START",
        },
        id: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Betfair API error: ${response.status}`);
    }

    const data = await response.json();
    const markets: PredictionMarket[] = [];

    for (const m of data.result || []) {
      const runner = m.runners?.[0] || {};
      markets.push({
        id: `bf_${m.marketId}`,
        provider: "betfair",
        marketId: m.marketId,
        marketName: m.marketName || "Unknown",
        category: categorizeMarket(m.marketName || ""),
        outcomeYesPrice: runner.ex?.availableToBack?.[0]?.price || 0.5,
        outcomeNoPrice: runner.ex?.availableToLay?.[0]?.price || 0.5,
        volume: m.totalMatched || 0,
        liquidity: m.totalAvailable || 0,
        closeDate: Math.floor(new Date(m.marketStartTime || Date.now()).getTime() / 1000),
        status: "open",
        fetchedAt: Math.floor(Date.now() / 1000),
        createdAt: Math.floor(Date.now() / 1000),
      });
    }

    config.lastFetchedAt = Date.now();
    config.status = "active";
    logger.info(`Fetched ${markets.length} markets from Betfair`);
    return markets;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Betfair fetch failed: ${msg}, falling back to mock`);
    config.status = "degraded";
    return generateMockMarkets("betfair");
  }
}

// ---------------------------------------------------------------------------
// Categorization helper
// ---------------------------------------------------------------------------

function categorizeMarket(name: string): PredictionMarketCategory {
  const lower = name.toLowerCase();
  if (/trump|biden|election|senate|congress|democrat|republican|vote|president|governor/.test(lower)) return "politics";
  if (/btc|bitcoin|eth|ethereum|crypto|etf|sol|cardano|blockchain/.test(lower)) return "crypto";
  if (/spx|sp500|nasdaq|dow|gdp|inflation|fed|rate|stock|tesla|apple/.test(lower)) return "economics";
  if (/super bowl|nba|nfl|mlb|nhl|premier|champions|lakers|celtics|golf|tennis/.test(lower)) return "sports";
  if (/oscar|grammy|eurovision|bbma|mtv|emmy/.test(lower)) return "entertainment";
  if (/nasa|mars|space|climate|weather|hurricane/.test(lower)) return "science";
  return "other";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getProviderConfigs(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}

export function getProviderConfig(provider: PredictionProvider): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[provider];
}

/**
 * Fetch odds from a specific provider and persist to database.
 */
export async function fetchMarketOdds(provider: PredictionProvider): Promise<PredictionMarket[]> {
  logger.info(`Fetching market odds from ${provider}`);
  const start = performance.now();

  let markets: PredictionMarket[];

  switch (provider) {
    case "kalshi":
      markets = await fetchKalshiMarkets();
      break;
    case "polymarket":
      markets = await fetchPolymarketMarkets();
      break;
    case "predictit":
      markets = await fetchPredictItMarkets();
      break;
    case "betfair":
      markets = await fetchBetfairMarkets();
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // Persist to database
  persistMarkets(markets);

  const duration = Math.round(performance.now() - start);
  logger.info(`Fetched and persisted ${markets.length} markets from ${provider} in ${duration}ms`);

  return markets;
}

/**
 * Fetch from all enabled providers.
 */
export async function fetchProvidersConcurrently(
  providers: readonly PredictionProvider[],
  fetchProvider: (provider: PredictionProvider) => Promise<PredictionMarket[]> = fetchMarketOdds,
): Promise<Record<PredictionProvider, PredictionMarket[]>> {
  const results: Partial<Record<PredictionProvider, PredictionMarket[]>> = {};

  const settled = await Promise.allSettled(
    providers.map((provider) => fetchProvider(provider)),
  );

  settled.forEach((result, index) => {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      results[provider] = result.value;
    } else {
      const err = result.reason;
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to fetch from ${provider}: ${msg}`);
      results[provider] = [];
    }
  });

  return results as Record<PredictionProvider, PredictionMarket[]>;
}

export async function fetchAllProviders(): Promise<Record<PredictionProvider, PredictionMarket[]>> {
  const enabledProviders = Object.values(PROVIDER_CONFIGS)
    .filter((config) => config.enabled)
    .map((config) => config.id);

  return fetchProvidersConcurrently(enabledProviders);
}

/**
 * Get markets from database with filters.
 */
export function getMarkets(filter: PredictionMarketFilter = {}): { markets: PredictionMarket[]; total: number } {
  const db = getDb();

  const searchPattern = filter.search ? `%${filter.search}%` : null;
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  const params = {
    provider: filter.provider ?? null,
    category: filter.category ?? null,
    status: filter.status ?? null,
    search: searchPattern,
    minVolume: filter.minVolume ?? null,
    limit,
    offset,
  };

  const countRow = db.query(SQL.getMarketCount).get(params) as { count: number } | null;
  const total = countRow?.count ?? 0;

  const rows = db.query(SQL.getMarkets).all(params) as Record<string, unknown>[];
  const markets = rows.map(mapMarketRow);

  return { markets, total };
}

/**
 * Get a single market by its internal ID.
 */
export function getMarketById(id: string): PredictionMarket | null {
  const db = getDb();
  const row = db.query(SQL.getMarketById).get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return mapMarketRow(row);
}

/**
 * Get market depth (order book simulation).
 */
export function getMarketDepth(marketId: string, provider?: PredictionProvider): MarketDepth {
  try {
    const db = getDb();
    let market: PredictionMarket | null = null;

    if (provider) {
      const rows = db.query(
        "SELECT * FROM prediction_markets WHERE market_id = ? AND provider = ?"
      ).all(marketId, provider) as Record<string, unknown>[];
      if (rows.length > 0) market = mapMarketRow(rows[0]);
    } else {
      const rows = db.query(
        "SELECT * FROM prediction_markets WHERE market_id = ? ORDER BY fetched_at DESC LIMIT 1"
      ).all(marketId) as Record<string, unknown>[];
      if (rows.length > 0) market = mapMarketRow(rows[0]);
    }

    if (!market) {
      // Return empty depth
      return {
        marketId,
        provider: provider || "kalshi",
        yesBids: [],
        yesAsks: [],
        noBids: [],
        noAsks: [],
        totalLiquidityYes: 0,
        totalLiquidityNo: 0,
        lastUpdated: Date.now(),
      };
    }

    // Simulate order book depth from market price
    const depth = generateSimulatedDepth(market);

    logMarketDepth({
      eventId: marketId,
      market: market.marketName,
      book: market.provider,
      spread: depth.yesAsks[0]?.price ? depth.yesAsks[0].price - depth.yesBids[0]?.price : 0,
      lastUpdated: new Date().toISOString(),
    });

    return depth;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logMarketDepth({ eventId: marketId, error: msg });
    logger.error(`[MarketDepth] getMarketDepth error: ${msg}`);
    throw err;
  }
}

/**
 * Generate simulated order book depth from market price.
 */
function generateSimulatedDepth(market: PredictionMarket): MarketDepth {
  const yesPrice = market.outcomeYesPrice;
  const noPrice = market.outcomeNoPrice;
  const baseLiquidity = market.liquidity;

  // Generate 5 levels on each side
  const yesBids = Array.from({ length: 5 }, (_, i) => ({
    price: Math.max(0.01, yesPrice - (i + 1) * 0.02),
    size: Math.round(baseLiquidity * (0.3 - i * 0.05)),
  }));

  const yesAsks = Array.from({ length: 5 }, (_, i) => ({
    price: Math.min(0.99, yesPrice + (i + 1) * 0.02),
    size: Math.round(baseLiquidity * (0.25 - i * 0.04)),
  }));

  const noBids = Array.from({ length: 5 }, (_, i) => ({
    price: Math.max(0.01, noPrice - (i + 1) * 0.02),
    size: Math.round(baseLiquidity * (0.2 - i * 0.03)),
  }));

  const noAsks = Array.from({ length: 5 }, (_, i) => ({
    price: Math.min(0.99, noPrice + (i + 1) * 0.02),
    size: Math.round(baseLiquidity * (0.18 - i * 0.03)),
  }));

  return {
    marketId: market.marketId,
    provider: market.provider,
    yesBids,
    yesAsks,
    noBids,
    noAsks,
    totalLiquidityYes: yesBids.reduce((s, b) => s + b.size, 0),
    totalLiquidityNo: noBids.reduce((s, b) => s + b.size, 0),
    lastUpdated: Date.now(),
  };
}

/**
 * Get real-time price tracking for a market.
 */
export function getMarketPrices(marketId: string): PredictionMarket[] {
  const db = getDb();
  const rows = db.query(
    "SELECT * FROM prediction_markets WHERE market_id = ? ORDER BY fetched_at DESC"
  ).all(marketId) as Record<string, unknown>[];

  return rows.map(mapMarketRow);
}

/**
 * Record price history snapshot for all active markets.
 */
export function recordPriceHistory(): void {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const markets = db.query(
    "SELECT * FROM prediction_markets WHERE status = 'open'"
  ).all() as Record<string, unknown>[];

  const insert = db.query(SQL.insertPriceHistory);
  let count = 0;

  for (const row of markets) {
    try {
      insert.run({
        marketId: String(row.market_id),
        provider: String(row.provider),
        yesPrice: Number(row.outcome_yes_price),
        noPrice: Number(row.outcome_no_price),
        volume: Number(row.volume),
        timestamp: now,
      });
      count++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`[MarketDepth] Failed to record price history: ${msg}`);
    }
  }

  logger.info(`[MarketDepth] Recorded price history for ${count} markets`);
}

/**
 * Get price history for a market.
 */
export function getPriceHistory(
  marketId: string,
  provider?: PredictionProvider,
  limit = 100
): PriceHistoryEntry[] {
  const db = getDb();
  const rows = db.query(SQL.getPriceHistory).all({
    marketId,
    provider: provider ?? null,
    limit,
  }) as Record<string, unknown>[];

  return rows.map(mapPriceHistoryRow);
}

/**
 * Clean up old price history entries.
 */
export function cleanupPriceHistory(retentionDays = 30): number {
  const db = getDb();
  const cutoff = Math.floor((Date.now() - retentionDays * 86400000) / 1000);

  const result = db.query(SQL.cleanupOldHistory).run({ cutoff });
  const deleted = result.changes || 0;

  logger.info(`[MarketDepth] Cleaned up ${deleted} old price history entries`);
  return deleted;
}

/**
 * Get all unique categories across markets.
 */
export function getMarketCategories(): PredictionMarketCategory[] {
  const db = getDb();
  const rows = db.query(
    "SELECT DISTINCT category FROM prediction_markets WHERE status = 'open'"
  ).all() as Array<{ category: string }>;

  return rows.map((r) => r.category as PredictionMarketCategory);
}

/**
 * Get provider status summary.
 */
export function getProviderStatus(): Array<{
  provider: PredictionProvider;
  name: string;
  enabled: boolean;
  status: string;
  marketCount: number;
  lastFetchedAt?: number;
}> {
  const db = getDb();
  const result: Array<{
    provider: PredictionProvider;
    name: string;
    enabled: boolean;
    status: string;
    marketCount: number;
    lastFetchedAt?: number;
  }> = [];

  for (const config of Object.values(PROVIDER_CONFIGS)) {
    const countRow = db.query(
      "SELECT COUNT(*) as count FROM prediction_markets WHERE provider = ?"
    ).get(config.id) as { count: number } | null;

    result.push({
      provider: config.id,
      name: config.name,
      enabled: config.enabled,
      status: config.status,
      marketCount: countRow?.count ?? 0,
      lastFetchedAt: config.lastFetchedAt,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function persistMarkets(markets: PredictionMarket[]): void {
  const db = getDb();
  const insert = db.query(SQL.insertMarket);

  for (const market of markets) {
    try {
      insert.run({
        id: market.id,
        provider: market.provider,
        marketId: market.marketId,
        marketName: market.marketName,
        category: market.category,
        yesPrice: market.outcomeYesPrice,
        noPrice: market.outcomeNoPrice,
        volume: market.volume,
        liquidity: market.liquidity,
        closeDate: market.closeDate,
        status: market.status,
        fetchedAt: market.fetchedAt,
        createdAt: market.createdAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error(`[MarketDepth] Failed to persist market ${market.id}: ${msg}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Cron job: periodic price history recording
// ---------------------------------------------------------------------------

export function startPriceHistoryCron(): void {
  // Record price history every 5 minutes via cron
  try {
    Bun.cron("*/5 * * * *", () => {
        try {
          recordPriceHistory();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          logger.error(`[MarketDepth] Price history cron error: ${msg}`);
        }
    });
    logger.info("[MarketDepth] Price history cron registered (every 5 minutes)");
  } catch {
    // Cron might already be registered or not available in this environment
  }
}

export function startHistoryCleanupCron(): void {
  // Clean up old history daily
  try {
    Bun.cron("0 2 * * *", () => {
        try {
          cleanupPriceHistory(30);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          logger.error(`[MarketDepth] History cleanup cron error: ${msg}`);
        }
    });
    logger.info("[MarketDepth] History cleanup cron registered (daily at 2am)");
  } catch {
    // Cron might already be registered
  }
}
