/**
 * Buckeye Live Feed Consumer
 *
 * Polls the Buckeye proxy for new wagers, maps them to cascade
 * SignalContext entries, routes through the Partner Profile OS
 * cascade engine, and returns results for SSE broadcast.
 *
 * Gated on BUCKEYE_LIVE_MODE (default: false for safety).
 * Called by the wager_refresh cron every 5 minutes.
 */

import { env } from "@utils/env";
import { createLogger } from "@utils/logger";
import { logHealth, logBuckeye } from "@utils/tableLogger";
import { fetchInternalProxy, INTERNAL_PROXY_ROUTES } from "@utils/internal-proxy-client";
import { processSignalRoute } from "../zones/partner-profile/cascade-engine-integration";
import type { SignalContext, GateResult } from "../zones/partner-profile/partner-profile-schema";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("BuckeyeFeed");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw wager shape from Buckeye proxy /api/proxy/wagers response. */
interface BuckeyeWager {
  wagerId: string;
  playerId?: string;
  playerLogin?: string;
  agentLogin?: string;
  sport?: string;
  eventId?: string;
  eventName?: string;
  market?: string;
  selection?: string;
  odds?: number;
  stake?: number;
  potentialPayout?: number;
  status?: string;
  placedAt?: number;
  ipAddress?: string;
}

interface BuckeyeWagerResponse {
  wagers?: BuckeyeWager[];
  total?: number;
  error?: string;
}

export interface FeedResult {
  /** Total wagers fetched from Buckeye. */
  fetched: number;
  /** Number of wagers successfully mapped to signals. */
  mapped: number;
  /** Per-partner gate results. */
  routed: Array<{
    wagerId: string;
    partnerId: string;
    result: GateResult;
  }>;
  /** Errors encountered during fetch/map/route. */
  errors: string[];
  /** Timestamp of the poll. */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Wager → SignalContext mapper
// ---------------------------------------------------------------------------

/**
 * Map a Buckeye wager to a cascade SignalContext.
 * Returns null if the wager is missing required fields or is non-actionable.
 */
function wagerToSignal(wager: BuckeyeWager): SignalContext | null {
  // Require at minimum a wagerId and stake
  if (!wager.wagerId || wager.stake == null || wager.stake <= 0) {
    return null;
  }

  // Require sport and market — cascade gate evaluation needs them
  if (!wager.sport || !wager.market) {
    return null;
  }

  // Map stake → tier heuristic
  const stake = wager.stake;
  let tier: SignalContext["tier"] = "T4";
  if (stake >= 100_00) tier = "T1";
  else if (stake >= 50_00) tier = "T2";
  else if (stake >= 10_00) tier = "T3";

  return {
    signalId: `buckeye:${wager.wagerId}`,
    // Use agentLogin as partnerId hint — routeSignal will fan out to all
    // partners that have the book, regardless of partnerId
    partnerId: wager.agentLogin || "buckeye",
    bookId: mapSportToBookId(wager.sport),
    tier,
    type: "manual",
    suggestedStake: stake,
    eventId: wager.eventId || `${wager.sport}:${wager.market}`,
    market: wager.market,
    sport: wager.sport,
    confidence: 0.7,
    urgencyMs: 5000,
    sourceAccount: wager.playerLogin || wager.playerId,
    odds: wager.odds,
  };
}

/**
 * Normalize a sport string to a book identifier.
 * Buckeye uses short sport codes; cascade uses book IDs.
 */
function mapSportToBookId(sport: string): string {
  const lower = sport.toLowerCase();
  const MAP: Record<string, string> = {
    nfl: "pinnacle_nfl",
    nba: "pinnacle_nba",
    mlb: "pinnacle_mlb",
    nhl: "pinnacle_nhl",
    ncaaf: "pinnacle_ncaaf",
    ncaab: "pinnacle_ncaab",
    ufc: "pinnacle_ufc",
    epl: "pinnacle_epl",
    tennis: "pinnacle_tennis",
    golf: "pinnacle_golf",
    soccer: "bet365_soccer",
    football: "pinnacle_nfl",
    basketball: "pinnacle_nba",
    baseball: "pinnacle_mlb",
    hockey: "pinnacle_nhl",
  };
  return MAP[lower] || `pinnacle_${lower}`;
}

// ---------------------------------------------------------------------------
// Poll + Route
// ---------------------------------------------------------------------------

/**
 * Poll the Buckeye proxy for new wagers, map to signals, and route
 * through the Partner Profile OS cascade engine.
 *
 * Returns FeedResult for the caller to inspect and broadcast.
 */
export async function pollBuckeyeWagers(): Promise<FeedResult> {
  const result: FeedResult = {
    fetched: 0,
    mapped: 0,
    routed: [],
    errors: [],
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Safety gate — don't hit the proxy unless explicitly enabled
  if (!env.BUCKEYE_LIVE_MODE) {
    logger.debug("Buckeye live mode disabled — skipping poll");
    return result;
  }

  const apiKey = process.env.PROXY_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;

  // ------------------------------------------------------------------
  // 1. Fetch wagers from Buckeye proxy
  // ------------------------------------------------------------------
  let wagers: BuckeyeWager[] = [];

  try {
    const resp = await fetchInternalProxy(INTERNAL_PROXY_ROUTES.wagers, {
      method: "GET",
      headers,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      result.errors.push(`Buckeye proxy returned ${resp.status}: ${text.slice(0, 200)}`);
      logBuckeye({
        endpoint: "/api/proxy/wagers",
        method: "GET",
        statusCode: resp.status,
        error: text.slice(0, 200),
      });
      return result;
    }

    const data = (await resp.json()) as BuckeyeWagerResponse;
    wagers = data.wagers || [];
    result.fetched = wagers.length;

    logBuckeye({
      endpoint: "/api/proxy/wagers",
      method: "GET",
      statusCode: resp.status,
      wagerCount: wagers.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown fetch error";
    result.errors.push(`Failed to reach Buckeye proxy: ${msg}`);
    logger.error(`[BuckeyeFeed] Proxy fetch failed: ${msg}`);
    logBuckeye({
      endpoint: "/api/proxy/wagers",
      method: "GET",
      statusCode: 0,
      error: msg,
    });
    return result;
  }

  if (wagers.length === 0) {
    logger.debug("No new wagers from Buckeye");
    return result;
  }

  // ------------------------------------------------------------------
  // 2. Map wagers → SignalContext[]
  // ------------------------------------------------------------------
  const signals: Array<{ wagerId: string; signal: SignalContext }> = [];

  for (const wager of wagers) {
    try {
      const signal = wagerToSignal(wager);
      if (signal) {
        signals.push({ wagerId: wager.wagerId, signal });
        result.mapped++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Map error";
      result.errors.push(`Mapping failed for wager ${wager.wagerId}: ${msg}`);
    }
  }

  if (signals.length === 0) {
    logger.debug(`Fetched ${result.fetched} wagers, none mappable`);
    return result;
  }

  // ------------------------------------------------------------------
  // 3. Route each signal through the cascade engine
  // ------------------------------------------------------------------
  for (const { wagerId, signal } of signals) {
    try {
      const gateResults = processSignalRoute(signal);
      for (const gr of gateResults) {
        result.routed.push({ wagerId, partnerId: gr.partnerId, result: gr.result });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Route error";
      result.errors.push(`Cascade routing failed for ${wagerId}: ${msg}`);
    }
  }

  // ------------------------------------------------------------------
  // 4. Log summary
  // ------------------------------------------------------------------
  const allowed = result.routed.filter((r) => r.result.allowed).length;
  const blocked = result.routed.length - allowed;

  logHealth({
    component: "BuckeyeFeed",
    fetched: result.fetched,
    mapped: result.mapped,
    routed: result.routed.length,
    allowed,
    blocked,
    errors: result.errors.length,
  });

  logger.info(
    `[BuckeyeFeed] ${result.fetched} fetched → ${result.mapped} mapped → ` +
      `${result.routed.length} routed (${allowed} allowed, ${blocked} blocked)` +
      (result.errors.length > 0 ? ` [${result.errors.length} errors]` : "")
  );

  return result;
}
