/**
 * Risk Management Service
 *
 * Core risk engine: position tracking, exposure aggregation, risk scoring,
 * betting velocity analysis, limit enforcement, and violation management.
 *
 * Tables: risk_positions, enforcement_queue, limit_enforcement_log,
 *         wager_violations, risk_config, risk_analytics_snapshots
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import {
  logPosition,
  logRiskScore,
  logRiskAlert,
  logEnforcement,
  logViolation,
  logCron,
} from "@utils/tableLogger";
import type { RiskTier } from "@utils/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskPosition {
  id: number;
  positionId: string;
  agentLogin: string;
  playerId: string | null;
  sport: string;
  eventId: string;
  eventName: string | null;
  market: string;
  positionType: string;
  side: string | null;
  totalStake: number;
  totalExposure: number;
  maxPayout: number;
  playerCount: number;
  wagerCount: number;
  riskScore: number;
  riskTier: RiskTier;
  concentrationPct: number | null;
  status: "open" | "warning" | "breached" | "closed" | "expired";
  expiresAt: number;
  closedAt: number | null;
  closeReason: string | null;
  breakdownJson: string | null;
  metadataJson: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RiskDashboard {
  openPositions: number;
  totalExposure: number;
  activeViolations: number;
  avgRiskScore: number;
  exposureBySport: ExposureSummary[];
  exposureByBook: ExposureSummary[];
  scoreDistribution: ScoreBin[];
  recentViolations: WagerViolation[];
  lastUpdated: number;
}

export interface ExposureSummary {
  key: string; // sport or book identifier
  totalExposure: number;
  wagerCount: number;
  playerCount: number;
  avgRiskScore: number;
  topTier: RiskTier;
}

export interface ScoreBin {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface BettingVelocity {
  playerId: string;
  wagersPerHour: number;
  wagersPerDay: number;
  avgStake: number;
  maxStake: number;
  totalStake24h: number;
  trend: "accelerating" | "stable" | "decelerating";
  sampleSize: number;
  calculatedAt: number;
}

export interface RiskScoreResult {
  playerId: string;
  score: number; // 0-100
  confidence: number;
  tier: RiskTier;
  factors: Array<{ factor: string; weight: number; description: string }>;
  modelVersion: string;
  calculatedAt: number;
}

export interface EnforcementAction {
  id: number;
  queueId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  agentLogin: string;
  paramsJson: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  scheduledAt: number | null;
  processedAt: number | null;
  processedBy: string | null;
  resultJson: string | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
}

export interface WagerViolation {
  id: number;
  violationId: string;
  wagerId: string;
  playerId: string;
  agentLogin: string;
  ruleId: string | null;
  violationType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  wagerSnapshotJson: string;
  actionTaken: string | null;
  actionParamsJson: string | null;
  enforcedBy: string | null;
  status: "open" | "reviewed" | "dismissed" | "confirmed";
  reviewedBy: string | null;
  reviewedAt: number | null;
  reviewNotes: string | null;
  createdAt: number;
}

export interface LimitEnforcementLog {
  id: number;
  enforcementId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  agentLogin: string;
  oldValueJson: string | null;
  newValueJson: string | null;
  paramsJson: string | null;
  executedBy: string | null;
  result: "success" | "failed" | "partial";
  resultMessage: string | null;
  wagerId: string | null;
  createdAt: number;
}

export interface PositionFilters {
  sport?: string;
  book?: string;
  riskTier?: RiskTier;
  status?: string;
  playerId?: string;
  agentLogin?: string;
  limit?: number;
  offset?: number;
}

export interface ViolationFilters {
  playerId?: string;
  severity?: string;
  status?: string;
  agentLogin?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Risk Service
// ---------------------------------------------------------------------------

let db: Database;

export function initRiskService(database: Database): void {
  db = database;
}

function getDb(): Database {
  if (!db) throw new Error("Risk service not initialized. Call initRiskService() first.");
  return db;
}

// --- Risk Positions ---

/**
 * Generate risk positions from wager data.
 * Aggregates open wagers into positions grouped by agent, sport, event, market.
 */
export function generateRiskPositions(): { count: number; positions: RiskPosition[] } {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const expiryHours = parseInt(getRiskConfig("position_expiry_hours") || "24", 10);
  const expiresAt = now + expiryHours * 3600;

  // Aggregate open wagers into positions
  const rows = db.query(`
    SELECT
      agent_login,
      sport,
      event_id,
      event_name,
      market,
      COUNT(*) as wager_count,
      SUM(stake) as total_stake,
      SUM(potential_payout) as max_payout,
      COUNT(DISTINCT player_id) as player_count,
      AVG(COALESCE(risk_score, 0)) as avg_risk_score
    FROM wagers
    WHERE status IN ('open', 'pending')
    GROUP BY agent_login, sport, event_id, market
    HAVING total_stake > 0
  `).all() as Array<{
    agent_login: string;
    sport: string;
    event_id: string;
    event_name: string;
    market: string;
    wager_count: number;
    total_stake: number;
    max_payout: number;
    player_count: number;
    avg_risk_score: number;
  }>;

  const positions: RiskPosition[] = [];

  for (const row of rows) {
    const positionId = `pos_${row.agent_login}_${row.event_id}_${row.market}_${now}`;
    const riskScore = Math.min(100, Math.round((row.avg_risk_score || 0) * 100));
    const riskTier = scoreToTier(riskScore);
    const exposure = row.max_payout - row.total_stake;

    try {
      db.query(
        `INSERT OR REPLACE INTO risk_positions (
          position_id, agent_login, player_id, sport, event_id, event_name,
          market, position_type, side, total_stake, total_exposure,
          max_payout, player_count, wager_count, risk_score, risk_tier,
          concentration_pct, status, expires_at, closed_at, close_reason,
          breakdown_json, metadata_json, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, 'exposure', NULL, ?, ?, ?, ?, ?, ?, ?, NULL, 'open', ?, NULL, NULL, NULL, NULL, ?, ?)`
      ).run(
        positionId, row.agent_login, row.sport, row.event_id, row.event_name,
        row.market, row.total_stake, exposure, row.max_payout, row.player_count,
        row.wager_count, riskScore, riskTier, expiresAt, now, now
      );

      const pos = getPositionById(positionId);
      if (pos) {
        positions.push(pos);
        logPosition({
          positionId,
          agentLogin: row.agent_login,
          sport: row.sport,
          eventId: row.event_id,
          exposure,
          status: "open",
          action: "create",
        });
      }
    } catch (err: any) {
      logRiskAlert({
        alertType: "system_alert",
        severity: "MEDIUM",
        source: "risk-service",
        message: `Failed to create position ${positionId}: ${err.message}`,
      });
    }
  }

  logCron({
    jobName: "position_generation",
    recordsProcessed: positions.length,
    durationMs: 0,
  });

  return { count: positions.length, positions };
}

export function getPositionById(positionId: string): RiskPosition | null {
  const row = getDb().query(
    `SELECT * FROM risk_positions WHERE position_id = ?`
  ).get(positionId) as Record<string, unknown> | null;
  return row ? mapRiskPosition(row) : null;
}

export function getOpenPositions(filters: PositionFilters = {}): { items: RiskPosition[]; total: number } {
  const db = getDb();
  const conditions: string[] = ["status = 'open' OR status = 'warning' OR status = 'breached'"];
  const params: SQLQueryBindings[] = [];

  if (filters.sport) {
    conditions.push("sport = ?");
    params.push(filters.sport);
  }
  if (filters.book) {
    conditions.push("agent_login = ?");
    params.push(filters.book);
  }
  if (filters.riskTier) {
    conditions.push("risk_tier = ?");
    params.push(filters.riskTier);
  }
  if (filters.status) {
    conditions.pop();
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.playerId) {
    conditions.push("player_id = ?");
    params.push(filters.playerId);
  }
  if (filters.agentLogin) {
    conditions.push("agent_login = ?");
    params.push(filters.agentLogin);
  }

  const whereClause = conditions.join(" AND ");
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const totalRow = db.query(`SELECT COUNT(*) as count FROM risk_positions WHERE ${whereClause}`).get(...params) as { count: number };
  const total = totalRow?.count || 0;

  const rows = db.query(`
    SELECT * FROM risk_positions
    WHERE ${whereClause}
    ORDER BY risk_score DESC, total_exposure DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Record<string, unknown>[];

  return {
    items: rows.map(mapRiskPosition),
    total,
  };
}

export function getRiskDashboard(): RiskDashboard {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // KPIs
  const openPosRow = db.query(`SELECT COUNT(*) as count, COALESCE(SUM(total_exposure), 0) as exposure FROM risk_positions WHERE status IN ('open', 'warning', 'breached')`).get() as { count: number; exposure: number };
  const violationsRow = db.query(`SELECT COUNT(*) as count FROM wager_violations WHERE status = 'open'`).get() as { count: number };
  const avgScoreRow = db.query(`SELECT AVG(risk_score) as avg FROM risk_positions WHERE status IN ('open', 'warning', 'breached')`).get() as { avg: number };

  // Exposure by sport
  const sportRows = db.query(`
    SELECT sport as key, SUM(total_exposure) as total_exposure, SUM(wager_count) as wager_count,
           SUM(player_count) as player_count, AVG(risk_score) as avg_risk_score, MAX(risk_tier) as top_tier
    FROM risk_positions WHERE status IN ('open', 'warning', 'breached') GROUP BY sport ORDER BY total_exposure DESC
  `).all() as Array<{
    key: string; total_exposure: number; wager_count: number; player_count: number;
    avg_risk_score: number; top_tier: string;
  }>;

  // Exposure by book (agent_login maps to book)
  const bookRows = db.query(`
    SELECT agent_login as key, SUM(total_exposure) as total_exposure, SUM(wager_count) as wager_count,
           SUM(player_count) as player_count, AVG(risk_score) as avg_risk_score, MAX(risk_tier) as top_tier
    FROM risk_positions WHERE status IN ('open', 'warning', 'breached') GROUP BY agent_login ORDER BY total_exposure DESC
  `).all() as Array<{
    key: string; total_exposure: number; wager_count: number; player_count: number;
    avg_risk_score: number; top_tier: string;
  }>;

  // Risk score distribution
  const scoreBins: ScoreBin[] = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ];

  const scoreRows = db.query(`SELECT risk_score FROM risk_positions WHERE status IN ('open', 'warning', 'breached')`).all() as Array<{ risk_score: number }>;
  for (const row of scoreRows) {
    const bin = scoreBins.find((b) => row.risk_score >= b.min && row.risk_score <= b.max);
    if (bin) bin.count++;
  }

  // Recent violations
  const recentViolations = db.query(`
    SELECT * FROM wager_violations ORDER BY created_at DESC LIMIT 10
  `).all() as Record<string, unknown>[];

  return {
    openPositions: openPosRow?.count || 0,
    totalExposure: openPosRow?.exposure || 0,
    activeViolations: violationsRow?.count || 0,
    avgRiskScore: Math.round(avgScoreRow?.avg || 0),
    exposureBySport: sportRows.map((r) => ({
      key: r.key,
      totalExposure: r.total_exposure,
      wagerCount: r.wager_count,
      playerCount: r.player_count,
      avgRiskScore: Math.round(r.avg_risk_score || 0),
      topTier: r.top_tier as RiskTier,
    })),
    exposureByBook: bookRows.map((r) => ({
      key: r.key,
      totalExposure: r.total_exposure,
      wagerCount: r.wager_count,
      playerCount: r.player_count,
      avgRiskScore: Math.round(r.avg_risk_score || 0),
      topTier: r.top_tier as RiskTier,
    })),
    scoreDistribution: scoreBins,
    recentViolations: recentViolations.map(mapWagerViolation),
    lastUpdated: now,
  };
}

export function getExposureBySport(): ExposureSummary[] {
  const rows = getDb().query(`
    SELECT sport as key, SUM(total_exposure) as total_exposure, SUM(wager_count) as wager_count,
           SUM(player_count) as player_count, AVG(risk_score) as avg_risk_score, MAX(risk_tier) as top_tier
    FROM risk_positions WHERE status IN ('open', 'warning', 'breached') GROUP BY sport ORDER BY total_exposure DESC
  `).all() as Array<{
    key: string; total_exposure: number; wager_count: number; player_count: number;
    avg_risk_score: number; top_tier: string;
  }>;

  return rows.map((r) => ({
    key: r.key,
    totalExposure: r.total_exposure,
    wagerCount: r.wager_count,
    playerCount: r.player_count,
    avgRiskScore: Math.round(r.avg_risk_score || 0),
    topTier: r.top_tier as RiskTier,
  }));
}

export function getExposureByBook(): ExposureSummary[] {
  const rows = getDb().query(`
    SELECT agent_login as key, SUM(total_exposure) as total_exposure, SUM(wager_count) as wager_count,
           SUM(player_count) as player_count, AVG(risk_score) as avg_risk_score, MAX(risk_tier) as top_tier
    FROM risk_positions WHERE status IN ('open', 'warning', 'breached') GROUP BY agent_login ORDER BY total_exposure DESC
  `).all() as Array<{
    key: string; total_exposure: number; wager_count: number; player_count: number;
    avg_risk_score: number; top_tier: string;
  }>;

  return rows.map((r) => ({
    key: r.key,
    totalExposure: r.total_exposure,
    wagerCount: r.wager_count,
    playerCount: r.player_count,
    avgRiskScore: Math.round(r.avg_risk_score || 0),
    topTier: r.top_tier as RiskTier,
  }));
}

// --- Betting Velocity ---

export function getBettingVelocity(playerId: string): BettingVelocity {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  const oneDayAgo = now - 86400;

  const hourRow = db.query(`
    SELECT COUNT(*) as count, AVG(stake) as avg_stake, MAX(stake) as max_stake, SUM(stake) as total_stake
    FROM wagers WHERE player_id = ? AND placed_at >= ?
  `).get(playerId, oneHourAgo) as { count: number; avg_stake: number; max_stake: number; total_stake: number };

  const dayRow = db.query(`
    SELECT COUNT(*) as count, AVG(stake) as avg_stake, MAX(stake) as max_stake, SUM(stake) as total_stake,
           MIN(placed_at) as oldest
    FROM wagers WHERE player_id = ? AND placed_at >= ?
  `).get(playerId, oneDayAgo) as { count: number; avg_stake: number; max_stake: number; total_stake: number; oldest: number };

  // Trend: compare first half vs second half of day
  const halfDayAgo = now - 43200;
  const firstHalfRow = db.query(`SELECT COUNT(*) as count FROM wagers WHERE player_id = ? AND placed_at >= ? AND placed_at < ?`).get(playerId, oneDayAgo, halfDayAgo) as { count: number };
  const secondHalfRow = db.query(`SELECT COUNT(*) as count FROM wagers WHERE player_id = ? AND placed_at >= ?`).get(playerId, halfDayAgo) as { count: number };

  let trend: BettingVelocity["trend"] = "stable";
  if (secondHalfRow.count > firstHalfRow.count * 1.3) trend = "accelerating";
  else if (secondHalfRow.count < firstHalfRow.count * 0.7) trend = "decelerating";

  return {
    playerId,
    wagersPerHour: hourRow?.count || 0,
    wagersPerDay: dayRow?.count || 0,
    avgStake: Math.round(dayRow?.avg_stake || 0),
    maxStake: Math.round(dayRow?.max_stake || 0),
    totalStake24h: Math.round(dayRow?.total_stake || 0),
    trend,
    sampleSize: dayRow?.count || 0,
    calculatedAt: now,
  };
}

// --- Risk Score ---

export function calculateRiskScore(playerId: string): RiskScoreResult {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Get player features
  const features = db.query(`SELECT * FROM customer_features WHERE customer_id = ? ORDER BY calculated_at DESC LIMIT 1`).get(playerId) as Record<string, unknown> | null;

  // Get recent violations
  const violationsRow = db.query(`SELECT COUNT(*) as count FROM wager_violations WHERE player_id = ? AND created_at >= ?`).get(playerId, now - 86400) as { count: number };

  // Get velocity
  const velocity = getBettingVelocity(playerId);

  // Get IP risk
  const ipRiskRow = db.query(`SELECT AVG(risk_score) as avg FROM ip_tracking WHERE player_id = ?`).get(playerId) as { avg: number };

  // Composite score calculation (0-100, higher = riskier)
  const factors: Array<{ factor: string; weight: number; description: string }> = [];
  let totalScore = 0;

  // Win rate anomaly (> 55% is suspicious)
  const winRate30d = features ? (features.win_rate_30d as number || 0) : 0;
  const winRateScore = winRate30d > 0.55 ? Math.min(30, Math.round((winRate30d - 0.55) * 600)) : 0;
  if (winRateScore > 0) {
    factors.push({ factor: "win_rate_anomaly", weight: winRateScore, description: `Win rate ${(winRate30d * 100).toFixed(1)}% over 30 days` });
    totalScore += winRateScore;
  }

  // Velocity spike
  const maxWagersPerHour = parseInt(getRiskConfig("max_wagers_per_hour") || "20", 10);
  const velocityScore = velocity.wagersPerHour > maxWagersPerHour ? Math.min(25, Math.round((velocity.wagersPerHour / maxWagersPerHour) * 15)) : 0;
  if (velocityScore > 0) {
    factors.push({ factor: "velocity_spike", weight: velocityScore, description: `${velocity.wagersPerHour} wagers/hour (limit: ${maxWagersPerHour})` });
    totalScore += velocityScore;
  }

  // Violation count
  const violationScore = Math.min(20, (violationsRow?.count || 0) * 10);
  if (violationScore > 0) {
    factors.push({ factor: "recent_violations", weight: violationScore, description: `${violationsRow?.count} violations in 24h` });
    totalScore += violationScore;
  }

  // IP risk
  const ipRisk = Math.round(ipRiskRow?.avg || 0);
  const ipScore = ipRisk > 50 ? Math.min(20, Math.round((ipRisk - 50) * 0.8)) : 0;
  if (ipScore > 0) {
    factors.push({ factor: "ip_risk", weight: ipScore, description: `IP risk score ${ipRisk}` });
    totalScore += ipScore;
  }

  // PnL anomaly
  const pnl30d = features ? (features.pnl_30d as number || 0) : 0;
  const pnlScore = pnl30d > 100000 ? Math.min(15, Math.round(pnl30d / 50000)) : 0;
  if (pnlScore > 0) {
    factors.push({ factor: "pnl_anomaly", weight: pnlScore, description: `PnL +$${(pnl30d / 100).toFixed(0)} in 30d` });
    totalScore += pnlScore;
  }

  // Baseline score: minimum 5 for any tracked player
  if (totalScore === 0) {
    totalScore = 5;
    factors.push({ factor: "baseline", weight: 5, description: "Baseline risk for tracked player" });
  }

  const finalScore = Math.min(100, totalScore);
  const tier = scoreToTier(finalScore);

  logRiskScore({
    playerId,
    score: finalScore,
    confidence: 0.85,
    factors: factors.map((f) => ({ factor: f.factor, weight: f.weight })),
    modelVersion: "v2.1-composite",
  });

  return {
    playerId,
    score: finalScore,
    confidence: 0.85,
    tier,
    factors,
    modelVersion: "v2.1-composite",
    calculatedAt: now,
  };
}

// --- Enforcement ---

export function enforceLimits(wagerData: {
  playerId: string;
  agentLogin: string;
  wagerId: string;
  stake: number;
}): { allowed: boolean; reason?: string; adjustedStake?: number } {
  const db = getDb();
  const { playerId, agentLogin, wagerId, stake } = wagerData;

  // Check player's risk tier
  const playerRow = db.query(`SELECT risk_tier FROM customers WHERE customer_id = ?`).get(playerId) as { risk_tier: RiskTier } | null;
  const tier = playerRow?.risk_tier || "GREEN";

  // Get tier limits from config
  const tierLimits = getTierLimits(tier);

  if (tier === "BLACK") {
    // Log violation
    insertViolation({
      wagerId,
      playerId,
      agentLogin,
      violationType: "tier_breach",
      severity: "critical",
      description: `Wager blocked: player ${playerId} is BLACK tier (max wager: $0)`,
      wagerSnapshotJson: JSON.stringify(wagerData),
      actionTaken: "blocked",
    });
    logEnforcement({
      playerId,
      agentLogin,
      action: "auto_enforce",
      reason: "BLACK tier - wager blocked",
    });
    return { allowed: false, reason: "Player is BLACK tier - wagering suspended" };
  }

  if (tier === "RED" && stake > tierLimits.maxWager) {
    const adjustedStake = tierLimits.maxWager;
    insertViolation({
      wagerId,
      playerId,
      agentLogin,
      violationType: "limit_exceeded",
      severity: "high",
      description: `Stake adjusted: $${stake} exceeds RED tier limit of $${tierLimits.maxWager}`,
      wagerSnapshotJson: JSON.stringify(wagerData),
      actionTaken: "limited",
    });
    logEnforcement({
      playerId,
      agentLogin,
      action: "apply_limit",
      limitType: "wager",
      oldValue: stake,
      newValue: adjustedStake,
      reason: "RED tier limit enforcement",
    });
    return { allowed: true, reason: `Stake adjusted to RED tier limit ($${tierLimits.maxWager})`, adjustedStake };
  }

  // Velocity check
  const velocity = getBettingVelocity(playerId);
  const maxPerHour = parseInt(getRiskConfig("max_wagers_per_hour") || "20", 10);
  if (velocity.wagersPerHour > maxPerHour * 1.5) {
    insertViolation({
      wagerId,
      playerId,
      agentLogin,
      violationType: "velocity",
      severity: "high",
      description: `Velocity breach: ${velocity.wagersPerHour} wagers/hour (limit: ${maxPerHour})`,
      wagerSnapshotJson: JSON.stringify(wagerData),
      actionTaken: "escalated",
    });
    logRiskAlert({
      alertType: "risk_alert",
      severity: "HIGH",
      source: "risk-service",
      entityType: "player",
      entityId: playerId,
      message: `Player ${playerId} velocity spike: ${velocity.wagersPerHour} wagers/hour`,
    });
    return { allowed: true, reason: "Velocity warning issued" };
  }

  return { allowed: true };
}

export function applyEnforcement(enforcementData: {
  playerId: string;
  agentLogin: string;
  actionType: string;
  limitType?: string;
  amount?: number;
  reason: string;
  appliedBy: string;
  wagerId?: string;
  durationMinutes?: number;
}): EnforcementAction {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const queueId = `enf_${now}_${Math.random().toString(36).slice(2, 8)}`;

  const params: Record<string, unknown> = {
    reason: enforcementData.reason,
    applied_by: enforcementData.appliedBy,
  };
  if (enforcementData.limitType) params.limit_type = enforcementData.limitType;
  if (enforcementData.amount !== undefined) params.amount = enforcementData.amount;
  if (enforcementData.durationMinutes) params.duration_minutes = enforcementData.durationMinutes;
  if (enforcementData.wagerId) params.wager_id = enforcementData.wagerId;

  const priority = enforcementData.actionType === "block_wager" ? 10 :
    enforcementData.actionType === "suspend_account" ? 5 : 100;

  db.query(`
    INSERT INTO enforcement_queue (
      queue_id, action_type, entity_type, entity_id, agent_login,
      params_json, status, priority, scheduled_at, processed_at, processed_by,
      result_json, error_message, attempts, max_attempts, metadata_json, created_at, updated_at
    ) VALUES (?, ?, 'player', ?, ?, ?, 'completed', ?, NULL, ?, ?, NULL, NULL, 1, 3, NULL, ?, ?)
  `).run(
    queueId, enforcementData.actionType, enforcementData.playerId,
    enforcementData.agentLogin, JSON.stringify(params), priority,
    now, enforcementData.appliedBy, JSON.stringify({ success: true }), now, now
  );

  // Log the enforcement
  db.query(`
    INSERT INTO limit_enforcement_log (
      enforcement_id, action_type, entity_type, entity_id, agent_login,
      old_value_json, new_value_json, params_json, executed_by, result,
      result_message, wager_id, metadata_json, created_at
    ) VALUES (?, ?, 'player', ?, ?, NULL, NULL, ?, ?, 'success', ?, ?, NULL, ?)
  `).run(
    queueId, enforcementData.actionType, enforcementData.playerId,
    enforcementData.agentLogin, JSON.stringify(params), enforcementData.appliedBy,
    enforcementData.reason, enforcementData.wagerId || null, now
  );

  logEnforcement({
    playerId: enforcementData.playerId,
    agentLogin: enforcementData.agentLogin,
    action: enforcementData.actionType,
    limitType: enforcementData.limitType,
    oldValue: undefined,
    newValue: enforcementData.amount,
    reason: enforcementData.reason,
  });

  const row = db.query(`SELECT * FROM enforcement_queue WHERE queue_id = ?`).get(queueId) as Record<string, unknown>;
  return mapEnforcementAction(row);
}

export function getEnforcementQueue(filters: { status?: string; agentLogin?: string; limit?: number; offset?: number } = {}): { items: EnforcementAction[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.agentLogin) {
    conditions.push("agent_login = ?");
    params.push(filters.agentLogin);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const totalRow = db.query(`SELECT COUNT(*) as count FROM enforcement_queue ${whereClause}`).get(...params) as { count: number };
  const rows = db.query(`SELECT * FROM enforcement_queue ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Record<string, unknown>[];

  return { items: rows.map(mapEnforcementAction), total: totalRow?.count || 0 };
}

export function getViolations(filters: ViolationFilters = {}): { items: WagerViolation[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (filters.playerId) {
    conditions.push("player_id = ?");
    params.push(filters.playerId);
  }
  if (filters.severity) {
    conditions.push("severity = ?");
    params.push(filters.severity);
  }
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.agentLogin) {
    conditions.push("agent_login = ?");
    params.push(filters.agentLogin);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const totalRow = db.query(`SELECT COUNT(*) as count FROM wager_violations ${whereClause}`).get(...params) as { count: number };
  const rows = db.query(`SELECT * FROM wager_violations ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Record<string, unknown>[];

  return { items: rows.map(mapWagerViolation), total: totalRow?.count || 0 };
}

// --- Position Expiry (Cron) ---

export function expireStalePositions(): { expired: number } {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const result = db.query(`
    UPDATE risk_positions
    SET status = 'expired', closed_at = ?, close_reason = 'auto_expired', updated_at = ?
    WHERE status IN ('open', 'warning') AND expires_at < ?
    RETURNING position_id
  `).all(now, now, now) as Array<{ position_id: string }>;

  const expired = result.length;

  for (const row of result) {
    logPosition({
      positionId: row.position_id,
      status: "expired",
      action: "expire",
    });
  }

  logCron({
    jobName: "position_expiry",
    recordsProcessed: expired,
    durationMs: 0,
  });

  return { expired };
}

// --- Risk Config Helpers ---

export function getRiskConfig(key: string): string | null {
  const row = getDb().query(`SELECT config_value FROM risk_config WHERE config_key = ? AND is_active = 1`).get(key) as { config_value: string } | null;
  return row?.config_value || null;
}

export function setRiskConfig(key: string, value: string, configType = "string", description = "", category = "general", updatedBy = "system"): void {
  const now = Math.floor(Date.now() / 1000);
  getDb().query(`
    INSERT INTO risk_config (config_key, config_value, config_type, description, category, is_active, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(config_key) DO UPDATE SET
      config_value = excluded.config_value,
      config_type = excluded.config_type,
      description = excluded.description,
      category = excluded.category,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(key, value, configType, description, category, updatedBy, now, now);
}

export function getAllRiskConfigs(category?: string): Array<{ configKey: string; configValue: string; configType: string; description: string; category: string }> {
  const db = getDb();
  const sql = category
    ? `SELECT config_key, config_value, config_type, description, category FROM risk_config WHERE category = ? AND is_active = 1`
    : `SELECT config_key, config_value, config_type, description, category FROM risk_config WHERE is_active = 1`;
  const params = category ? [category] : [];
  const rows = db.query(sql).all(...params) as Array<{ config_key: string; config_value: string; config_type: string; description: string; category: string }>;

  return rows.map((r) => ({
    configKey: r.config_key,
    configValue: r.config_value,
    configType: r.config_type,
    description: r.description,
    category: r.category,
  }));
}

// --- Helpers ---

function scoreToTier(score: number): RiskTier {
  if (score >= 81) return "BLACK";
  if (score >= 61) return "RED";
  if (score >= 41) return "YELLOW";
  return "GREEN";
}

function getTierLimits(tier: RiskTier): { maxWager: number; maxPayout: number } {
  const db = getDb();
  const defaults: Record<RiskTier, { maxWager: number; maxPayout: number }> = {
    BLACK: { maxWager: 0, maxPayout: 0 },
    RED: { maxWager: 5000, maxPayout: 10000 },
    YELLOW: { maxWager: 50000, maxPayout: 100000 },
    GREEN: { maxWager: 500000, maxPayout: 1000000 },
  };

  if (tier === "BLACK") return defaults.BLACK;

  const wagerKey = `tier_${tier.toLowerCase()}_max_wager`;
  const payoutKey = `tier_${tier.toLowerCase()}_max_payout`;

  const wagerRow = db.query(`SELECT config_value FROM risk_config WHERE config_key = ?`).get(wagerKey) as { config_value: string } | null;
  const payoutRow = db.query(`SELECT config_value FROM risk_config WHERE config_key = ?`).get(payoutKey) as { config_value: string } | null;

  return {
    maxWager: wagerRow ? parseInt(wagerRow.config_value, 10) : defaults[tier].maxWager,
    maxPayout: payoutRow ? parseInt(payoutRow.config_value, 10) : defaults[tier].maxPayout,
  };
}

function insertViolation(data: {
  wagerId: string;
  playerId: string;
  agentLogin: string;
  violationType: string;
  severity: WagerViolation["severity"];
  description: string;
  wagerSnapshotJson: string;
  actionTaken: string;
}): void {
  const now = Math.floor(Date.now() / 1000);
  const violationId = `vlt_${now}_${Math.random().toString(36).slice(2, 8)}`;

  getDb().query(`
    INSERT INTO wager_violations (
      violation_id, wager_id, player_id, agent_login, rule_id, violation_type,
      severity, description, wager_snapshot_json, action_taken, action_params_json,
      enforced_by, status, reviewed_by, reviewed_at, review_notes, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, 'open', NULL, NULL, NULL, NULL, ?)
  `).run(
    violationId, data.wagerId, data.playerId, data.agentLogin,
    data.violationType, data.severity, data.description,
    data.wagerSnapshotJson, data.actionTaken, now
  );

  logViolation({
    violationId,
    wagerId: data.wagerId,
    playerId: data.playerId,
    violationType: data.violationType,
    severity: data.severity,
    enforced: data.actionTaken !== undefined,
  });
}

// --- Mappers ---

function mapRiskPosition(row: Record<string, unknown>): RiskPosition {
  return {
    id: row.id as number,
    positionId: row.position_id as string,
    agentLogin: row.agent_login as string,
    playerId: row.player_id as string | null,
    sport: row.sport as string,
    eventId: row.event_id as string,
    eventName: row.event_name as string | null,
    market: row.market as string,
    positionType: row.position_type as string,
    side: row.side as string | null,
    totalStake: row.total_stake as number,
    totalExposure: row.total_exposure as number,
    maxPayout: row.max_payout as number,
    playerCount: row.player_count as number,
    wagerCount: row.wager_count as number,
    riskScore: Math.round((row.risk_score as number || 0) * 100) / 100,
    riskTier: (row.risk_tier as RiskTier) || "GREEN",
    concentrationPct: row.concentration_pct as number | null,
    status: (row.status as RiskPosition["status"]) || "open",
    expiresAt: row.expires_at as number,
    closedAt: row.closed_at as number | null,
    closeReason: row.close_reason as string | null,
    breakdownJson: row.breakdown_json as string | null,
    metadataJson: row.metadata_json as string | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function mapWagerViolation(row: Record<string, unknown>): WagerViolation {
  return {
    id: row.id as number,
    violationId: row.violation_id as string,
    wagerId: row.wager_id as string,
    playerId: row.player_id as string,
    agentLogin: row.agent_login as string,
    ruleId: row.rule_id as string | null,
    violationType: row.violation_type as string,
    severity: (row.severity as WagerViolation["severity"]) || "medium",
    description: row.description as string,
    wagerSnapshotJson: row.wager_snapshot_json as string,
    actionTaken: row.action_taken as string | null,
    actionParamsJson: row.action_params_json as string | null,
    enforcedBy: row.enforced_by as string | null,
    status: (row.status as WagerViolation["status"]) || "open",
    reviewedBy: row.reviewed_by as string | null,
    reviewedAt: row.reviewed_at as number | null,
    reviewNotes: row.review_notes as string | null,
    createdAt: row.created_at as number,
  };
}

function mapEnforcementAction(row: Record<string, unknown>): EnforcementAction {
  return {
    id: row.id as number,
    queueId: row.queue_id as string,
    actionType: row.action_type as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    agentLogin: row.agent_login as string,
    paramsJson: row.params_json as string,
    status: (row.status as EnforcementAction["status"]) || "pending",
    priority: row.priority as number,
    scheduledAt: row.scheduled_at as number | null,
    processedAt: row.processed_at as number | null,
    processedBy: row.processed_by as string | null,
    resultJson: row.result_json as string | null,
    errorMessage: row.error_message as string | null,
    attempts: row.attempts as number,
    maxAttempts: row.max_attempts as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
