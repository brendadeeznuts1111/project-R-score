/**
 * Rules Engine Service — Zone 2 (Golden Hour)
 *
 * Provides auto-trade simulation with rule-based logic:
 *   - CRUD for trading rules with AND/OR condition logic
 *   - Rule evaluation against live market data
 *   - Simulated trade execution (no real money)
 *   - Backtesting against historical data
 *   - P&L tracking and win rate statistics
 *
 * SQLite tables: rules, rule_executions
 * All errors logged via tableLogger with [PluginExecution] prefix.
 * Depends on: Zone 1 (sportsbook_odds, line_movements tables), Zone 8 (webhook dispatch)
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { getDb } from "@db/index";
import { logPlugin } from "@utils/tableLogger";
import { createLogger } from "@utils/logger";
import { NotFoundError, ValidationError } from "@utils/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RuleType = "odds_threshold" | "line_movement_pct" | "steam_detected" | "confidence_level" | "time_based";
export type Comparator = "eq" | "gt" | "lt" | "gte" | "lte" | "between" | "contains";
export type LogicOperator = "AND" | "OR";
export type ActionType = "alert" | "simulate" | "webhook" | "log_only";

export interface RuleCondition {
  field: string; // e.g., "odds", "movement_pct", "confidence", "steam_book_count", "timestamp"
  comparator: Comparator;
  value: number | string | boolean | [number, number]; // for "between", use [min, max]
  logic?: LogicOperator; // AND/OR with next condition (default: AND)
}

export interface RuleAction {
  type: ActionType;
  config: Record<string, unknown>; // action-specific config
}

export interface TradingRule {
  id: string;
  name: string;
  description: string;
  ruleType: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  priority: number; // 1-10, higher = more important
  simulationCount: number;
  winCount: number;
  lossCount: number;
  totalPnl: number; // in cents
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  executionType: "simulated" | "live";
  inputData: Record<string, unknown>;
  result: RuleExecutionResult;
  pnl: number; // in cents, negative = loss
  notes?: string;
  executedAt: number;
}

export interface RuleExecutionResult {
  matched: boolean;
  conditionsMet: boolean[];
  actionsTriggered: ActionType[];
  simulatedStake?: number;
  simulatedOdds?: number;
  simulatedPayout?: number;
  details: Record<string, unknown>;
}

export interface BacktestResult {
  ruleId: string;
  ruleName: string;
  totalExecutions: number;
  wins: number;
  losses: number;
  pushes: number;
  totalPnl: number;
  avgPnl: number;
  winRate: number; // 0-100
  maxDrawdown: number;
  sharpeRatio: number;
  executionLog: Array<{
    executedAt: number;
    matched: boolean;
    pnl: number;
    marketData: Record<string, unknown>;
  }>;
}

export interface MarketDataContext {
  sport: string;
  eventId: string;
  market: string;
  odds?: number;
  line?: number;
  movementPct?: number;
  steamDetected?: boolean;
  steamBookCount?: number;
  confidence?: number;
  timestamp?: number;
  bookId?: string;
  vig?: number;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("RulesEngine");

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

interface RuleRow {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  conditions_json: string;
  actions_json: string;
  enabled: number;
  priority: number;
  simulation_count: number;
  win_count: number;
  loss_count: number;
  total_pnl: number;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

interface ExecutionRow {
  id: string;
  rule_id: string;
  execution_type: string;
  input_data_json: string;
  result_json: string;
  pnl: number;
  notes: string | null;
  executed_at: number;
}

function mapRuleRow(row: RuleRow): TradingRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ruleType: row.rule_type as RuleType,
    conditions: safeJsonParse<RuleCondition[]>(row.conditions_json, []),
    actions: safeJsonParse<RuleAction[]>(row.actions_json, []),
    enabled: row.enabled === 1,
    priority: row.priority,
    simulationCount: row.simulation_count,
    winCount: row.win_count,
    lossCount: row.loss_count,
    totalPnl: row.total_pnl,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExecutionRow(row: ExecutionRow): RuleExecution {
  return {
    id: row.id,
    ruleId: row.rule_id,
    executionType: row.execution_type as "simulated" | "live",
    inputData: safeJsonParse<Record<string, unknown>>(row.input_data_json, {}),
    result: safeJsonParse<RuleExecutionResult>(row.result_json, { matched: false, conditionsMet: [], actionsTriggered: [], details: {} }),
    pnl: row.pnl,
    notes: row.notes ?? undefined,
    executedAt: row.executed_at,
  };
}

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single condition against market data context.
 */
function evaluateSingleCondition(condition: RuleCondition, context: MarketDataContext): boolean {
  const fieldValue = getFieldValue(condition.field, context);

  switch (condition.comparator) {
    case "eq":
      return fieldValue === condition.value;
    case "gt":
      return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue > condition.value;
    case "lt":
      return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue < condition.value;
    case "gte":
      return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue >= condition.value;
    case "lte":
      return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue <= condition.value;
    case "between": {
      if (typeof fieldValue !== "number") return false;
      const range = condition.value as [number, number];
      return fieldValue >= range[0] && fieldValue <= range[1];
    }
    case "contains": {
      const strField = String(fieldValue).toLowerCase();
      const strValue = String(condition.value).toLowerCase();
      return strField.includes(strValue);
    }
    default:
      return false;
  }
}

/**
 * Extract a field value from market data context.
 */
function getFieldValue(field: string, context: MarketDataContext): number | string | boolean | undefined {
  const fieldMap: Record<string, unknown> = {
    odds: context.odds,
    line: context.line,
    movement_pct: context.movementPct,
    steam_detected: context.steamDetected,
    steam_book_count: context.steamBookCount,
    confidence: context.confidence,
    timestamp: context.timestamp,
    sport: context.sport,
    event_id: context.eventId,
    market: context.market,
    book_id: context.bookId,
    vig: context.vig,
  };
  return fieldMap[field] as number | string | boolean | undefined;
}

/**
 * Evaluate all conditions with AND/OR logic.
 */
export function evaluateConditions(conditions: RuleCondition[], context: MarketDataContext): { met: boolean; individual: boolean[] } {
  if (conditions.length === 0) return { met: true, individual: [] };

  const individual: boolean[] = [];

  for (let i = 0; i < conditions.length; i++) {
    const result = evaluateSingleCondition(conditions[i], context);
    individual.push(result);
  }

  // Evaluate with logic operators
  let overall = individual[0];
  for (let i = 1; i < conditions.length; i++) {
    const logicOp = conditions[i - 1].logic || "AND";
    if (logicOp === "AND") {
      overall = overall && individual[i];
    } else {
      overall = overall || individual[i];
    }
  }

  return { met: overall, individual };
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new trading rule.
 */
export function createRule(input: {
  name: string;
  description: string;
  ruleType: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled?: boolean;
  priority?: number;
  createdBy?: string;
}): TradingRule {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const id = `rule_${Bun.randomUUIDv7().slice(0, 8)}`;

  // Validate
  if (!input.name?.trim()) throw ValidationError.field("name", "required");
  if (!input.conditions?.length) throw ValidationError.field("conditions", "at least one condition required");
  if (!input.actions?.length) throw ValidationError.field("actions", "at least one action required");

  try {
    db.run(
      `INSERT INTO rules (id, name, description, rule_type, conditions_json, actions_json,
                          enabled, priority, simulation_count, win_count, loss_count, total_pnl,
                          created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        input.description.trim(),
        input.ruleType,
        JSON.stringify(input.conditions),
        JSON.stringify(input.actions),
        input.enabled ? 1 : 0,
        Math.min(Math.max(input.priority ?? 5, 1), 10),
        0, 0, 0, 0,
        input.createdBy || null,
        now,
        now,
      ]
    );

    logPlugin({ plugin: "RulesEngine", method: "createRule", ruleId: id, ruleName: input.name });

    return getRule(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] createRule failed: ${msg}`);
    logPlugin({ plugin: "RulesEngine", method: "createRule", error: msg });
    throw err;
  }
}

/**
 * Get a single rule by ID.
 */
export function getRule(id: string): TradingRule {
  const db = getDb();

  const row = db.query(`SELECT * FROM rules WHERE id = ?`).get(id) as RuleRow | null;

  if (!row) throw new NotFoundError(`Rule ${id} not found`, "RULE_NOT_FOUND", "rule", id);

  return mapRuleRow(row);
}

/**
 * List all rules with optional filtering.
 */
export function listRules(options?: {
  enabled?: boolean;
  ruleType?: RuleType;
  limit?: number;
  offset?: number;
}): { items: TradingRule[]; total: number } {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.enabled !== undefined) {
    conditions.push("enabled = ?");
    params.push(options.enabled ? 1 : 0);
  }
  if (options?.ruleType) {
    conditions.push("rule_type = ?");
    params.push(options.ruleType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    const rows = db.query(`SELECT * FROM rules ${whereClause} ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?`).all(
      ...params, limit, offset
    ) as RuleRow[];

    const countRow = db.query(`SELECT COUNT(*) as total FROM rules ${whereClause}`).get(...params) as { total: number };

    return {
      items: rows.map(mapRuleRow),
      total: countRow?.total ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] listRules failed: ${msg}`);
    logPlugin({ plugin: "RulesEngine", method: "listRules", error: msg });
    return { items: [], total: 0 };
  }
}

/**
 * Update a rule.
 */
export function updateRule(id: string, input: Partial<{
  name: string;
  description: string;
  ruleType: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  priority: number;
}>): TradingRule {
  const db = getDb();

  // Verify exists
  getRule(id);

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    if (!input.name.trim()) throw ValidationError.field("name", "cannot be empty");
    updates.push("name = ?");
    params.push(input.name.trim());
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description.trim());
  }
  if (input.ruleType !== undefined) {
    updates.push("rule_type = ?");
    params.push(input.ruleType);
  }
  if (input.conditions !== undefined) {
    updates.push("conditions_json = ?");
    params.push(JSON.stringify(input.conditions));
  }
  if (input.actions !== undefined) {
    updates.push("actions_json = ?");
    params.push(JSON.stringify(input.actions));
  }
  if (input.enabled !== undefined) {
    updates.push("enabled = ?");
    params.push(input.enabled ? 1 : 0);
  }
  if (input.priority !== undefined) {
    updates.push("priority = ?");
    params.push(Math.min(Math.max(input.priority, 1), 10));
  }

  if (updates.length === 0) {
    return getRule(id);
  }

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(id);

  try {
    db.run(`UPDATE rules SET ${updates.join(", ")} WHERE id = ?`, params);

    logPlugin({ plugin: "RulesEngine", method: "updateRule", ruleId: id });

    return getRule(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] updateRule failed for ${id}: ${msg}`);
    throw err;
  }
}

/**
 * Delete a rule and its execution history.
 */
export function deleteRule(id: string): void {
  const db = getDb();

  // Verify exists
  getRule(id);

  try {
    // Delete executions first
    db.run("DELETE FROM rule_executions WHERE rule_id = ?", [id]);
    // Delete rule
    db.run("DELETE FROM rules WHERE id = ?", [id]);

    logPlugin({ plugin: "RulesEngine", method: "deleteRule", ruleId: id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] deleteRule failed for ${id}: ${msg}`);
    throw err;
  }
}

/**
 * Toggle rule enabled/disabled.
 */
export function toggleRule(id: string): TradingRule {
  const rule = getRule(id);
  return updateRule(id, { enabled: !rule.enabled });
}

// ---------------------------------------------------------------------------
// Rule execution
// ---------------------------------------------------------------------------

/**
 * Evaluate a rule against live market data context.
 */
export function evaluateRule(rule: TradingRule, context: MarketDataContext): RuleExecutionResult {
  const startTime = performance.now();

  const { met: conditionsMet, individual } = evaluateConditions(rule.conditions, context);

  const result: RuleExecutionResult = {
    matched: conditionsMet,
    conditionsMet: individual,
    actionsTriggered: [],
    details: {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      evaluationMs: Math.round(performance.now() - startTime),
      timestamp: Date.now(),
      context,
    },
  };

  if (conditionsMet) {
    result.actionsTriggered = rule.actions.map((a) => a.type);

    // Simulate trade if simulate action present
    const simulateAction = rule.actions.find((a) => a.type === "simulate");
    if (simulateAction) {
      const stake = (simulateAction.config.stake as number) || 10000; // default 100 units in cents
      const odds = context.odds || -110;
      const payout = odds > 0
        ? stake + (stake * odds) / 100
        : stake + (stake * 100) / Math.abs(odds);

      result.simulatedStake = stake;
      result.simulatedOdds = odds;
      result.simulatedPayout = Math.round(payout);
    }
  }

  logPlugin({
    plugin: "RulesEngine",
    method: "evaluateRule",
    ruleId: rule.id,
    matched: conditionsMet,
    actions: result.actionsTriggered,
  });

  return result;
}

/**
 * Execute a rule (simulated) against market data and persist the result.
 */
export function executeRule(ruleId: string, context: MarketDataContext, executionType: "simulated" | "live" = "simulated"): RuleExecution {
  const db = getDb();
  const rule = getRule(ruleId);

  if (!rule.enabled) {
    throw new Error(`Rule ${ruleId} is disabled`);
  }

  const result = evaluateRule(rule, context);
  const now = Math.floor(Date.now() / 1000);
  const execId = `exec_${Bun.randomUUIDv7().slice(0, 8)}`;

  // Calculate P&L for simulated trades
  let pnl = 0;
  if (result.matched && result.simulatedPayout !== undefined && result.simulatedStake !== undefined) {
    // Simulate outcome: 50% win rate for demo, weighted by confidence
    const winProbability = (context.confidence || 50) / 100;
    const won = Math.random() < winProbability;
    pnl = won
      ? result.simulatedPayout - result.simulatedStake
      : -result.simulatedStake;

    result.details.simulatedOutcome = won ? "win" : "loss";
  }

  const execution: RuleExecution = {
    id: execId,
    ruleId,
    executionType,
    inputData: context as unknown as Record<string, unknown>,
    result,
    pnl,
    notes: `Conditions: [${result.conditionsMet.join(", ")}]`,
    executedAt: now,
  };

  try {
    db.run(
      `INSERT INTO rule_executions (id, rule_id, execution_type, input_data_json, result_json, pnl, notes, executed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        execId,
        ruleId,
        executionType,
        JSON.stringify(context),
        JSON.stringify(result),
        pnl,
        execution.notes ?? null,
        now,
      ]
    );

    // Update rule stats
    db.run(
      `UPDATE rules SET
         simulation_count = simulation_count + 1,
         win_count = win_count + CASE WHEN ? > 0 THEN 1 ELSE 0 END,
         loss_count = loss_count + CASE WHEN ? < 0 THEN 1 ELSE 0 END,
         total_pnl = total_pnl + ?,
         updated_at = ?
       WHERE id = ?`,
      [pnl, pnl, pnl, now, ruleId]
    );

    logPlugin({
      plugin: "RulesEngine",
      method: "executeRule",
      ruleId,
      executionId: execId,
      matched: result.matched,
      pnl,
    });

    return execution;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] executeRule failed for ${ruleId}: ${msg}`);
    logPlugin({ plugin: "RulesEngine", method: "executeRule", ruleId, error: msg });
    throw err;
  }
}

/**
 * Simulate a trade without persisting — for quick previews.
 */
export function simulateTrade(rule: TradingRule, marketData: MarketDataContext): RuleExecutionResult {
  return evaluateRule(rule, marketData);
}

// ---------------------------------------------------------------------------
// Backtesting
// ---------------------------------------------------------------------------

/**
 * Backtest a rule against historical data from line_movements and sportsbook_odds.
 */
export function backtestRule(ruleId: string, options?: {
  from?: number;
  to?: number;
  limit?: number;
}): BacktestResult {
  const db = getDb();
  const rule = getRule(ruleId);

  const from = options?.from || Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
  const to = options?.to || Date.now();
  const limit = Math.min(options?.limit || 500, 2000);

  try {
    // Fetch historical line movements as backtest data
    const rows = db.query(
      `SELECT book_id, sport, event_id, market, old_odds, new_odds,
              old_line, new_line, direction, movement_pct, timestamp
       FROM line_movements
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC
       LIMIT ?`
    ).all(from, to, limit) as Array<{
      book_id: string; sport: string; event_id: string; market: string;
      old_odds: number; new_odds: number; old_line: number | null; new_line: number | null;
      direction: string; movement_pct: number; timestamp: number;
    }>;

    const executionLog: BacktestResult["executionLog"] = [];
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let totalPnl = 0;
    let maxDrawdown = 0;
    let peak = 0;
    const pnlSeries: number[] = [];

    for (const row of rows) {
      const context: MarketDataContext = {
        sport: row.sport,
        eventId: row.event_id,
        market: row.market,
        odds: row.new_odds,
        line: row.new_line ?? undefined,
        movementPct: row.movement_pct,
        bookId: row.book_id,
        timestamp: row.timestamp,
      };

      const result = evaluateRule(rule, context);

      if (result.matched) {
        // Simulate outcome
        const stake = 10000; // 100 units
        const odds = row.new_odds;
        const payout = odds > 0
          ? stake + (stake * odds) / 100
          : stake + (stake * 100) / Math.abs(odds);

        // Random outcome weighted by direction favorability
        const winChance = row.direction === "up" ? 0.52 : 0.48;
        const roll = Math.random();
        let pnl = 0;

        if (roll < winChance) {
          pnl = Math.round(payout - stake);
          wins++;
        } else if (roll < winChance + 0.05) {
          pnl = 0;
          pushes++;
        } else {
          pnl = -stake;
          losses++;
        }

        totalPnl += pnl;
        pnlSeries.push(totalPnl);

        if (totalPnl > peak) peak = totalPnl;
        const drawdown = peak - totalPnl;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        executionLog.push({
          executedAt: row.timestamp,
          matched: true,
          pnl,
          marketData: context as unknown as Record<string, unknown>,
        });
      }
    }

    const totalExecutions = wins + losses + pushes;
    const winRate = totalExecutions > 0 ? Math.round((wins / totalExecutions) * 1000) / 10 : 0;
    const avgPnl = totalExecutions > 0 ? Math.round(totalPnl / totalExecutions) : 0;

    // Sharpe ratio (simplified)
    const returns = executionLog.map((e) => e.pnl);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? Math.round((avgReturn / stdDev) * 100) / 100 : 0;

    logPlugin({
      plugin: "RulesEngine",
      method: "backtestRule",
      ruleId,
      totalExecutions,
      winRate,
      totalPnl,
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      totalExecutions,
      wins,
      losses,
      pushes,
      totalPnl,
      avgPnl,
      winRate,
      maxDrawdown,
      sharpeRatio,
      executionLog,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] backtestRule failed for ${ruleId}: ${msg}`);
    logPlugin({ plugin: "RulesEngine", method: "backtestRule", ruleId, error: msg });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      totalExecutions: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalPnl: 0,
      avgPnl: 0,
      winRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      executionLog: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Execution history
// ---------------------------------------------------------------------------

/**
 * Get execution history for a rule.
 */
export function getExecutions(ruleId: string, options?: {
  executionType?: "simulated" | "live";
  limit?: number;
  offset?: number;
}): { items: RuleExecution[]; total: number } {
  const db = getDb();

  // Verify rule exists
  getRule(ruleId);

  const conditions: string[] = ["rule_id = ?"];
  const params: (string | number)[] = [ruleId];

  if (options?.executionType) {
    conditions.push("execution_type = ?");
    params.push(options.executionType);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    const rows = db.query(
      `SELECT * FROM rule_executions ${whereClause} ORDER BY executed_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as ExecutionRow[];

    const countRow = db.query(`SELECT COUNT(*) as total FROM rule_executions ${whereClause}`).get(...params) as { total: number };

    return {
      items: rows.map(mapExecutionRow),
      total: countRow?.total ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] getExecutions failed for ${ruleId}: ${msg}`);
    return { items: [], total: 0 };
  }
}

/**
 * Get rule statistics (win rate, P&L).
 */
export function getRuleStats(ruleId: string): {
  simulationCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  lastExecutedAt?: number;
} {
  const db = getDb();

  // Verify rule exists
  getRule(ruleId);

  try {
    const row = db.query(
      `SELECT simulation_count, win_count, loss_count, total_pnl
       FROM rules WHERE id = ?`
    ).get(ruleId) as {
      simulation_count: number; win_count: number;
      loss_count: number; total_pnl: number;
    } | null;

    const lastExec = db.query(
      `SELECT MAX(executed_at) as last_at FROM rule_executions WHERE rule_id = ?`
    ).get(ruleId) as { last_at: number } | null;

    if (!row) {
      return { simulationCount: 0, winCount: 0, lossCount: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
    }

    const total = row.simulation_count;
    const winRate = total > 0 ? Math.round((row.win_count / total) * 1000) / 10 : 0;
    const avgPnl = total > 0 ? Math.round(row.total_pnl / total) : 0;

    return {
      simulationCount: row.simulation_count,
      winCount: row.win_count,
      lossCount: row.loss_count,
      winRate,
      totalPnl: row.total_pnl,
      avgPnl,
      lastExecutedAt: lastExec?.last_at ?? undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] getRuleStats failed for ${ruleId}: ${msg}`);
    return { simulationCount: 0, winCount: 0, lossCount: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
  }
}

// evaluateConditions is already exported inline above — no re-export needed.
