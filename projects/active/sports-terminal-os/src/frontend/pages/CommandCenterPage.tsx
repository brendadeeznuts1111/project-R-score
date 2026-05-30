/**
 * CommandCenterPage — Zone 8: Webhook Alerts
 *
 * Tabbed interface providing:
 *   - Overview: System status cards + recent alerts + webhook summary
 *   - Alerts: Full alert panel with filtering, acknowledge/resolve
 *   - Webhooks: Webhook CRUD management, testing, delivery history
 *   - Settings: Configuration and preferences
 *
 * Theme: Tech Innovation (#0066ff)
 */

import React, { useState, useEffect, useCallback } from "react";
import WebhookSettings from "@frontend/components/WebhookSettings";
import AlertPanel from "@frontend/components/AlertPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "overview" | "alerts" | "webhooks" | "settings";

interface SystemStatus {
  uptime: number;
  activeConnections: number;
  requests: { total: number; errors: number };
  timestamp: string;
}

interface AlertSummary {
  total: number;
  bySeverity: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
  byStatus: { open: number; acknowledged: number; resolved: number };
  criticalUnacknowledged: number;
  open: number;
}

interface WebhookSummary {
  total: number;
  enabled: number;
  disabled: number;
  degraded: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#0066ff";
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "alerts", label: "Alerts", icon: "⚠" },
  { id: "webhooks", label: "Webhooks", icon: "◈" },
  { id: "settings", label: "Settings", icon: "◉" },
];

// ---------------------------------------------------------------------------
// Overview Tab Component
// ---------------------------------------------------------------------------

const OverviewTab: React.FC<{
  alertSummary: AlertSummary | null;
  webhookSummary: WebhookSummary | null;
  systemStatus: SystemStatus | null;
}> = ({ alertSummary, webhookSummary, systemStatus }) => {
  const styles: Record<string, React.CSSProperties> = {
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "16px",
      marginBottom: "24px",
    },
    card: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "10px",
      padding: "20px",
    },
    cardTitle: {
      fontSize: "11px",
      fontWeight: 600,
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: "1px",
      margin: "0 0 12px 0",
    },
    metricValue: {
      fontSize: "32px",
      fontWeight: 700,
      color: "#ffffff",
      margin: 0,
    },
    metricSub: {
      fontSize: "12px",
      color: "#64748b",
      margin: "4px 0 0 0",
    },
    alertPreview: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "10px",
      padding: "20px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: 600,
      color: "#ffffff",
      margin: "0 0 16px 0",
    },
    miniAlert: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 12px",
      borderRadius: "6px",
      marginBottom: "8px",
      backgroundColor: "#0f172a",
    },
    miniAlertDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      flexShrink: 0,
    },
    miniAlertText: {
      fontSize: "13px",
      color: "#c8d0e0",
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
    },
    miniAlertTime: {
      fontSize: "11px",
      color: "#64748b",
      marginLeft: "auto",
      flexShrink: 0,
    },
    twoCol: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    statusDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      display: "inline-block",
      marginRight: "6px",
    },
    statusOnline: { backgroundColor: "#22c55e" },
    statusOffline: { backgroundColor: "#ef4444" },
  };

  return (
    <div>
      {/* Metric Cards */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <p style={styles.cardTitle}>Critical Alerts</p>
          <p style={{ ...styles.metricValue, color: alertSummary?.criticalUnacknowledged ? "#ef4444" : "#22c55e" }}>
            {alertSummary?.criticalUnacknowledged ?? 0}
          </p>
          <p style={styles.metricSub}>
            {alertSummary?.open ?? 0} open total
          </p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardTitle}>Active Webhooks</p>
          <p style={{ ...styles.metricValue, color: THEME_COLOR }}>
            {webhookSummary?.enabled ?? 0}
            <span style={{ fontSize: "16px", color: "#64748b", marginLeft: "4px" }}>
              / {webhookSummary?.total ?? 0}
            </span>
          </p>
          <p style={styles.metricSub}>
            {webhookSummary?.degraded ?? 0} degraded
          </p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardTitle}>System Health</p>
          <p style={styles.metricValue}>
            <span style={styles.statusDot} className={systemStatus ? "" : ""} />
            <span style={{ color: systemStatus ? "#22c55e" : "#64748b", fontSize: "20px" }}>
              {systemStatus ? "ONLINE" : "UNKNOWN"}
            </span>
          </p>
          <p style={styles.metricSub}>
            {systemStatus?.activeConnections ?? 0} connections
          </p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardTitle}>Request Rate</p>
          <p style={styles.metricValue}>
            {systemStatus?.requests.total ?? 0}
          </p>
          <p style={styles.metricSub}>
            {systemStatus?.requests.errors ?? 0} errors
          </p>
        </div>
      </div>

      {/* Two-column layout: Alerts + Webhook Status */}
      <div style={styles.twoCol}>
        {/* Recent Alerts Preview */}
        <div style={styles.alertPreview}>
          <h3 style={styles.sectionTitle}>Recent Alerts</h3>
          {alertSummary && alertSummary.total === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No alerts in the system.</p>
          ) : (
            <>
              {/* We'll show a quick summary instead of actual alerts here */}
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
                const colors: Record<string, string> = {
                  CRITICAL: "#ef4444",
                  HIGH: "#f97316",
                  MEDIUM: "#eab308",
                  LOW: "#3b82f6",
                };
                const count = alertSummary?.bySeverity[sev] ?? 0;
                return (
                  <div key={sev} style={styles.miniAlert}>
                    <span style={{ ...styles.miniAlertDot, backgroundColor: colors[sev] }} />
                    <span style={{ fontSize: "12px", color: "#94a3b8", width: "60px" }}>{sev}</span>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>{count}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Webhook Status */}
        <div style={styles.alertPreview}>
          <h3 style={styles.sectionTitle}>Webhook Status</h3>
          {webhookSummary && webhookSummary.total === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No webhooks configured.</p>
          ) : (
            <>
              <div style={styles.miniAlert}>
                <span style={{ ...styles.miniAlertDot, backgroundColor: "#22c55e" }} />
                <span style={{ fontSize: "12px", color: "#94a3b8", width: "80px" }}>Enabled</span>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#22c55e" }}>
                  {webhookSummary?.enabled ?? 0}
                </span>
              </div>
              <div style={styles.miniAlert}>
                <span style={{ ...styles.miniAlertDot, backgroundColor: "#64748b" }} />
                <span style={{ fontSize: "12px", color: "#94a3b8", width: "80px" }}>Disabled</span>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#64748b" }}>
                  {webhookSummary?.disabled ?? 0}
                </span>
              </div>
              <div style={styles.miniAlert}>
                <span style={{ ...styles.miniAlertDot, backgroundColor: "#ef4444" }} />
                <span style={{ fontSize: "12px", color: "#94a3b8", width: "80px" }}>Degraded</span>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#ef4444" }}>
                  {webhookSummary?.degraded ?? 0}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Settings Tab Component
// ---------------------------------------------------------------------------

const SettingsTab: React.FC = () => {
  const styles: Record<string, React.CSSProperties> = {
    section: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "16px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: 600,
      color: "#ffffff",
      margin: "0 0 16px 0",
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid #1e293b",
    },
    rowLabel: {
      fontSize: "13px",
      color: "#c8d0e0",
    },
    rowDescription: {
      fontSize: "11px",
      color: "#64748b",
      margin: "2px 0 0 0",
    },
    toggle: {
      width: "44px",
      height: "24px",
      borderRadius: "12px",
      backgroundColor: "#334155",
      border: "none",
      cursor: "pointer",
      position: "relative" as const,
      transition: "background-color 0.2s",
    },
    toggleActive: {
      backgroundColor: THEME_COLOR,
    },
    toggleKnob: {
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      position: "absolute" as const,
      top: "3px",
      left: "3px",
      transition: "left 0.2s",
    },
    toggleKnobActive: {
      left: "23px",
    },
  };

  const [autoAcknowledge, setAutoAcknowledge] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  return (
    <div>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Alert Preferences</h3>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Sound Notifications</p>
            <p style={styles.rowDescription}>Play sound for CRITICAL alerts</p>
          </div>
          <button
            style={{ ...styles.toggle, ...(soundEnabled ? styles.toggleActive : {}) }}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            <span style={{ ...styles.toggleKnob, ...(soundEnabled ? styles.toggleKnobActive : {}) }} />
          </button>
        </div>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Auto-Acknowledge Low Alerts</p>
            <p style={styles.rowDescription}>Automatically acknowledge LOW severity after 1 hour</p>
          </div>
          <button
            style={{ ...styles.toggle, ...(autoAcknowledge ? styles.toggleActive : {}) }}
            onClick={() => setAutoAcknowledge(!autoAcknowledge)}
          >
            <span style={{ ...styles.toggleKnob, ...(autoAcknowledge ? styles.toggleKnobActive : {}) }} />
          </button>
        </div>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Alert Retention</p>
            <p style={styles.rowDescription}>Days to keep resolved alerts</p>
          </div>
          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            style={{
              padding: "6px 12px",
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "4px",
              color: "#e2e8f0",
              fontSize: "13px",
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Webhook Defaults</h3>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Retry Policy</p>
            <p style={styles.rowDescription}>3 attempts with exponential backoff (1s, 2s, 4s)</p>
          </div>
          <span style={{ fontSize: "13px", color: THEME_COLOR, fontWeight: 500 }}>Active</span>
        </div>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Circuit Breaker</p>
            <p style={styles.rowDescription}>5 consecutive failures triggers degraded mode</p>
          </div>
          <span style={{ fontSize: "13px", color: THEME_COLOR, fontWeight: 500 }}>Active</span>
        </div>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Signature Verification</p>
            <p style={styles.rowDescription}>HMAC-SHA256 with per-webhook secrets</p>
          </div>
          <span style={{ fontSize: "13px", color: THEME_COLOR, fontWeight: 500 }}>Available</span>
        </div>

        <div style={styles.row}>
          <div>
            <p style={styles.rowLabel}>Default Timeout</p>
            <p style={styles.rowDescription}>30 seconds per delivery attempt</p>
          </div>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>30s</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>About Zone 8</h3>
        <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
          Zone 8: Webhook Alerts — part of the Sports Terminal OS command center.
          Provides reliable webhook dispatch with circuit breaker protection,
          exponential backoff retry, HMAC-SHA256 signature verification, and
          real-time alert management with severity-based escalation.
        </p>
        <p style={{ fontSize: "11px", color: "#475569", marginTop: "12px" }}>
          Theme: Tech Innovation | Accent: #0066ff | Version: 5.2.0
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main CommandCenterPage
// ---------------------------------------------------------------------------

const CommandCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [webhookSummary, setWebhookSummary] = useState<WebhookSummary | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const fetchSummaries = useCallback(async () => {
    try {
      const [alertRes, whRes] = await Promise.all([
        fetch("/api/alerts/stats/summary"),
        fetch("/api/webhooks?limit=100"),
      ]);

      if (alertRes.ok) setAlertSummary(await alertRes.json());
      if (whRes.ok) {
        const whData = await whRes.json();
        const items = whData.items ?? [];
        setWebhookSummary({
          total: items.length,
          enabled: items.filter((w: any) => w.enabled).length,
          disabled: items.filter((w: any) => !w.enabled).length,
          degraded: items.filter((w: any) => w.circuitState === "half_open").length,
        });
      }

      // Fetch system status from health endpoint
      const healthRes = await fetch("/api/health/detailed");
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemStatus({
          uptime: healthData.uptime ?? 0,
          activeConnections: healthData.connections?.websocket ?? 0,
          requests: { total: healthData.requests?.total ?? 0, errors: healthData.requests?.errors ?? 0 },
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Silently fail — summaries are non-critical
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
    const interval = setInterval(fetchSummaries, 30000);
    return () => clearInterval(interval);
  }, [fetchSummaries]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const styles: Record<string, React.CSSProperties> = {
    page: {
      backgroundColor: "#0a0e1a",
      color: "#c8d0e0",
      minHeight: "100vh",
      fontFamily: "'Inter', 'SF Mono', monospace",
    },
    topBar: {
      backgroundColor: "#0f172a",
      borderBottom: "1px solid #1e293b",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "56px",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    logoIcon: {
      width: "28px",
      height: "28px",
      backgroundColor: THEME_COLOR,
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: 700,
    },
    logoText: {
      fontSize: "15px",
      fontWeight: 600,
      color: "#ffffff",
      margin: 0,
    },
    logoSub: {
      fontSize: "10px",
      color: "#64748b",
      letterSpacing: "1px",
      textTransform: "uppercase" as const,
    },
    tabNav: {
      display: "flex",
      gap: "2px",
      backgroundColor: "#0f172a",
      padding: "0 24px",
      borderBottom: "1px solid #1e293b",
    },
    tab: {
      padding: "14px 20px",
      fontSize: "13px",
      fontWeight: 500,
      color: "#64748b",
      backgroundColor: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.15s",
    },
    tabActive: {
      color: THEME_COLOR,
      borderBottomColor: THEME_COLOR,
      backgroundColor: "rgba(0, 102, 255, 0.06)",
    },
    content: {
      padding: "24px",
    },
  };

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>8</div>
          <div>
            <p style={styles.logoText}>Command Center</p>
            <p style={styles.logoSub}>Zone 8 — Webhook Alerts</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Critical alert indicator in header */}
          {alertSummary && alertSummary.criticalUnacknowledged > 0 && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }} />
              {alertSummary.criticalUnacknowledged} CRITICAL
            </div>
          )}
          <span style={{ fontSize: "11px", color: "#475569" }}>v5.2.0</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.id === "alerts" && alertSummary && alertSummary.open > 0 && (
              <span
                style={{
                  backgroundColor: alertSummary.criticalUnacknowledged > 0 ? "#ef4444" : "#64748b",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "8px",
                  marginLeft: "4px",
                }}
              >
                {alertSummary.open}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {activeTab === "overview" && (
          <OverviewTab
            alertSummary={alertSummary}
            webhookSummary={webhookSummary}
            systemStatus={systemStatus}
          />
        )}
        {activeTab === "alerts" && <AlertPanel />}
        {activeTab === "webhooks" && <WebhookSettings />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
};

export default CommandCenterPage;
