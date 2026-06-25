/**
 * RiskPage — Risk Command Center
 *
 * Tabbed interface: Overview, Positions, Enforcement, Violations, Analytics.
 * Integrates RiskDashboard, RiskPositions, EnforcementPanel components.
 * Manages SSE streams for real-time updates.
 *
 * Theme: Arctic Frost (#4a6fa5)
 */

import React, { useEffect, useState } from "react";
import RiskDashboard from "@components/RiskDashboard";
import RiskPositions from "@components/RiskPositions";
import EnforcementPanel from "@components/EnforcementPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "overview" | "positions" | "enforcement" | "violations" | "analytics";

interface Violation {
  id: number;
  violationId: string;
  playerId: string;
  severity: string;
  description: string;
  status: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME = {
  accent: "#4a6fa5",
  accentLight: "#6b8cbc",
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "positions", label: "Positions", icon: "📍" },
  { id: "enforcement", label: "Enforcement", icon: "🛡️" },
  { id: "violations", label: "Violations", icon: "⚠️" },
  { id: "analytics", label: "Analytics", icon: "📈" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RiskPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationLoading, setViolationLoading] = useState(false);
  const [sseStatus, setSseStatus] = useState<"connected" | "disconnected">("disconnected");

  // SSE streams
  useEffect(() => {
    const es = new EventSource("/api/stream/alerts");
    es.addEventListener("connected", () => setSseStatus("connected"));
    es.addEventListener("risk_update", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "enforcement" || payload.type === "positions_generated") {
          // Trigger refresh via key change
          if (activeTab === "violations") {
            fetchViolations();
          }
        }
      } catch {
        // ignore
      }
    });
    es.onerror = () => setSseStatus("disconnected");

    return () => es.close();
  }, [activeTab]);

  const fetchViolations = async () => {
    setViolationLoading(true);
    try {
      const res = await fetch("/api/risk/violations?limit=50");
      if (res.ok) {
        const json = await res.json();
        setViolations(json.items || []);
      }
    } catch {
      // silent
    } finally {
      setViolationLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "violations") {
      fetchViolations();
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <RiskDashboard />;
      case "positions":
        return <RiskPositions />;
      case "enforcement":
        return <EnforcementPanel />;
      case "violations":
        return <ViolationsTab violations={violations} loading={violationLoading} />;
      case "analytics":
        return <AnalyticsTab />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.page}>
      {/* Top Navigation Bar */}
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.logo}>Risk Command Center</span>
          <span style={{
            ...styles.sseBadge,
            background: sseStatus === "connected" ? "rgba(63,185,80,0.15)" : "rgba(248,81,73,0.15)",
            color: sseStatus === "connected" ? "#3fb950" : "#f85149",
          }}>
            {sseStatus === "connected" ? "● SSE Live" : "● SSE Offline"}
          </span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.version}>v5.2.0</span>
        </div>
      </nav>

      {/* Tab Bar */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              background: activeTab === tab.id ? THEME.accent : "transparent",
              color: activeTab === tab.id ? "#fff" : THEME.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${THEME.accent}` : "2px solid transparent",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ViolationsTab({ violations, loading }: { violations: Violation[]; loading: boolean }): React.JSX.Element {
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = violations.filter((v) => {
    if (severityFilter && v.severity !== severityFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    return true;
  });

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "#da3633";
      case "high": return "#f85149";
      case "medium": return "#d29922";
      default: return "#3fb950";
    }
  };

  return (
    <div style={styles.tabContainer}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>Wager Violations</h2>
        <div style={styles.filterGroup}>
          <select
            style={styles.filterSelect}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="confirmed">Confirmed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading violations...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>No violations found</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Player</th>
                <th style={styles.th}>Severity</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.violationId}
                  style={{
                    ...styles.tr,
                    borderLeft: `3px solid ${severityColor(v.severity)}`,
                  }}
                >
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11 }}>
                    {v.violationId.slice(0, 16)}...
                  </td>
                  <td style={styles.td}>{v.playerId}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.severityBadge,
                      background: `${severityColor(v.severity)}22`,
                      color: severityColor(v.severity),
                    }}>
                      {v.severity}
                    </span>
                  </td>
                  <td style={{ ...styles.td, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.description}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      color: v.status === "open" ? "#f85149" : v.status === "confirmed" ? "#d29922" : "#3fb950",
                    }}>
                      {v.status}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(v.createdAt * 1000).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab(): React.JSX.Element {
  const [scoreData, setScoreData] = useState<{ playerId: string; score: number; tier: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        // Fetch from raw_players to get initial list
        const res = await fetch("/api/proxy/players?limit=20");
        if (res.ok) {
          const json = await res.json();
          const players = (json.players || []).slice(0, 10);
          const scores = await Promise.all(
            players.map(async (p: { id: string; riskTier?: string }) => {
              try {
                const r = await fetch(`/api/risk/score/${p.id}`);
                if (r.ok) {
                  const s = await r.json();
                  return { playerId: p.id, score: s.score || 0, tier: s.tier || "GREEN" };
                }
              } catch { /* ignore */ }
              return { playerId: p.id, score: 0, tier: "GREEN" };
            })
          );
          setScoreData(scores);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const tierColor = (tier: string) => {
    switch (tier) {
      case "BLACK": return "#8b949e";
      case "RED": return "#f85149";
      case "YELLOW": return "#d29922";
      default: return "#3fb950";
    }
  };

  return (
    <div style={styles.tabContainer}>
      <div style={styles.tabHeader}>
        <h2 style={styles.tabTitle}>Risk Analytics</h2>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading analytics...</div>
      ) : (
        <div style={styles.analyticsGrid}>
          <div style={styles.analyticsCard}>
            <h3 style={styles.cardTitle}>Player Risk Scores</h3>
            {scoreData.length === 0 ? (
              <div style={styles.empty}>No score data</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scoreData.map((s) => (
                  <div key={s.playerId} style={styles.scoreRow}>
                    <span style={styles.scorePlayer}>{s.playerId}</span>
                    <div style={styles.scoreBarTrack}>
                      <div style={{
                        ...styles.scoreBar,
                        width: `${Math.min(100, s.score)}%`,
                        background: tierColor(s.tier),
                      }} />
                    </div>
                    <span style={{ ...styles.scoreValue, color: tierColor(s.tier) }}>{s.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.analyticsCard}>
            <h3 style={styles.cardTitle}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ActionButton label="Generate Positions" endpoint="/api/risk/positions/generate" method="POST" />
              <ActionButton label="Expire Stale Positions" endpoint="/api/risk/positions/expire" method="POST" />
              <ActionButton label="Refresh Dashboard" endpoint="/api/risk/dashboard" method="GET" />
              <ActionButton label="Export Configs" endpoint="/api/risk/config" method="GET" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, endpoint, method }: { label: string; endpoint: string; method: string }): React.JSX.Element {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleClick = async () => {
    setStatus("loading");
    try {
      const res = await fetch(endpoint, { method });
      setStatus(res.ok ? "done" : "error");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const btnColor = status === "done" ? "#3fb950" : status === "error" ? "#f85149" : "#4a6fa5";

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      style={{
        padding: "10px 16px",
        background: btnColor,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: status === "loading" ? "wait" : "pointer",
        fontSize: 13,
        fontWeight: 600,
        opacity: status === "loading" ? 0.7 : 1,
        transition: "background 0.2s",
      }}
    >
      {status === "loading" ? "..." : status === "done" ? "✓ " : status === "error" ? "✗ " : ""}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#c9d1d9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    background: "#161b22",
    borderBottom: "1px solid #30363d",
  },
  navLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: "#4a6fa5",
    letterSpacing: 0.3,
  },
  sseBadge: {
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  version: {
    fontSize: 11,
    color: "#8b949e",
  },
  tabBar: {
    display: "flex",
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "0 20px",
    gap: 2,
  },
  tab: {
    padding: "12px 20px",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s",
  },
  tabIcon: {
    fontSize: 14,
  },
  content: {
    padding: "0 0 20px 0",
  },
  tabContainer: {
    padding: "20px",
  },
  tabHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid #30363d",
  },
  tabTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#4a6fa5",
  },
  filterGroup: {
    display: "flex",
    gap: 8,
  },
  filterSelect: {
    padding: "6px 10px",
    background: "#161b22",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    borderRadius: 6,
    fontSize: 12,
  },
  loading: {
    textAlign: "center",
    color: "#8b949e",
    padding: 40,
  },
  empty: {
    textAlign: "center",
    color: "#8b949e",
    padding: 40,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "2px solid #30363d",
    color: "#8b949e",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: {
    borderBottom: "1px solid #21262d",
  },
  td: {
    padding: "8px",
    color: "#c9d1d9",
    fontVariantNumeric: "tabular-nums",
  },
  severityBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: "capitalize",
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: 16,
  },
  analyticsCard: {
    background: "#161b22",
    borderRadius: 8,
    padding: 20,
    border: "1px solid #30363d",
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
  },
  scorePlayer: {
    width: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: "monospace",
    fontSize: 11,
  },
  scoreBarTrack: {
    flex: 1,
    height: 16,
    background: "#21262d",
    borderRadius: 8,
    overflow: "hidden",
  },
  scoreBar: {
    height: "100%",
    borderRadius: 8,
    transition: "width 0.5s ease",
  },
  scoreValue: {
    width: 36,
    textAlign: "right",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
};
