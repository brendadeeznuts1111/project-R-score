/**
 * OperationsPage — Operational Features Hub
 *
 * Tabbed interface providing:
 *   - Overview: System status cards, quick stats, recent activity
 *   - Exports: CSV/JSON/XLSX data export panel
 *   - Sandbox: A/B testing, scenario simulation, customer modeling
 *   - IP Surveillance: IP tracking, denylist, flags, reputation
 *   - Settings: Configuration and preferences
 *
 * Theme: Midnight Galaxy (#2b1e3e)
 */

import React, { useState, useEffect, useCallback } from "react";
import ExportPanel from "@frontend/components/ExportPanel";
import SandboxPanel from "@frontend/components/SandboxPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "overview" | "exports" | "sandbox" | "ip" | "settings";

interface SystemStatus {
  uptime: number;
  activeConnections: number;
  memory: { used: number; total: number };
  requests: { total: number; errors: number };
  timestamp: string;
}

interface IPStats {
  totalTracked: number;
  denylisted: number;
  flagged: number;
  recentBlocks: number;
}

interface ExportStats {
  totalExports: number;
  lastExportAt?: number;
  byFormat: { csv: number; json: number; xlsx: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#2b1e3e";
const ACCENT = "#8b5cf6";
const ACCENT_HOVER = "#7c3aed";
const TEXT = "#e0d5f5";
const TEXT_MUTED = "#9b8db5";
const CARD_BG = "#23183a";
const BORDER = "#3d2b5c";
const SUCCESS = "#22c55e";
const DANGER = "#ef4444";
const WARNING = "#f59e0b";
const INFO = "#3b82f6";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◉" },
  { id: "exports", label: "Exports", icon: "⬇" },
  { id: "sandbox", label: "Sandbox", icon: "◈" },
  { id: "ip", label: "IP Surveillance", icon: "⚡" },
  { id: "settings", label: "Settings", icon: "◉" },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const OperationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [ipStats, setIpStats] = useState<IPStats | null>(null);
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      // Fetch IP stats
      const ipRes = await fetch("/api/ip/tracking?limit=1");
      if (ipRes.ok) {
        const data = await ipRes.json();
        setIpStats({
          totalTracked: data.total || 0,
          denylisted: 0,
          flagged: 0,
          recentBlocks: 0,
        });
      }

      // Fetch export stats
      const expRes = await fetch("/api/export/jobs");
      if (expRes.ok) {
        const data = await expRes.json();
        setExportStats({
          totalExports: data.total || 0,
          lastExportAt: data.jobs?.[0]?.createdAt,
          byFormat: { csv: 0, json: 0, xlsx: 0 },
        });
      }

      // Fetch system status from health endpoint
      const healthRes = await fetch("/api/health/system-status");
      if (healthRes.ok) {
        const data = await healthRes.json();
        setSystemStatus({
          uptime: data.uptime || 0,
          activeConnections: data.connections?.websocket || 0,
          memory: data.memory || { used: 0, total: 1 },
          requests: data.requests || { total: 0, errors: 0 },
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    } catch {
      // Silently fail — stats are non-critical
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0a1e",
        color: TEXT,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: THEME_COLOR,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: TEXT }}>
          <span style={{ color: ACCENT, marginRight: "10px" }}>◈</span>
          Operations Center
        </h1>
        <p style={{ margin: "4px 0 0", color: TEXT_MUTED, fontSize: "12px" }}>
          Midnight Galaxy — Export, Sandbox &amp; IP Surveillance
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: THEME_COLOR,
          padding: "0 24px",
          gap: "4px",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 18px",
              border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : "2px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === tab.id ? ACCENT : TEXT_MUTED,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px" }}>
        {activeTab === "overview" && (
          <OverviewTab
            systemStatus={systemStatus}
            ipStats={ipStats}
            exportStats={exportStats}
          />
        )}
        {activeTab === "exports" && <ExportPanel />}
        {activeTab === "sandbox" && <SandboxPanel />}
        {activeTab === "ip" && <IPSurveillanceTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

const OverviewTab: React.FC<{
  systemStatus: SystemStatus | null;
  ipStats: IPStats | null;
  exportStats: ExportStats | null;
}> = ({ systemStatus, ipStats, exportStats }) => {
  return (
    <div>
      <h2 style={{ color: TEXT, fontSize: "18px", marginBottom: "20px", fontWeight: 600 }}>
        System Overview
      </h2>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          title="EXPORTS TODAY"
          value={exportStats?.totalExports || 0}
          subtitle={exportStats?.lastExportAt ? `Last: ${new Date(exportStats.lastExportAt).toLocaleTimeString()}` : "No exports yet"}
          icon="⬇"
          color={ACCENT}
        />
        <StatCard
          title="TRACKED IPs"
          value={ipStats?.totalTracked || 0}
          subtitle={`${ipStats?.flagged || 0} flagged`}
          icon="⚡"
          color={WARNING}
        />
        <StatCard
          title="DENYLISTED"
          value={ipStats?.denylisted || 0}
          subtitle="Active blocks"
          icon="⊘"
          color={DANGER}
        />
        <StatCard
          title="WS CONNECTIONS"
          value={systemStatus?.activeConnections || 0}
          subtitle="Real-time subscribers"
          icon="◉"
          color={INFO}
        />
        <StatCard
          title="UPTIME"
          value={systemStatus ? formatUptime(systemStatus.uptime) : "—"}
          subtitle="System stable"
          icon="◈"
          color={SUCCESS}
        />
        <StatCard
          title="MEMORY"
          value={
            systemStatus
              ? `${((systemStatus.memory.used / systemStatus.memory.total) * 100).toFixed(1)}%`
              : "—"
          }
          subtitle={`${formatBytes(systemStatus?.memory.used || 0)} / ${formatBytes(systemStatus?.memory.total || 1)}`}
          icon="◉"
          color={ACCENT}
        />
      </div>

      {/* Quick Links */}
      <div
        style={{
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <h3 style={{ color: TEXT, fontSize: "14px", marginBottom: "12px", fontWeight: 600 }}>
          Quick Actions
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          <QuickActionCard
            title="Export Player Data"
            description="Download player reports in CSV, JSON, or XLSX"
            action="Go to Exports →"
          />
          <QuickActionCard
            title="Run A/B Test"
            description="Create and execute sandbox simulations"
            action="Go to Sandbox →"
          />
          <QuickActionCard
            title="Check IP Flags"
            description="Review flagged IPs and shared usage"
            action="Go to IP Surveillance →"
          />
          <QuickActionCard
            title="System Health"
            description="Monitor system status and metrics"
            action="View Status →"
          />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// IP Surveillance Tab
// ---------------------------------------------------------------------------

const IPSurveillanceTab: React.FC = () => {
  const [ips, setIps] = useState<any[]>([]);
  const [denylist, setDenylist] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"tracking" | "denylist" | "flags">("tracking");
  const [loading, setLoading] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [playerIdSearch, setPlayerIdSearch] = useState("");
  const [reputationResult, setReputationResult] = useState<any>(null);
  const [checkIp, setCheckIp] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trackRes, denyRes] = await Promise.all([
        fetch("/api/ip/tracking?limit=50"),
        fetch("/api/ip/denylist?limit=50"),
      ]);
      if (trackRes.ok) setIps((await trackRes.json()).ips || []);
      if (denyRes.ok) setDenylist((await denyRes.json()).entries || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddToDenylist = async () => {
    if (!newIp || !newReason) return;
    try {
      const res = await fetch("/api/ip/denylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: newIp, reason: newReason }),
      });
      if (res.ok) {
        setNewIp("");
        setNewReason("");
        loadData();
      }
    } catch {}
  };

  const handleRemoveDenylist = async (ip: string) => {
    try {
      const res = await fetch(`/api/ip/denylist/${ip}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch {}
  };

  const handleCheckReputation = async () => {
    if (!checkIp) return;
    try {
      const res = await fetch(`/api/ip/reputation/${checkIp}`);
      if (res.ok) setReputationResult((await res.json()).reputation);
    } catch {}
  };

  const handleGetFlags = async () => {
    if (!playerIdSearch) return;
    try {
      const res = await fetch(`/api/ip/flags/${playerIdSearch}`);
      if (res.ok) setFlags((await res.json()).flags || []);
      setActiveView("flags");
    } catch {}
  };

  return (
    <div style={{ padding: "4px" }}>
      <h2 style={{ color: TEXT, fontSize: "20px", marginBottom: "20px", fontWeight: 600 }}>
        ⚡ IP Surveillance
      </h2>

      {/* Controls */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button onClick={() => setActiveView("tracking")} style={viewButtonStyle(activeView === "tracking")}>Tracking</button>
        <button onClick={() => setActiveView("denylist")} style={viewButtonStyle(activeView === "denylist")}>Denylist ({denylist.length})</button>
        <button onClick={() => setActiveView("flags")} style={viewButtonStyle(activeView === "flags")}>Flags</button>
      </div>

      {/* Reputation Checker */}
      <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <h4 style={{ color: TEXT, fontSize: "13px", marginBottom: "10px" }}>IP Reputation Check</h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={checkIp}
            onChange={(e) => setCheckIp(e.target.value)}
            placeholder="Enter IP address..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleCheckReputation} style={{ ...buttonStyle, backgroundColor: ACCENT, color: "#fff" }}>Check</button>
        </div>
        {reputationResult && (
          <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#0f0a1e", borderRadius: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: TEXT, fontSize: "13px" }}>Score: <strong style={{ color: reputationResult.score > 50 ? DANGER : reputationResult.score > 25 ? WARNING : SUCCESS }}>{reputationResult.score}/100</strong></span>
              <span style={{ color: reputationResult.isBlocked ? DANGER : SUCCESS, fontSize: "12px" }}>{reputationResult.isBlocked ? "BLOCKED" : "Clear"}</span>
            </div>
            {reputationResult.flaggedReasons.length > 0 && (
              <div style={{ color: WARNING, fontSize: "11px", marginTop: "4px" }}>
                Flags: {reputationResult.flaggedReasons.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Denylist Management */}
      {activeView === "denylist" && (
        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
          <h4 style={{ color: TEXT, fontSize: "13px", marginBottom: "10px" }}>Add to Denylist</h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="IP Address" style={{ ...inputStyle, flex: 1 }} />
            <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Reason" style={{ ...inputStyle, flex: 2 }} />
            <button onClick={handleAddToDenylist} style={{ ...buttonStyle, backgroundColor: DANGER, color: "#fff" }}>Block</button>
          </div>
        </div>
      )}

      {/* Player Flag Search */}
      {activeView === "flags" && (
        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
          <h4 style={{ color: TEXT, fontSize: "13px", marginBottom: "10px" }}>Lookup Player Flags</h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={playerIdSearch} onChange={(e) => setPlayerIdSearch(e.target.value)} placeholder="Player ID" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={handleGetFlags} style={{ ...buttonStyle, backgroundColor: ACCENT, color: "#fff" }}>Search</button>
          </div>
        </div>
      )}

      {/* Data Tables */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: TEXT_MUTED }}>Loading...</div>
      ) : (
        <div>
          {activeView === "tracking" && (
            <DataTable
              headers={["IP Address", "Player", "Agent", "Sightings", "Risk Score", "VPN/Proxy/Tor"]}
              rows={ips.map((ip) => [
                ip.ipAddress,
                ip.playerId,
                ip.agentLogin,
                ip.sightingCount,
                <span style={{ color: ip.riskScore > 50 ? DANGER : ip.riskScore > 25 ? WARNING : SUCCESS }}>{ip.riskScore}</span>,
                `${ip.isVpn ? "VPN " : ""}${ip.isProxy ? "Proxy " : ""}${ip.isTor ? "Tor" : ""}`,
              ])}
            />
          )}
          {activeView === "denylist" && (
            <DataTable
              headers={["IP Address", "Reason", "Type", "Hits", "Actions"]}
              rows={denylist.map((d) => [
                d.ipAddress,
                d.reason,
                d.listType,
                d.hitCount,
                <button onClick={() => handleRemoveDenylist(d.ipAddress)} style={{ ...buttonStyle, backgroundColor: "transparent", border: `1px solid ${DANGER}`, color: DANGER, padding: "2px 8px", fontSize: "11px" }}>Unblock</button>,
              ])}
            />
          )}
          {activeView === "flags" && (
            <DataTable
              headers={["IP Address", "Player", "Flag Type", "Severity", "Description"]}
              rows={flags.map((f) => [
                f.ipAddress,
                f.playerId,
                f.flagType,
                <span style={{ color: f.severity === "critical" ? DANGER : f.severity === "high" ? WARNING : SUCCESS, fontSize: "11px" }}>{f.severity}</span>,
                f.description,
              ])}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

const SettingsTab: React.FC = () => {
  const [cronInterval, setCronInterval] = useState("*/15");
  const [autoBlock, setAutoBlock] = useState(true);
  const [exportLimit, setExportLimit] = useState("50000");

  return (
    <div style={{ padding: "4px" }}>
      <h2 style={{ color: TEXT, fontSize: "20px", marginBottom: "20px", fontWeight: 600 }}>
        ◉ Settings
      </h2>

      <div style={{ display: "grid", gap: "16px", maxWidth: "600px" }}>
        <SettingCard title="IP Surveillance">
          <SettingRow label="Auto-flag interval">
            <select value={cronInterval} onChange={(e) => setCronInterval(e.target.value)} style={inputStyle}>
              <option value="*/5">Every 5 minutes</option>
              <option value="*/15">Every 15 minutes</option>
              <option value="*/30">Every 30 minutes</option>
              <option value="0">Every hour</option>
            </select>
          </SettingRow>
          <SettingRow label="Auto-block high-risk IPs">
            <button
              onClick={() => setAutoBlock(!autoBlock)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: `1px solid ${autoBlock ? SUCCESS : BORDER}`,
                backgroundColor: autoBlock ? `${SUCCESS}20` : "transparent",
                color: autoBlock ? SUCCESS : TEXT_MUTED,
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {autoBlock ? "Enabled" : "Disabled"}
            </button>
          </SettingRow>
        </SettingCard>

        <SettingCard title="Export Settings">
          <SettingRow label="Max export rows">
            <input value={exportLimit} onChange={(e) => setExportLimit(e.target.value)} style={{ ...inputStyle, width: "120px" }} type="number" />
          </SettingRow>
          <SettingRow label="Default format">
            <select style={inputStyle}>
              <option>CSV</option>
              <option>JSON</option>
              <option>XLSX</option>
            </select>
          </SettingRow>
        </SettingCard>

        <SettingCard title="Sandbox Settings">
          <SettingRow label="Max simulated customers">
            <input defaultValue="10000" style={{ ...inputStyle, width: "120px" }} type="number" />
          </SettingRow>
          <SettingRow label="Auto-generate summaries">
            <button style={{ ...buttonStyle, backgroundColor: `${SUCCESS}20`, color: SUCCESS, border: `1px solid ${SUCCESS}` }}>Enabled</button>
          </SettingRow>
        </SettingCard>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared Sub-components
// ---------------------------------------------------------------------------

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => (
  <div
    style={{
      backgroundColor: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: "10px",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: "12px",
        right: "16px",
        fontSize: "24px",
        opacity: 0.3,
        color,
      }}
    >
      {icon}
    </div>
    <div
      style={{
        color: TEXT_MUTED,
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "8px",
      }}
    >
      {title}
    </div>
    <div
      style={{
        color,
        fontSize: "28px",
        fontWeight: 700,
        marginBottom: "4px",
      }}
    >
      {value}
    </div>
    <div style={{ color: TEXT_MUTED, fontSize: "11px" }}>{subtitle}</div>
  </div>
);

const QuickActionCard: React.FC<{
  title: string;
  description: string;
  action: string;
}> = ({ title, description, action }) => (
  <div
    style={{
      padding: "16px",
      backgroundColor: "#0f0a1e",
      border: `1px solid ${BORDER}`,
      borderRadius: "8px",
      cursor: "pointer",
      transition: "border-color 0.15s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
  >
    <div style={{ color: TEXT, fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
      {title}
    </div>
    <div style={{ color: TEXT_MUTED, fontSize: "11px", marginBottom: "10px" }}>
      {description}
    </div>
    <div style={{ color: ACCENT, fontSize: "11px", fontWeight: 500 }}>{action}</div>
  </div>
);

const DataTable: React.FC<{ headers: string[]; rows: React.ReactNode[][] }> = ({
  headers,
  rows,
}) => (
  <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#0f0a1e" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: TEXT_MUTED, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${BORDER}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: "24px", textAlign: "center", color: TEXT_MUTED, fontSize: "13px" }}>
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "10px 14px", color: TEXT, fontSize: "12px" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const SettingCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px" }}>
    <h4 style={{ color: TEXT, fontSize: "14px", marginBottom: "12px", fontWeight: 600 }}>{title}</h4>
    <div style={{ display: "grid", gap: "12px" }}>{children}</div>
  </div>
);

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ color: TEXT_MUTED, fontSize: "12px" }}>{label}</span>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const viewButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: "6px",
  border: active ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
  backgroundColor: active ? `${ACCENT}20` : CARD_BG,
  color: active ? ACCENT : TEXT_MUTED,
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: active ? 600 : 400,
});

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "6px",
  border: `1px solid ${BORDER}`,
  backgroundColor: "#0f0a1e",
  color: TEXT,
  fontSize: "13px",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};

export default OperationsPage;
