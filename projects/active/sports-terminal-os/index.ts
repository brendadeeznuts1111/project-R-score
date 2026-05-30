/**
 * Sports Terminal OS — Barrel Export
 *
 * Single entry point for workspace consumers. Import from "sports-terminal-os"
 * to access server bindings, services, types, and utilities.
 *
 * Does NOT auto-start the server — use `bun run --filter sports-terminal-os dev`
 * or import and call `startServer()` explicitly.
 */

// ---------------------------------------------------------------------------
// Server (testing utilities — does NOT start the server)
// ---------------------------------------------------------------------------
export {
  wsClients,
  sseClients,
  requestCount,
  errorCount,
  serverStartTime,
  gracefulShutdown,
  broadcastToWebSockets,
  broadcastToSSE,
} from "./src/index";

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export * as SportsbookService from "./src/services/sportsbook-service";
export * as PatternService from "./src/services/pattern-service";
export * as RulesEngine from "./src/services/rules-engine";
export * as PredictionMarketService from "./src/services/prediction-market-service";
export * as ArbitrageDetector from "./src/services/arbitrage-detector";
export * as WebhookService from "./src/services/webhook-service";
export * as WebhookDispatcher from "./src/services/webhook-dispatcher";
export * as AlertService from "./src/services/alert-service";
export * as PlayerService from "./src/services/player-service";
export * as AgentService from "./src/services/agent-service";
export * as RiskService from "./src/services/risk-service";
export * as AIRiskService from "./src/services/ai-risk-service";
export * as ExportService from "./src/services/export-service";
export * as SandboxService from "./src/services/sandbox-service";
export * as IPSurveillanceService from "./src/services/ip-surveillance-service";
export * as CronService from "./src/services/cron";
export * as MetricsCollector from "./src/services/metrics-collector";

// ---------------------------------------------------------------------------
// Partner Profile OS
// ---------------------------------------------------------------------------
export * as PartnerProfile from "./src/zones/partner-profile";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
export * from "./src/utils/errors";
export * from "./src/utils/logger";
export * from "./src/utils/validators";
export * as TableLogger from "./src/utils/tableLogger";
export * as Env from "./src/utils/env";

// ---------------------------------------------------------------------------
// Types (re-export all shared types)
// ---------------------------------------------------------------------------
export type * from "./src/utils/types";
