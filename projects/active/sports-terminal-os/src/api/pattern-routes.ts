/**
 * Pattern API Routes — Zone 2 (Golden Hour)
 *
 * Endpoints:
 *   GET  /api/patterns           — List detected patterns with filters
 *   GET  /api/patterns/:id       — Single pattern details
 *   GET  /api/patterns/stats/summary  — Pattern statistics
 *   GET  /api/patterns/history   — Pattern history
 *   POST /api/patterns/refresh   — Trigger pattern detection
 *
 * All errors logged via tableLogger with [PluginExecution] prefix.
 */

import { logPlugin } from "@utils/tableLogger";
import { createLogger } from "@utils/logger";
import type { AuthContext } from "@utils/types";
import {
  detectPatterns,
  getPatterns,
  getPatternById,
  getPatternHistory,
  getPatternStats,
  updatePatternOutcome,
  type PatternFilter,
  type PatternType,
} from "@services/pattern-service";

const logger = createLogger("PatternRoutes");

const VALID_PATTERN_TYPES: PatternType[] = [
  "steam_moves",
  "reverse_line",
  "public_money",
  "sharp_money",
  "line_freeze",
  "key_number",
];

// ---------------------------------------------------------------------------
// Query param parser
// ---------------------------------------------------------------------------

function parsePatternFilter(url: URL): PatternFilter {
  const filter: PatternFilter = {};

  const type = url.searchParams.get("type");
  if (type && VALID_PATTERN_TYPES.includes(type as PatternType)) {
    filter.type = type as PatternType;
  }

  const sport = url.searchParams.get("sport");
  if (sport) filter.sport = sport;

  const eventId = url.searchParams.get("eventId");
  if (eventId) filter.eventId = eventId;

  const market = url.searchParams.get("market");
  if (market) filter.market = market;

  const minConfidence = url.searchParams.get("minConfidence");
  if (minConfidence) filter.minConfidence = parseInt(minConfidence, 10);

  const maxConfidence = url.searchParams.get("maxConfidence");
  if (maxConfidence) filter.maxConfidence = parseInt(maxConfidence, 10);

  const from = url.searchParams.get("from");
  if (from) filter.from = parseInt(from, 10);

  const to = url.searchParams.get("to");
  if (to) filter.to = parseInt(to, 10);

  const limit = url.searchParams.get("limit");
  if (limit) filter.limit = parseInt(limit, 10);

  const offset = url.searchParams.get("offset");
  if (offset) filter.offset = parseInt(offset, 10);

  return filter;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/patterns — List detected patterns with filters
 */
export async function handleListPatterns(req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filter = parsePatternFilter(url);

    // Check if we should run detection first
    const refresh = url.searchParams.get("refresh") === "true";
    if (refresh) {
      detectPatterns(filter);
    }

    const { items, total } = getPatterns(filter);

    return Response.json({
      patterns: items,
      total,
      limit: filter.limit || 100,
      offset: filter.offset || 0,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleListPatterns error: ${msg}`);
    logPlugin({ plugin: "PatternRoutes", method: "handleListPatterns", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/patterns/:id — Single pattern details
 */
export async function handleGetPattern(req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Pattern ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const pattern = getPatternById(id);
    if (!pattern) {
      return Response.json({ error: "Pattern not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ pattern });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleGetPattern error: ${msg}`);
    logPlugin({ plugin: "PatternRoutes", method: "handleGetPattern", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/patterns/stats/summary — Pattern statistics
 */
export async function handlePatternStats(_req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(_req.url);
    const filter = parsePatternFilter(url);
    const stats = getPatternStats(filter);

    return Response.json({ stats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handlePatternStats error: ${msg}`);
    logPlugin({ plugin: "PatternRoutes", method: "handlePatternStats", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/patterns/history — Pattern history
 */
export async function handlePatternHistory(req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filter = parsePatternFilter(url);

    const { items, total } = getPatternHistory(filter);

    return Response.json({
      history: items,
      total,
      limit: filter.limit || 100,
      offset: filter.offset || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handlePatternHistory error: ${msg}`);
    logPlugin({ plugin: "PatternRoutes", method: "handlePatternHistory", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/patterns/refresh — Trigger pattern detection
 */
export async function handleRefreshPatterns(req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filter = parsePatternFilter(url);

    // Parse body for additional context
    let bodyFilter: PatternFilter = {};
    try {
      bodyFilter = await req.json();
    } catch {
      // No body, use query params only
    }

    const mergedFilter = { ...filter, ...bodyFilter };
    const patterns = detectPatterns(mergedFilter);

    // Persist each pattern
    for (const pattern of patterns) {
      try {
        updatePatternOutcome(pattern.id, "pending" as "hit" | "miss");
      } catch {
        // Ignore persistence errors
      }
    }

    logPlugin({
      plugin: "PatternRoutes",
      method: "handleRefreshPatterns",
      detected: patterns.length,
    });

    return Response.json({
      detected: patterns.length,
      patterns,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleRefreshPatterns error: ${msg}`);
    logPlugin({ plugin: "PatternRoutes", method: "handleRefreshPatterns", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
