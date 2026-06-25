/**
 * Shared TypeScript Types and Interfaces
 *
 * Core type definitions used across the entire system.
 * These types mirror the database schema and API contracts.
 *
 * Rule: Types go here, Zod schemas go in validators.ts.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type UserRole = "public" | "user" | "admin" | "superadmin" | "dev";

export interface AuthenticatedUser {
  id: string;
  login?: string;
  role: UserRole;
  displayName?: string;
  email?: string;
  balance?: number;
  currency?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  method: "jwt" | "apikey" | "session" | "dev_bypass";
  requestId: string;
}

export type AuthMode = "jwt" | "apikey" | "session" | "dev_bypass";

// ---------------------------------------------------------------------------
// Buckeye / Proxy
// ---------------------------------------------------------------------------

export interface BuckeyeSession {
  sessionId: string;
  token: string;
  expiresAt: number;
  isActive: number;
  cfToken?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface ProxyRequest {
  endpoint: string;
  method: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  sessionId?: string;
}

export interface ProxyResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export type RiskTier = "BLACK" | "RED" | "YELLOW" | "GREEN";

export type CustomerArchetype =
  | "sharp"
  | "whale"
  | "chase_gambler"
  | "new"
  | "recreational"
  | "suspicious";

export interface Player {
  id: string;
  playerId: string;
  login: string;
  displayName: string;
  email?: string;
  balance: number;
  status: "active" | "suspended" | "closed";
  riskTier: RiskTier;
  archetype?: CustomerArchetype;
  lastWagerAt?: number;
  wagerCount: number;
  winRate?: number;
  pnlLifetime: number;
  agentId: string;
}

// ---------------------------------------------------------------------------
// Wagers
// ---------------------------------------------------------------------------

export type WagerStatus =
  | "pending"
  | "won"
  | "lost"
  | "pushed"
  | "cancelled";
export type WagerResult = "win" | "loss" | "push" | "void";
export type MarketType = "spread" | "ml" | "total" | "parlay" | "teaser" | "prop";

export interface Wager {
  id: string;
  wagerId: string;
  playerId: string;
  playerLogin: string;
  agentLogin: string;
  sport: string;
  eventId?: string;
  eventName?: string;
  market: MarketType;
  selection: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  actualPayout?: number;
  status: WagerStatus;
  result?: WagerResult;
  placedAt: number;
  settledAt?: number;
  ipAddress?: string;
  riskScore?: number;
}

// ---------------------------------------------------------------------------
// Risk & Analytics
// ---------------------------------------------------------------------------

export type AlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertType =
  | "risk_alert"
  | "system_alert"
  | "pattern_alert"
  | "enforcement_alert";

export interface RiskAlert {
  alertId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  source: string;
  sourceId?: string;
  title: string;
  message: string;
  entityType?: "player" | "agent" | "wager" | "system";
  entityId?: string;
  agentLogin?: string;
  playerId?: string;
  context?: Record<string, unknown>;
}

export interface RiskPosition {
  positionId: string;
  playerId: string;
  agentLogin: string;
  sport: string;
  eventId: string;
  eventName?: string;
  market: string;
  exposure: number;
  potentialLiability: number;
  status: "open" | "closing" | "closed";
  createdAt: number;
  expiresAt?: number;
}

export interface RiskScore {
  playerId: string;
  score: number;
  confidence: number;
  tier: RiskTier;
  factors: Array<{ factor: string; weight: number; description: string }>;
  modelVersion: string;
  calculatedAt: number;
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

export type WebSocketMessageType =
  | "lineMove"
  | "riskAlert"
  | "wagerTick"
  | "positionUpdate"
  | "agentUpdate"
  | "sportsbook_odds_update"
  | "error"
  | "subscribe"
  | "unsubscribe"
  | "subscribed"
  | "unsubscribed"
  | "pattern_detected"
  | "player_update"
  | "odds_drift"
  | "pong";

export interface WebSocketMessage {
  type: WebSocketMessageType;
  provider?: string;
  data?: unknown;
  timestamp?: number;
}

export interface WebSocketClient {
  id: string;
  ws: import("bun").ServerWebSocket<unknown>;
  subscribedChannels: Set<string>;
  connectedAt: number;
  lastPingAt: number;
  userId?: string;
  role?: UserRole;
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

export interface SSEClient {
  id: string;
  stream: ReadableStreamDefaultController<Uint8Array>;
  connectedAt: number;
  filter?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent Hierarchy
// ---------------------------------------------------------------------------

export interface AgentNode {
  login: string;
  displayName?: string;
  parentLogin?: string;
  level: number;
  commissionPct: number;
  isActive: boolean;
  downline: AgentNode[];
}

export interface AgentPerformance {
  agentLogin: string;
  period: string;
  totalPlayers: number;
  activePlayers: number;
  totalWagers: number;
  totalWagered: number;
  totalPayouts: number;
  grossProfit: number;
  holdPercentage: number;
  newPlayers: number;
}

// ---------------------------------------------------------------------------
// Rules Engine
// ---------------------------------------------------------------------------

export type RuleType = "threshold" | "pattern" | "composite" | "time_based";
export type RuleSeverity = "low" | "medium" | "high" | "critical";

export interface Rule {
  id: string;
  ruleId: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  matchCount: number;
  lastMatchedAt?: number;
  tags: string[];
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface WebhookConfig {
  id: string;
  webhookId: string;
  name: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  authType?: "none" | "bearer" | "hmac" | "api_key";
  authConfig?: Record<string, unknown>;
  eventTypes: string[];
  filters?: Record<string, unknown>;
  retryPolicy: { max_retries: number; backoff_ms: number };
  timeoutMs: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// IP Intelligence
// ---------------------------------------------------------------------------

export interface IPTrackingRecord {
  id: string;
  ipAddress: string;
  playerId: string;
  agentLogin: string;
  firstSeenAt: number;
  lastSeenAt: number;
  sightingCount: number;
  countryCode?: string;
  city?: string;
  isp?: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  riskScore: number;
}

// ---------------------------------------------------------------------------
// Partner Profile OS
// ---------------------------------------------------------------------------

export interface GateResult {
  allowed: boolean;
  action: "allow" | "block" | "adjust" | "defer";
  reason?: string;
  adjustedStake?: number;
  deferredUntil?: number;
  metadata: {
    originalStake: number;
    maxExposure: number;
    maxDaily: number;
    remainingDaily: number;
    tier: string;
    template: string;
    bookAllowed: boolean;
    typeAllowed: boolean;
    kycPass: boolean;
    balancePass: boolean;
    opsecPass: boolean;
    marketLimit?: number;
  };
}

// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Telemetry / Metrics
// ---------------------------------------------------------------------------

export interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    rss: number;
  };
  cpu: {
    usage: number;
    loadAvg: number[];
  };
  connections: {
    websocket: number;
    sse: number;
    http: number;
  };
  requests: {
    total: number;
    errors: number;
    avgLatencyMs: number;
  };
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Cron
// ---------------------------------------------------------------------------

export interface CronJobDefinition {
  name: string;
  schedule: string;
  description: string;
  handler: () => Promise<void> | void;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Prediction Markets (Zone 3)
// ---------------------------------------------------------------------------

export type PredictionProvider = "kalshi" | "polymarket" | "predictit" | "betfair";

export type PredictionMarketStatus = "open" | "closed" | "resolved" | "cancelled";

export type PredictionMarketCategory = "politics" | "sports" | "crypto" | "economics" | "entertainment" | "science" | "other";

export type ArbitrageStatus = "active" | "expired" | "executed" | "stale";

export interface PredictionMarket {
  id: string;
  provider: PredictionProvider;
  marketId: string;
  marketName: string;
  category: PredictionMarketCategory;
  outcomeYesPrice: number;
  outcomeNoPrice: number;
  volume: number;
  liquidity: number;
  closeDate: number;
  status: PredictionMarketStatus;
  fetchedAt: number;
  createdAt: number;
}

export interface ArbitrageOpportunity {
  id: string;
  marketId: string;
  marketName?: string;
  category?: PredictionMarketCategory;
  providerA: PredictionProvider;
  priceA: number;
  sideA: "yes" | "no";
  providerB: PredictionProvider;
  priceB: number;
  sideB: "yes" | "no";
  spread: number;
  profitPct: number;
  impliedProbabilityA: number;
  impliedProbabilityB: number;
  detectedAt: number;
  expiresAt: number;
  status: ArbitrageStatus;
}

export interface MarketDepth {
  marketId: string;
  provider: PredictionProvider;
  yesBids: Array<{ price: number; size: number }>;
  yesAsks: Array<{ price: number; size: number }>;
  noBids: Array<{ price: number; size: number }>;
  noAsks: Array<{ price: number; size: number }>;
  totalLiquidityYes: number;
  totalLiquidityNo: number;
  lastUpdated: number;
}

export interface PriceHistoryEntry {
  id: string;
  marketId: string;
  provider: PredictionProvider;
  yesPrice: number;
  noPrice: number;
  volume: number;
  timestamp: number;
}

export interface ProviderConfig {
  id: PredictionProvider;
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  rateLimitPerMinute: number;
  lastFetchedAt?: number;
  status: "active" | "degraded" | "down";
}

export interface PredictionMarketFilter {
  provider?: PredictionProvider;
  category?: PredictionMarketCategory;
  status?: PredictionMarketStatus;
  search?: string;
  minVolume?: number;
  limit?: number;
  offset?: number;
}

export interface PredictionUpdateMessage {
  type: "prediction_update";
  provider: PredictionProvider;
  data: {
    marketId: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    timestamp: number;
  };
}

export interface ArbitrageAlertMessage {
  type: "arbitrage_alert";
  data: ArbitrageOpportunity;
}

// ---------------------------------------------------------------------------
// Partner Profile OS — Signal + Gate Types
// ---------------------------------------------------------------------------

export type GateAction = "allow" | "block" | "adjust" | "defer";

export interface GateResult {
  allowed: boolean;
  action: GateAction;
  reason?: string;
  adjustedStake?: number;
  deferredUntil?: number;
  metadata: {
    originalStake: number;
    maxExposure: number;
    maxDaily: number;
    remainingDaily: number;
    tier: string;
    template: string;
    bookAllowed: boolean;
    typeAllowed: boolean;
    kycPass: boolean;
    balancePass: boolean;
    opsecPass: boolean;
    marketLimit?: number;
  };
}

export type SignalType = "steam" | "arb" | "clv" | "manual" | "predictive";
export type Tier = "T1" | "T2" | "T3" | "T4";

export interface SignalContext {
  signalId: string;
  partnerId: string;
  bookId: string;
  tier: Tier;
  type: SignalType;
  suggestedStake: number;
  eventId: string;
  market: string;
  sport: string;
  confidence: number;
  urgencyMs: number;
  sourceAccount?: string;
  odds?: number;
  line?: number;
  side?: string;
}

export type LifecycleState =
  | "signup"
  | "materialized"
  | "kyc_pending"
  | "active"
  | "cultivating"
  | "graduated"
  | "frozen"
  | "suspended"
  | "terminated";

export type KycStatus = "pending" | "verified" | "rejected";
export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface PartnerRuntimeState {
  currentBalance: number;
  dailyUsed: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalSettledPnl: number;
  currentLimit: number;
  currentLimits: Record<string, number>;
  kycStatus: KycStatus;
  riskLevel: RiskLevel;
  opsecScore: number;
  lastDepositAt?: number;
  lastBetAt?: number;
  lastSettlementAt?: number;
  dailyResetAt?: number;
}
