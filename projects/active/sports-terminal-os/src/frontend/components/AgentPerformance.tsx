/**
 * AgentPerformance — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Performance dashboard for agents:
 *   - KPI cards: total players, total wagers, net P&L, commission
 *   - P&L over time visualization (line chart via CSS)
 *   - Wager volume by player (bar chart via CSS)
 *   - Player table: top performers, risk flags
 *   - Period selector: today, week, month, quarter, year
 *   - CSS classes: .performance-card
 */

import React, { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerPerformance {
  playerId: string;
  displayName: string;
  riskTier: string;
  wagerCount: number;
  totalWagered: number;
  pnl: number;
  winRate: number;
  flags: string[];
}

export interface PnLDataPoint {
  label: string;
  pnl: number;
  wagers: number;
}

export interface AgentPerformanceData {
  agentLogin: string;
  displayName: string;
  period: string;
  totalPlayers: number;
  activePlayers: number;
  totalWagers: number;
  totalWagered: number;
  totalPayouts: number;
  grossProfit: number;
  netProfit: number;
  holdPercentage: number;
  newPlayers: number;
  commissionDue: number;
  pnlHistory: PnLDataPoint[];
  playerVolumes: PlayerPerformance[];
}

interface AgentPerformanceProps {
  data: AgentPerformanceData | null;
  themeColor?: string;
  onPeriodChange?: (period: string) => void;
  loading?: boolean;
}

type PeriodOption = { value: string; label: string };

const PERIODS: PeriodOption[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  if (Math.abs(cents) < 100) return `${cents}c`;
  const val = cents / 100;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Mini Line Chart (CSS-based)
// ---------------------------------------------------------------------------

const MiniLineChart: React.FC<{ data: PnLDataPoint[]; color: string; height?: number }> = ({
  data,
  color,
  height = 120,
}) => {
  if (data.length === 0) return <div style={{ color: "#aaa", fontSize: 12, padding: 16 }}>No data</div>;

  const values = data.map((d) => d.pnl);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 100;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const zeroY = height - ((0 - min) / range) * height;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      {/* Zero line */}
      <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
      {/* Area */}
      <polygon
        points={`0,${zeroY} ${points} 100,${zeroY}`}
        fill={color}
        opacity={0.1}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {values.map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * 100;
        const y = height - ((v - min) / range) * height;
        return <circle key={i} cx={x} cy={y} r="1.5" fill={color} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Mini Bar Chart (CSS-based)
// ---------------------------------------------------------------------------

const MiniBarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; themeColor: string; maxItems?: number }> = ({
  data,
  themeColor,
  maxItems = 10,
}) => {
  const items = data.slice(0, maxItems);
  if (items.length === 0) return <div style={{ color: "#aaa", fontSize: 12, padding: 16 }}>No data</div>;

  const maxVal = Math.max(...items.map((d) => Math.abs(d.value)), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
      {items.map((item, i) => {
        const barWidth = (Math.abs(item.value) / maxVal) * 100;
        const isNegative = item.value < 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 60,
                fontSize: 10,
                color: "#666",
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={item.label}
            >
              {item.label.length > 8 ? item.label.slice(0, 7) + "…" : item.label}
            </div>
            <div style={{ flex: 1, position: "relative", height: 18, background: "#f5f5f5", borderRadius: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${barWidth}%`,
                  background: item.color || (isNegative ? "#e76f51" : themeColor),
                  borderRadius: 4,
                  transition: "width 0.5s ease",
                  opacity: 0.85,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: barWidth > 30 ? "#fff" : "#333",
                  mixBlendMode: barWidth > 30 ? "difference" : "normal",
                }}
              >
                {formatCurrency(item.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

const KpiCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  color: string;
  icon: string;
}> = ({ title, value, subtitle, color, icon }) => (
  <div
    className="performance-card"
    style={{
      background: "#fff",
      borderRadius: 12,
      border: `1px solid ${color}25`,
      padding: "16px 20px",
      boxShadow: `0 2px 8px ${color}10`,
      transition: "transform 0.15s, box-shadow 0.15s",
      cursor: "default",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = `0 4px 16px ${color}20`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = `0 2px 8px ${color}10`;
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {title}
      </span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: "#264653", lineHeight: 1.2 }}>{value}</div>
    {subtitle && (
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{subtitle}</div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Risk Tier Badge
// ---------------------------------------------------------------------------

const RiskBadge: React.FC<{ tier: string }> = ({ tier }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    GREEN:  { bg: "#d4edda", text: "#155724" },
    YELLOW: { bg: "#fff3cd", text: "#856404" },
    RED:    { bg: "#f8d7da", text: "#721c24" },
    BLACK:  { bg: "#f5c6cb", text: "#721c24" },
  };
  const c = colors[tier] || colors.GREEN;
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 700,
        background: c.bg,
        color: c.text,
        textTransform: "uppercase",
      }}
    >
      {tier}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const AgentPerformance: React.FC<AgentPerformanceProps> = ({
  data,
  themeColor = "#e76f51",
  onPeriodChange,
  loading = false,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(data?.period || "month");

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  // Top players sorted by P&L
  const topPlayers = useMemo(() => {
    if (!data) return [];
    return [...data.playerVolumes]
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 15);
  }, [data]);

  // Flagged players
  const flaggedPlayers = useMemo(() => {
    if (!data) return [];
    return data.playerVolumes.filter((p) => p.flags.length > 0 || ["RED", "BLACK"].includes(p.riskTier));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#aaa" }}>
        <div style={{ fontSize: 16 }}>Loading performance data…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#aaa" }}>
        <div style={{ fontSize: 16, marginBottom: 8 }}>No performance data</div>
        <div style={{ fontSize: 12 }}>Select an agent and period to view performance</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header with period selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "#264653", fontWeight: 700 }}>
            {data.displayName}
          </h2>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>@{data.agentLogin}</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f5f5f5", borderRadius: 8, padding: 3 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: selectedPeriod === p.value ? themeColor : "transparent",
                color: selectedPeriod === p.value ? "#fff" : "#666",
                fontSize: 12,
                fontWeight: selectedPeriod === p.value ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KpiCard
          title="Total Players"
          value={formatNumber(data.totalPlayers)}
          subtitle={`${formatNumber(data.activePlayers)} active`}
          color={themeColor}
          icon="👥"
        />
        <KpiCard
          title="Total Wagers"
          value={formatNumber(data.totalWagers)}
          subtitle={`${formatCurrency(data.totalWagered)} wagered`}
          color={themeColor}
          icon="🎲"
        />
        <KpiCard
          title="Net P&L"
          value={formatCurrency(data.netProfit)}
          subtitle={`Hold: ${formatPct(data.holdPercentage)}`}
          color={data.netProfit >= 0 ? "#2a9d8f" : "#e76f51"}
          icon={data.netProfit >= 0 ? "📈" : "📉"}
        />
        <KpiCard
          title="Commission"
          value={formatCurrency(data.commissionDue)}
          subtitle={`${data.newPlayers} new players`}
          color="#f4a261"
          icon="💰"
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* P&L Over Time */}
        <div
          className="performance-card"
          style={{
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${themeColor}15`,
            padding: 16,
            boxShadow: `0 2px 8px ${themeColor}08`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#264653", marginBottom: 12 }}>
            P&L Over Time
          </div>
          <MiniLineChart data={data.pnlHistory} color={themeColor} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: 10,
              color: "#aaa",
            }}
          >
            {data.pnlHistory.length > 0 && (
              <>
                <span>{data.pnlHistory[0].label}</span>
                <span>{data.pnlHistory[data.pnlHistory.length - 1].label}</span>
              </>
            )}
          </div>
        </div>

        {/* Wager Volume by Player */}
        <div
          className="performance-card"
          style={{
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${themeColor}15`,
            padding: 16,
            boxShadow: `0 2px 8px ${themeColor}08`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#264653", marginBottom: 12 }}>
            Top Players by P&L
          </div>
          <MiniBarChart
            data={topPlayers.map((p) => ({
              label: p.displayName || p.playerId,
              value: p.pnl,
              color: p.pnl >= 0 ? themeColor : "#e76f51",
            }))}
            themeColor={themeColor}
          />
        </div>
      </div>

      {/* Player Table */}
      <div
        className="performance-card"
        style={{
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${themeColor}15`,
          padding: 16,
          boxShadow: `0 2px 8px ${themeColor}08`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#264653" }}>
            Player Performance
          </div>
          {flaggedPlayers.length > 0 && (
            <div
              style={{
                padding: "3px 10px",
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                background: "#f8d7da",
                color: "#721c24",
              }}
            >
              {flaggedPlayers.length} flagged
            </div>
          )}
        </div>

        {topPlayers.length === 0 ? (
          <div style={{ color: "#aaa", fontSize: 12, padding: 16, textAlign: "center" }}>
            No player data available
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${themeColor}30` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Player</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Risk</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Wagers</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Wagered</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600 }}>P&L</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Win Rate</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((p) => (
                  <tr
                    key={p.playerId}
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${themeColor}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: 600, color: "#264653" }}>
                        {p.displayName || p.playerId}
                      </div>
                      <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>
                        {p.playerId}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 10px" }}>
                      <RiskBadge tier={p.riskTier} />
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600 }}>
                      {formatNumber(p.wagerCount)}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 10px" }}>
                      {formatCurrency(p.totalWagered)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "8px 10px",
                        fontWeight: 700,
                        color: p.pnl >= 0 ? "#2a9d8f" : "#e76f51",
                      }}
                    >
                      {formatCurrency(p.pnl)}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 10px" }}>
                      {formatPct(p.winRate)}
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 10px" }}>
                      {p.flags.length > 0 ? (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            background: "#f8d7da",
                            color: "#721c24",
                          }}
                          title={p.flags.join(", ")}
                        >
                          {p.flags.length}
                        </span>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPerformance;
