/**
 * AlertPanel Component
 *
 * Provides:
 *   - Alert list with severity colors (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=blue)
 *   - Acknowledge/resolve actions
 *   - Filter by severity, status, type
 *   - Real-time alert count badge
 *   - Sound notification for CRITICAL alerts
 *
 * Zone 8: Webhook Alerts — Tech Innovation Theme (#0066ff)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type AlertStatus = "open" | "acknowledged" | "resolved";
type AlertType =
  | "risk_alert"
  | "system_alert"
  | "pattern_alert"
  | "enforcement_alert"
  | "webhook_failure"
  | "circuit_breaker"
  | "ip_flag"
  | "compliance";

interface RiskAlert {
  id: number;
  alertId: string;
  severity: AlertSeverity;
  alertType: AlertType;
  message: string;
  source?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedBy?: string;
  createdAt: number;
  updatedAt: number;
}

interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  criticalUnacknowledged: number;
  open: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#0066ff";

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", label: "CRIT" },
  HIGH:     { color: "#f97316", bg: "rgba(249, 115, 22, 0.12)", label: "HIGH" },
  MEDIUM:   { color: "#eab308", bg: "rgba(234, 179, 8, 0.12)", label: "MED" },
  LOW:      { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", label: "LOW" },
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  open: "Open",
  acknowledged: "Ackd",
  resolved: "Resolved",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  risk_alert: "Risk",
  system_alert: "System",
  pattern_alert: "Pattern",
  enforcement_alert: "Enforcement",
  webhook_failure: "Webhook",
  circuit_breaker: "Circuit",
  ip_flag: "IP Flag",
  compliance: "Compliance",
};

// ---------------------------------------------------------------------------
// Sound notification (using Web Audio API)
// ---------------------------------------------------------------------------

function playCriticalAlertSound(): void {
  try {
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "square";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.setValueAtTime(330, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not supported, silently ignore
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AlertPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("open");
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");

  // SSE ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const previousCriticalRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`/api/alerts?${params.toString()}`),
        fetch("/api/alerts/stats/summary"),
      ]);

      if (!alertsRes.ok || !summaryRes.ok) throw new Error("Failed to fetch alerts");

      const alertsData = await alertsRes.json();
      const summaryData = await summaryRes.json();

      // Sound notification for new CRITICAL alerts
      const newCritical = summaryData.criticalUnacknowledged ?? 0;
      if (
        soundEnabled &&
        newCritical > 0 &&
        newCritical > previousCriticalRef.current
      ) {
        playCriticalAlertSound();
      }
      previousCriticalRef.current = newCritical;

      setAlerts(alertsData.items ?? []);
      setSummary(summaryData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
    }
  }, [severityFilter, statusFilter, typeFilter, soundEnabled]);

  const fetchWithLoading = useCallback(async () => {
    setLoading(true);
    await fetchAlerts();
    setLoading(false);
  }, [fetchAlerts]);

  useEffect(() => {
    fetchWithLoading();
  }, [fetchWithLoading]);

  // ---------------------------------------------------------------------------
  // SSE real-time alerts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const es = new EventSource("/api/alerts/stream");
    eventSourceRef.current = es;

    es.addEventListener("connected", (e) => {
      console.log("[AlertPanel] SSE connected:", e.data);
    });

    es.addEventListener("alert", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_alert") {
          // Refresh alerts
          fetchAlerts();
          if (soundEnabled && data.severity === "CRITICAL") {
            playCriticalAlertSound();
          }
        } else if (data.type === "acknowledged" || data.type === "resolved") {
          fetchAlerts();
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener("error", () => {
      // Auto-reconnect handled by EventSource
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [fetchAlerts, soundEnabled]);

  // Poll for updates every 30s as fallback
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAlerts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge");
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAlerts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    }
  };

  const handleBulkAcknowledge = async (targetSeverity?: AlertSeverity) => {
    try {
      const params = new URLSearchParams();
      if (targetSeverity) params.set("severity", targetSeverity);
      const res = await fetch(`/api/alerts/bulk-acknowledge?${params.toString()}`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAlerts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk acknowledge failed");
    }
  };

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const styles: Record<string, React.CSSProperties> = {
    container: {
      backgroundColor: "#0a0e1a",
      color: "#c8d0e0",
      padding: "24px",
      fontFamily: "'Inter', 'SF Mono', monospace",
      minHeight: "100%",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    title: {
      fontSize: "20px",
      fontWeight: 600,
      color: "#ffffff",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    badge: {
      backgroundColor: "#ef4444",
      color: "#ffffff",
      fontSize: "12px",
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: "10px",
      minWidth: "20px",
      textAlign: "center" as const,
    },
    soundToggle: {
      padding: "6px 12px",
      borderRadius: "4px",
      border: "1px solid #334155",
      backgroundColor: "#1e293b",
      color: "#94a3b8",
      cursor: "pointer",
      fontSize: "12px",
    },
    toolbar: {
      display: "flex",
      gap: "12px",
      marginBottom: "20px",
      flexWrap: "wrap" as const,
      alignItems: "center",
    },
    filterSelect: {
      padding: "8px 12px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      fontSize: "13px",
      fontFamily: "inherit",
      minWidth: "120px",
    },
    summaryBar: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
    },
    summaryCard: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "8px",
      padding: "12px",
      textAlign: "center" as const,
    },
    summaryValue: {
      fontSize: "22px",
      fontWeight: 700,
      margin: 0,
    },
    summaryLabel: {
      fontSize: "10px",
      color: "#64748b",
      margin: "4px 0 0 0",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    error: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#ef4444",
      padding: "12px",
      borderRadius: "6px",
      marginBottom: "16px",
      fontSize: "13px",
    },
    alertCard: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "10px",
      borderLeftWidth: "4px",
    },
    alertHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "8px",
    },
    severityBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    alertMessage: {
      fontSize: "14px",
      color: "#e2e8f0",
      margin: "0 0 8px 0",
      lineHeight: 1.5,
    },
    alertMeta: {
      fontSize: "11px",
      color: "#64748b",
      display: "flex",
      gap: "12px",
      flexWrap: "wrap" as const,
    },
    alertActions: {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
    },
    btn: {
      padding: "6px 14px",
      borderRadius: "4px",
      border: "1px solid #334155",
      backgroundColor: "#1e293b",
      color: "#94a3b8",
      cursor: "pointer",
      fontSize: "12px",
    },
    btnAck: {
      backgroundColor: "rgba(0, 102, 255, 0.12)",
      color: THEME_COLOR,
      border: `1px solid ${THEME_COLOR}30`,
    },
    btnResolve: {
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      color: "#22c55e",
      border: "1px solid rgba(34, 197, 94, 0.25)",
    },
    empty: {
      textAlign: "center" as const,
      padding: "40px",
      color: "#64748b",
    },
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const getSeverityClassName = (severity: AlertSeverity): string => {
    switch (severity) {
      case "CRITICAL": return "alert-critical";
      case "HIGH": return "alert-high";
      case "MEDIUM": return "alert-medium";
      case "LOW": return "alert-low";
      default: return "";
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          Alert Center
          {summary && summary.criticalUnacknowledged > 0 && (
            <span style={styles.badge}>{summary.criticalUnacknowledged}</span>
          )}
        </h2>
        <button
          style={{
            ...styles.soundToggle,
            ...(soundEnabled ? { borderColor: THEME_COLOR, color: THEME_COLOR } : {}),
          }}
          onClick={() => setSoundEnabled((p) => !p)}
        >
          {soundEnabled ? "Sound On" : "Sound Off"}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Summary Bar */}
      {summary && (
        <div style={styles.summaryBar}>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as AlertSeverity[]).map((sev) => (
            <div key={sev} style={styles.summaryCard}>
              <p style={{ ...styles.summaryValue, color: SEVERITY_CONFIG[sev].color }}>
                {summary.bySeverity[sev] ?? 0}
              </p>
              <p style={styles.summaryLabel}>{sev}</p>
            </div>
          ))}
          <div style={styles.summaryCard}>
            <p style={{ ...styles.summaryValue, color: "#22c55e" }}>{summary.open ?? 0}</p>
            <p style={styles.summaryLabel}>Open</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.toolbar}>
        <select
          style={styles.filterSelect}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | "all")}
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          style={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AlertStatus | "all")}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          style={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AlertType | "all")}
        >
          <option value="all">All Types</option>
          <option value="risk_alert">Risk</option>
          <option value="system_alert">System</option>
          <option value="pattern_alert">Pattern</option>
          <option value="enforcement_alert">Enforcement</option>
          <option value="webhook_failure">Webhook</option>
          <option value="circuit_breaker">Circuit</option>
          <option value="ip_flag">IP Flag</option>
          <option value="compliance">Compliance</option>
        </select>

        {summary && summary.open > 0 && (
          <button style={{ ...styles.btn, ...styles.btnAck }} onClick={() => handleBulkAcknowledge()}>
            Ack All Open
          </button>
        )}
      </div>

      {/* Alert List */}
      {loading ? (
        <div style={styles.empty}>Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div style={styles.empty}>
          {statusFilter === "open"
            ? "No open alerts. All clear!"
            : "No alerts match the current filters."}
        </div>
      ) : (
        alerts.map((alert) => {
          const sevConfig = SEVERITY_CONFIG[alert.severity];
          const alertClass = getSeverityClassName(alert.severity);

          return (
            <div
              key={alert.alertId}
              style={{
                ...styles.alertCard,
                borderLeftColor: sevConfig.color,
              }}
              className={alertClass}
            >
              <div style={styles.alertHeader}>
                <span
                  style={{
                    ...styles.severityBadge,
                    backgroundColor: sevConfig.bg,
                    color: sevConfig.color,
                  }}
                >
                  {sevConfig.label}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {new Date(alert.createdAt * 1000).toLocaleString()}
                </span>
              </div>

              <p style={styles.alertMessage}>{alert.message}</p>

              <div style={styles.alertMeta}>
                <span>Type: {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}</span>
                {alert.source && <span>Source: {alert.source}</span>}
                {alert.relatedEntityType && (
                  <span>
                    Entity: {alert.relatedEntityType}
                    {alert.relatedEntityId ? ` (${alert.relatedEntityId})` : ""}
                  </span>
                )}
                {alert.acknowledged && (
                  <span style={{ color: THEME_COLOR }}>
                    Ack by {alert.acknowledgedBy}
                  </span>
                )}
                {alert.resolved && (
                  <span style={{ color: "#22c55e" }}>
                    Resolved by {alert.resolvedBy}
                  </span>
                )}
              </div>

              {!alert.resolved && (
                <div style={styles.alertActions}>
                  {!alert.acknowledged && (
                    <button
                      style={{ ...styles.btn, ...styles.btnAck }}
                      onClick={() => handleAcknowledge(alert.alertId)}
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    style={{ ...styles.btn, ...styles.btnResolve }}
                    onClick={() => handleResolve(alert.alertId)}
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default AlertPanel;
