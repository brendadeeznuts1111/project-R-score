/**
 * Agent Service — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Provides agent hierarchy management, performance tracking,
 * downline queries, billing, sync from Buckeye, and supergroup management.
 *
 * Tables: agents, agent_hierarchy, player_agent_map, agent_supergroups,
 *         agent_supergroup_topics, agent_billing
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { createLogger } from "@utils/logger";
import { logAgent, logAgentAction } from "@utils/tableLogger";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("AgentService");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentTier = "platinum" | "gold" | "silver" | "bronze";
export type AgentStatus = "active" | "inactive" | "suspended";

export interface Agent {
  id: number;
  agentLogin: string;
  displayName: string;
  email?: string;
  phone?: string;
  tier: AgentTier;
  status: AgentStatus;
  parentLogin?: string;
  balance: number;
  commissionRate: number;
  totalPlayers: number;
  totalWagers: number;
  totalPnl: number;
  lifetimeGgr: number;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface AgentNode {
  login: string;
  displayName: string;
  tier: AgentTier;
  status: AgentStatus;
  balance: number;
  commissionRate: number;
  totalPlayers: number;
  totalWagers: number;
  totalPnl: number;
  level: number;
  children: AgentNode[];
}

export interface AgentHierarchy {
  root: AgentNode | null;
  totalAgents: number;
  maxDepth: number;
  byTier: Record<AgentTier, number>;
}

export interface DownlineSummary {
  login: string;
  displayName: string;
  tier: AgentTier;
  status: AgentStatus;
  level: number;
  totalPlayers: number;
  totalWagers: number;
  totalPnl: number;
  balance: number;
  commissionRate: number;
  path: string;
}

export interface AgentPerformance {
  agentLogin: string;
  displayName: string;
  period: string;
  totalPlayers: number;
  activePlayers: number;
  totalWagers: number;
  totalWagered: number;
  totalPayouts: number;
  grossProfit: number;
  netProfit: number;
  holdPercentage: number;
  newPlayers: number;
  commissionDue: number;
  topPlayerByWager?: string;
  updatedAt: number;
}

export interface AgentBilling {
  agentLogin: string;
  displayName: string;
  period: string;
  periodStart: number;
  periodEnd: number;
  totalPlayers: number;
  activePlayers: number;
  totalWagers: number;
  totalWagered: number;
  totalPayouts: number;
  grossProfit: number;
  netProfit: number;
  commissionDue: number;
  commissionRate: number;
  holdPct: number;
  newPlayers: number;
  createdAt: number;
}

export interface AgentSupergroup {
  id: number;
  agentLogin: string;
  groupName: string;
  chatId: string;
  botId?: string;
  purpose: string;
  status: string;
  isForum: boolean;
  settings?: Record<string, unknown>;
  topics?: AgentSupergroupTopic[];
  createdAt: number;
  updatedAt: number;
}

export interface AgentSupergroupTopic {
  id: number;
  supergroupId: number;
  topicName: string;
  threadId: string;
  purpose: string;
  status: string;
  settings?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface AgentPlayer {
  playerId: string;
  displayName: string;
  status: string;
  riskTier: string;
  balance: number;
  wagerCount: number;
  winRate: number;
  pnlLifetime: number;
  assignedAt: number;
  assignedBy?: string;
  isPrimary: boolean;
}

export interface CreateAgentData {
  agentLogin: string;
  displayName: string;
  email?: string;
  phone?: string;
  tier?: AgentTier;
  parentLogin?: string;
  balance?: number;
  commissionRate?: number;
  settings?: Record<string, unknown>;
}

export interface UpdateAgentData {
  displayName?: string;
  email?: string;
  phone?: string;
  tier?: AgentTier;
  status?: AgentStatus;
  parentLogin?: string;
  balance?: number;
  commissionRate?: number;
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// DB accessor
// ---------------------------------------------------------------------------

let _db: Database | null = null;

export function setAgentDatabase(db: Database): void {
  _db = db;
}

function getDb(): Database {
  if (!_db) {
    // Fallback: try to get from global or create new
    const dbPath = process.env.DB_PATH || "/data/terminal.db";
    _db = new Database(dbPath);
    _db.exec("PRAGMA foreign_keys = ON;");
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapAgentRow(row: Record<string, unknown>): Agent {
  return {
    id: row.id as number,
    agentLogin: row.agent_login as string,
    displayName: row.display_name as string,
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    tier: (row.tier as AgentTier) || "bronze",
    status: (row.status as AgentStatus) || "active",
    parentLogin: row.parent_login as string | undefined,
    balance: row.balance as number,
    commissionRate: row.commission_rate as number,
    totalPlayers: row.total_players as number,
    totalWagers: row.total_wagers as number,
    totalPnl: row.total_pnl as number,
    lifetimeGgr: row.lifetime_ggr as number,
    avatarUrl: row.avatar_url as string | undefined,
    settings: row.settings_json ? JSON.parse(row.settings_json as string) : undefined,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json as string) : undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

// ---------------------------------------------------------------------------
// 1. Agent CRUD
// ---------------------------------------------------------------------------

export function getAgentByLogin(agentLogin: string): Agent | null {
  try {
    const db = getDb();
    const row = db.query("SELECT * FROM agents WHERE agent_login = ?").get(agentLogin) as Record<string, unknown> | null;
    return row ? mapAgentRow(row) : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentByLogin failed for ${agentLogin}: ${msg}`);
    return null;
  }
}

export function listAgents(filters?: { tier?: AgentTier; status?: AgentStatus; parentLogin?: string; limit?: number; offset?: number }): { agents: Agent[]; total: number } {
  try {
    const db = getDb();
    const conditions: string[] = [];
    const params: SQLQueryBindings[] = [];

    if (filters?.tier) { conditions.push("tier = ?"); params.push(filters.tier); }
    if (filters?.status) { conditions.push("status = ?"); params.push(filters.status); }
    if (filters?.parentLogin !== undefined) { conditions.push("parent_login = ?"); params.push(filters.parentLogin); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    const countRow = db.query(`SELECT COUNT(*) as total FROM agents ${whereClause}`).get(...params) as { total: number };

    const rows = db.query(`SELECT * FROM agents ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Record<string, unknown>[];

    return {
      agents: rows.map(mapAgentRow),
      total: countRow?.total ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] listAgents failed: ${msg}`);
    return { agents: [], total: 0 };
  }
}

export function addAgent(data: CreateAgentData): Agent | null {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    db.query(
      `INSERT INTO agents (agent_login, display_name, email, phone, tier, parent_login, balance, commission_rate, settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.agentLogin,
      data.displayName,
      data.email ?? null,
      data.phone ?? null,
      data.tier ?? "bronze",
      data.parentLogin ?? null,
      data.balance ?? 0,
      data.commissionRate ?? 25.0,
      data.settings ? JSON.stringify(data.settings) : null,
      now,
      now
    );

    // Insert hierarchy record
    if (data.parentLogin) {
      const parentRow = db.query("SELECT path, level FROM agent_hierarchy WHERE agent_login = ? AND is_active = 1").get(data.parentLogin) as { path: string; level: number } | null;
      const path = parentRow ? `${parentRow.path}/${data.agentLogin}` : `/${data.agentLogin}`;
      const level = parentRow ? (parentRow.level + 1) : 0;

      db.query(
        `INSERT OR REPLACE INTO agent_hierarchy (agent_login, parent_login, level, path, commission_pct, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      ).run(data.agentLogin, data.parentLogin, level, path, data.commissionRate ?? 25.0, now);
    } else {
      db.query(
        `INSERT OR IGNORE INTO agent_hierarchy (agent_login, parent_login, level, path, commission_pct, is_active, created_at)
         VALUES (?, NULL, 0, ?, ?, 1, ?)`
      ).run(data.agentLogin, `/${data.agentLogin}`, data.commissionRate ?? 35.0, now);
    }

    logAgent({ agentLogin: data.agentLogin, parentLogin: data.parentLogin, action: "create", level: 0 });
    logger.info(`[AgentAction] Agent created: ${data.agentLogin}`);

    return getAgentByLogin(data.agentLogin);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] addAgent failed: ${msg}`);
    return null;
  }
}

export function updateAgent(agentLogin: string, data: UpdateAgentData): Agent | null {
  try {
    const db = getDb();
    const sets: string[] = [];
    const params: SQLQueryBindings[] = [];

    if (data.displayName !== undefined) { sets.push("display_name = ?"); params.push(data.displayName); }
    if (data.email !== undefined) { sets.push("email = ?"); params.push(data.email); }
    if (data.phone !== undefined) { sets.push("phone = ?"); params.push(data.phone); }
    if (data.tier !== undefined) { sets.push("tier = ?"); params.push(data.tier); }
    if (data.status !== undefined) { sets.push("status = ?"); params.push(data.status); }
    if (data.parentLogin !== undefined) { sets.push("parent_login = ?"); params.push(data.parentLogin); }
    if (data.balance !== undefined) { sets.push("balance = ?"); params.push(data.balance); }
    if (data.commissionRate !== undefined) { sets.push("commission_rate = ?"); params.push(data.commissionRate); }
    if (data.settings !== undefined) { sets.push("settings_json = ?"); params.push(JSON.stringify(data.settings)); }

    if (sets.length === 0) return getAgentByLogin(agentLogin);

    sets.push("updated_at = ?");
    params.push(Math.floor(Date.now() / 1000));
    params.push(agentLogin);

    db.query(`UPDATE agents SET ${sets.join(", ")} WHERE agent_login = ?`).run(...params);

    // Update hierarchy if parent changed
    if (data.parentLogin !== undefined) {
      db.query("UPDATE agent_hierarchy SET is_active = 0 WHERE agent_login = ?").run(agentLogin);

      const parentRow = db.query("SELECT path, level FROM agent_hierarchy WHERE agent_login = ? AND is_active = 1").get(data.parentLogin) as { path: string; level: number } | null;
      const path = parentRow ? `${parentRow.path}/${agentLogin}` : `/${agentLogin}`;
      const level = parentRow ? (parentRow.level + 1) : 0;
      const commission = data.commissionRate ?? 25.0;
      const now = Math.floor(Date.now() / 1000);

      db.query(
        `INSERT OR REPLACE INTO agent_hierarchy (agent_login, parent_login, level, path, commission_pct, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      ).run(agentLogin, data.parentLogin || null, level, path, commission, now);
    }

    logAgent({ agentLogin, action: "update" });
    logger.info(`[AgentAction] Agent updated: ${agentLogin}`);

    return getAgentByLogin(agentLogin);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] updateAgent failed for ${agentLogin}: ${msg}`);
    return null;
  }
}

export function deactivateAgent(agentLogin: string): boolean {
  try {
    const db = getDb();
    db.query("UPDATE agents SET status = 'inactive', updated_at = ? WHERE agent_login = ?").run(Math.floor(Date.now() / 1000), agentLogin);
    db.query("UPDATE agent_hierarchy SET is_active = 0 WHERE agent_login = ?").run(agentLogin);

    logAgent({ agentLogin, action: "deactivate" });
    logAgentAction({ agentLogin, actionType: "deactivate" });
    logger.info(`[AgentAction] Agent deactivated: ${agentLogin}`);

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] deactivateAgent failed for ${agentLogin}: ${msg}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. Hierarchy
// ---------------------------------------------------------------------------

export function getAgentHierarchy(rootLogin?: string): AgentHierarchy {
  try {
    const db = getDb();
    const rootAgent = rootLogin ? getAgentByLogin(rootLogin) : null;

    // If no root specified, find the agent with no parent
    let effectiveRoot = rootAgent;
    if (!effectiveRoot) {
      const row = db.query("SELECT * FROM agents WHERE parent_login IS NULL AND status = 'active' LIMIT 1").get() as Record<string, unknown> | null;
      if (row) effectiveRoot = mapAgentRow(row);
    }

    if (!effectiveRoot) return { root: null, totalAgents: 0, maxDepth: 0, byTier: { platinum: 0, gold: 0, silver: 0, bronze: 0 } };

    // Build tree using recursive CTE
    const rows = db.query(`
      WITH RECURSIVE downline AS (
        SELECT a.*, h.level, h.path, 0 as child_count
        FROM agents a
        JOIN agent_hierarchy h ON a.agent_login = h.agent_login
        WHERE h.agent_login = ? AND h.is_active = 1
        UNION ALL
        SELECT a.*, h.level, h.path, 0
        FROM agents a
        JOIN agent_hierarchy h ON a.agent_login = h.agent_login
        JOIN downline d ON h.parent_login = d.agent_login
        WHERE h.is_active = 1 AND a.status = 'active'
      )
      SELECT * FROM downline ORDER BY path
    `).all(effectiveRoot.agentLogin) as Array<Record<string, unknown>>;

    const agents = rows.map(mapAgentRow);
    const totalAgents = agents.length;
    const maxDepth = agents.length > 0 ? Math.max(...agents.map(a => {
      const r = rows.find(r => r.agent_login === a.agentLogin);
      return (r?.level as number) || 0;
    })) : 0;

    const byTier: Record<AgentTier, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    for (const a of agents) { byTier[a.tier] = (byTier[a.tier] || 0) + 1; }

    // Build tree
    function buildNode(login: string, level: number): AgentNode | null {
      const agent = agents.find(a => a.agentLogin === login);
      if (!agent) return null;

      const children = agents
        .filter(a => a.parentLogin === login)
        .map(a => buildNode(a.agentLogin, level + 1))
        .filter((n): n is AgentNode => n !== null);

      return {
        login: agent.agentLogin,
        displayName: agent.displayName,
        tier: agent.tier,
        status: agent.status,
        balance: agent.balance,
        commissionRate: agent.commissionRate,
        totalPlayers: agent.totalPlayers,
        totalWagers: agent.totalWagers,
        totalPnl: agent.totalPnl,
        level,
        children,
      };
    }

    const root = buildNode(effectiveRoot.agentLogin, 0);

    return { root, totalAgents, maxDepth, byTier };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentHierarchy failed: ${msg}`);
    return { root: null, totalAgents: 0, maxDepth: 0, byTier: { platinum: 0, gold: 0, silver: 0, bronze: 0 } };
  }
}

// ---------------------------------------------------------------------------
// 3. Downline
// ---------------------------------------------------------------------------

export function getAgentDownline(agentLogin: string, includeInactive = false): { direct: DownlineSummary[]; all: DownlineSummary[] } {
  try {
    const db = getDb();
    const statusFilter = includeInactive ? "" : "AND a.status = 'active'";

    // Direct children
    const directRows = db.query(`
      SELECT a.*, h.level, h.path, h.commission_pct
      FROM agents a
      JOIN agent_hierarchy h ON a.agent_login = h.agent_login
      WHERE h.parent_login = ? AND h.is_active = 1 ${statusFilter}
      ORDER BY a.display_name
    `).all(agentLogin) as Record<string, unknown>[];

    // All descendants via recursive CTE
    const allRows = db.query(`
      WITH RECURSIVE downline AS (
        SELECT a.*, h.level, h.path, h.commission_pct
        FROM agents a
        JOIN agent_hierarchy h ON a.agent_login = h.agent_login
        WHERE h.parent_login = ? AND h.is_active = 1 ${statusFilter}
        UNION ALL
        SELECT a.*, h.level, h.path, h.commission_pct
        FROM agents a
        JOIN agent_hierarchy h ON a.agent_login = h.agent_login
        JOIN downline d ON h.parent_login = d.agent_login
        WHERE h.is_active = 1 ${statusFilter}
      )
      SELECT * FROM downline ORDER BY path
    `).all(agentLogin) as Record<string, unknown>[];

    const mapDownline = (row: Record<string, unknown>): DownlineSummary => ({
      login: row.agent_login as string,
      displayName: row.display_name as string,
      tier: (row.tier as AgentTier) || "bronze",
      status: (row.status as AgentStatus) || "active",
      level: (row.level as number) || 0,
      totalPlayers: (row.total_players as number) || 0,
      totalWagers: (row.total_wagers as number) || 0,
      totalPnl: (row.total_pnl as number) || 0,
      balance: (row.balance as number) || 0,
      commissionRate: (row.commission_rate as number) || 0,
      path: (row.path as string) || "",
    });

    return {
      direct: directRows.map(mapDownline),
      all: allRows.map(mapDownline),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentDownline failed for ${agentLogin}: ${msg}`);
    return { direct: [], all: [] };
  }
}

// ---------------------------------------------------------------------------
// 4. Performance
// ---------------------------------------------------------------------------

export function getAgentPerformance(agentLogin: string, period: string): AgentPerformance | null {
  try {
    const db = getDb();

    // Check cached billing first
    const periodBounds = getPeriodBounds(period);
    const billingRow = db.query(
      "SELECT * FROM agent_billing WHERE agent_login = ? AND period = ? AND period_start = ?"
    ).get(agentLogin, period, periodBounds.start) as Record<string, unknown> | null;

    if (billingRow) {
      const agent = getAgentByLogin(agentLogin);
      return {
        agentLogin,
        displayName: agent?.displayName || agentLogin,
        period,
        totalPlayers: (billingRow.total_players as number) || 0,
        activePlayers: (billingRow.active_players as number) || 0,
        totalWagers: (billingRow.total_wagers as number) || 0,
        totalWagered: (billingRow.total_wagered as number) || 0,
        totalPayouts: (billingRow.total_payouts as number) || 0,
        grossProfit: (billingRow.gross_profit as number) || 0,
        netProfit: (billingRow.net_profit as number) || 0,
        holdPercentage: (billingRow.hold_pct as number) || 0,
        newPlayers: (billingRow.new_players as number) || 0,
        commissionDue: (billingRow.commission_due as number) || 0,
        updatedAt: (billingRow.updated_at as number) || Math.floor(Date.now() / 1000),
      };
    }

    // Build from raw data: count players, aggregate wagers
    const agent = getAgentByLogin(agentLogin);
    if (!agent) return null;

    // Get player count
    const playerCount = db.query(
      "SELECT COUNT(*) as cnt FROM player_agent_map WHERE agent_login = ? AND status = 'active'"
    ).get(agentLogin) as { cnt: number };

    // Get wager aggregates from raw_wagers (best effort)
    let totalWagers = agent.totalWagers;
    let totalWagered = 0;
    let totalPayouts = 0;
    try {
      const wagerRow = db.query(`
        SELECT COUNT(*) as wager_count, COALESCE(SUM(stake), 0) as total_stake, COALESCE(SUM(potential_payout), 0) as total_payout
        FROM raw_wagers WHERE agent_login = ? AND placed_at >= ? AND placed_at <= ?
      `).get(agentLogin, periodBounds.start, periodBounds.end) as { wager_count: number; total_stake: number; total_payout: number } | null;
      if (wagerRow) {
        totalWagers = wagerRow.wager_count;
        totalWagered = wagerRow.total_stake;
        totalPayouts = wagerRow.total_payout;
      }
    } catch {
      // raw_wagers may not exist or be accessible
    }

    const grossProfit = totalWagered - totalPayouts;
    const holdPct = totalWagered > 0 ? grossProfit / totalWagered : 0;
    const commissionDue = grossProfit > 0 ? grossProfit * (agent.commissionRate / 100) : 0;

    return {
      agentLogin,
      displayName: agent.displayName,
      period,
      totalPlayers: playerCount?.cnt ?? agent.totalPlayers,
      activePlayers: playerCount?.cnt ?? agent.totalPlayers,
      totalWagers,
      totalWagered,
      totalPayouts,
      grossProfit,
      netProfit: grossProfit - commissionDue,
      holdPercentage: holdPct,
      newPlayers: 0,
      commissionDue,
      updatedAt: Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentPerformance failed for ${agentLogin}: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. Players
// ---------------------------------------------------------------------------

export function getAgentPlayers(agentLogin: string): { players: AgentPlayer[]; total: number } {
  try {
    const db = getDb();

    // Try to join with customers for richer data
    let rows: Record<string, unknown>[] = [];
    try {
      rows = db.query(`
        SELECT pam.player_id, c.display_name, c.status, c.risk_tier, c.balance,
               c.wager_count, c.win_rate, c.lifetime_pnl as pnl_lifetime,
               pam.assigned_at, pam.assigned_by, pam.is_primary
        FROM player_agent_map pam
        LEFT JOIN customers c ON pam.player_id = c.customer_id
        WHERE pam.agent_login = ? AND pam.status = 'active'
        ORDER BY pam.assigned_at DESC
      `).all(agentLogin) as Record<string, unknown>[];
    } catch {
      // customers table may not be available, fall back to player_agent_map only
      rows = db.query(`
        SELECT player_id, '' as display_name, 'active' as status, 'GREEN' as risk_tier,
               0 as balance, 0 as wager_count, 0 as win_rate, 0 as pnl_lifetime,
               assigned_at, assigned_by, is_primary
        FROM player_agent_map
        WHERE agent_login = ? AND status = 'active'
        ORDER BY assigned_at DESC
      `).all(agentLogin) as Record<string, unknown>[];
    }

    const players: AgentPlayer[] = rows.map(row => ({
      playerId: row.player_id as string,
      displayName: (row.display_name as string) || (row.player_id as string),
      status: (row.status as string) || "active",
      riskTier: (row.risk_tier as string) || "GREEN",
      balance: (row.balance as number) || 0,
      wagerCount: (row.wager_count as number) || 0,
      winRate: (row.win_rate as number) || 0,
      pnlLifetime: (row.pnl_lifetime as number) || 0,
      assignedAt: row.assigned_at as number,
      assignedBy: row.assigned_by as string | undefined,
      isPrimary: (row.is_primary as number) === 1,
    }));

    return { players, total: players.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentPlayers failed for ${agentLogin}: ${msg}`);
    return { players: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// 6. Billing
// ---------------------------------------------------------------------------

export function getAgentBilling(agentLogin: string, period: string): AgentBilling | null {
  try {
    const db = getDb();
    const agent = getAgentByLogin(agentLogin);
    if (!agent) return null;

    const periodBounds = getPeriodBounds(period);

    // Check cached billing
    const billingRow = db.query(
      "SELECT * FROM agent_billing WHERE agent_login = ? AND period = ? AND period_start = ?"
    ).get(agentLogin, period, periodBounds.start) as Record<string, unknown> | null;

    if (billingRow) {
      return {
        agentLogin,
        displayName: agent.displayName,
        period,
        periodStart: billingRow.period_start as number,
        periodEnd: billingRow.period_end as number,
        totalPlayers: (billingRow.total_players as number) || 0,
        activePlayers: (billingRow.active_players as number) || 0,
        totalWagers: (billingRow.total_wagers as number) || 0,
        totalWagered: (billingRow.total_wagered as number) || 0,
        totalPayouts: (billingRow.total_payouts as number) || 0,
        grossProfit: (billingRow.gross_profit as number) || 0,
        netProfit: (billingRow.net_profit as number) || 0,
        commissionDue: (billingRow.commission_due as number) || 0,
        commissionRate: (billingRow.commission_rate as number) || agent.commissionRate,
        holdPct: (billingRow.hold_pct as number) || 0,
        newPlayers: (billingRow.new_players as number) || 0,
        createdAt: (billingRow.created_at as number) || Math.floor(Date.now() / 1000),
      };
    }

    // Build from performance
    const perf = getAgentPerformance(agentLogin, period);
    if (!perf) return null;

    return {
      agentLogin,
      displayName: agent.displayName,
      period,
      periodStart: periodBounds.start,
      periodEnd: periodBounds.end,
      totalPlayers: perf.totalPlayers,
      activePlayers: perf.activePlayers,
      totalWagers: perf.totalWagers,
      totalWagered: perf.totalWagered,
      totalPayouts: perf.totalPayouts,
      grossProfit: perf.grossProfit,
      netProfit: perf.netProfit,
      commissionDue: perf.commissionDue,
      commissionRate: agent.commissionRate,
      holdPct: perf.holdPercentage,
      newPlayers: perf.newPlayers,
      createdAt: Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentBilling failed for ${agentLogin}: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 7. Supergroups
// ---------------------------------------------------------------------------

export function getAgentSupergroups(agentLogin: string): { supergroups: AgentSupergroup[]; total: number } {
  try {
    const db = getDb();

    const groupRows = db.query(
      "SELECT * FROM agent_supergroups WHERE agent_login = ? ORDER BY created_at DESC"
    ).all(agentLogin) as Record<string, unknown>[];

    const supergroups: AgentSupergroup[] = groupRows.map(row => {
      const sg: AgentSupergroup = {
        id: row.id as number,
        agentLogin: row.agent_login as string,
        groupName: row.group_name as string,
        chatId: row.chat_id as string,
        botId: row.bot_id as string | undefined,
        purpose: (row.purpose as string) || "general",
        status: (row.status as string) || "active",
        isForum: (row.is_forum as number) === 1,
        settings: row.settings_json ? JSON.parse(row.settings_json as string) : undefined,
        createdAt: row.created_at as number,
        updatedAt: row.updated_at as number,
      };

      // Load topics
      const topicRows = db.query(
        "SELECT * FROM agent_supergroup_topics WHERE supergroup_id = ? AND status = 'active'"
      ).all(sg.id) as Record<string, unknown>[];

      sg.topics = topicRows.map(t => ({
        id: t.id as number,
        supergroupId: t.supergroup_id as number,
        topicName: t.topic_name as string,
        threadId: t.thread_id as string,
        purpose: (t.purpose as string) || "general",
        status: (t.status as string) || "active",
        settings: t.settings_json ? JSON.parse(t.settings_json as string) : undefined,
        createdAt: t.created_at as number,
        updatedAt: t.updated_at as number,
      }));

      return sg;
    });

    return { supergroups, total: supergroups.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentSupergroups failed for ${agentLogin}: ${msg}`);
    return { supergroups: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// 8. Sync from Buckeye
// ---------------------------------------------------------------------------

export interface SyncResult {
  synced: boolean;
  agentsProcessed: number;
  playersProcessed: number;
  errors: string[];
  timestamp: number;
}

export async function syncAgentData(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: false,
    agentsProcessed: 0,
    playersProcessed: 0,
    errors: [],
    timestamp: Math.floor(Date.now() / 1000),
  };

  try {
    // Fetch from Buckeye proxy endpoint
    const proxyUrl = process.env.PROXY_INTERNAL_URL || "http://localhost:3001";
    const apiKey = process.env.PROXY_API_KEY;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    // Try to fetch agent downline from Buckeye
    try {
      const resp = await fetch(`${proxyUrl}/api/proxy/agentDownline`, {
        method: "GET",
        headers,
      });

      if (resp.ok) {
        const data = await resp.json() as { agents?: Array<Record<string, unknown>> };
        if (data.agents) {
          for (const agentData of data.agents) {
            const login = (agentData.login || agentData.agentLogin) as string;
            if (!login) continue;

            const existing = getAgentByLogin(login);
            if (existing) {
              updateAgent(login, {
                displayName: (agentData.name || agentData.displayName) as string || existing.displayName,
                balance: (agentData.balance as number) ?? existing.balance,
              });
            } else {
              addAgent({
                agentLogin: login,
                displayName: (agentData.name || agentData.displayName || login) as string,
                email: (agentData.email as string) || undefined,
                tier: (agentData.tier as AgentTier) || "bronze",
                parentLogin: (agentData.parentLogin || agentData.parent_login) as string | undefined,
                balance: (agentData.balance as number) || 0,
              });
            }
            result.agentsProcessed++;
          }
        }
      } else {
        result.errors.push(`agentDownline proxy returned ${resp.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`agentDownline fetch failed: ${msg}`);
    }

    // Try to fetch billing data
    try {
      const resp = await fetch(`${proxyUrl}/api/proxy/agentBilling`, {
        method: "GET",
        headers,
      });

      if (resp.ok) {
        const data = await resp.json() as { billings?: Array<Record<string, unknown>> };
        if (data.billings) {
          for (const bill of data.billings) {
            const login = (bill.agentLogin || bill.agent_login) as string;
            if (!login) continue;

            const db = getDb();
            db.query(`
              INSERT OR REPLACE INTO agent_billing
              (agent_login, period, period_start, period_end, total_players, active_players,
               total_wagers, total_wagered, total_payouts, gross_profit, net_profit,
               commission_due, commission_rate, hold_pct, new_players, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              login,
              (bill.period as string) || "month",
              (bill.periodStart as number) || Math.floor(Date.now() / 1000) - 2592000,
              (bill.periodEnd as number) || Math.floor(Date.now() / 1000),
              (bill.totalPlayers as number) || 0,
              (bill.activePlayers as number) || 0,
              (bill.totalWagers as number) || 0,
              (bill.totalWagered as number) || 0,
              (bill.totalPayouts as number) || 0,
              (bill.grossProfit as number) || 0,
              (bill.netProfit as number) || 0,
              (bill.commissionDue as number) || 0,
              (bill.commissionRate as number) || 25.0,
              (bill.holdPct as number) || 0,
              (bill.newPlayers as number) || 0,
              Math.floor(Date.now() / 1000)
            );
          }
        }
      } else {
        result.errors.push(`agentBilling proxy returned ${resp.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`agentBilling fetch failed: ${msg}`);
    }

    result.synced = result.agentsProcessed > 0;

    logAgentAction({
      actionType: "sync",
      details: {
        agentsProcessed: result.agentsProcessed,
        errors: result.errors.length,
      },
    });
    logger.info(`[AgentAction] Sync complete: ${result.agentsProcessed} agents processed, ${result.errors.length} errors`);

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync error";
    result.errors.push(msg);
    logger.error(`[AgentHierarchy] syncAgentData failed: ${msg}`);
    return result;
  }
}

// ---------------------------------------------------------------------------
// 9. Helpers
// ---------------------------------------------------------------------------

function getPeriodBounds(period: string): { start: number; end: number } {
  const now = new Date();
  const end = Math.floor(now.getTime() / 1000);
  let start = end;

  switch (period) {
    case "today": {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = Math.floor(startOfDay.getTime() / 1000);
      break;
    }
    case "week": {
      start = end - 604800;
      break;
    }
    case "month": {
      start = end - 2592000;
      break;
    }
    case "quarter": {
      start = end - 7776000;
      break;
    }
    case "year": {
      start = end - 31536000;
      break;
    }
    default: {
      start = end - 2592000; // default month
    }
  }

  return { start, end };
}

// ---------------------------------------------------------------------------
// 10. Summary stats
// ---------------------------------------------------------------------------

export function getAgentSummary(): { total: number; byTier: Record<AgentTier, number>; byStatus: Record<string, number>; totalPlayers: number } {
  try {
    const db = getDb();

    const totalRow = db.query("SELECT COUNT(*) as cnt FROM agents").get() as { cnt: number };

    const tierRows = db.query("SELECT tier, COUNT(*) as cnt FROM agents GROUP BY tier").all() as Array<{ tier: string; cnt: number }>;
    const byTier: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    for (const r of tierRows) { byTier[r.tier] = r.cnt; }

    const statusRows = db.query("SELECT status, COUNT(*) as cnt FROM agents GROUP BY status").all() as Array<{ status: string; cnt: number }>;
    const byStatus: Record<string, number> = {};
    for (const r of statusRows) { byStatus[r.status] = r.cnt; }

    const playerRow = db.query("SELECT COUNT(*) as cnt FROM player_agent_map WHERE status = 'active'").get() as { cnt: number };

    return {
      total: totalRow.cnt,
      byTier: byTier as Record<AgentTier, number>,
      byStatus,
      totalPlayers: playerRow.cnt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    logger.error(`[AgentHierarchy] getAgentSummary failed: ${msg}`);
    return { total: 0, byTier: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, byStatus: {}, totalPlayers: 0 };
  }
}
