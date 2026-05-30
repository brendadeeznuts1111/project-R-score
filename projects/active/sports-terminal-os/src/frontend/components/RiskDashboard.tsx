/**
 * RiskDashboard Component
 *
 * Command center overview: KPI cards, exposure charts by sport/book,
 * risk score histogram, recent violations table.
 *
 * Theme: Arctic Frost (#4a6fa5) accent on dark background.
 */

import React, { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExposureSummary {
  key: string;
  totalExposure: number;
  wagerCount: number;
  playerCount: number;
  avgRiskScore: number;
  topTier: string;
}

interface ScoreBin {
  range: string;
  min: number;
  max: number;
  count: number;
}

interface Violation {
  id: number;
  violationId: string;
  wagerId: string;
  playerId: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  status: string;
  createdAt: number;
}

interface DashboardData {
  openPositions: number;
  totalExposure: number;
  activeViolations: number;
  avgRiskScore: number;
  exposureBySport: ExposureSummary[];
  exposureByBook: ExposureSummary[];
  scoreDistribution: ScoreBin[];
  recentViolations: Violation[];
  lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME = {
  accent: "#4a6fa5",
  accentLight: "#6b8cbc",
  accentDark: "#3a5a8a",
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  green: "#3fb950",
  yellow: "#d29922",
  red: "#f85149",
  black: "#8b949e",
  critical: "#da3633",
};

const TIER_COLORS: Record<string, string> = {
  GREEN: THEME.green,
  YELLOW: THEME.yellow,
  RED: THEME.red,
  BLACK: THEME.black,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RiskDashboard(): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/risk/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);

    // SSE connection
    const es = new EventSource("/api/stream/alerts");
    esRef.current = es;
    es.addEventListener("connected", () => setSseConnected(true));
    es.addEventListener("risk_update", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "positions_generated" || payload.type === "enforcement") {
          fetchDashboard();
        }
      } catch {
        // ignore parse errors
      }
    });
    es.onerror = () => setSseConnected(false);

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Failed to load dashboard</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Risk Command Center</h2>
        <div style={styles.headerRight}>
          <span style={{ ...styles.badge, background: sseConnected ? "rgba(63,185,80,0.2)" : "rgba(218,54,51,0.2)", color: sseConnected ? THEME.green : THEME.red }}>
            {sseConnected ? "● LIVE" : "● OFFLINE"}
          </span>
          <span style={styles.timestamp}>Updated: {new Date(data.lastUpdated * 1000).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KpiCard title="Open Positions" value={data.openPositions} color={THEME.accent} icon="📊" />
        <KpiCard title="Total Exposure" value={`$${(data.totalExposure / 100).toLocaleString()}`} color={THEME.yellow} icon="💰" />
        <KpiCard title="Active Violations" value={data.activeViolations} color={data.activeViolations > 0 ? THEME.red : THEME.green} icon="⚠️" />
        <KpiCard title="Avg Risk Score" value={data.avgRiskScore} color={scoreColor(data.avgRiskScore)} icon="📈" />
      </div>

      {/* Charts Row */}
      <div style={styles.chartGrid}>
        {/* Exposure by Sport */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Exposure by Sport</h3>
          <HorizontalBarChart data={data.exposureBySport.map((d) => ({ label: d.key, value: d.totalExposure, tier: d.topTier }))} />
        </div>

        {/* Exposure by Book */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Exposure by Book</h3>
          <HorizontalBarChart data={data.exposureByBook.map((d) => ({ label: d.key, value: d.totalExposure, tier: d.topTier }))} />
        </div>

        {/* Risk Score Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Risk Score Distribution</h3>
          <Histogram data={data.scoreDistribution} />
        </div>
      </div>

      {/* Recent Violations */}
      <div style={styles.violationsCard}>
        <h3 style={styles.chartTitle}>Recent Violations</h3>
        <ViolationsTable violations={data.recentViolations} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function KpiCard({ title, value, color, icon }: { title: string; value: string | number; color: string; icon: string }): React.JSX.Element {
  return (
    <div style={{ ...styles.kpiCard, borderLeft: `4px solid ${color}` }}>
      <div style={styles.kpiIcon}>{icon}</div>
      <div style={styles.kpiValue} className="risk-score-gauge">{value}</div>
      <div style={styles.kpiTitle}>{title}</div>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: Array<{ label: string; value: number; tier: string }> }): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={styles.barChart}>
      {data.map((d) => (
        <div key={d.label} style={styles.barRow}>
          <span style={styles.barLabel}>{d.label}</span>
          <div style={styles.barTrack}>
            <div
              className="exposure-bar"
              style={{
                ...styles.barFill,
                width: `${Math.min(100, (d.value / max) * 100)}%`,
                background: TIER_COLORS[d.tier] || THEME.accent,
              }}
            />
          </div>
          <span style={styles.barValue}>${(d.value / 100).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function Histogram({ data }: { data: ScoreBin[] }): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={styles.histogram}>
      <div style={styles.histogramBars}>
        {data.map((bin) => (
          <div key={bin.range} style={styles.histColumn}>
            <div style={styles.histBarContainer}>
              <div
                style={{
                  ...styles.histBar,
                  height: `${Math.min(100, (bin.count / max) * 100)}%`,
                  background: scoreColor((bin.min + bin.max) / 2),
                  opacity: 0.85,
                }}
              />
            </div>
            <span style={styles.histLabel}>{bin.range}</span>
            <span style={styles.histCount}>{bin.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViolationsTable({ violations }: { violations: Violation[] }): React.JSX.Element {
  if (violations.length === 0) {
    return <div style={styles.noData}>No recent violations</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Player</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Severity</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {violations.map((v) => (
            <tr
              key={v.violationId}
              className={v.severity === "critical" ? "violation-critical" : ""}
              style={{
                ...styles.tr,
                borderLeft: `3px solid ${severityColor(v.severity)}`,
              }}
            >
              <td style={styles.td}>{v.violationId.slice(0, 12)}</td>
              <td style={styles.td}>{v.playerId}</td>
              <td style={styles.td}>{v.violationId.split("_")[0]}</td>
              <td style={styles.td}>
                <span style={{ ...styles.severityBadge, background: `${severityColor(v.severity)}33`, color: severityColor(v.severity) }}>
                  {v.severity}
                </span>
              </td>
              <td style={{ ...styles.td, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.description}
              </td>
              <td style={styles.td}>
                <span style={{ ...styles.statusBadge, color: v.status === "open" ? THEME.red : THEME.green }}>
                  {v.status}
                </span>
              </td>
              <td style={styles.td}>{new Date(v.createdAt * 1000).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 81) return THEME.black;
  if (score >= 61) return THEME.red;
  if (score >= 41) return THEME.yellow;
  return THEME.green;
}

function severityColor(sev: string): string {
  switch (sev) {
    case "critical": return THEME.critical;
    case "high": return THEME.red;
    case "medium": return THEME.yellow;
    default: return THEME.green;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    background: THEME.bg,
    color: THEME.text,
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `1px solid ${THEME.border}`,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: THEME.accent,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    background: THEME.surface,
    borderRadius: 8,
    padding: 16,
    border: `1px solid ${THEME.border}`,
  },
  kpiIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 12,
    color: THEME.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    background: THEME.surface,
    borderRadius: 8,
    padding: 16,
    border: `1px solid ${THEME.border}`,
  },
  chartTitle: {
    margin: "0 0 16px 0",
    fontSize: 14,
    fontWeight: 600,
    color: THEME.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  barChart: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
  },
  barLabel: {
    width: 50,
    textAlign: "right",
    color: THEME.textMuted,
    fontWeight: 500,
    fontSize: 11,
  },
  barTrack: {
    flex: 1,
    height: 18,
    background: "#21262d",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.5s ease",
    minWidth: 2,
  },
  barValue: {
    width: 70,
    textAlign: "right",
    color: THEME.text,
    fontVariantNumeric: "tabular-nums",
    fontSize: 11,
  },
  histogram: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  histogramBars: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    height: 140,
    paddingBottom: 8,
  },
  histColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  histBarContainer: {
    width: 40,
    height: 100,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  histBar: {
    width: "100%",
    borderRadius: "3px 3px 0 0",
    transition: "height 0.5s ease",
  },
  histLabel: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  histCount: {
    fontSize: 11,
    fontWeight: 600,
    color: THEME.text,
  },
  violationsCard: {
    background: THEME.surface,
    borderRadius: 8,
    padding: 16,
    border: `1px solid ${THEME.border}`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: `1px solid ${THEME.border}`,
    color: THEME.textMuted,
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: {
    borderBottom: `1px solid ${THEME.border}`,
    transition: "background 0.15s",
  },
  td: {
    padding: "8px 10px",
    color: THEME.text,
    fontVariantNumeric: "tabular-nums",
  },
  severityBadge: {
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: "capitalize",
  },
  noData: {
    textAlign: "center",
    color: THEME.textMuted,
    padding: "24px 0",
    fontSize: 13,
  },
  loading: {
    textAlign: "center",
    color: THEME.textMuted,
    padding: 40,
  },
  error: {
    textAlign: "center",
    color: THEME.red,
    padding: 40,
  },
};
