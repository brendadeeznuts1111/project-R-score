/**
 * ArchitecturePage — System Architecture Visualizer
 *
 * Visual pipeline flow: Ingest → Extract → Analyze → Enforce → Stream → Alert
 * - Endpoint traces diagram (collapsible)
 * - Database table map with relationships
 * - Cron job schedule display
 * - Component tree/dependency graph (text-based)
 * - Zone status display (colored indicators)
 */

import React, { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ZoneStatus = "healthy" | "degraded" | "down" | "unknown";

interface ZoneInfo {
  id: string;
  name: string;
  color: string;
  status: ZoneStatus;
  endpoints: number;
  description: string;
  components: string[];
}

interface CronJob {
  name: string;
  schedule: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { id: "ingest", label: "INGEST", icon: "📥", description: "Raw data ingestion from sportsbooks, agents, and external feeds" },
  { id: "extract", label: "EXTRACT", icon: "🔧", description: "Feature extraction, parsing, normalization" },
  { id: "analyze", label: "ANALYZE", icon: "🧠", description: "AI risk analysis, pattern detection, scoring" },
  { id: "enforce", label: "ENFORCE", icon: "⚡", description: "Rule enforcement, limit application, auto-actions" },
  { id: "stream", label: "STREAM", icon: "📡", description: "Real-time streaming via WebSocket + SSE" },
  { id: "alert", label: "ALERT", icon: "🔔", description: "Alert generation, Telegram delivery, webhooks" },
];

const ZONES: ZoneInfo[] = [
  { id: "zone1", name: "Zone 1: Sportsbook Grid", color: "#1a2332", status: "healthy", endpoints: 7, description: "Live odds, best lines, line movements", components: ["SportsbookGrid", "OddsEngine", "LineTracker"] },
  { id: "zone3", name: "Zone 3: Prediction Markets", color: "#1a3228", status: "healthy", endpoints: 11, description: "Kalshi, Polymarket, PredictIt, Betfair", components: ["PredictionMarkets", "ArbitrageEngine", "PriceHistory"] },
  { id: "zoned", name: "Zone D: Agent Decisions", color: "#321a1a", status: "healthy", endpoints: 5, description: "AI analysis, feature extraction, rules", components: ["AgentAnalyzer", "FeatureExtractor", "RulesEngine"] },
  { id: "zonee", name: "Zone E: IP Intelligence", color: "#1a1a32", status: "healthy", endpoints: 3, description: "IP tracking, VPN/proxy detection, blocking", components: ["IPTracker", "GeoResolver", "BlockManager"] },
  { id: "zonef", name: "Zone F: Rules Engine", color: "#321a28", status: "healthy", endpoints: 3, description: "Threshold, pattern, composite, time-based rules", components: ["RuleMatcher", "ActionExecutor", "RuleStore"] },
  { id: "zoneg", name: "Zone G: Player Intel", color: "#32321a", status: "healthy", endpoints: 3, description: "Player search, profiles, risk tiers", components: ["PlayerSearch", "PlayerProfile", "RiskScorer"] },
  { id: "zonei", name: "Zone I: Sandbox v2", color: "#2a1a32", status: "healthy", endpoints: 3, description: "Scenario saving, A/B testing, summaries", components: ["SandboxManager", "ABTester", "SummaryGen"] },
  { id: "zonek", name: "Zone K: Kimi AI", color: "#1a322a", status: "healthy", endpoints: 1, description: "AI chat, risk analysis, natural language", components: ["KimiChat", "RiskAnalysis", "NLQuery"] },
  { id: "zonel", name: "Zone L: Risk Command", color: "#321a1a", status: "healthy", endpoints: 4, description: "Positions, enforcement, dashboard", components: ["PositionGen", "Enforcer", "Dashboard"] },
  { id: "zone4", name: "Zone 4: Backend Ops", color: "#2a2a2a", status: "healthy", endpoints: 6, description: "Metrics, health, cron, idle shutdown", components: ["MetricsCollector", "HealthCheck", "CronManager", "IdleShutdown"] },
  { id: "telegram", name: "Telegram Hub", color: "#1a2832", status: "healthy", endpoints: 6, description: "Bot management, delivery, topics", components: ["BotManager", "DeliveryLog", "TopicRouter"] },
  { id: "vault", name: "Zone B: Secrets Vault", color: "#321a32", status: "healthy", endpoints: 3, description: "Secret storage, key management", components: ["VaultStore", "KeyManager", "AccessAudit"] },
];

const CRON_JOBS: CronJob[] = [
  { name: "oddsRefresh", schedule: "*/30 * * * *", description: "Refresh sportsbook odds every 30 minutes", enabled: true },
  { name: "predictionRefresh", schedule: "*/15 * * * *", description: "Refresh prediction markets every 15 minutes", enabled: true },
  { name: "riskAnalysis", schedule: "0 * * * *", description: "Hourly risk analysis sweep", enabled: true },
  { name: "ipGeoUpdate", schedule: "0 2 * * *", description: "Daily IP geolocation update", enabled: true },
  { name: "cleanupOldData", schedule: "0 3 * * *", description: "Daily cleanup of old wager data", enabled: true },
  { name: "backupSecrets", schedule: "0 4 * * *", description: "Daily secrets vault backup", enabled: true },
  { name: "reportGeneration", schedule: "0 6 * * *", description: "Daily morning report generation", enabled: true },
  { name: "healthCheck", schedule: "*/5 * * * *", description: "Health check every 5 minutes", enabled: true },
];

const DB_TABLES = [
  { name: "players", description: "Player accounts, risk tiers, archetypes", related: ["wagers", "risk_scores", "agent_nodes"] },
  { name: "wagers", description: "Betting transactions, outcomes, settlements", related: ["players", "positions"] },
  { name: "odds", description: "Sportsbook odds snapshots, line history", related: ["line_movements"] },
  { name: "prediction_markets", description: "Prediction market data from all providers", related: ["price_history", "arbitrage_ops"] },
  { name: "risk_scores", description: "AI-generated risk scores per player", related: ["players", "risk_alerts"] },
  { name: "risk_alerts", description: "Generated risk alerts with severity", related: ["risk_scores", "enforcement_actions"] },
  { name: "positions", description: "Open risk positions by event/market", related: ["wagers", "enforcement_actions"] },
  { name: "enforcement_actions", description: "Applied limits, suspensions, adjustments", related: ["risk_alerts", "positions"] },
  { name: "agent_nodes", description: "Agent hierarchy tree", related: ["players", "agent_performance"] },
  { name: "agent_performance", description: "Agent P&L and activity metrics", related: ["agent_nodes"] },
  { name: "ip_tracking", description: "IP sighting records with geo data", related: ["players"] },
  { name: "rules", description: "Active rules engine rules", related: ["rule_matches"] },
  { name: "webhooks", description: "Webhook configurations and delivery logs", related: [] },
  { name: "secrets", description: "Encrypted secrets vault", related: [] },
  { name: "sessions", description: "Auth sessions and tokens", related: ["players"] },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ArchitecturePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pipeline" | "zones" | "database" | "cron" |"components">("pipeline");
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const getStatusColor = (status: ZoneStatus) => {
    switch (status) {
      case "healthy": return "#4caf50";
      case "degraded": return "#ff9800";
      case "down": return "#f44336";
      default: return "#6a6a80";
    }
  };

  const TABS = [
    { id: "pipeline" as const, label: "Pipeline", icon: "⚡" },
    { id: "zones" as const, label: "Zones", icon: "◈" },
    { id: "database" as const, label: "Database", icon: "🗄" },
    { id: "cron" as const, label: "Cron Jobs", icon: "⏰" },
    { id: "components" as const, label: "Components", icon: "🧩" },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 1200 }}>
      <h1>System Architecture</h1>
      <p className="page-description">
        Visual overview of the Sports Terminal OS architecture, zones, data pipeline, and infrastructure.
      </p>

      {/* Tabs */}
      <div className="arch-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`arch-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Pipeline Tab */}
      {activeTab === "pipeline" && (
        <div className="arch-panel">
          <h2 className="arch-section-title">Data Processing Pipeline</h2>
          <div className="pipeline-flow">
            {PIPELINE_STAGES.map((stage, i) => (
              <React.Fragment key={stage.id}>
                <div className="pipeline-stage">
                  <div className="pipeline-icon">{stage.icon}</div>
                  <div className="pipeline-label">{stage.label}</div>
                  <div className="pipeline-desc">{stage.description}</div>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className="pipeline-arrow">→</div>
                )}
              </React.Fragment>
            ))}
          </div>

          <h3 className="arch-subtitle">WebSocket Message Flow</h3>
          <div className="arch-flow-diagram">
            <div className="flow-box">Client</div>
            <div className="flow-arrow">⇄</div>
            <div className="flow-box">Bun.serve</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">WS Handler</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Channel Router</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Subscribers</div>
          </div>

          <h3 className="arch-subtitle">HTTP Request Flow</h3>
          <div className="arch-flow-diagram">
            <div className="flow-box">Client</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Bun.serve</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">CORS + Rate Limit</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Auth Middleware</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Route Handler</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Response</div>
          </div>
        </div>
      )}

      {/* Zones Tab */}
      {activeTab === "zones" && (
        <div className="arch-panel">
          <h2 className="arch-section-title">Zone Status Overview</h2>
          <div className="zones-grid">
            {ZONES.map((zone) => {
              const isExpanded = expandedZone === zone.id;
              return (
                <div
                  key={zone.id}
                  className={`zone-card ${isExpanded ? "expanded" : ""}`}
                  style={{ borderLeftColor: zone.color }}
                  onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                >
                  <div className="zone-header">
                    <span className="zone-status-dot" style={{ background: getStatusColor(zone.status) }} />
                    <span className="zone-name">{zone.name}</span>
                    <span className="zone-endpoints">{zone.endpoints} endpoints</span>
                  </div>
                  <div className="zone-desc">{zone.description}</div>
                  {isExpanded && (
                    <div className="zone-detail">
                      <div className="zone-detail-section">
                        <h4>Status</h4>
                        <span className={`zone-status-badge ${zone.status}`}>{zone.status.toUpperCase()}</span>
                      </div>
                      <div className="zone-detail-section">
                        <h4>Components</h4>
                        <div className="zone-components">
                          {zone.components.map((c) => (
                            <span key={c} className="zone-component-tag">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Database Tab */}
      {activeTab === "database" && (
        <div className="arch-panel">
          <h2 className="arch-section-title">Database Schema</h2>
          <div className="db-tables">
            {DB_TABLES.map((table) => (
              <div key={table.name} className="db-table-card">
                <div className="db-table-header">
                  <span className="db-table-icon">📋</span>
                  <code className="db-table-name">{table.name}</code>
                </div>
                <div className="db-table-desc">{table.description}</div>
                {table.related.length > 0 && (
                  <div className="db-table-related">
                    <span>Related: </span>
                    {table.related.map((r) => (
                      <code key={r} className="db-related-tag">{r}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cron Tab */}
      {activeTab === "cron" && (
        <div className="arch-panel">
          <h2 className="arch-section-title">Cron Job Schedule</h2>
          <div className="cron-schedule">
            <div className="cron-timeline">
              {CRON_JOBS.map((job) => (
                <div key={job.name} className="cron-job-row">
                  <div className="cron-job-time">
                    <code className="cron-schedule-code">{job.schedule}</code>
                  </div>
                  <div className={`cron-job-status ${job.enabled ? "enabled" : "disabled"}`}>
                    {job.enabled ? "●" : "○"}
                  </div>
                  <div className="cron-job-info">
                    <code className="cron-job-name">{job.name}</code>
                    <span className="cron-job-desc">{job.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Components Tab */}
      {activeTab === "components" && (
        <div className="arch-panel">
          <h2 className="arch-section-title">Component Dependency Tree</h2>
          <pre className="arch-component-tree">
{`App.tsx
├── Sidebar (navigation)
├── TopBar (status, time, alerts)
├── Routes
│   ├── HomePage
│   │   └── StatusGrid + QuickLinks
│   ├── SportsbookPage
│   │   └── SportsbookGrid
│   ├── PredictionMarketsPage
│   │   └── PredictionMarkets
│   ├── CustomersPage
│   │   ├── PlayerSearch
│   │   └── PlayerProfile
│   ├── AgentsPage
│   │   ├── AgentTree
│   │   ├── AgentPerformance
│   │   └── AgentDownline
│   ├── CommandCenterPage
│   │   ├── AlertPanel
│   │   └── WebhookSettings
│   ├── RiskPage
│   │   ├── RiskDashboard
│   │   ├── RiskPositions
│   │   └── RulesEngine
│   ├── OperationsPage
│   │   └── Operations Dashboard
│   ├── TelegramPage
│   │   └── TelegramHub
│   ├── LiveTickerPage
│   ├── PatternsPage
│   ├── PartnersPage
│   ├── AIPlaygroundPage
│   ├── ApiReferencePage
│   ├── ArchitecturePage
│   ├── OpenAPIPage
│   ├── DeployPage
│   ├── AgentConfigPage
│   ├── LogsPage
│   └── VaultPage
├── WebSocket Manager
│   ├── subscribe(channel)
│   ├── unsubscribe(channel)
│   └── broadcast(msg)
└── AppContext
    ├── state (version, wsConnected, alerts)
    └── setState`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ArchitecturePage;
