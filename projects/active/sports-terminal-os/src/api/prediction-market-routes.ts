/**
 * Prediction Market API Routes
 *
 * REST endpoints for prediction market data, arbitrage, and provider management.
 *
 * Zone: 3 (Forest Canopy)
 * Base: /api/prediction-markets
 */

import { createLogger } from "@utils/logger";
import { logMarketDepth } from "@utils/tableLogger";
import type { AuthContext, PredictionProvider, PredictionMarketFilter, PredictionMarket } from "@utils/types";
import {
  getMarkets,
  getMarketById,
  getMarketDepth,
  getMarketPrices,
  getPriceHistory,
  getProviderConfigs,
  getProviderStatus,
  fetchMarketOdds,
  fetchAllProviders,
  getProviderConfig,
  getMarketCategories,
  recordPriceHistory,
} from "@services/prediction-market-service";
import {
  scanForArbitrage,
  getActiveArbitrage,
  getArbitrageHistory,
  getArbitrageStats,
  markArbitrageExecuted,
} from "@services/arbitrage-detector";
import {
  broadcastPriceUpdate,
  broadcastArbitrageAlert,
  getPredictionSubscriberCount,
} from "@services/websocket-handlers/prediction-ws";

const logger = createLogger("PredictionMarketAPI");

// ---------------------------------------------------------------------------
// Helper: parse filters from URL
// ---------------------------------------------------------------------------

function parseFilters(url: URL): PredictionMarketFilter {
  const provider = url.searchParams.get("provider") as PredictionProvider | null;
  const category = url.searchParams.get("category") as PredictionMarket["category"] | null;
  const status = url.searchParams.get("status") as PredictionMarket["status"] | null;
  const search = url.searchParams.get("search") || undefined;
  const minVolume = url.searchParams.has("minVolume")
    ? Number(url.searchParams.get("minVolume"))
    : undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);

  return {
    ...(provider ? { provider } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(minVolume !== undefined ? { minVolume } : {}),
    limit,
    offset,
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/prediction-markets
 * List all markets with filters (provider, category, status)
 */
export async function handleListMarkets(req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filters = parseFilters(url);
    const { markets, total } = getMarkets(filters);

    return Response.json({
      markets,
      total,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
      hasMore: (filters.offset ?? 0) + markets.length < total,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleListMarkets error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/:id
 * Single market details
 */
export async function handleGetMarket(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Market ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const market = getMarketById(id);
    if (!market) {
      return Response.json({ error: "Market not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Get latest prices across all providers for this market_id
    const prices = getMarketPrices(market.marketId);

    return Response.json({
      market,
      prices,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleGetMarket error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/providers
 * List configured providers
 */
export async function handleListProviders(_req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const providers = getProviderStatus();
    const configs = getProviderConfigs();

    return Response.json({
      providers,
      configs: configs.map((c) => ({
        id: c.id,
        name: c.name,
        enabled: c.enabled,
        apiEndpoint: c.apiEndpoint,
        rateLimitPerMinute: c.rateLimitPerMinute,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleListProviders error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/arbitrage
 * Active arbitrage opportunities
 */
export async function handleGetArbitrage(req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const minProfit = Number(url.searchParams.get("minProfit") || 0);
    const history = url.searchParams.get("history") === "true";
    const limit = Number(url.searchParams.get("limit") || 50);

    let opportunities;
    if (history) {
      opportunities = getArbitrageHistory(limit);
    } else {
      opportunities = getActiveArbitrage();
    }

    // Filter by minimum profit
    if (minProfit > 0) {
      opportunities = opportunities.filter((o) => o.profitPct >= minProfit);
    }

    const stats = getArbitrageStats();

    return Response.json({
      opportunities,
      count: opportunities.length,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleGetArbitrage error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/prediction-markets/refresh
 * Trigger manual refresh of all providers
 */
export async function handleRefreshMarkets(_req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const start = performance.now();
    const results = await fetchAllProviders();

    const summary: Record<string, number> = {};
    for (const [provider, markets] of Object.entries(results)) {
      summary[provider] = markets.length;
    }

    // Run arbitrage scan after refresh
    const opportunities = scanForArbitrage();

    // Broadcast opportunities via WebSocket
    for (const arb of opportunities) {
      if (arb.profitPct > 2) {
        broadcastArbitrageAlert(arb);
      }
    }

    const duration = Math.round(performance.now() - start);

    logMarketDepth({
      eventId: "refresh",
      market: "all",
      spread: opportunities.length,
      lastUpdated: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      summary,
      arbitrageOpportunities: opportunities.length,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleRefreshMarkets error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/depth/:id
 * Market depth for a specific market
 */
export async function handleGetMarketDepth(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Market ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") as PredictionProvider | null;

    const depth = getMarketDepth(id, provider || undefined);

    return Response.json({
      depth,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleGetMarketDepth error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/history/:id
 * Price history for a specific market
 */
export async function handleGetPriceHistory(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Market ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") as PredictionProvider | null;
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);

    const history = getPriceHistory(id, provider || undefined, limit);

    return Response.json({
      marketId: id,
      provider,
      history,
      count: history.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleGetPriceHistory error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/categories
 * List all unique categories
 */
export async function handleListCategories(_req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const categories = getMarketCategories();

    return Response.json({
      categories,
      count: categories.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleListCategories error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/stats
 * Overall prediction market statistics
 */
export async function handleGetStats(_req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const providers = getProviderStatus();
    const arbStats = getArbitrageStats();
    const wsSubscribers = getPredictionSubscriberCount();

    const totalMarkets = providers.reduce((sum, p) => sum + p.marketCount, 0);
    const activeProviders = providers.filter((p) => p.status === "active").length;

    return Response.json({
      totalMarkets,
      activeProviders,
      totalProviders: providers.length,
      activeArbitrage: arbStats.activeCount,
      totalArbitrageDetected: arbStats.totalDetected,
      avgArbitrageProfit: arbStats.avgProfit,
      maxArbitrageProfit: arbStats.maxProfit,
      wsSubscribers,
      providers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleGetStats error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/prediction-markets/arbitrage/:id/execute
 * Mark an arbitrage opportunity as executed
 */
export async function handleExecuteArbitrage(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Arbitrage ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    markArbitrageExecuted(id);

    return Response.json({
      success: true,
      id,
      status: "executed",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleExecuteArbitrage error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/prediction-markets/provider/:provider
 * Markets for a specific provider
 */
export async function handleGetProviderMarkets(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  try {
    const provider = params?.provider as PredictionProvider | undefined;
    if (!provider) {
      return Response.json({ error: "Provider required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const config = getProviderConfig(provider);
    if (!config) {
      return Response.json({ error: "Unknown provider", code: "NOT_FOUND" }, { status: 404 });
    }

    const { markets, total } = getMarkets({ provider, limit: 100 });

    return Response.json({
      provider: config,
      markets,
      total,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[MarketDepth] handleGetProviderMarkets error: ${msg}`);
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
