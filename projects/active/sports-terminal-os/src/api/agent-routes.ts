/**
 * Agent API Routes — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Category O: Agent Hub (12 endpoints)
 * Provides agent CRUD, hierarchy, downline, performance, billing,
 * supergroups, and Buckeye sync.
 *
 * Endpoints:
 *   GET    /api/agents                     — List agents with filters
 *   POST   /api/agents                     — Create agent
 *   GET    /api/agents/:id                 — Agent profile
 *   PUT    /api/agents/:id                 — Update agent
 *   DELETE /api/agents/:id                 — Deactivate (soft delete)
 *   GET    /api/agents/:id/hierarchy       — Full hierarchy tree
 *   GET    /api/agents/:id/downline        — Downline agents
 *   GET    /api/agents/:id/performance     — Performance metrics
 *   GET    /api/agents/:id/players         — Players assigned
 *   GET    /api/agents/:id/billing         — Billing/commissions
 *   GET    /api/agents/:id/supergroups     — Telegram supergroups
 *   POST   /api/agents/sync                — Trigger Buckeye sync
 *   GET    /api/proxy/agentDownline        — Proxy endpoint
 *   GET    /api/proxy/agentBilling         — Proxy endpoint
 */

import { createLogger } from "@utils/logger";
import { logAgent, logAgentAction } from "@utils/tableLogger";
import type { AuthContext } from "@utils/types";
import {
  listAgents,
  getAgentByLogin,
  addAgent,
  updateAgent,
  deactivateAgent,
  getAgentHierarchy,
  getAgentDownline,
  getAgentPerformance,
  getAgentPlayers,
  getAgentBilling,
  getAgentSupergroups,
  syncAgentData,
  getAgentSummary,
  type CreateAgentData,
  type UpdateAgentData,
  type AgentTier,
  type AgentStatus,
  setAgentDatabase,
} from "@services/agent-service";
import { Database } from "bun:sqlite";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("AgentRoutes");

// ---------------------------------------------------------------------------
// DB wiring
// ---------------------------------------------------------------------------

export function initAgentRoutes(db: Database): void {
  setAgentDatabase(db);
}

// ---------------------------------------------------------------------------
// Helper: JSON response
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
}

function errorResponse(message: string, code: string, status: number): Response {
  return Response.json(
    { error: message, code, timestamp: new Date().toISOString() },
    { status }
  );
}

// ---------------------------------------------------------------------------
// O.1 GET /api/agents — List agents with filters
// ---------------------------------------------------------------------------

export async function handleListAgents(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const tier = url.searchParams.get("tier") as AgentTier | null;
    const status = url.searchParams.get("status") as AgentStatus | null;
    const parentLogin = url.searchParams.get("parentLogin");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const filters = {
      ...(tier && ["platinum", "gold", "silver", "bronze"].includes(tier) ? { tier } : {}),
      ...(status && ["active", "inactive", "suspended"].includes(status) ? { status } : {}),
      ...(parentLogin !== null ? { parentLogin } : {}),
      limit: Math.min(limit, 200),
      offset,
    };

    const result = listAgents(filters);

    logAgent({ agentLogin: auth.user?.login || "unknown", action: "list", downlineCount: result.total });

    return jsonResponse({
      agents: result.agents,
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleListAgents failed: ${msg}`);
    return errorResponse("Failed to list agents", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.2 POST /api/agents — Create agent
// ---------------------------------------------------------------------------

export async function handleCreateAgent(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const body = await req.json() as Record<string, unknown>;

    if (!body.agentLogin || typeof body.agentLogin !== "string") {
      return errorResponse("agentLogin is required", "VALIDATION_ERROR", 400);
    }
    if (!body.displayName || typeof body.displayName !== "string") {
      return errorResponse("displayName is required", "VALIDATION_ERROR", 400);
    }

    const data: CreateAgentData = {
      agentLogin: body.agentLogin,
      displayName: body.displayName,
      email: body.email as string | undefined,
      phone: body.phone as string | undefined,
      tier: (body.tier as AgentTier) || "bronze",
      parentLogin: body.parentLogin as string | undefined,
      balance: typeof body.balance === "number" ? body.balance : undefined,
      commissionRate: typeof body.commissionRate === "number" ? body.commissionRate : undefined,
      settings: body.settings as Record<string, unknown> | undefined,
    };

    const existing = getAgentByLogin(data.agentLogin);
    if (existing) {
      return errorResponse("Agent with this login already exists", "DUPLICATE_PARTNER", 409);
    }

    const agent = addAgent(data);
    if (!agent) {
      return errorResponse("Failed to create agent", "INTERNAL_ERROR", 500);
    }

    logAgentAction({ agentLogin: data.agentLogin, actionType: "create" });

    return jsonResponse({ success: true, agent }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleCreateAgent failed: ${msg}`);
    return errorResponse("Failed to create agent", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.3 GET /api/agents/:id — Agent profile
// ---------------------------------------------------------------------------

export async function handleGetAgent(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const agent = getAgentByLogin(agentLogin);
    if (!agent) {
      return errorResponse("Agent not found", "NOT_FOUND", 404);
    }

    return jsonResponse({ agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleGetAgent failed: ${msg}`);
    return errorResponse("Failed to get agent", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.4 PUT /api/agents/:id — Update agent
// ---------------------------------------------------------------------------

export async function handleUpdateAgent(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const existing = getAgentByLogin(agentLogin);
    if (!existing) {
      return errorResponse("Agent not found", "NOT_FOUND", 404);
    }

    const body = await req.json() as Record<string, unknown>;

    const data: UpdateAgentData = {
      ...(body.displayName !== undefined ? { displayName: body.displayName as string } : {}),
      ...(body.email !== undefined ? { email: body.email as string | undefined } : {}),
      ...(body.phone !== undefined ? { phone: body.phone as string | undefined } : {}),
      ...(body.tier !== undefined ? { tier: body.tier as AgentTier } : {}),
      ...(body.status !== undefined ? { status: body.status as AgentStatus } : {}),
      ...(body.parentLogin !== undefined ? { parentLogin: body.parentLogin as string | undefined } : {}),
      ...(body.balance !== undefined ? { balance: body.balance as number } : {}),
      ...(body.commissionRate !== undefined ? { commissionRate: body.commissionRate as number } : {}),
      ...(body.settings !== undefined ? { settings: body.settings as Record<string, unknown> } : {}),
    };

    const agent = updateAgent(agentLogin, data);
    if (!agent) {
      return errorResponse("Failed to update agent", "INTERNAL_ERROR", 500);
    }

    logAgentAction({ agentLogin, actionType: "update", details: { fields: Object.keys(data) } });

    return jsonResponse({ success: true, agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleUpdateAgent failed: ${msg}`);
    return errorResponse("Failed to update agent", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.5 DELETE /api/agents/:id — Deactivate (soft delete)
// ---------------------------------------------------------------------------

export async function handleDeactivateAgent(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const existing = getAgentByLogin(agentLogin);
    if (!existing) {
      return errorResponse("Agent not found", "NOT_FOUND", 404);
    }

    const ok = deactivateAgent(agentLogin);
    if (!ok) {
      return errorResponse("Failed to deactivate agent", "INTERNAL_ERROR", 500);
    }

    return jsonResponse({ success: true, message: "Agent deactivated" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleDeactivateAgent failed: ${msg}`);
    return errorResponse("Failed to deactivate agent", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.6 GET /api/agents/:id/hierarchy — Full hierarchy tree
// ---------------------------------------------------------------------------

export async function handleGetHierarchy(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const hierarchy = getAgentHierarchy(agentLogin);

    logAgent({ agentLogin, action: "view_hierarchy", downlineCount: hierarchy.totalAgents });

    return jsonResponse(hierarchy);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetHierarchy failed: ${msg}`);
    return errorResponse("Failed to get hierarchy", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.7 GET /api/agents/:id/downline — Downline agents
// ---------------------------------------------------------------------------

export async function handleGetDownline(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    const result = getAgentDownline(agentLogin, includeInactive);

    return jsonResponse({
      agentLogin,
      directChildren: result.direct,
      allDescendants: result.all,
      directCount: result.direct.length,
      totalDownline: result.all.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetDownline failed: ${msg}`);
    return errorResponse("Failed to get downline", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.8 GET /api/agents/:id/performance — Performance metrics
// ---------------------------------------------------------------------------

export async function handleGetPerformance(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";

    const performance = getAgentPerformance(agentLogin, period);
    if (!performance) {
      return errorResponse("Agent not found", "NOT_FOUND", 404);
    }

    return jsonResponse(performance);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetPerformance failed: ${msg}`);
    return errorResponse("Failed to get performance", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.9 GET /api/agents/:id/players — Players assigned to agent
// ---------------------------------------------------------------------------

export async function handleGetAgentPlayers(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const result = getAgentPlayers(agentLogin);

    return jsonResponse({
      agentLogin,
      players: result.players,
      total: result.total,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetAgentPlayers failed: ${msg}`);
    return errorResponse("Failed to get players", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.10 GET /api/agents/:id/billing — Billing/commissions
// ---------------------------------------------------------------------------

export async function handleGetBilling(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";

    const billing = getAgentBilling(agentLogin, period);
    if (!billing) {
      return errorResponse("Agent not found", "NOT_FOUND", 404);
    }

    return jsonResponse(billing);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetBilling failed: ${msg}`);
    return errorResponse("Failed to get billing", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.11 GET /api/agents/:id/supergroups — Telegram supergroups
// ---------------------------------------------------------------------------

export async function handleGetSupergroups(req: Request, auth: AuthContext, params: Record<string, string>): Promise<Response> {
  try {
    const agentLogin = params.id;
    if (!agentLogin) {
      return errorResponse("Agent ID is required", "BAD_REQUEST", 400);
    }

    const result = getAgentSupergroups(agentLogin);

    return jsonResponse({
      agentLogin,
      supergroups: result.supergroups,
      total: result.total,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetSupergroups failed: ${msg}`);
    return errorResponse("Failed to get supergroups", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// O.12 POST /api/agents/sync — Trigger sync from Buckeye
// ---------------------------------------------------------------------------

export async function handleSyncAgents(req: Request, auth: AuthContext): Promise<Response> {
  try {
    logger.info(`[AgentAction] Sync triggered by ${auth.user?.login || "unknown"}`);

    const result = await syncAgentData();

    return jsonResponse({
      success: result.synced,
      agentsProcessed: result.agentsProcessed,
      errors: result.errors,
      timestamp: result.timestamp,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleSyncAgents failed: ${msg}`);
    return errorResponse("Sync failed", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// Proxy endpoints
// ---------------------------------------------------------------------------

export async function handleProxyAgentDownline(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");

    // Get the downline data from our service
    const login = agentId || auth.user?.login;
    if (!login) {
      return errorResponse("Agent ID required", "BAD_REQUEST", 400);
    }

    const result = getAgentDownline(login);
    const agent = getAgentByLogin(login);

    return jsonResponse({
      agentId: login,
      agentName: agent?.displayName || login,
      directChildren: result.direct,
      allDescendants: result.all,
      totalDownline: result.all.length,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleProxyAgentDownline failed: ${msg}`);
    return errorResponse("Failed to fetch downline", "INTERNAL_ERROR", 500);
  }
}

export async function handleProxyAgentBilling(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const period = url.searchParams.get("period") || "month";

    const login = agentId || auth.user?.login;
    if (!login) {
      return errorResponse("Agent ID required", "BAD_REQUEST", 400);
    }

    const billing = getAgentBilling(login, period);

    return jsonResponse({
      agentId: login,
      period,
      billing: billing || null,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentAction] handleProxyAgentBilling failed: ${msg}`);
    return errorResponse("Failed to fetch billing", "INTERNAL_ERROR", 500);
  }
}

// ---------------------------------------------------------------------------
// Summary endpoint
// ---------------------------------------------------------------------------

export async function handleGetAgentSummary(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const summary = getAgentSummary();
    return jsonResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[AgentHierarchy] handleGetAgentSummary failed: ${msg}`);
    return errorResponse("Failed to get summary", "INTERNAL_ERROR", 500);
  }
}
