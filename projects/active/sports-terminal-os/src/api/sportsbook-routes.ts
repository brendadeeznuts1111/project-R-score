/**
 * Sportsbook API Routes — Zone 1 (Ocean Depths)
 *
 * REST endpoints for the sportsbook grid:
 *   GET  /api/sportsbook/odds           — List all odds with filters
 *   GET  /api/sportsbook/odds/:id       — Single odds entry
 *   GET  /api/sportsbook/health         — Book health status
 *   GET  /api/sportsbook/best-lines     — Best lines across all books
 *   GET  /api/sportsbook/line-movements — Recent line movements with arrows
 *   POST /api/sportsbook/refresh        — Trigger manual odds refresh
 *
 * WebSocket broadcasts on: sportsbook_odds_update
 */

import type { AuthContext } from "@utils/types";
import { createLogger } from "@utils/logger";
import { logSportEvent, logMarketDepth } from "@utils/tableLogger";
import {
  listOdds,
  getOddsById,
  fetchBookHealth,
  getBestLines,
  getLineMovements,
  refreshAllOdds,
  updateBookOdds,
  type OddsFilter,
  type MarketType,
} from "@services/sportsbook-service";

// Import broadcast function from index.ts (Zone 4 WS)
// This is set at runtime to avoid circular imports
let broadcastFn: ((message: { type: string; provider: string; data: unknown }) => void) | null = null;

export function setBroadcastFunction(fn: typeof broadcastFn): void {
  broadcastFn = fn;
}

function broadcastOddsUpdate(data: unknown): void {
  if (broadcastFn) {
    broadcastFn({ type: "sportsbook_odds_update", provider: "sportsbook", data });
  }
}

const logger = createLogger("SportsbookRoutes");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function errorResponse(message: string, code: string, status = 500): Response {
  return Response.json(
    { error: message, code, timestamp: new Date().toISOString() },
    { status }
  );
}

function parseQueryParams(url: URL): OddsFilter {
  const filter: OddsFilter = {};
  if (url.searchParams.has("sport")) filter.sport = url.searchParams.get("sport")!;
  if (url.searchParams.has("book")) filter.bookId = url.searchParams.get("book")!;
  if (url.searchParams.has("market")) filter.market = url.searchParams.get("market") as MarketType;
  if (url.searchParams.has("limit")) filter.limit = parseInt(url.searchParams.get("limit")!, 10);
  if (url.searchParams.has("offset")) filter.offset = parseInt(url.searchParams.get("offset")!, 10);
  return filter;
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/sportsbook/odds — List all odds with optional filters
 */
export async function handleListOdds(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filter = parseQueryParams(url);

    logger.debug(`Listing odds — sport:${filter.sport || "all"}, book:${filter.bookId || "all"}, market:${filter.market || "all"}`);

    const result = listOdds(filter);

    logMarketDepth({
      eventId: "list",
      market: filter.market || "all",
      book: filter.bookId || "all",
      lastUpdated: new Date().toISOString(),
    });

    return jsonResponse({
      odds: result.items,
      total: result.total,
      limit: filter.limit || 100,
      offset: filter.offset || 0,
      filters: filter,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list odds";
    logger.error(`[MarketDepth] handleListOdds error: ${msg}`);
    return errorResponse(msg, "ODDS_LIST_ERROR", 500);
  }
}

/**
 * GET /api/sportsbook/odds/:id — Single odds entry
 */
export async function handleGetOddsById(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return errorResponse("Missing odds ID", "BAD_REQUEST", 400);
    }

    const odds = getOddsById(id);
    if (!odds) {
      return errorResponse(`Odds entry not found: ${id}`, "NOT_FOUND", 404);
    }

    return jsonResponse({
      odds,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get odds";
    logger.error(`[MarketDepth] handleGetOddsById error: ${msg}`);
    return errorResponse(msg, "ODDS_GET_ERROR", 500);
  }
}

/**
 * GET /api/sportsbook/health — Book health status for all books
 */
export async function handleBookHealth(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const health = fetchBookHealth();

    // Summarize
    const summary = {
      total: health.length,
      healthy: health.filter((h) => h.status === "healthy").length,
      degraded: health.filter((h) => h.status === "degraded").length,
      down: health.filter((h) => h.status === "down").length,
      avgLatencyMs: health.length > 0
        ? Math.round(health.reduce((sum, h) => sum + h.latencyMs, 0) / health.length)
        : 0,
      avgErrorRate: health.length > 0
        ? Math.round((health.reduce((sum, h) => sum + h.errorRate, 0) / health.length) * 10000) / 10000
        : 0,
    };

    logSportEvent({
      sport: "all",
      status: `health_check_h${summary.healthy}_d${summary.degraded}_x${summary.down}`,
      marketCount: summary.avgLatencyMs,
    });

    return jsonResponse({
      books: health,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch book health";
    logger.error(`[SportEvent] handleBookHealth error: ${msg}`);
    return errorResponse(msg, "HEALTH_CHECK_ERROR", 500);
  }
}

/**
 * GET /api/sportsbook/best-lines — Best lines across all books (highlighted)
 */
export async function handleBestLines(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filter = {
      sport: url.searchParams.get("sport") || undefined,
      eventId: url.searchParams.get("eventId") || undefined,
      market: (url.searchParams.get("market") as MarketType) || undefined,
    };

    logger.debug(`Fetching best lines — sport:${filter.sport || "all"}, event:${filter.eventId || "all"}`);

    const lines = getBestLines(filter);

    // Group by sport for organized display
    const bySport: Record<string, typeof lines> = {};
    for (const line of lines) {
      if (!bySport[line.sport]) bySport[line.sport] = [];
      bySport[line.sport].push(line);
    }

    logMarketDepth({
      eventId: filter.eventId || "all",
      market: filter.market || "all",
      lastUpdated: new Date().toISOString(),
    });

    return jsonResponse({
      bestLines: lines,
      bySport,
      count: lines.length,
      filters: filter,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get best lines";
    logger.error(`[MarketDepth] handleBestLines error: ${msg}`);
    return errorResponse(msg, "BEST_LINES_ERROR", 500);
  }
}

/**
 * GET /api/sportsbook/line-movements — Recent line movements with arrows
 */
export async function handleLineMovements(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filter = {
      sport: url.searchParams.get("sport") || undefined,
      bookId: url.searchParams.get("book") || undefined,
      eventId: url.searchParams.get("eventId") || undefined,
      limit: url.searchParams.has("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 50,
    };

    logger.debug(`Fetching line movements — sport:${filter.sport || "all"}, book:${filter.bookId || "all"}`);

    const movements = getLineMovements(filter);

    // Summarize by direction
    const summary = {
      up: movements.filter((m) => m.direction === "up").length,
      down: movements.filter((m) => m.direction === "down").length,
      steady: movements.filter((m) => m.direction === "steady").length,
      total: movements.length,
    };

    logMarketDepth({
      eventId: filter.eventId || "all",
      market: "line_movements",
      lastUpdated: new Date().toISOString(),
    });

    return jsonResponse({
      movements,
      summary,
      filters: filter,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get line movements";
    logger.error(`[MarketDepth] handleLineMovements error: ${msg}`);
    return errorResponse(msg, "LINE_MOVEMENTS_ERROR", 500);
  }
}

/**
 * POST /api/sportsbook/refresh — Trigger manual odds refresh from upstream
 */
export async function handleRefreshOdds(req: Request, auth: AuthContext): Promise<Response> {
  try {
    logger.info("Manual odds refresh triggered");

    const start = performance.now();
    const updatedCount = await refreshAllOdds();
    const durationMs = Math.round(performance.now() - start);

    const result = {
      refreshed: true,
      updatedCount,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    // Broadcast refresh to all WebSocket subscribers
    broadcastOddsUpdate({
      type: "refresh_complete",
      updatedCount,
      durationMs,
      timestamp: Date.now(),
    });

    logSportEvent({
      sport: "all",
      status: "manual_refresh",
      marketCount: updatedCount,
    });

    return jsonResponse(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to refresh odds";
    logger.error(`[SportEvent] handleRefreshOdds error: ${msg}`);
    return errorResponse(msg, "REFRESH_ERROR", 500);
  }
}

/**
 * POST /api/sportsbook/odds — Create or update odds (admin/internal)
 */
export async function handleUpsertOdds(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.bookId || !body.sport || !body.eventId || !body.market || body.odds === undefined) {
      return errorResponse("Missing required fields: bookId, sport, eventId, market, odds", "VALIDATION_ERROR", 400);
    }

    const odds = updateBookOdds({
      bookId: body.bookId,
      sport: body.sport,
      eventId: body.eventId,
      market: body.market as MarketType,
      odds: Number(body.odds),
      line: body.line !== undefined ? Number(body.line) : undefined,
      overUnder: body.overUnder,
      timestamp: body.timestamp || Date.now(),
      source: body.source || "manual",
    });

    // Broadcast the update
    broadcastOddsUpdate({
      type: "odds_updated",
      odds,
      timestamp: Date.now(),
    });

    logSportEvent({
      eventId: body.eventId,
      sport: body.sport,
      status: "upsert",
    });

    return jsonResponse({ odds, created: true }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to upsert odds";
    logger.error(`[MarketDepth] handleUpsertOdds error: ${msg}`);
    return errorResponse(msg, "UPSERT_ERROR", 500);
  }
}
