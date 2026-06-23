/**
 * Main API Request Router
 *
 * Dispatches incoming HTTP requests to zone-specific handlers.
 * Provides:
 *   - CORS handling
 *   - Auth middleware selection (JWT / API Key / Session / Dev Bypass)
 *   - Route dispatch to zone-specific handlers
 *   - Global error handling wrapper
 *   - Consistent response formatting
 *   - Request logging
 */

import { authenticate, authenticateOptional, handleCorsPreflight, getCorsHeaders, requireAdmin } from "@auth/middleware";
import { createLogger } from "@utils/logger";
import { TerminalError, NotFoundError } from "@utils/errors";
import type { AuthContext } from "@utils/types";
import {
  handleBasicHealth,
  handleReadiness,
  handleLiveness,
  handleDetailedHealth,
} from "./health";
import { serveMetricsEndpoint } from "./metrics";
import { handleUpdateCookies, handleInternalHealth } from "./internal-routes";
import {
  handleListOdds,
  handleGetOddsById,
  handleBookHealth,
  handleBestLines,
  handleLineMovements,
  handleRefreshOdds,
  handleUpsertOdds,
  setBroadcastFunction,
} from "./sportsbook-routes";
import { checkRateLimit, applyRateLimitHeaders } from "./rate-limiter";

// Zone 3: Prediction Markets
import {
  handleListMarkets,
  handleGetMarket,
  handleListProviders,
  handleGetArbitrage,
  handleRefreshMarkets,
  handleGetMarketDepth,
  handleGetPriceHistory,
  handleListCategories,
  handleGetStats,
  handleExecuteArbitrage,
  handleGetProviderMarkets,
} from "./prediction-market-routes";
import { getSecurityHeaders, applySecurityHeaders, getRequestId, logRequest, logResponse, createTimer } from "@middleware/security";

const logger = createLogger("Router");

// Wire up sportsbook broadcast function to global WebSocket broadcaster.
// Uses lazy dynamic require to avoid circular import with index.ts
let _broadcastInitialized = false;
function initBroadcastFunction(): void {
  if (_broadcastInitialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const indexModule = require("@/index");
    if (indexModule?.broadcastToWebSockets) {
      setBroadcastFunction((msg: { type: string; provider: string; data: unknown }) => {
        indexModule.broadcastToWebSockets(msg);
      });
      _broadcastInitialized = true;
    }
  } catch {
    // index.ts not available during tests or some module loads
  }
}

// ---------------------------------------------------------------------------
// Route handler type
// ---------------------------------------------------------------------------

type RouteHandler = (req: Request, auth: AuthContext, params?: Record<string, string>) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  auth: "required" | "optional" | "admin" | "none";
  zone: string;
}

// ---------------------------------------------------------------------------
// Zone 4: Backend Operations handlers
// ---------------------------------------------------------------------------

async function metricsHandler(): Promise<Response> {
  return serveMetricsEndpoint(new Request("http://localhost/api/metrics"));
}

async function healthHandler(): Promise<Response> {
  return handleBasicHealth();
}

async function healthReadyHandler(): Promise<Response> {
  return handleReadiness();
}

async function healthLiveHandler(): Promise<Response> {
  return handleLiveness();
}

async function healthDetailedHandler(): Promise<Response> {
  return handleDetailedHealth();
}

// ---------------------------------------------------------------------------
// Proxy auth handlers (public login endpoints)
// ---------------------------------------------------------------------------

async function proxyAuthHandler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    // Delegate to proxy bridge
    const proxyUrl = process.env.PROXY_INTERNAL_URL || "http://localhost:3001";
    const response = await fetch(`${proxyUrl}/api/proxy/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return Response.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy auth failed";
    logger.error(`Proxy auth error: ${message}`);
    return Response.json(
      { error: message, code: "BAD_GATEWAY" },
      { status: 502 }
    );
  }
}

async function proxyRenewTokenHandler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const proxyUrl = process.env.PROXY_INTERNAL_URL || "http://localhost:3001";
    const response = await fetch(`${proxyUrl}/api/proxy/renewToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return Response.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token renewal failed";
    return Response.json(
      { error: message, code: "BAD_GATEWAY" },
      { status: 502 }
    );
  }
}

async function proxyAccountInfoHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const proxyUrl = process.env.PROXY_INTERNAL_URL || "http://localhost:3001";
    const proxyReqUrl = new URL(`${proxyUrl}/api/proxy/accountInfo`);
    if (sessionId) proxyReqUrl.searchParams.set("sessionId", sessionId);

    const response = await fetch(proxyReqUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(req.headers.entries()),
      },
    });

    const data = await response.json().catch(() => ({}));
    return Response.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Account info failed";
    return Response.json(
      { error: message, code: "BAD_GATEWAY" },
      { status: 502 }
    );
  }
}

// ---------------------------------------------------------------------------
// Zone stub handlers (to be implemented by zone modules)
// ---------------------------------------------------------------------------

// Proxy helpers — forward to Buckeye upstream, fall back to empty if unreachable
async function proxyToUpstream(path: string, auth: AuthContext): Promise<Response> {
  const proxyUrl = process.env.PROXY_INTERNAL_URL || "http://localhost:3001";
  try {
    const resp = await fetch(`${proxyUrl}${path}`, {
      headers: { "X-Internal-Token": process.env.INTERNAL_API_TOKEN || "" },
    });
    if (resp.ok) {
      const data = await resp.json();
      return Response.json(data);
    }
    logger.warn(`Proxy upstream ${path} returned ${resp.status}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upstream unreachable";
    logger.warn(`Proxy upstream ${path} failed: ${msg}`);
  }
  // Fallback: empty response
  return Response.json({ error: "Upstream unavailable" }, { status: 502 });
}

/** Zone 1: Sportsbook Grid — Live data proxy */
async function proxyPlayersHandler(req: Request, auth: AuthContext): Promise<Response> {
  return proxyToUpstream("/api/proxy/players", auth);
}

async function proxyWagersHandler(req: Request, auth: AuthContext): Promise<Response> {
  return proxyToUpstream("/api/proxy/wagers", auth);
}

async function proxyAgentPerformanceHandler(req: Request, auth: AuthContext): Promise<Response> {
  return proxyToUpstream("/api/proxy/agentPerformance", auth);
}

async function proxyPendingHandler(req: Request, auth: AuthContext): Promise<Response> {
  return proxyToUpstream("/api/proxy/pending", auth);
}

/** Zone D: Agent Decisions */
async function agentAnalyzeLiveHandler(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json();
  logger.debug(`AI analysis request for player ${body.playerId}`);
  return Response.json({
    playerId: body.playerId,
    analysisId: `analysis_${Bun.randomUUIDv7().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    riskTier: "GREEN",
    riskScore: 0.25,
    confidence: 0.85,
    factors: [],
    recommendations: ["No action required"],
    aiSummary: "Player shows normal betting patterns.",
    processingTimeMs: 150,
  });
}

async function agentExtractFeaturesHandler(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json();
  return Response.json({
    playerId: body.playerId,
    features: { avgStake: 0, winRate: 0.5, sportDiversity: 1 },
    archetype: "recreational",
    confidence: 0.75,
  });
}

async function agentRulesHandler(req: Request, auth: AuthContext): Promise<Response> {
  if (req.method === "GET") {
    return Response.json({ rules: [], total: 0 });
  }
  if (req.method === "POST") {
    requireAdmin(auth);
    const body = await req.json();
    return Response.json({ id: `rule_${Bun.randomUUIDv7().slice(0, 8)}`, ...body, createdAt: new Date().toISOString() }, { status: 201 });
  }
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

async function agentDeleteRuleHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  requireAdmin(auth);
  return new Response(null, { status: 204 });
}

/** Zone E: IP Intelligence */
async function ipTrackingHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ ips: [], total: 0, flagged: 0 });
}

async function ipTrackingDetailHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return Response.json({ ipAddress: params?.ip, playerIds: [], players: [] });
}

async function ipBlockHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  const body = await req.json();
  return Response.json({ id: `block_${Bun.randomUUIDv7().slice(0, 8)}`, ...body, status: "active", createdAt: new Date().toISOString() }, { status: 201 });
}

/** Zone F: Rules Engine */
async function rulesListHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ rules: [], total: 0 });
}

async function rulesCreateHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  const body = await req.json();
  return Response.json({ id: `rule_${Bun.randomUUIDv7().slice(0, 8)}`, ...body, createdAt: new Date().toISOString() }, { status: 201 });
}

async function rulesDeleteHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  requireAdmin(auth);
  return new Response(null, { status: 204 });
}

/** Zone G: Player Intelligence */
async function playersSearchHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ players: [], total: 0, limit: 50, offset: 0 });
}

async function playerDetailHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return Response.json({
    id: params?.id,
    login: "unknown",
    displayName: "Unknown Player",
    balance: 0,
    status: "active",
    riskTier: "GREEN",
  });
}

/** Zone I: Sandbox v2 */
async function sandboxSaveHandler(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json();
  return Response.json({ scenarioId: `scn_${Bun.randomUUIDv7().slice(0, 8)}`, ...body, saved: true }, { status: 201 });
}

async function sandboxABTestHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ testId: `test_${Bun.randomUUIDv7().slice(0, 8)}`, status: "created" }, { status: 201 });
}

async function sandboxGenerateSummariesHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ summaries: [], generated: 0 });
}

/** Zone K: Kimi AI */
async function kimiChatHandler(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json();
  return Response.json({
    message: { role: "assistant", content: "Kimi AI integration not yet configured." },
    model: "kimi",
    usage: { prompt_tokens: 0, completion_tokens: 0 },
  });
}

/** Zone L: Risk Command Center */
async function positionsGenerateHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ positions: [], generated: 0 });
}

async function dashboardMetricsHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({
    totalExposure: 0,
    activePositions: 0,
    alertsToday: 0,
    violationsToday: 0,
    timestamp: new Date().toISOString(),
  });
}

async function enforcementApplyLimitHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  const body = await req.json();
  return Response.json({ enforcementId: ` enf_${Bun.randomUUIDv7().slice(0, 8)}`, ...body, status: "applied" });
}

async function enforcementAutoEnforceHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  return Response.json({ autoEnforced: 0, timestamp: new Date().toISOString() });
}

/** Zone B: Secrets Vault */
async function vaultListHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  return Response.json({ secrets: [], total: 0, limit: 50, offset: 0 });
}

async function vaultStoreHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  const body = await req.json();
  return Response.json({ key: body.key, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 });
}

async function vaultDeleteHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  requireAdmin(auth);
  return new Response(null, { status: 204 });
}

/** Zone J: Export */
async function exportHandler(req: Request, auth: AuthContext): Promise<Response> {
  const csv = "id,name,balance\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="export_${Date.now()}.csv"`,
    },
  });
}

/** Zone P: Benchmark */
async function benchmarkHandler(req: Request, auth: AuthContext): Promise<Response> {
  const start = performance.now();
  // Simple benchmark: measure round-trip time
  const db = await import("@db/index");
  db.checkDbHealth();
  const duration = performance.now() - start;

  return Response.json({
    dbRoundTripMs: Math.round(duration),
    timestamp: new Date().toISOString(),
    version: "5.2.0",
  });
}

/** Zone N: Player Search */
async function playerSearchHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ players: [], total: 0, limit: 50, offset: 0 });
}

/** Zone O: Agent Hub */
async function agentDownlineHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ agents: [], total: 0 });
}

async function agentBillingHandler(req: Request, auth: AuthContext): Promise<Response> {
  return Response.json({ billing: [], total: 0 });
}

/** Telegram Hub */
import {
  handleSystemStatus,
  handleBotsRefresh,
  handleDeliveryStats,
  handleBotStats,
  handleBotDeliveryLog,
  handleTopicsStatus,
} from "./telegram-routes";

async function telegramDeliveryStatsHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  return handleDeliveryStats(req);
}

async function telegramBotStatsHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  requireAdmin(auth);
  const botId = params?.botId || params?.id || "";
  return handleBotStats(req, botId);
}

async function telegramBotDeliveryLogHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  requireAdmin(auth);
  const botId = params?.botId || params?.id || "";
  return handleBotDeliveryLog(req, botId);
}

async function telegramTopicsStatusHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  return handleTopicsStatus();
}

async function systemStatusHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleSystemStatus();
}

/** Admin */
async function adminBotsRefreshHandler(req: Request, auth: AuthContext): Promise<Response> {
  requireAdmin(auth);
  return handleBotsRefresh(req);
}

// ---------------------------------------------------------------------------
// Zone 3: Prediction Markets handlers
// ---------------------------------------------------------------------------

async function predictionMarketsListHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleListMarkets(req, auth);
}

async function predictionMarketDetailHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return handleGetMarket(req, auth, params);
}

async function predictionProvidersHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleListProviders(req, auth);
}

async function predictionArbitrageHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleGetArbitrage(req, auth);
}

async function predictionRefreshHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleRefreshMarkets(req, auth);
}

async function predictionDepthHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return handleGetMarketDepth(req, auth, params);
}

async function predictionHistoryHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return handleGetPriceHistory(req, auth, params);
}

async function predictionCategoriesHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleListCategories(req, auth);
}

async function predictionStatsHandler(req: Request, auth: AuthContext): Promise<Response> {
  return handleGetStats(req, auth);
}

async function predictionArbitrageExecuteHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return handleExecuteArbitrage(req, auth, params);
}

async function predictionProviderMarketsHandler(req: Request, auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  return handleGetProviderMarkets(req, auth, params);
}

// ---------------------------------------------------------------------------
// Route registry
// ---------------------------------------------------------------------------

const routes: Route[] = [
  // Zone 0: Internal — Shadow Agent, health probes
  { method: "POST", pattern: /^\/api\/internal\/update-cookies$/, handler: handleUpdateCookies, auth: "none", zone: "internal" },
  { method: "GET", pattern: /^\/api\/internal\/health$/, handler: handleInternalHealth, auth: "none", zone: "internal" },

  // Zone 4: Backend Operations — Metrics & Health
  { method: "GET", pattern: /^\/api\/metrics$/, handler: metricsHandler, auth: "none", zone: "zone4" },
  { method: "GET", pattern: /^\/api\/health$/, handler: healthHandler, auth: "none", zone: "zone4" },
  { method: "GET", pattern: /^\/api\/health\/ready$/, handler: healthReadyHandler, auth: "none", zone: "zone4" },
  { method: "GET", pattern: /^\/api\/health\/live$/, handler: healthLiveHandler, auth: "none", zone: "zone4" },
  { method: "GET", pattern: /^\/api\/health\/detailed$/, handler: healthDetailedHandler, auth: "admin", zone: "zone4" },

  // Category A: Authentication
  { method: "POST", pattern: /^\/api\/proxy\/auth$/, handler: proxyAuthHandler, auth: "none", zone: "auth" },
  { method: "POST", pattern: /^\/api\/proxy\/renewToken$/, handler: proxyRenewTokenHandler, auth: "optional", zone: "auth" },
  { method: "GET", pattern: /^\/api\/proxy\/accountInfo$/, handler: proxyAccountInfoHandler, auth: "optional", zone: "auth" },

  // Category C: Buckeye Live Data
  { method: "GET", pattern: /^\/api\/proxy\/players$/, handler: proxyPlayersHandler, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/proxy\/wagers$/, handler: proxyWagersHandler, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/proxy\/agentPerformance$/, handler: proxyAgentPerformanceHandler, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/proxy\/pending$/, handler: proxyPendingHandler, auth: "required", zone: "sportsbook" },

  // Category D: Agent Decisions
  { method: "POST", pattern: /^\/api\/agent\/analyze-live$/, handler: agentAnalyzeLiveHandler, auth: "required", zone: "agent-decisions" },
  { method: "POST", pattern: /^\/api\/agent\/extract-features$/, handler: agentExtractFeaturesHandler, auth: "required", zone: "agent-decisions" },
  { method: "GET", pattern: /^\/api\/agent\/rules$/, handler: agentRulesHandler, auth: "required", zone: "agent-decisions" },
  { method: "POST", pattern: /^\/api\/agent\/rules$/, handler: agentRulesHandler, auth: "required", zone: "agent-decisions" },
  { method: "DELETE", pattern: /^\/api\/agent\/rules\/[^/]+$/, handler: agentDeleteRuleHandler, auth: "admin", zone: "agent-decisions" },

  // Category E: IP Intelligence
  { method: "GET", pattern: /^\/api\/agent\/ip-tracking$/, handler: ipTrackingHandler, auth: "required", zone: "ip-intelligence" },
  { method: "GET", pattern: /^\/api\/agent\/ip-tracking\/[^/]+$/, handler: ipTrackingDetailHandler, auth: "required", zone: "ip-intelligence" },
  { method: "POST", pattern: /^\/api\/agent\/ip-block$/, handler: ipBlockHandler, auth: "admin", zone: "ip-intelligence" },

  // Category F: Rules Engine
  { method: "GET", pattern: /^\/api\/rules$/, handler: rulesListHandler, auth: "required", zone: "rules" },
  { method: "POST", pattern: /^\/api\/rules$/, handler: rulesCreateHandler, auth: "admin", zone: "rules" },
  { method: "DELETE", pattern: /^\/api\/rules\/[^/]+$/, handler: rulesDeleteHandler, auth: "admin", zone: "rules" },

  // Category G: Player Intelligence
  { method: "GET", pattern: /^\/api\/players\/search$/, handler: playersSearchHandler, auth: "required", zone: "players" },
  { method: "GET", pattern: /^\/api\/players\/([^/]+)$/, handler: playerDetailHandler, auth: "required", zone: "players" },

  // Category I: Sandbox v2
  { method: "POST", pattern: /^\/api\/sandbox\/v2\/save$/, handler: sandboxSaveHandler, auth: "required", zone: "sandbox" },
  { method: "POST", pattern: /^\/api\/sandbox\/v2\/ab-test$/, handler: sandboxABTestHandler, auth: "required", zone: "sandbox" },
  { method: "POST", pattern: /^\/api\/sandbox\/v2\/generate-summaries$/, handler: sandboxGenerateSummariesHandler, auth: "required", zone: "sandbox" },

  // Category K: Kimi AI
  { method: "POST", pattern: /^\/api\/kimi\/chat$/, handler: kimiChatHandler, auth: "required", zone: "kimi" },

  // Category L: Risk Command Center
  { method: "POST", pattern: /^\/api\/positions\/generate$/, handler: positionsGenerateHandler, auth: "required", zone: "risk" },
  { method: "GET", pattern: /^\/api\/dashboard\/metrics$/, handler: dashboardMetricsHandler, auth: "required", zone: "risk" },

  // Category M: Enforcement
  { method: "POST", pattern: /^\/api\/enforcement\/apply-limit$/, handler: enforcementApplyLimitHandler, auth: "admin", zone: "enforcement" },
  { method: "POST", pattern: /^\/api\/enforcement\/auto-enforce$/, handler: enforcementAutoEnforceHandler, auth: "admin", zone: "enforcement" },

  // Category B: Secrets Vault
  { method: "GET", pattern: /^\/api\/vault\/secrets$/, handler: vaultListHandler, auth: "admin", zone: "vault" },
  { method: "POST", pattern: /^\/api\/vault\/secrets$/, handler: vaultStoreHandler, auth: "admin", zone: "vault" },
  { method: "DELETE", pattern: /^\/api\/vault\/secrets\/[^/]+$/, handler: vaultDeleteHandler, auth: "admin", zone: "vault" },

  // Category J: Export
  { method: "GET", pattern: /^\/api\/export\/.*$/, handler: exportHandler, auth: "required", zone: "export" },

  // Category P: Benchmark
  { method: "GET", pattern: /^\/api\/benchmark$/, handler: benchmarkHandler, auth: "optional", zone: "benchmark" },

  // Category N: Player Search
  { method: "GET", pattern: /^\/api\/players-search$/, handler: playerSearchHandler, auth: "required", zone: "player-search" },

  // Category O: Agent Hub
  { method: "GET", pattern: /^\/api\/proxy\/agentDownline$/, handler: agentDownlineHandler, auth: "required", zone: "agent-hub" },
  { method: "GET", pattern: /^\/api\/proxy\/agentBilling$/, handler: agentBillingHandler, auth: "required", zone: "agent-hub" },

  // Telegram Hub
  { method: "GET", pattern: /^\/api\/health\/system-status$/, handler: systemStatusHandler, auth: "none", zone: "telegram" },
  { method: "GET", pattern: /^\/api\/telegram\/delivery-stats$/, handler: telegramDeliveryStatsHandler, auth: "admin", zone: "telegram" },
  { method: "GET", pattern: /^\/api\/telegram\/bot\/([^/]+)\/stats$/, handler: telegramBotStatsHandler, auth: "admin", zone: "telegram" },
  { method: "GET", pattern: /^\/api\/telegram\/bot\/([^/]+)\/delivery-log$/, handler: telegramBotDeliveryLogHandler, auth: "admin", zone: "telegram" },
  { method: "GET", pattern: /^\/api\/telegram\/topics-status$/, handler: telegramTopicsStatusHandler, auth: "admin", zone: "telegram" },

  // Admin
  { method: "POST", pattern: /^\/api\/admin\/bots\/refresh$/, handler: adminBotsRefreshHandler, auth: "admin", zone: "admin" },

  // Zone 10: WebSocket Metrics
  { method: "GET", pattern: /^\/ws\/metrics$/, handler: wsMetricsHandler, auth: "none", zone: "ws-metrics" },

  // Zone 1: Sportsbook Grid
  { method: "GET", pattern: /^\/api\/sportsbook\/odds$/, handler: handleListOdds, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/sportsbook\/odds\/[^/]+$/, handler: handleGetOddsById, auth: "required", zone: "sportsbook" },
  { method: "POST", pattern: /^\/api\/sportsbook\/odds$/, handler: handleUpsertOdds, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/sportsbook\/health$/, handler: handleBookHealth, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/sportsbook\/best-lines$/, handler: handleBestLines, auth: "required", zone: "sportsbook" },
  { method: "GET", pattern: /^\/api\/sportsbook\/line-movements$/, handler: handleLineMovements, auth: "required", zone: "sportsbook" },
  { method: "POST", pattern: /^\/api\/sportsbook\/refresh$/, handler: handleRefreshOdds, auth: "required", zone: "sportsbook" },

  // Zone 3: Prediction Markets
  { method: "GET", pattern: /^\/api\/prediction-markets$/, handler: predictionMarketsListHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/providers$/, handler: predictionProvidersHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/arbitrage$/, handler: predictionArbitrageHandler, auth: "required", zone: "prediction-markets" },
  { method: "POST", pattern: /^\/api\/prediction-markets\/refresh$/, handler: predictionRefreshHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/categories$/, handler: predictionCategoriesHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/stats$/, handler: predictionStatsHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/provider\/([^/]+)$/, handler: predictionProviderMarketsHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/depth\/([^/]+)$/, handler: predictionDepthHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/history\/([^/]+)$/, handler: predictionHistoryHandler, auth: "required", zone: "prediction-markets" },
  { method: "GET", pattern: /^\/api\/prediction-markets\/([^/]+)$/, handler: predictionMarketDetailHandler, auth: "required", zone: "prediction-markets" },
  { method: "POST", pattern: /^\/api\/prediction-markets\/arbitrage\/([^/]+)\/execute$/, handler: predictionArbitrageExecuteHandler, auth: "required", zone: "prediction-markets" },
];

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------

function matchRoute(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const match = pathname.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      // Extract named params from regex groups
      const keys = ["botId", "id", "ip"];
      match.slice(1).forEach((value, index) => {
        if (value && keys[index]) {
          params[keys[index]] = value;
        }
      });
      return { route, params };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main request handler
// ---------------------------------------------------------------------------

export async function handleRequest(req: Request): Promise<Response> {
  // Lazy-init sportsbook broadcast on first request (avoids circular import)
  initBroadcastFunction();

  const url = new URL(req.url);
  const method = req.method;
  const pathname = url.pathname;
  const requestId = getRequestId(req);
  const timer = createTimer();

  // CORS preflight
  if (method === "OPTIONS") {
    return handleCorsPreflight();
  }

  const corsHeaders = getCorsHeaders(req);

  // Log the request
  logRequest(req, pathname, requestId);

  try {
    // Rate limiting check (Zone 4)
    const rateLimitResult = checkRateLimit(req, pathname);

    // Find matching route
    const matched = matchRoute(method, pathname);
    if (!matched) {
      throw new NotFoundError(`No route found for ${method} ${pathname}`, "ROUTE_NOT_FOUND");
    }

    const { route, params } = matched;

    // Authenticate based on route requirements
    let auth: AuthContext;
    switch (route.auth) {
      case "none":
        auth = { user: { id: "anonymous", role: "public" }, method: "dev_bypass", requestId };
        break;
      case "optional":
        auth = (await authenticateOptional(req)) || {
          user: { id: "anonymous", role: "public" },
          method: "dev_bypass",
          requestId,
        };
        break;
      case "admin":
        auth = await authenticate(req);
        requireAdmin(auth);
        break;
      case "required":
      default:
        auth = await authenticate(req);
        break;
    }

    // Update request ID from auth context
    auth.requestId = requestId;

    // Call the handler
    const response = await route.handler(req, auth, params);

    const durationMs = timer();

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add security headers
    applySecurityHeaders(response);

    // Add request ID header
    response.headers.set("X-Request-ID", requestId);

    // Log response
    logResponse(requestId, method, pathname, response.status, durationMs);

    // Record HTTP metric
    const { recordHttpRequest } = await import("./metrics").catch(() => ({ recordHttpRequest: null }));
    if (recordHttpRequest) {
      await recordHttpRequest(method, pathname, response.status);
    }

    return response;
  } catch (err: unknown) {
    const durationMs = timer();

    // If it's a rate limit error, include its headers
    const rateLimitHeaders = err instanceof TerminalError && err.code === "RATE_LIMITED"
      ? (err as any).getHeaders?.() || {}
      : {};

    return handleError(err, requestId, { ...corsHeaders, ...rateLimitHeaders }, durationMs, method, pathname);
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function handleError(
  err: unknown,
  requestId: string,
  corsHeaders: Record<string, string> = {},
  durationMs?: number,
  method?: string,
  pathname?: string
): Response {
  let status = 500;
  let errorBody: Record<string, unknown> = {
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
    requestId,
  };

  if (err instanceof TerminalError) {
    status = err.statusCode;
    errorBody = {
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
      timestamp: err.timestamp,
      requestId,
    };
  } else if (err instanceof Error) {
    errorBody.error = err.message;
  }

  logger.error(`Request error [${requestId}]: ${String(errorBody.error)}`, {
    status,
    code: errorBody.code,
    durationMs,
  });

  const response = Response.json(errorBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      "X-Request-ID": requestId,
    },
  });

  // Apply security headers to error responses too
  applySecurityHeaders(response);

  return response;
}

// ---------------------------------------------------------------------------
// Metrics endpoint (backward-compatible export)
// ---------------------------------------------------------------------------

export async function handleMetrics(): Promise<Response> {
  return serveMetricsEndpoint(new Request("http://localhost/metrics"));
}

// ---------------------------------------------------------------------------
// WebSocket Metrics endpoint
// ---------------------------------------------------------------------------

async function wsMetricsHandler(req: Request, auth: AuthContext): Promise<Response> {
  // Lazy-import to avoid circular dependency at module load time
  const { getWsMetrics } = await import("../index") as {
    getWsMetrics: () => Record<string, unknown>;
  };

  // Optionally include engine metrics if engine is initialized
  let engineMetrics: Record<string, unknown> | null = null;
  try {
    const { getOddsDriftEngine } = await import("@services/odds-drift-engine");
    engineMetrics = getOddsDriftEngine().getMetrics();
  } catch {
    // Engine not initialized — skip
  }

  const wsMetrics = getWsMetrics();

  return Response.json({
    ...wsMetrics,
    odds_drift_engine: engineMetrics,
  });
}
