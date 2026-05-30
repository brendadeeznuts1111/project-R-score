/**
 * Risk Command Center API Routes
 *
 * 19 endpoints for risk management, enforcement, AI analysis,
 * and real-time streaming (SSE).
 *
 * Prefix: /api/risk/*, /api/agent/*, /api/stream/*
 * Auth: JWT required (enforcement mutations also require Admin)
 */

import type { Database } from "bun:sqlite";
import type { AuthenticatedUser, RiskTier } from "@utils/types";
import {
  initRiskService,
  generateRiskPositions,
  getOpenPositions,
  getRiskDashboard,
  getExposureBySport,
  getExposureByBook,
  getBettingVelocity,
  calculateRiskScore,
  enforceLimits,
  applyEnforcement,
  getEnforcementQueue,
  getViolations,
  expireStalePositions,
  getRiskConfig,
  setRiskConfig,
  getAllRiskConfigs,
} from "@services/risk-service";
import {
  initAIRiskService,
  analyzePlayerRisk,
  extractFeatures,
  classifyArchetype,
  getRiskFlags,
} from "@services/ai-risk-service";
import { logRiskAlert, logEnforcement } from "@utils/tableLogger";

// ---------------------------------------------------------------------------
// SSE Client Management
// ---------------------------------------------------------------------------

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  filter?: Record<string, unknown>;
  connectedAt: number;
}

const liveWagerClients = new Map<string, SSEClient>();
const alertClients = new Map<string, SSEClient>();

// ---------------------------------------------------------------------------
// Route Registration
// ---------------------------------------------------------------------------

export function registerRiskRoutes(db: Database): Map<string, (req: Request, user?: AuthenticatedUser) => Promise<Response> | Response> {
  initRiskService(db);
  initAIRiskService(db);

  const routes = new Map<string, (req: Request, user?: AuthenticatedUser) => Promise<Response> | Response>();

  // === L.1 GET /api/risk/positions ===
  routes.set("GET /api/risk/positions", async (req) => {
    try {
      const url = new URL(req.url);
      const filters = {
        sport: url.searchParams.get("sport") || undefined,
        book: url.searchParams.get("book") || undefined,
        riskTier: (url.searchParams.get("riskTier") || undefined) as RiskTier | undefined,
        status: url.searchParams.get("status") || undefined,
        playerId: url.searchParams.get("playerId") || undefined,
        agentLogin: url.searchParams.get("agentLogin") || undefined,
        limit: parseInt(url.searchParams.get("limit") || "50", 10),
        offset: parseInt(url.searchParams.get("offset") || "0", 10),
      };
      const result = getOpenPositions(filters);
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.2 POST /api/risk/positions/generate ===
  routes.set("POST /api/risk/positions/generate", async (req, user) => {
    try {
      requireAdmin(user);
      const result = generateRiskPositions();
      broadcastToRiskClients({ type: "positions_generated", count: result.count });
      return jsonResponse(result, 201);
    } catch (err: any) {
      return errorResponse(err.message, err.code || "INTERNAL_ERROR", err.status || 500);
    }
  });

  // === L.3 GET /api/risk/positions/:id ===
  routes.set("GET /api/risk/positions/:id", async (req) => {
    try {
      const id = extractPathParam(req.url, "/api/risk/positions/");
      const allPositions = getOpenPositions({ limit: 1000 });
      const position = allPositions.items.find((p) => p.positionId === id);
      if (!position) return errorResponse("Position not found", "NOT_FOUND", 404);
      return jsonResponse(position);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.4 GET /api/risk/dashboard ===
  routes.set("GET /api/risk/dashboard", async () => {
    try {
      const dashboard = getRiskDashboard();
      return jsonResponse(dashboard);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.5 GET /api/risk/exposure/sport ===
  routes.set("GET /api/risk/exposure/sport", async () => {
    try {
      const exposure = getExposureBySport();
      return jsonResponse({ exposure });
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.6 GET /api/risk/exposure/book ===
  routes.set("GET /api/risk/exposure/book", async () => {
    try {
      const exposure = getExposureByBook();
      return jsonResponse({ exposure });
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.7 GET /api/risk/velocity/:playerId ===
  routes.set("GET /api/risk/velocity/:playerId", async (req) => {
    try {
      const playerId = extractPathParam(req.url, "/api/risk/velocity/");
      const velocity = getBettingVelocity(playerId);
      return jsonResponse(velocity);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.8 GET /api/risk/score/:playerId ===
  routes.set("GET /api/risk/score/:playerId", async (req) => {
    try {
      const playerId = extractPathParam(req.url, "/api/risk/score/");
      const score = calculateRiskScore(playerId);
      return jsonResponse(score);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === M.1 POST /api/risk/enforce ===
  routes.set("POST /api/risk/enforce", async (req, user) => {
    try {
      requireAdmin(user);
      const body = await req.json();
      const result = enforceLimits(body);
      if (!result.allowed) {
        broadcastToRiskClients({ type: "enforcement", playerId: body.playerId, action: "blocked" });
      }
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === M.2 POST /api/risk/enforcement/apply-limit ===
  routes.set("POST /api/risk/enforcement/apply-limit", async (req, user) => {
    try {
      requireAdmin(user);
      const body = await req.json();
      const result = applyEnforcement({
        playerId: body.playerId,
        agentLogin: body.agentLogin || user?.login || "system",
        actionType: body.limitType ? "reduce_limit" : "apply_limit",
        limitType: body.limitType,
        amount: body.amount,
        reason: body.reason,
        appliedBy: user?.login || "system",
        wagerId: body.wagerId,
        durationMinutes: body.durationMinutes,
      });
      broadcastToRiskClients({ type: "enforcement", playerId: body.playerId, action: "limit_applied" });
      return jsonResponse(result, 201);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === M.3 POST /api/risk/enforcement/auto-enforce ===
  routes.set("POST /api/risk/enforcement/auto-enforce", async (req, user) => {
    try {
      requireAdmin(user);
      const body = await req.json();
      const result = applyEnforcement({
        playerId: body.playerId,
        agentLogin: body.agentLogin || "system",
        actionType: "auto_enforce",
        reason: body.reason || `Auto-enforcement triggered by rule: ${body.ruleId || "unknown"}`,
        appliedBy: user?.login || "system",
        wagerId: body.wagerId,
      });
      logEnforcement({
        playerId: body.playerId,
        action: "auto_enforce",
        reason: body.reason || "Auto-enforcement triggered",
        triggeredByRule: body.ruleId,
      });
      broadcastToRiskClients({ type: "enforcement", playerId: body.playerId, action: "auto_enforced" });
      return jsonResponse(result, 201);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === M.4 GET /api/risk/enforcement/queue ===
  routes.set("GET /api/risk/enforcement/queue", async (req) => {
    try {
      const url = new URL(req.url);
      const filters = {
        status: url.searchParams.get("status") || undefined,
        agentLogin: url.searchParams.get("agentLogin") || undefined,
        limit: parseInt(url.searchParams.get("limit") || "50", 10),
        offset: parseInt(url.searchParams.get("offset") || "0", 10),
      };
      const result = getEnforcementQueue(filters);
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.9 GET /api/risk/violations ===
  routes.set("GET /api/risk/violations", async (req) => {
    try {
      const url = new URL(req.url);
      const filters = {
        playerId: url.searchParams.get("playerId") || undefined,
        severity: url.searchParams.get("severity") || undefined,
        status: url.searchParams.get("status") || undefined,
        agentLogin: url.searchParams.get("agentLogin") || undefined,
        limit: parseInt(url.searchParams.get("limit") || "50", 10),
        offset: parseInt(url.searchParams.get("offset") || "0", 10),
      };
      const result = getViolations(filters);
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.10 GET /api/risk/flags/:playerId ===
  routes.set("GET /api/risk/flags/:playerId", async (req) => {
    try {
      const playerId = extractPathParam(req.url, "/api/risk/flags/");
      const flags = getRiskFlags(playerId);
      return jsonResponse({ flags });
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.11 POST /api/risk/analyze/:playerId ===
  routes.set("POST /api/risk/analyze/:playerId", async (req) => {
    try {
      const playerId = extractPathParam(req.url, "/api/risk/analyze/");
      const result = await analyzePlayerRisk(playerId);
      broadcastToRiskClients({ type: "analysis_complete", playerId, riskTier: result.riskTier });
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.12 POST /api/agent/analyze-live ===
  routes.set("POST /api/agent/analyze-live", async (req) => {
    try {
      const body = await req.json();
      const playerId = body.playerId;
      if (!playerId) return errorResponse("playerId required", "BAD_REQUEST", 400);
      const result = await analyzePlayerRisk(playerId);
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.13 POST /api/agent/extract-features ===
  routes.set("POST /api/agent/extract-features", async (req) => {
    try {
      const body = await req.json();
      const playerId = body.playerId;
      if (!playerId) return errorResponse("playerId required", "BAD_REQUEST", 400);
      const result = extractFeatures(playerId);
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === L.14 SSE /api/stream/live-wagers ===
  routes.set("GET /api/stream/live-wagers", (req) => {
    return createSSEResponse(liveWagerClients, "live_wagers");
  });

  // === L.15 SSE /api/stream/alerts ===
  routes.set("GET /api/stream/alerts", (req) => {
    return createSSEResponse(alertClients, "alerts");
  });

  // === Internal: position expiry ===
  routes.set("POST /api/risk/positions/expire", async (req, user) => {
    try {
      requireAdmin(user);
      const result = expireStalePositions();
      return jsonResponse(result);
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  // === Internal: risk config ===
  routes.set("GET /api/risk/config", async (req) => {
    try {
      const url = new URL(req.url);
      const category = url.searchParams.get("category") || undefined;
      const configs = getAllRiskConfigs(category);
      return jsonResponse({ configs });
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  routes.set("PUT /api/risk/config/:key", async (req, user) => {
    try {
      requireAdmin(user);
      const key = extractPathParam(req.url, "/api/risk/config/");
      const body = await req.json();
      setRiskConfig(key, body.value, body.type, body.description, body.category, user?.login);
      return jsonResponse({ success: true });
    } catch (err: any) {
      return errorResponse(err.message, "INTERNAL_ERROR", 500);
    }
  });

  return routes;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function errorResponse(error: string, code: string, status: number): Response {
  return Response.json(
    { error, code, timestamp: new Date().toISOString() },
    { status }
  );
}

function extractPathParam(url: string, prefix: string): string {
  const path = new URL(url).pathname;
  return decodeURIComponent(path.slice(prefix.length));
}

function requireAdmin(user?: AuthenticatedUser): void {
  if (!user) throw Object.assign(new Error("Authentication required"), { code: "UNAUTHORIZED", status: 401 });
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "dev") {
    throw Object.assign(new Error("Admin role required"), { code: "FORBIDDEN", status: 403 });
  }
}

function createSSEResponse(clientMap: Map<string, SSEClient>, channel: string): Response {
  const clientId = `sse_${channel}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = {
        id: clientId,
        controller,
        connectedAt: Date.now(),
      };
      clientMap.set(clientId, client);

      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({ clientId, channel, timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: ping\ndata: {}\n\n`));
        } catch {
          clearInterval(heartbeat);
          clientMap.delete(clientId);
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        clientMap.delete(clientId);
      };

      // Handle client disconnect
      try {
        controller.enqueue(new TextEncoder().encode(``));
      } catch {
        cleanup();
      }
    },
    cancel() {
      clientMap.delete(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/** Broadcast a risk update to all connected SSE alert clients */
export function broadcastAlert(data: Record<string, unknown>): void {
  const payload = `event: risk_alert\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const [id, client] of alertClients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      alertClients.delete(id);
    }
  }
}

/** Broadcast wager update to all connected SSE wager clients */
export function broadcastWager(data: Record<string, unknown>): void {
  const payload = `event: wager\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const [id, client] of liveWagerClients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      liveWagerClients.delete(id);
    }
  }
}

/** Broadcast a generic risk event to all SSE clients */
function broadcastToRiskClients(data: Record<string, unknown>): void {
  const payload = `event: risk_update\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const [id, client] of alertClients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      alertClients.delete(id);
    }
  }
}

/** Get active SSE connection counts for monitoring */
export function getSSEStats(): { liveWagerClients: number; alertClients: number } {
  return {
    liveWagerClients: liveWagerClients.size,
    alertClients: alertClients.size,
  };
}
