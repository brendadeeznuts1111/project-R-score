/**
 * Domain-Specific Log Functions
 *
 * Provides typed log functions for all 23 domain objects in the system.
 * Each function uses a consistent prefix for greppable log output.
 *
 * Usage:
 *   import { logWager, logRiskAlert } from '@utils/tableLogger';
 *   logWager({ playerId: 'p123', wagerNumber: 'W-001', stake: 50000 });
 *
 * To add a new domain log function:
 *   1. Add the interface for its payload
 *   2. Add the function implementation with its prefix
 *   3. Export the function
 */

import { createLogger } from "./logger";

// ---------------------------------------------------------------------------
// 1. Wager Ticker — [WagerTicker]
// ---------------------------------------------------------------------------

export interface WagerLogPayload {
  wagerId?: string;
  wagerNumber?: string;
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
  ipAddress?: string;
  [key: string]: unknown;
}

export function logWager(payload: WagerLogPayload): void {
  const logger = createLogger("WagerTicker");
  logger.info("wager", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 2. Agent Hierarchy — [AgentHierarchy]
// ---------------------------------------------------------------------------

export interface AgentHierarchyPayload {
  agentLogin?: string;
  parentLogin?: string;
  action?: string; // create | update | delete
  level?: number;
  commissionPct?: number;
  downlineCount?: number;
  [key: string]: unknown;
}

export function logAgent(payload: AgentHierarchyPayload): void {
  const logger = createLogger("AgentHierarchy");
  logger.info("agent_hierarchy", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 3. Player Risk — [PlayerRisk]
// ---------------------------------------------------------------------------

export interface PlayerRiskPayload {
  playerId?: string;
  playerLogin?: string;
  riskTier?: string; // BLACK | RED | YELLOW | GREEN
  riskScore?: number;
  archetype?: string;
  reason?: string;
  previousTier?: string;
  [key: string]: unknown;
}

export function logPlayerRisk(payload: PlayerRiskPayload): void {
  const logger = createLogger("PlayerRisk");
  logger.info("player_risk", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 4. Risk Score — [RiskScore]
// ---------------------------------------------------------------------------

export interface RiskScorePayload {
  playerId?: string;
  score?: number;
  confidence?: number;
  factors?: Array<{ factor: string; weight: number }>;
  modelVersion?: string;
  [key: string]: unknown;
}

export function logRiskScore(payload: RiskScorePayload): void {
  const logger = createLogger("RiskScore");
  logger.info("risk_score", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 5. Open Position — [OpenPosition]
// ---------------------------------------------------------------------------

export interface PositionPayload {
  positionId?: string;
  playerId?: string;
  agentLogin?: string;
  sport?: string;
  eventId?: string;
  exposure?: number;
  potentialLiability?: number;
  status?: string; // open | closing | closed
  action?: string; // create | update | expire
  [key: string]: unknown;
}

export function logPosition(payload: PositionPayload): void {
  const logger = createLogger("OpenPosition");
  logger.info("position", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 6. Risk Alert — [RiskAlert]
// ---------------------------------------------------------------------------

export interface RiskAlertPayload {
  alertId?: string;
  alertType?: string; // risk_alert | system_alert | pattern_alert | enforcement_alert
  severity?: string; // INFO | LOW | MEDIUM | HIGH | CRITICAL
  source?: string;
  entityType?: string; // player | agent | wager | system
  entityId?: string;
  message?: string;
  playerId?: string;
  agentLogin?: string;
  [key: string]: unknown;
}

export function logRiskAlert(payload: RiskAlertPayload): void {
  const logger = createLogger("RiskAlert");
  logger.info("risk_alert", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 7. Plugin Execution — [PluginExecution]
// ---------------------------------------------------------------------------

export interface PluginPayload {
  pluginId?: string;
  pluginName?: string;
  ruleId?: string;
  playerId?: string;
  executionTimeMs?: number;
  result?: string; // allow | block | flag
  matchedConditions?: number;
  [key: string]: unknown;
}

export function logPlugin(payload: PluginPayload): void {
  const logger = createLogger("PluginExecution");
  logger.info("plugin_execution", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 8. Agent Action — [AgentAction]
// ---------------------------------------------------------------------------

export interface AgentActionPayload {
  agentLogin?: string;
  actionType?: string; // limit_change | tier_change | note_added | player_assigned
  targetPlayerId?: string;
  targetAgentLogin?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export function logAgentAction(payload: AgentActionPayload): void {
  const logger = createLogger("AgentAction");
  logger.info("agent_action", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 9. Enforcement — [Enforcement]
// ---------------------------------------------------------------------------

export interface EnforcementPayload {
  enforcementId?: string;
  playerId?: string;
  agentLogin?: string;
  action?: string; // apply_limit | auto_enforce | suspend
  limitType?: string; // wager | payout | deposit
  oldValue?: number;
  newValue?: number;
  reason?: string;
  triggeredByRule?: string;
  [key: string]: unknown;
}

export function logEnforcement(payload: EnforcementPayload): void {
  const logger = createLogger("Enforcement");
  logger.info("enforcement", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 10. Health Check — [HealthCheck]
// ---------------------------------------------------------------------------

export interface HealthPayload {
  component?: string; // Database | WebSocket | Redis | Migration | Seed | System
  status?: string; // connected | disconnected | error | ok | applied | complete | degraded
  path?: string;
  walMode?: string;
  foreignKeys?: boolean;
  filename?: string;
  direction?: string;
  table?: string;
  count?: number;
  uptimeMs?: number;
  memoryMb?: number;
  activeConnections?: number;
  totalRequests?: number;
  [key: string]: unknown;
}

export function logHealth(payload: HealthPayload): void {
  const logger = createLogger("HealthCheck");
  logger.info("health", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 11. Cron Schedule — [CronSchedule]
// ---------------------------------------------------------------------------

export interface CronPayload {
  jobName?: string; // wager_refresh | player_refresh | feature_extraction | position_expiry | sandbox_janitor | alert_cleanup | ip_surveillance | queue_processor
  schedule?: string; // e.g., */5 * * * *
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  recordsProcessed?: number;
  error?: string;
  [key: string]: unknown;
}

export function logCron(payload: CronPayload): void {
  const logger = createLogger("CronSchedule");
  logger.info("cron", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 12. Buckeye Audit — [BuckeyeAudit]
// ---------------------------------------------------------------------------

export interface BuckeyePayload {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  sessionId?: string;
  agentLogin?: string;
  error?: string;
  requestSize?: number;
  responseSize?: number;
  [key: string]: unknown;
}

export function logBuckeye(payload: BuckeyePayload): void {
  const logger = createLogger("BuckeyeAudit");
  logger.info("buckeye_audit", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 13. Telegram Route — [TelegramRoute]
// ---------------------------------------------------------------------------

export interface TelegramPayload {
  botId?: string;
  chatId?: string;
  threadId?: number;
  messageType?: string; // alert | summary | command | notification
  status?: string; // sent | delivered | failed | retrying
  latencyMs?: number;
  error?: string;
  dispatchId?: string;
  [key: string]: unknown;
}

export function logTelegram(payload: TelegramPayload): void {
  const logger = createLogger("TelegramRoute");
  logger.info("telegram_route", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 14. Webhook Status — [WebhookStatus]
// ---------------------------------------------------------------------------

export interface WebhookPayload {
  webhookId?: string;
  url?: string;
  eventType?: string;
  status?: string; // success | failed | retrying | timeout
  statusCode?: number;
  latencyMs?: number;
  attemptNumber?: number;
  error?: string;
  payloadSize?: number;
  [key: string]: unknown;
}

export function logWebhook(payload: WebhookPayload): void {
  const logger = createLogger("WebhookStatus");
  logger.info("webhook", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 15. Archetype Batch — [ArchetypeBatch]
// ---------------------------------------------------------------------------

export interface ArchetypePayload {
  batchId?: string;
  playersProcessed?: number;
  classifications?: Record<string, number>;
  durationMs?: number;
  modelVersion?: string;
  errors?: number;
  [key: string]: unknown;
}

export function logArchetype(payload: ArchetypePayload): void {
  const logger = createLogger("ArchetypeBatch");
  logger.info("archetype_batch", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 16. Player Note — [PlayerNote]
// ---------------------------------------------------------------------------

export interface PlayerNotePayload {
  noteId?: string;
  playerId?: string;
  authorLogin?: string;
  action?: string; // create | update | delete
  noteType?: string; // general | risk | compliance | vip
  [key: string]: unknown;
}

export function logPlayerNote(payload: PlayerNotePayload): void {
  const logger = createLogger("PlayerNote");
  logger.info("player_note", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 17. Transaction — [Transaction]
// ---------------------------------------------------------------------------

export interface TransactionPayload {
  transactionId?: string;
  playerId?: string;
  agentLogin?: string;
  type?: string; // deposit | withdrawal | settlement | commission
  amount?: number;
  currency?: string;
  status?: string; // pending | completed | failed | reversed
  method?: string;
  [key: string]: unknown;
}

export function logTransaction(payload: TransactionPayload): void {
  const logger = createLogger("Transaction");
  logger.info("transaction", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 18. Violation — [Violation]
// ---------------------------------------------------------------------------

export interface ViolationPayload {
  violationId?: string;
  wagerId?: string;
  playerId?: string;
  violationType?: string; // max_stake | suspicious_pattern | ip_mismatch | velocity
  severity?: string;
  ruleId?: string;
  enforced?: boolean;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export function logViolation(payload: ViolationPayload): void {
  const logger = createLogger("Violation");
  logger.info("violation", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 19. Player Flag — [PlayerFlag]
// ---------------------------------------------------------------------------

export interface PlayerFlagPayload {
  flagId?: string;
  playerId?: string;
  flagType?: string; // manual | auto | system
  severity?: string;
  reason?: string;
  triggeredBy?: string;
  action?: string; // create | resolve | dismiss
  [key: string]: unknown;
}

export function logPlayerFlag(payload: PlayerFlagPayload): void {
  const logger = createLogger("PlayerFlag");
  logger.info("player_flag", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 20. Sport Event — [SportEvent]
// ---------------------------------------------------------------------------

export interface SportEventPayload {
  eventId?: string;
  sport?: string;
  homeTeam?: string;
  awayTeam?: string;
  startTime?: string;
  status?: string; // upcoming | live | completed | cancelled
  scoreHome?: number;
  scoreAway?: number;
  marketCount?: number;
  [key: string]: unknown;
}

export function logSportEvent(payload: SportEventPayload): void {
  const logger = createLogger("SportEvent");
  logger.info("sport_event", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 21. Market Depth — [MarketDepth]
// ---------------------------------------------------------------------------

export interface MarketDepthPayload {
  eventId?: string;
  market?: string;
  book?: string;
  homeOdds?: number;
  awayOdds?: number;
  homeStake?: number;
  awayStake?: number;
  spread?: number;
  total?: number;
  lastUpdated?: string;
  [key: string]: unknown;
}

export function logMarketDepth(payload: MarketDepthPayload): void {
  const logger = createLogger("MarketDepth");
  logger.info("market_depth", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 22. Telemetry — [Telemetry]
// ---------------------------------------------------------------------------

export interface TelemetryPayload {
  metric?: string;
  value?: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: string;
  [key: string]: unknown;
}

export function logTelemetry(payload: TelemetryPayload): void {
  const logger = createLogger("Telemetry");
  logger.info("telemetry", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 23. Action Queue — [ActionQueue]
// ---------------------------------------------------------------------------

export interface ActionQueuePayload {
  queueId?: string;
  actionType?: string;
  status?: string; // pending | processing | completed | failed
  priority?: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  retryCount?: number;
  [key: string]: unknown;
}

export function logQueue(payload: ActionQueuePayload): void {
  const logger = createLogger("ActionQueue");
  logger.info("action_queue", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 24. Metrics — [Metrics]
// ---------------------------------------------------------------------------

export interface MetricsPayload {
  metric?: string;
  value?: number;
  unit?: string;
  endpoint?: string;
  statusCode?: number;
  durationMs?: number;
  labels?: Record<string, string>;
  [key: string]: unknown;
}

export function logMetrics(payload: MetricsPayload): void {
  const logger = createLogger("Metrics");
  logger.info("metrics", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 25. Idle — [Idle]
// ---------------------------------------------------------------------------

export interface IdlePayload {
  event?: string; // timer_started | connection_opened | connection_closed | shutdown_triggered
  idleMs?: number;
  thresholdMs?: number;
  wsConnections?: number;
  sseConnections?: number;
  reason?: string;
  [key: string]: unknown;
}

export function logIdle(payload: IdlePayload): void {
  const logger = createLogger("Idle");
  logger.info("idle", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 26. Auth — [Auth]
// ---------------------------------------------------------------------------

export interface AuthPayload {
  userId?: string;
  login?: string;
  role?: string;
  method?: string; // jwt | apikey | session | dev_bypass
  action?: string; // login | logout | token_renewed | verify
  ipAddress?: string;
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

export function logAuth(payload: AuthPayload): void {
  const logger = createLogger("Auth");
  logger.info("auth", payload as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 27. RateLimit — [RateLimit]
// ---------------------------------------------------------------------------

export interface RateLimitPayload {
  ip?: string;
  tier?: number;
  endpoint?: string;
  limit?: number;
  remaining?: number;
  allowed?: boolean;
  retryAfter?: number;
  [key: string]: unknown;
}

export function logRateLimit(payload: RateLimitPayload): void {
  const logger = createLogger("RateLimit");
  logger.info("rate_limit", payload as Record<string, unknown>);
}
