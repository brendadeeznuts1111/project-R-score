/**
 * DeployPage — Deployment Configuration
 *
 * - Environment variable display/edit
 * - Deployment mode selector (dev/staging/prod)
 * - PM2 config preview
 * - Docker setup guide (text)
 * - Health check URLs
 * - Feature flags toggle
 */

import React, { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnvVar {
  key: string;
  value: string;
  description: string;
  category: string;
  secret?: boolean;
}

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ENV_VARS: EnvVar[] = [
  { key: "NODE_ENV", value: "development", description: "Runtime environment", category: "Core" },
  { key: "PORT", value: "3000", description: "HTTP server port", category: "Core" },
  { key: "HOST", value: "0.0.0.0", description: "Bind address", category: "Core" },
  { key: "DATABASE_URL", value: "./data/terminal.db", description: "SQLite database path", category: "Database", secret: true },
  { key: "REDIS_URL", value: "redis://localhost:6379", description: "Redis connection URL", category: "Cache", secret: true },
  { key: "JWT_SECRET", value: "change-me-in-production", description: "JWT signing secret", category: "Auth", secret: true },
  { key: "API_KEY", value: "", description: "Master API key", category: "Auth", secret: true },
  { key: "KIMI_API_KEY", value: "", description: "Kimi AI API key", category: "AI", secret: true },
  { key: "TELEGRAM_BOT_TOKEN", value: "", description: "Telegram bot token", category: "Telegram", secret: true },
  { key: "PROXY_INTERNAL_URL", value: "http://localhost:3001", description: "Internal proxy URL", category: "Proxy" },
  { key: "IDLE_TIMEOUT_MS", value: "0", description: "Idle shutdown timeout (0=disabled)", category: "Core" },
  { key: "LOG_LEVEL", value: "info", description: "Logging level", category: "Core" },
  { key: "RATE_LIMIT_ENABLED", value: "true", description: "Enable rate limiting", category: "Security" },
  { key: "CORS_ORIGIN", value: "*", description: "Allowed CORS origins", category: "Security" },
  { key: "METRICS_ENABLED", value: "true", description: "Enable Prometheus metrics", category: "Monitoring" },
];

const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: "sportsbook_grid", name: "Sportsbook Grid", description: "Enable sportsbook odds grid", enabled: true, category: "Trading" },
  { key: "prediction_markets", name: "Prediction Markets", description: "Enable prediction markets module", enabled: true, category: "Trading" },
  { key: "risk_analysis", name: "Risk Analysis", description: "AI-powered risk analysis", enabled: true, category: "Risk" },
  { key: "auto_enforcement", name: "Auto Enforcement", description: "Automatic enforcement actions", enabled: false, category: "Risk" },
  { key: "telegram_alerts", name: "Telegram Alerts", description: "Send alerts via Telegram", enabled: true, category: "Notifications" },
  { key: "webhook_delivery", name: "Webhook Delivery", description: "Enable webhook delivery", enabled: true, category: "Notifications" },
  { key: "sse_streams", name: "SSE Streams", description: "Server-sent events for live data", enabled: true, category: "Realtime" },
  { key: "websocket", name: "WebSocket", description: "WebSocket real-time connection", enabled: true, category: "Realtime" },
  { key: "cron_jobs", name: "Cron Jobs", description: "Scheduled background jobs", enabled: true, category: "System" },
  { key: "sandbox_mode", name: "Sandbox Mode", description: "Enable sandbox testing", enabled: false, category: "System" },
  { key: "ip_tracking", name: "IP Tracking", description: "Track and analyze IP addresses", enabled: true, category: "Security" },
  { key: "vault_encryption", name: "Vault Encryption", description: "Encrypt secrets at rest", enabled: true, category: "Security" },
];

const PM2_CONFIG = `module.exports = {
  apps: [{
    name: "sports-terminal-os",
    script: "./src/index.ts",
    interpreter: "bun",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    log_file: "./logs/combined.log",
    out_file: "./logs/out.log",
    error_file: "./logs/error.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
    max_memory_restart: "512M",
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: "10s",
    watch: false,
    source_map_support: true,
  }],
};`;

const DOCKER_GUIDE = `# Docker Deployment Guide

## Build Image
\`\`\`bash
docker build -t sports-terminal-os:latest .
\`\`\`

## Run Container
\`\`\`bash
docker run -d \\
  --name sports-terminal \\
  -p 3000:3000 \\
  -v ./data:/app/data \\
  -e NODE_ENV=production \\
  -e DATABASE_URL=/app/data/terminal.db \\
  sports-terminal-os:latest
\`\`\`

## Docker Compose
\`\`\`yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_URL=/app/data/terminal.db
    restart: unless-stopped
\`\`\`

## Health Checks
- Health: http://localhost:3000/api/health
- Ready: http://localhost:3000/api/health/ready
- Live: http://localhost:3000/api/health/live
- Metrics: http://localhost:3000/api/metrics`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type DeployMode = "development" | "staging" | "production";

const DeployPage: React.FC = () => {
  const [mode, setMode] = useState<DeployMode>("development");
  const [envVars, setEnvVars] = useState<EnvVar[]>(DEFAULT_ENV_VARS);
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FLAGS);
  const [activeTab, setActiveTab] = useState<"env" | "pm2" | "docker" | "health" | "flags">("env");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const modeColors: Record<DeployMode, string> = {
    development: "#4a9eff",
    staging: "#ff9800",
    production: "#4caf50",
  };

  const handleEditStart = (v: EnvVar) => {
    setEditingKey(v.key);
    setEditValue(v.secret ? "••••••••" : v.value);
  };

  const handleEditSave = () => {
    setEnvVars((prev) =>
      prev.map((v) => (v.key === editingKey ? { ...v, value: editValue } : v))
    );
    setEditingKey(null);
  };

  const toggleFlag = (key: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const categories = Array.from(new Set(envVars.map((v) => v.category)));

  const TABS = [
    { id: "env" as const, label: "Environment" },
    { id: "flags" as const, label: "Feature Flags" },
    { id: "pm2" as const, label: "PM2 Config" },
    { id: "docker" as const, label: "Docker Guide" },
    { id: "health" as const, label: "Health Checks" },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <h1>Deployment</h1>
      <p className="page-description">Configure deployment settings, environment variables, and feature flags.</p>

      {/* Mode selector */}
      <div className="deploy-mode-bar">
        <span className="deploy-mode-label">Deployment Mode:</span>
        {(["development", "staging", "production"] as DeployMode[]).map((m) => (
          <button
            key={m}
            className={`deploy-mode-btn ${mode === m ? "active" : ""}`}
            style={mode === m ? { borderColor: modeColors[m], color: modeColors[m], background: `${modeColors[m]}15` } : {}}
            onClick={() => setMode(m)}
          >
            <span className="deploy-mode-dot" style={{ background: modeColors[m] }} />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="deploy-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`deploy-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Environment Variables */}
      {activeTab === "env" && (
        <div className="deploy-panel">
          {categories.map((cat) => (
            <div key={cat} className="env-category">
              <h3 className="env-category-title">{cat}</h3>
              <div className="env-vars-list">
                {envVars
                  .filter((v) => v.category === cat)
                  .map((v) => (
                    <div key={v.key} className="env-var-row">
                      <div className="env-var-info">
                        <code className="env-var-key">{v.key}</code>
                        <span className="env-var-desc">{v.description}</span>
                      </div>
                      {editingKey === v.key ? (
                        <div className="env-var-edit">
                          <input
                            type={v.secret ? "password" : "text"}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                            autoFocus
                          />
                          <button className="btn btn-sm btn-primary" onClick={handleEditSave}>Save</button>
                          <button className="btn btn-sm" onClick={() => setEditingKey(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="env-var-value" onClick={() => handleEditStart(v)}>
                          <code>{v.secret ? "••••••••" : v.value || "(empty)"}</code>
                          <span className="env-var-edit-hint">✎</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === "flags" && (
        <div className="deploy-panel">
          <div className="flags-grid">
            {flags.map((flag) => (
              <div
                key={flag.key}
                className={`flag-card ${flag.enabled ? "enabled" : "disabled"}`}
                onClick={() => toggleFlag(flag.key)}
              >
                <div className="flag-toggle">
                  <div className={`flag-switch ${flag.enabled ? "on" : ""}`}>
                    <div className="flag-switch-thumb" />
                  </div>
                </div>
                <div className="flag-info">
                  <div className="flag-name">{flag.name}</div>
                  <div className="flag-desc">{flag.description}</div>
                  <div className="flag-category">{flag.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PM2 Config */}
      {activeTab === "pm2" && (
        <div className="deploy-panel">
          <h3>PM2 Ecosystem Config</h3>
          <pre className="deploy-code">{PM2_CONFIG}</pre>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              const blob = new Blob([PM2_CONFIG], { type: "text/javascript" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "ecosystem.config.js";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            ⬇ Download ecosystem.config.js
          </button>
        </div>
      )}

      {/* Docker Guide */}
      {activeTab === "docker" && (
        <div className="deploy-panel">
          <pre className="deploy-code">{DOCKER_GUIDE}</pre>
        </div>
      )}

      {/* Health Checks */}
      {activeTab === "health" && (
        <div className="deploy-panel">
          <h3>Health Check Endpoints</h3>
          <div className="health-checks-list">
            {[
              { name: "Basic Health", url: "/api/health", description: "Overall system health" },
              { name: "Readiness", url: "/api/health/ready", description: "Ready to accept traffic" },
              { name: "Liveness", url: "/api/health/live", description: "Process is alive" },
              { name: "Detailed Health", url: "/api/health/detailed", description: "Detailed health report (admin)" },
              { name: "Metrics", url: "/api/metrics", description: "Prometheus metrics" },
              { name: "Benchmark", url: "/api/benchmark", description: "Performance benchmark" },
              { name: "System Status", url: "/api/health/system-status", description: "Telegram system status" },
            ].map((check) => (
              <div key={check.url} className="health-check-row">
                <div className="health-check-info">
                  <div className="health-check-name">{check.name}</div>
                  <div className="health-check-desc">{check.description}</div>
                </div>
                <code className="health-check-url">http://localhost:3000{check.url}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeployPage;
