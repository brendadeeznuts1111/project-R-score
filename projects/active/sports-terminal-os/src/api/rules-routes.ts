/**
 * Rules Engine API Routes — Zone 2 (Golden Hour)
 *
 * Endpoints:
 *   GET    /api/rules              — List all rules
 *   POST   /api/rules              — Create new rule
 *   GET    /api/rules/:id          — Get rule
 *   PUT    /api/rules/:id          — Update rule
 *   DELETE /api/rules/:id          — Delete rule
 *   POST   /api/rules/:id/execute  — Execute rule (simulated)
 *   POST   /api/rules/:id/backtest — Backtest rule
 *   POST   /api/rules/:id/toggle   — Enable/disable rule
 *   GET    /api/rules/:id/executions — Execution history
 *   GET    /api/rules/:id/stats    — Rule statistics (win rate, P&L)
 *
 * All errors logged via tableLogger with [PluginExecution] prefix.
 */

import { logPlugin } from "@utils/tableLogger";
import { createLogger } from "@utils/logger";
import type { AuthContext } from "@utils/types";
import {
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
  toggleRule,
  executeRule,
  backtestRule,
  getExecutions,
  getRuleStats,
  simulateTrade,
  type RuleType,
  type MarketDataContext,
  type RuleCondition,
  type RuleAction,
} from "@services/rules-engine";

const logger = createLogger("RulesRoutes");

const VALID_RULE_TYPES: RuleType[] = [
  "odds_threshold",
  "line_movement_pct",
  "steam_detected",
  "confidence_level",
  "time_based",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseListOptions(url: URL) {
  const enabled = url.searchParams.get("enabled");
  const ruleType = url.searchParams.get("ruleType") as RuleType | null;
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  return {
    ...(enabled !== null ? { enabled: enabled === "true" } : {}),
    ...(ruleType && VALID_RULE_TYPES.includes(ruleType) ? { ruleType } : {}),
    ...(limit ? { limit: parseInt(limit, 10) } : {}),
    ...(offset ? { offset: parseInt(offset, 10) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/rules — List all rules
 */
export async function handleListRules(req: Request, _auth: AuthContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const options = parseListOptions(url);
    const { items, total } = listRules(options);

    return Response.json({
      rules: items,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleListRules error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleListRules", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/rules — Create new rule
 */
export async function handleCreateRule(req: Request, auth: AuthContext): Promise<Response> {
  try {
    const body = await req.json();

    // Validate
    if (!body.name?.trim()) {
      return Response.json({ error: "Rule name is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!body.ruleType || !VALID_RULE_TYPES.includes(body.ruleType)) {
      return Response.json({ error: `Invalid ruleType. Must be one of: ${VALID_RULE_TYPES.join(", ")}`, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
      return Response.json({ error: "At least one condition is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!Array.isArray(body.actions) || body.actions.length === 0) {
      return Response.json({ error: "At least one action is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const rule = createRule({
      name: body.name,
      description: body.description || "",
      ruleType: body.ruleType,
      conditions: body.conditions as RuleCondition[],
      actions: body.actions as RuleAction[],
      enabled: body.enabled ?? false,
      priority: body.priority ?? 5,
      createdBy: auth.user.id,
    });

    logPlugin({
      plugin: "RulesRoutes",
      method: "handleCreateRule",
      ruleId: rule.id,
      createdBy: auth.user.id,
    });

    return Response.json({ rule }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleCreateRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleCreateRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/rules/:id — Get rule
 */
export async function handleGetRule(_req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const rule = getRule(id);
    return Response.json({ rule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      return Response.json({ error: msg, code: "NOT_FOUND" }, { status: 404 });
    }
    logger.error(`[PluginExecution] handleGetRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleGetRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * PUT /api/rules/:id — Update rule
 */
export async function handleUpdateRule(req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const body = await req.json();
    const rule = updateRule(id, body);

    logPlugin({ plugin: "RulesRoutes", method: "handleUpdateRule", ruleId: id });

    return Response.json({ rule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      return Response.json({ error: msg, code: "NOT_FOUND" }, { status: 404 });
    }
    logger.error(`[PluginExecution] handleUpdateRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleUpdateRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * DELETE /api/rules/:id — Delete rule
 */
export async function handleDeleteRule(_req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    deleteRule(id);

    logPlugin({ plugin: "RulesRoutes", method: "handleDeleteRule", ruleId: id });

    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      return Response.json({ error: msg, code: "NOT_FOUND" }, { status: 404 });
    }
    logger.error(`[PluginExecution] handleDeleteRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleDeleteRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/rules/:id/execute — Execute rule (simulated)
 */
export async function handleExecuteRule(req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    // Parse market data context from body, or use defaults
    let context: MarketDataContext;
    try {
      const body = await req.json();
      context = {
        sport: body.sport || "NBA",
        eventId: body.eventId || `evt_${Date.now()}`,
        market: body.market || "spread",
        odds: body.odds,
        line: body.line,
        movementPct: body.movementPct,
        steamDetected: body.steamDetected,
        steamBookCount: body.steamBookCount,
        confidence: body.confidence,
        timestamp: body.timestamp || Date.now(),
        bookId: body.bookId,
        vig: body.vig,
      };
    } catch {
      // Default context
      context = {
        sport: "NBA",
        eventId: `evt_${Date.now()}`,
        market: "spread",
        odds: -110,
        timestamp: Date.now(),
      };
    }

    const execution = executeRule(id, context, "simulated");

    // Check if this is just a simulation preview (no persist)
    const preview = new URL(req.url).searchParams.get("preview") === "true";
    if (preview) {
      // For preview, we still executed and persisted — but we note it
      return Response.json({
        execution,
        preview: true,
        note: "Execution was simulated and logged",
      });
    }

    return Response.json({ execution });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleExecuteRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleExecuteRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/rules/:id/backtest — Backtest rule
 */
export async function handleBacktestRule(req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    let options: { from?: number; to?: number; limit?: number } = {};
    try {
      const body = await req.json();
      options = {
        from: body.from,
        to: body.to,
        limit: body.limit,
      };
    } catch {
      // No body, use defaults
    }

    const result = backtestRule(id, options);

    logPlugin({
      plugin: "RulesRoutes",
      method: "handleBacktestRule",
      ruleId: id,
      totalExecutions: result.totalExecutions,
      winRate: result.winRate,
    });

    return Response.json({ backtest: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleBacktestRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleBacktestRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/rules/:id/toggle — Enable/disable rule
 */
export async function handleToggleRule(_req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const rule = toggleRule(id);

    logPlugin({
      plugin: "RulesRoutes",
      method: "handleToggleRule",
      ruleId: id,
      enabled: rule.enabled,
    });

    return Response.json({ rule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      return Response.json({ error: msg, code: "NOT_FOUND" }, { status: 404 });
    }
    logger.error(`[PluginExecution] handleToggleRule error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleToggleRule", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/rules/:id/executions — Execution history
 */
export async function handleRuleExecutions(req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const url = new URL(req.url);
    const executionType = url.searchParams.get("executionType") as "simulated" | "live" | null;
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    const { items, total } = getExecutions(id, {
      ...(executionType ? { executionType } : {}),
      ...(limit ? { limit: parseInt(limit, 10) } : {}),
      ...(offset ? { offset: parseInt(offset, 10) } : {}),
    });

    return Response.json({
      executions: items,
      total,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleRuleExecutions error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleRuleExecutions", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * GET /api/rules/:id/stats — Rule statistics
 */
export async function handleRuleStats(_req: Request, _auth: AuthContext, params?: Record<string, string>): Promise<Response> {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: "Rule ID required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const stats = getRuleStats(id);

    return Response.json({ stats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] handleRuleStats error: ${msg}`);
    logPlugin({ plugin: "RulesRoutes", method: "handleRuleStats", error: msg });
    return Response.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
