/**
 * LogsPage — System Logs & Audit Trails
 *
 * - Tabbed: Application Logs, Audit Trail, WebSocket Logs
 * - Log table: timestamp, level, component, message
 * - Filter by level, component, time range
 * - Auto-refresh toggle
 * - Export logs button
 * - Color coding: DEBUG=gray, INFO=blue, WARN=yellow, ERROR=red
 */

import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
type LogTab = "application" | "audit" | "websocket";

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

interface AuditEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  result: "success" | "failure";
  ip?: string;
  details?: string;
}

interface WSLogEntry {
  id: string;
  timestamp: number;
  direction: "in" | "out";
  clientId: string;
  messageType: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const COMPONENTS = ["Server", "Router", "Sportsbook", "PredictionMarkets", "RiskEngine", "Agent", "Auth", "Vault", "Cron", "Webhook", "Telegram", "Database"];

function generateMockLog(index: number): LogEntry {
  const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
  const weights = [0.3, 0.5, 0.15, 0.05];
  let r = Math.random();
  let level: LogLevel = "INFO";
  for (let i = 0; i < levels.length; i++) {
    r -= weights[i];
    if (r <= 0) { level = levels[i]; break; }
  }
  const comp = COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)];
  const messages: Record<LogLevel, string[]> = {
    DEBUG: ["Processing request", "Cache hit", "Query executed", "WS ping received", "Rate limit check"],
    INFO: ["Request completed", "Odds refreshed", "Player analyzed", "Cron job finished", "Webhook delivered"],
    WARN: ["Slow query detected", "Rate limit approaching", "Stale odds data", "WS reconnection attempt"],
    ERROR: ["Database connection failed", "API timeout", "Auth token expired", "Webhook delivery failed"],
  };
  return {
    id: `log_${Date.now()}_${index}`,
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    level,
    component: comp,
    message: messages[level][Math.floor(Math.random() * messages[level].length)],
    requestId: `req_${Math.random().toString(36).slice(2, 10)}`,
  };
}

function generateMockAudit(index: number): AuditEntry {
  const actions = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "APPROVE"];
  const resources = ["player", "wager", "rule", "webhook", "secret", "agent", "position"];
  return {
    id: `audit_${Date.now()}_${index}`,
    timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    actor: ["admin", "system", "api_user", "cron"][Math.floor(Math.random() * 4)],
    action: actions[Math.floor(Math.random() * actions.length)],
    resource: resources[Math.floor(Math.random() * resources.length)],
    resourceId: `res_${Math.random().toString(36).slice(2, 8)}`,
    result: Math.random() > 0.1 ? "success" : "failure",
    ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
  };
}

function generateMockWS(index: number): WSLogEntry {
  const types = ["subscribe", "unsubscribe", "wagerTick", "riskAlert", "pong", "connected", "lineMove"];
  return {
    id: `ws_${Date.now()}_${index}`,
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    direction: Math.random() > 0.4 ? "in" : "out",
    clientId: `client_${Math.random().toString(36).slice(2, 8)}`,
    messageType: types[Math.floor(Math.random() * types.length)],
    size: Math.floor(Math.random() * 2000),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LogTab>("application");
  const [appLogs, setAppLogs] = useState<LogEntry[]>(() =>
    Array.from({ length: 50 }, (_, i) => generateMockLog(i))
  );
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() =>
    Array.from({ length: 30 }, (_, i) => generateMockAudit(i))
  );
  const [wsLogs, setWsLogs] = useState<WSLogEntry[]>(() =>
    Array.from({ length: 40 }, (_, i) => generateMockWS(i))
  );

  const [filterLevel, setFilterLevel] = useState<LogLevel | "ALL">("ALL");
  const [filterComponent, setFilterComponent] = useState("ALL");
  const [filterTimeRange, setFilterTimeRange] = useState("1h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setAppLogs((prev) => [generateMockLog(Date.now()), ...prev].slice(0, 200));
      setAuditLogs((prev) => [generateMockAudit(Date.now()), ...prev].slice(0, 200));
      setWsLogs((prev) => [generateMockWS(Date.now()), ...prev].slice(0, 200));
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const now = Date.now();
  const timeRanges: Record<string, number> = { "5m": 300000, "15m": 900000, "1h": 3600000, "6h": 21600000, "24h": 86400000 };
  const timeCutoff = now - (timeRanges[filterTimeRange] || 3600000);

  const filteredAppLogs = appLogs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (filterComponent !== "ALL" && log.component !== filterComponent) return false;
    if (log.timestamp < timeCutoff) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase()) && !log.component.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (log.timestamp < timeCutoff) return false;
    if (search && !log.action.toLowerCase().includes(search.toLowerCase()) && !log.actor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredWSLogs = wsLogs.filter((log) => {
    if (log.timestamp < timeCutoff) return false;
    if (search && !log.messageType.toLowerCase().includes(search.toLowerCase()) && !log.clientId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "DEBUG": return { bg: "rgba(106,106,128,0.12)", text: "#8888a0" };
      case "INFO": return { bg: "rgba(74,158,255,0.12)", text: "#4a9eff" };
      case "WARN": return { bg: "rgba(255,152,0,0.12)", text: "#ff9800" };
      case "ERROR": return { bg: "rgba(244,67,54,0.12)", text: "#f44336" };
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const exportLogs = useCallback(() => {
    let data: string;
    if (activeTab === "application") {
      data = filteredAppLogs.map((l) => `${formatTime(l.timestamp)} [${l.level}] ${l.component}: ${l.message}`).join("\n");
    } else if (activeTab === "audit") {
      data = filteredAuditLogs.map((l) => `${formatTime(l.timestamp)} ${l.actor} ${l.action} ${l.resource} (${l.result})`).join("\n");
    } else {
      data = filteredWSLogs.map((l) => `${formatTime(l.timestamp)} ${l.direction.toUpperCase()} ${l.clientId} ${l.messageType} (${l.size}b)`).join("\n");
    }
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${activeTab}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, filteredAppLogs, filteredAuditLogs, filteredWSLogs]);

  const TABS = [
    { id: "application" as const, label: "Application Logs", count: filteredAppLogs.length },
    { id: "audit" as const, label: "Audit Trail", count: filteredAuditLogs.length },
    { id: "websocket" as const, label: "WebSocket Logs", count: filteredWSLogs.length },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 1400 }}>
      <div className="logs-header">
        <div>
          <h1>System Logs</h1>
          <p className="page-description">Application logs, audit trails, and WebSocket activity</p>
        </div>
        <div className="logs-controls">
          <button className={`btn btn-sm ${autoRefresh ? "btn-primary" : ""}`} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "● Auto" : "○ Manual"}
          </button>
          <button className="btn btn-sm btn-primary" onClick={exportLogs}>⬇ Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="logs-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`logs-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} <span className="logs-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="logs-filters">
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="logs-search"
        />
        {activeTab === "application" && (
          <>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as LogLevel | "ALL")} className="filter-select">
              <option value="ALL">All Levels</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
            <select value={filterComponent} onChange={(e) => setFilterComponent(e.target.value)} className="filter-select">
              <option value="ALL">All Components</option>
              {COMPONENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        <select value={filterTimeRange} onChange={(e) => setFilterTimeRange(e.target.value)} className="filter-select">
          <option value="5m">Last 5 min</option>
          <option value="15m">Last 15 min</option>
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
        </select>
      </div>

      {/* Application Logs */}
      {activeTab === "application" && (
        <div className="logs-table-container">
          <table className="data-table logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Level</th>
                <th>Component</th>
                <th>Message</th>
                <th>Request ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppLogs.map((log) => {
                const lc = getLevelColor(log.level);
                return (
                  <tr key={log.id} style={{ background: lc.bg }}>
                    <td className="log-time">{formatTime(log.timestamp)}</td>
                    <td><span className="log-level-badge" style={{ color: lc.text, background: lc.text + "20" }}>{log.level}</span></td>
                    <td><code>{log.component}</code></td>
                    <td>{log.message}</td>
                    <td><code className="log-request-id">{log.requestId}</code></td>
                  </tr>
                );
              })}
              {filteredAppLogs.length === 0 && (
                <tr><td colSpan={5} className="logs-empty">No logs match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Trail */}
      {activeTab === "audit" && (
        <div className="logs-table-container">
          <table className="data-table logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>ID</th>
                <th>Result</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="log-time">{formatTime(log.timestamp)}</td>
                  <td><code>{log.actor}</code></td>
                  <td><span className="audit-action-badge">{log.action}</span></td>
                  <td>{log.resource}</td>
                  <td><code>{log.resourceId}</code></td>
                  <td>
                    <span className={`audit-result ${log.result}`}>
                      {log.result === "success" ? "✓" : "✗"} {log.result}
                    </span>
                  </td>
                  <td><code>{log.ip}</code></td>
                </tr>
              ))}
              {filteredAuditLogs.length === 0 && (
                <tr><td colSpan={7} className="logs-empty">No audit entries match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* WebSocket Logs */}
      {activeTab === "websocket" && (
        <div className="logs-table-container">
          <table className="data-table logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Direction</th>
                <th>Client</th>
                <th>Type</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredWSLogs.map((log) => (
                <tr key={log.id}>
                  <td className="log-time">{formatTime(log.timestamp)}</td>
                  <td>
                    <span className={`ws-direction ${log.direction}`}>
                      {log.direction === "in" ? "← IN" : "→ OUT"}
                    </span>
                  </td>
                  <td><code>{log.clientId}</code></td>
                  <td><code>{log.messageType}</code></td>
                  <td>{log.size}b</td>
                </tr>
              ))}
              {filteredWSLogs.length === 0 && (
                <tr><td colSpan={5} className="logs-empty">No WebSocket logs match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
