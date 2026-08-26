/**
 * AI Risk Analysis Service
 *
 * AI-powered risk analysis using Kimi API for player risk assessment,
 * feature extraction, archetype classification, and risk flag generation.
 *
 * Tables: ai_risk_flags, customer_features
 */

import { Database } from "bun:sqlite";
import {
  logRiskScore,
  logRiskAlert,
  logArchetype,
  logPlayerRisk,
} from "@utils/tableLogger";
import type { RiskTier, CustomerArchetype } from "@utils/types";
import { fetchFixedExternalProvider } from "@utils/outbound-endpoints";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIRiskFlag {
  id: number;
  flagId: string;
  customerId: string;
  agentLogin: string;
  flagType: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  modelName: string | null;
  modelVersion: string | null;
  promptHash: string | null;
  financialRisk: number;
  behavioralRisk: number;
  complianceRisk: number;
  overallScore: number;
  explanation: string | null;
  evidenceJson: string | null;
  recommendedAction: string | null;
  status: "open" | "acknowledged" | "dismissed" | "confirmed" | "escalated";
  reviewedBy: string | null;
  reviewedAt: number | null;
  reviewNotes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerFeatures {
  id: number;
  customerId: string;
  agentLogin: string;
  featureVersion: string;
  wagerCount7d: number;
  wagerCount30d: number;
  wagerCount90d: number;
  avgStake7d: number;
  avgStake30d: number;
  avgOdds30d: number;
  totalStake30d: number;
  totalStake90d: number;
  winRate30d: number;
  winRate90d: number;
  pnl30d: number;
  pnl90d: number;
  pnlLifetime: number;
  roi30d: number;
  roi90d: number;
  dailyWagerCount: number;
  maxDailyStake: number;
  stakeVariance: number;
  parlayPct: number;
  teaserPct: number;
  liveBetPct: number;
  favoritePct: number;
  archetype: CustomerArchetype | null;
  archetypeConfidence: number;
  riskSignalsJson: string | null;
  featuresJson: string | null;
  calculatedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface RiskAnalysisResult {
  playerId: string;
  analysisId: string;
  timestamp: string;
  riskTier: RiskTier;
  riskScore: number;
  confidence: number;
  factors: Array<{ factor: string; weight: number; description: string }>;
  recommendations: string[];
  aiSummary: string;
  processingTimeMs: number;
}

export interface FeatureExtractionResult {
  playerId: string;
  features: Record<string, number>;
  archetype: CustomerArchetype;
  confidence: number;
  nextReviewAt: string;
}

let db: Database;

export function initAIRiskService(database: Database): void {
  db = database;
}

function getDb(): Database {
  if (!db) throw new Error("AI Risk service not initialized. Call initAIRiskService() first.");
  return db;
}

// --- AI Risk Analysis ---

/**
 * Analyze player risk using Kimi AI API.
 * Falls back to statistical analysis if AI is unavailable.
 */
export async function analyzePlayerRisk(playerId: string): Promise<RiskAnalysisResult> {
  const startMs = Date.now();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const analysisId = `analysis_${now}_${Math.random().toString(36).slice(2, 8)}`;

  // Gather player context
  const features = extractFeatures(playerId);
  const velocityRow = db.query(`
    SELECT COUNT(*) as count, AVG(stake) as avg_stake, SUM(stake) as total_stake
    FROM wagers WHERE player_id = ? AND placed_at >= ?
  `).get(playerId, now - 86400) as { count: number; avg_stake: number; total_stake: number };

  const violationsRow = db.query(`
    SELECT COUNT(*) as count, MAX(severity) as max_severity
    FROM wager_violations WHERE player_id = ? AND created_at >= ?
  `).get(playerId, now - 86400 * 7) as { count: number; max_severity: string };

  const context = {
    recentWagers: velocityRow?.count || 0,
    timeWindow: "24h",
    stakeVelocity: Math.round(velocityRow?.total_stake || 0),
    avgStake: Math.round(velocityRow?.avg_stake || 0),
    winRate: features.features.winRate30d || 0,
    unusualMarkets: [] as string[],
    ipFlags: [] as string[],
    violations7d: violationsRow?.count || 0,
    maxSeverity: violationsRow?.max_severity || null,
    archetype: features.archetype,
    archetypeConfidence: features.confidence,
  };

  // Attempt Kimi AI call if configured
  let aiResult: RiskAnalysisResult | null = null;
  const kimiApiKey = process.env.KIMI_API_KEY;

  if (kimiApiKey && process.env.ENABLE_RISK_ENGINE === "true") {
    try {
      const response = await fetchFixedExternalProvider("kimi-risk", "https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${kimiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "kimi-latest",
          messages: [
            {
              role: "system",
              content: `You are a risk analysis engine for a sports betting platform. Analyze player risk and respond ONLY with JSON in this exact format:\n{\n  "riskTier": "GREEN|YELLOW|RED|BLACK",\n  "riskScore": 0.0-1.0,\n  "confidence": 0.0-1.0,\n  "factors": [{"factor": "name", "weight": 0.0-1.0, "description": "text"}],\n  "recommendations": ["text"],\n  "summary": "text"\n}`,
            },
            {
              role: "user",
              content: `Analyze player ${playerId}: ${JSON.stringify(context)}`,
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json() as {
          choices: Array<{ message: { content: string } }>;
        };
        const parsed = JSON.parse(data.choices[0]?.message?.content || "{}");

        aiResult = {
          playerId,
          analysisId,
          timestamp: new Date().toISOString(),
          riskTier: (parsed.riskTier || "GREEN") as RiskTier,
          riskScore: Math.min(1, Math.max(0, parsed.riskScore || 0)),
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
          factors: (parsed.factors || []).map((f: { factor: string; weight: number; description: string }) => ({
            factor: f.factor,
            weight: f.weight,
            description: f.description,
          })),
          recommendations: parsed.recommendations || ["Monitor activity"],
          aiSummary: parsed.summary || "No summary available",
          processingTimeMs: Date.now() - startMs,
        };
      }
    } catch (err: any) {
      logRiskAlert({
        alertType: "system_alert",
        severity: "MEDIUM",
        source: "ai-risk-service",
        message: `Kimi AI analysis failed for player ${playerId}: ${err.message}`,
      });
    }
  }

  // Fallback to statistical analysis
  if (!aiResult) {
    aiResult = performStatisticalRiskAnalysis(playerId, context, features, analysisId, startMs);
  }

  // Store AI risk flag
  const flagId = `flag_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const flagSeverity = aiResult.riskScore > 0.8 ? "critical" :
    aiResult.riskScore > 0.6 ? "high" :
    aiResult.riskScore > 0.4 ? "medium" : "low";

  try {
    db.query(`
      INSERT INTO ai_risk_flags (
        flag_id, customer_id, agent_login, flag_type, severity, model_name, model_version,
        prompt_hash, financial_risk, behavioral_risk, compliance_risk, overall_score,
        explanation, evidence_json, recommended_action, status, reviewed_by, reviewed_at,
        review_notes, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'model_prediction', ?, 'kimi', 'v1', NULL, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, NULL, NULL, NULL, ?, ?)
    `).run(
      flagId, playerId, context.archetype || "unknown", flagSeverity,
      aiResult.riskScore * 0.7, aiResult.riskScore * 0.8, aiResult.riskScore * 0.5,
      aiResult.riskScore,
      aiResult.aiSummary,
      JSON.stringify(aiResult.factors),
      aiResult.recommendations[0] || "monitor",
      now, now
    );

    logPlayerRisk({
      playerId,
      riskTier: aiResult.riskTier,
      riskScore: Math.round(aiResult.riskScore * 100),
      reason: aiResult.aiSummary,
    });
  } catch (err: any) {
    logRiskAlert({
      alertType: "system_alert",
      severity: "LOW",
      source: "ai-risk-service",
      message: `Failed to store AI flag for player ${playerId}: ${err.message}`,
    });
  }

  return aiResult;
}

/**
 * Extract betting features for ML model input.
 */
export function extractFeatures(playerId: string): FeatureExtractionResult {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const windows = [
    { days: 7, key: "7d" },
    { days: 30, key: "30d" },
    { days: 90, key: "90d" },
  ];

  const features: Record<string, number> = {};

  for (const w of windows) {
    const since = now - w.days * 86400;

    const row = db.query(`
      SELECT COUNT(*) as wager_count, AVG(stake) as avg_stake, SUM(stake) as total_stake,
             AVG(odds) as avg_odds, SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
             SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
             SUM(CASE WHEN result = 'win' THEN potential_payout - stake ELSE -stake END) as pnl
      FROM wagers WHERE player_id = ? AND placed_at >= ?
    `).get(playerId, since) as {
      wager_count: number; avg_stake: number; total_stake: number;
      avg_odds: number; wins: number; losses: number; pnl: number;
    };

    const totalGames = (row?.wins || 0) + (row?.losses || 0);
    features[`wagerCount${w.key}`] = row?.wager_count || 0;
    features[`avgStake${w.key}`] = Math.round(row?.avg_stake || 0);
    features[`totalStake${w.key}`] = Math.round(row?.total_stake || 0);
    features[`avgOdds${w.key}`] = Math.round(row?.avg_odds || 0);
    features[`winRate${w.key}`] = totalGames > 0 ? Math.round((row.wins / totalGames) * 1000) / 1000 : 0;
    features[`pnl${w.key}`] = Math.round(row?.pnl || 0);
    features[`roi${w.key}`] = row?.total_stake > 0 ? Math.round((row.pnl / row.total_stake) * 1000) / 1000 : 0;
  }

  // Pattern features
  const patternRow = db.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN market = 'parlay' THEN 1 ELSE 0 END) as parlays,
      SUM(CASE WHEN market = 'teaser' THEN 1 ELSE 0 END) as teasers,
      SUM(CASE WHEN market LIKE 'live%' THEN 1 ELSE 0 END) as live_bets,
      SUM(CASE WHEN odds < 0 THEN 1 ELSE 0 END) as favorites,
      MAX(stake) as max_stake,
      AVG(stake) as avg_stake
    FROM wagers WHERE player_id = ? AND placed_at >= ?
  `).get(playerId, now - 30 * 86400) as {
    total: number; parlays: number; teasers: number; live_bets: number;
    favorites: number; max_stake: number; avg_stake: number;
  };

  const total = patternRow?.total || 1;
  features.parlayPct = Math.round(((patternRow?.parlays || 0) / total) * 1000) / 1000;
  features.teaserPct = Math.round(((patternRow?.teasers || 0) / total) * 1000) / 1000;
  features.liveBetPct = Math.round(((patternRow?.live_bets || 0) / total) * 1000) / 1000;
  features.favoritePct = Math.round(((patternRow?.favorites || 0) / total) * 1000) / 1000;
  features.maxDailyStake = Math.round(patternRow?.max_stake || 0);
  features.stakeVariance = Math.round((patternRow?.max_stake || 0) - (patternRow?.avg_stake || 0));
  features.dailyWagerCount = Math.round((patternRow?.total || 0) / 30);

  // Archetype classification
  const archetype = classifyArchetypeFromFeatures(features);

  // Persist to customer_features
  const existingRow = db.query(`SELECT id FROM customer_features WHERE customer_id = ?`).get(playerId) as { id: number } | null;

  if (existingRow) {
    db.query(`
      UPDATE customer_features SET
        agent_login = 'system', wager_count_7d = ?, wager_count_30d = ?, wager_count_90d = ?,
        avg_stake_7d = ?, avg_stake_30d = ?, avg_odds_30d = ?,
        total_stake_30d = ?, total_stake_90d = ?, win_rate_30d = ?, win_rate_90d = ?,
        pnl_30d = ?, pnl_90d = ?, pnl_lifetime = ?, roi_30d = ?, roi_90d = ?,
        daily_wager_count = ?, max_daily_stake = ?, stake_variance = ?,
        parlay_pct = ?, teaser_pct = ?, live_bet_pct = ?, favorite_pct = ?,
        archetype = ?, archetype_confidence = ?, features_json = ?, calculated_at = ?, updated_at = ?
      WHERE customer_id = ?
    `).run(
      features.wagerCount7d, features.wagerCount30d, features.wagerCount90d,
      features.avgStake7d, features.avgStake30d, features.avgOdds30d,
      features.totalStake30d, features.totalStake90d, features.winRate30d, features.winRate90d,
      features.pnl30d, features.pnl90d, features.pnlLifetime || 0, features.roi30d, features.roi90d,
      features.dailyWagerCount, features.maxDailyStake, features.stakeVariance,
      features.parlayPct, features.teaserPct, features.liveBetPct, features.favoritePct,
      archetype.archetype, archetype.confidence, JSON.stringify(features), now, now, playerId
    );
  } else {
    db.query(`
      INSERT INTO customer_features (
        customer_id, agent_login, feature_version, wager_count_7d, wager_count_30d, wager_count_90d,
        avg_stake_7d, avg_stake_30d, avg_odds_30d, total_stake_30d, total_stake_90d,
        win_rate_30d, win_rate_90d, pnl_30d, pnl_90d, pnl_lifetime, roi_30d, roi_90d,
        daily_wager_count, max_daily_stake, stake_variance, parlay_pct, teaser_pct,
        live_bet_pct, favorite_pct, archetype, archetype_confidence, risk_signals_json,
        features_json, calculated_at, created_at, updated_at
      ) VALUES (?, ?, '1.0', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `).run(
      playerId, "system", features.wagerCount7d, features.wagerCount30d, features.wagerCount90d,
      features.avgStake7d, features.avgStake30d, features.avgOdds30d,
      features.totalStake30d, features.totalStake90d, features.winRate30d, features.winRate90d,
      features.pnl30d, features.pnl90d, features.pnlLifetime || 0, features.roi30d, features.roi90d,
      features.dailyWagerCount, features.maxDailyStake, features.stakeVariance,
      features.parlayPct, features.teaserPct, features.liveBetPct, features.favoritePct,
      archetype.archetype, archetype.confidence, JSON.stringify(features), now, now, now
    );
  }

  logArchetype({
    playersProcessed: 1,
    classifications: { [archetype.archetype]: 1 },
    durationMs: 0,
    modelVersion: "v1-statistical",
  });

  return {
    playerId,
    features,
    archetype: archetype.archetype,
    confidence: archetype.confidence,
    nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
  };
}

/**
 * ML-based archetype classification from features.
 */
export function classifyArchetype(playerId: string): { archetype: CustomerArchetype; confidence: number } {
  const features = extractFeatures(playerId);
  return { archetype: features.archetype, confidence: features.confidence };
}

/**
 * Get AI-generated risk flags for a player.
 */
export function getRiskFlags(playerId: string): AIRiskFlag[] {
  const db = getDb();
  const rows = db.query(`
    SELECT * FROM ai_risk_flags WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(playerId) as Record<string, unknown>[];

  return rows.map(mapRiskFlag);
}

// --- Internal Helpers ---

function classifyArchetypeFromFeatures(features: Record<string, number>): { archetype: CustomerArchetype; confidence: number } {
  const winRate = features.winRate30d || 0;
  const avgStake = features.avgStake30d || 0;
  const wagerCount = features.wagerCount30d || 0;
  const parlayPct = features.parlayPct || 0;
  const pnl30d = features.pnl30d || 0;
  const roi30d = features.roi30d || 0;

  // Sharp: high win rate + high ROI + consistent stakes
  if (winRate > 0.55 && roi30d > 0.1 && wagerCount > 20) {
    return { archetype: "sharp", confidence: Math.min(0.95, 0.7 + roi30d) };
  }

  // Whale: very high stakes
  if (avgStake > 100000 && wagerCount > 5) {
    return { archetype: "whale", confidence: Math.min(0.95, 0.8) };
  }

  // Chase gambler: high loss rate, increasing stakes
  if (winRate < 0.4 && features.stakeVariance > avgStake * 0.5 && pnl30d < -50000) {
    return { archetype: "chase_gambler", confidence: Math.min(0.95, 0.75) };
  }

  // New: low wager count
  if (wagerCount < 10) {
    return { archetype: "new", confidence: 0.9 };
  }

  // Suspicious: high win rate but low sample + unusual patterns
  if (winRate > 0.6 && wagerCount < 30) {
    return { archetype: "suspicious", confidence: Math.min(0.9, 0.6 + winRate * 0.3) };
  }

  // Recreational: moderate everything, loves parlays
  if (parlayPct > 0.3 || (winRate >= 0.4 && winRate <= 0.55)) {
    return { archetype: "recreational", confidence: 0.75 };
  }

  return { archetype: "recreational", confidence: 0.6 };
}

function performStatisticalRiskAnalysis(
  playerId: string,
  context: Record<string, unknown>,
  features: FeatureExtractionResult,
  analysisId: string,
  startMs: number
): RiskAnalysisResult {
  const factors: Array<{ factor: string; weight: number; description: string }> = [];
  let totalScore = 0;

  const winRate = features.features.winRate30d || 0;
  const stakeVelocity = context.stakeVelocity as number || 0;
  const violations7d = context.violations7d as number || 0;

  if (winRate > 0.55) {
    const weight = Math.min(0.35, (winRate - 0.55) * 3.5);
    factors.push({ factor: "win_rate_anomaly", weight, description: `Win rate ${(winRate * 100).toFixed(1)}% over 30 days` });
    totalScore += weight;
  }

  if (stakeVelocity > 250000) {
    const weight = Math.min(0.25, stakeVelocity / 2000000);
    factors.push({ factor: "stake_velocity_spike", weight, description: `Stake velocity $${(stakeVelocity / 100).toFixed(0)} in 24h` });
    totalScore += weight;
  }

  if (violations7d > 0) {
    const weight = Math.min(0.25, violations7d * 0.08);
    factors.push({ factor: "recent_violations", weight, description: `${violations7d} violations in 7 days` });
    totalScore += weight;
  }

  if (features.archetype === "suspicious") {
    factors.push({ factor: "suspicious_archetype", weight: 0.2, description: "Player classified as suspicious archetype" });
    totalScore += 0.2;
  }

  // Baseline
  if (totalScore === 0) {
    factors.push({ factor: "baseline", weight: 0.05, description: "No risk signals detected" });
    totalScore = 0.05;
  }

  const riskScore = Math.min(1, totalScore);
  const tier = riskScore > 0.8 ? "BLACK" : riskScore > 0.6 ? "RED" : riskScore > 0.4 ? "YELLOW" : "GREEN";

  const recommendations: string[] = [];
  if (tier === "BLACK" || tier === "RED") {
    recommendations.push("Reduce max wager to $5,000");
    recommendations.push("Flag for manual review");
  }
  if (tier === "YELLOW") {
    recommendations.push("Monitor activity closely");
    recommendations.push("Schedule review in 48 hours");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue normal monitoring");
  }

  return {
    playerId,
    analysisId,
    timestamp: new Date().toISOString(),
    riskTier: tier,
    riskScore,
    confidence: 0.85,
    factors,
    recommendations,
    aiSummary: `Statistical analysis: ${factors.map((f) => f.description).join("; ")}. Overall risk: ${tier}.`,
    processingTimeMs: Date.now() - startMs,
  };
}

function mapRiskFlag(row: Record<string, unknown>): AIRiskFlag {
  return {
    id: row.id as number,
    flagId: row.flag_id as string,
    customerId: row.customer_id as string,
    agentLogin: row.agent_login as string,
    flagType: row.flag_type as string,
    severity: (row.severity as AIRiskFlag["severity"]) || "low",
    modelName: row.model_name as string | null,
    modelVersion: row.model_version as string | null,
    promptHash: row.prompt_hash as string | null,
    financialRisk: row.financial_risk as number,
    behavioralRisk: row.behavioral_risk as number,
    complianceRisk: row.compliance_risk as number,
    overallScore: row.overall_score as number,
    explanation: row.explanation as string | null,
    evidenceJson: row.evidence_json as string | null,
    recommendedAction: row.recommended_action as string | null,
    status: (row.status as AIRiskFlag["status"]) || "open",
    reviewedBy: row.reviewed_by as string | null,
    reviewedAt: row.reviewed_at as number | null,
    reviewNotes: row.review_notes as string | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function mapCustomerFeatures(row: Record<string, unknown>): CustomerFeatures {
  return {
    id: row.id as number,
    customerId: row.customer_id as string,
    agentLogin: row.agent_login as string,
    featureVersion: (row.feature_version as string) || "1.0",
    wagerCount7d: row.wager_count_7d as number,
    wagerCount30d: row.wager_count_30d as number,
    wagerCount90d: row.wager_count_90d as number,
    avgStake7d: row.avg_stake_7d as number,
    avgStake30d: row.avg_stake_30d as number,
    avgOdds30d: row.avg_odds_30d as number,
    totalStake30d: row.total_stake_30d as number,
    totalStake90d: row.total_stake_90d as number,
    winRate30d: row.win_rate_30d as number,
    winRate90d: row.win_rate_90d as number,
    pnl30d: row.pnl_30d as number,
    pnl90d: row.pnl_90d as number,
    pnlLifetime: row.pnl_lifetime as number,
    roi30d: row.roi_30d as number,
    roi90d: row.roi_90d as number,
    dailyWagerCount: row.daily_wager_count as number,
    maxDailyStake: row.max_daily_stake as number,
    stakeVariance: row.stake_variance as number,
    parlayPct: row.parlay_pct as number,
    teaserPct: row.teaser_pct as number,
    liveBetPct: row.live_bet_pct as number,
    favoritePct: row.favorite_pct as number,
    archetype: row.archetype as CustomerArchetype | null,
    archetypeConfidence: row.archetype_confidence as number,
    riskSignalsJson: row.risk_signals_json as string | null,
    featuresJson: row.features_json as string | null,
    calculatedAt: row.calculated_at as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
