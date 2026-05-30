/**
 * AgentDownline — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Downline management view:
 *   - Table: agent name, login, tier, players, wagers, P&L, commission
 *   - Sortable columns
 *   - Expand rows to see children
 *   - Search/filter
 *   - Export to CSV
 *   - CSS classes: .downline-row
 */

import React, { useState, useMemo, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentTier = "platinum" | "gold" | "silver" | "bronze";
type AgentStatus = "active" | "inactive" | "suspended";
type SortField = "displayName" | "login" | "tier" | "totalPlayers" | "totalWagers" | "totalPnl" | "balance" | "commissionRate" | "level";
type SortDir = "asc" | "desc";

export interface DownlineAgent {
  login: string;
  displayName: string;
  tier: AgentTier;
  status: AgentStatus;
  level: number;
  totalPlayers: number;
  totalWagers: number;
  totalPnl: number;
  balance: number;
  commissionRate: number;
  path: string;
  children?: DownlineAgent[];
}

interface AgentDownlineProps {
  downline: DownlineAgent[];
  themeColor?: string;
  agentLogin?: string;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Tier badge colors
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<AgentTier, string> = {
  platinum: "#e76f51",
  gold:     "#f4a261",
  silver:   "#adb5bd",
  bronze:   "#cd7f32",
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  if (Math.abs(cents) < 100) return `${cents}c`;
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Tier Badge
// ---------------------------------------------------------------------------

const TierBadge: React.FC<{ tier: AgentTier; themeColor: string }> = ({ tier }) => {
  const color = TIER_COLORS[tier];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 10px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.5px",
        background: color,
        color: "#fff",
        textTransform: "uppercase",
      }}
    >
      {tier}
    </span>
  );
};

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportToCSV(agents: DownlineAgent[], filename: string): void {
  const headers = ["Login", "Name", "Tier", "Status", "Level", "Players", "Wagers", "P&L", "Balance", "Commission"];
  const rows = agents.map((a) => [
    a.login,
    a.displayName,
    a.tier,
    a.status,
    String(a.level),
    String(a.totalPlayers),
    String(a.totalWagers),
    String(a.totalPnl),
    String(a.balance),
    `${a.commissionRate}%`,
  ]);

  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortAgents(agents: DownlineAgent[], field: SortField, dir: SortDir): DownlineAgent[] {
  const sorted = [...agents].sort((a, b) => {
    const va = a[field];
    const vb = b[field];
    if (typeof va === "string" && typeof vb === "string") {
      return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    if (typeof va === "number" && typeof vb === "number") {
      return dir === "asc" ? va - vb : vb - va;
    }
    return 0;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// Sort indicator
// ---------------------------------------------------------------------------

const SortIndicator: React.FC<{ active: boolean; dir: SortDir }> = ({ active, dir }) => (
  <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10 }}>
    {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
  </span>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const AgentDownline: React.FC<AgentDownlineProps> = ({
  downline,
  themeColor = "#e76f51",
  agentLogin,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>("level");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [tierFilter, setTierFilter] = useState<AgentTier | "all">("all");

  const handleSort = useCallback(
    (field: SortField) => {
      setSortField((prev) => {
        if (prev === field) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return prev;
        }
        setSortDir("asc");
        return field;
      });
    },
    []
  );

  const toggleRow = useCallback((login: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login);
      else next.add(login);
      return next;
    });
  }, []);

  // Flatten and filter
  const filtered = useMemo(() => {
    let agents = [...downline];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      agents = agents.filter(
        (a) =>
          a.login.toLowerCase().includes(q) ||
          a.displayName.toLowerCase().includes(q)
      );
    }

    // Tier filter
    if (tierFilter !== "all") {
      agents = agents.filter((a) => a.tier === tierFilter);
    }

    return agents;
  }, [downline, search, tierFilter]);

  const sorted = useMemo(
    () => sortAgents(filtered, sortField, sortDir),
    [filtered, sortField, sortDir]
  );

  const totalStats = useMemo(() => {
    return filtered.reduce(
      (acc, a) => ({
        players: acc.players + a.totalPlayers,
        wagers: acc.wagers + a.totalWagers,
        pnl: acc.pnl + a.totalPnl,
        balance: acc.balance + a.balance,
      }),
      { players: 0, wagers: 0, pnl: 0, balance: 0 }
    );
  }, [filtered]);

  const headerStyle = (field: SortField): React.CSSProperties => ({
    textAlign: field === "displayName" || field === "login" ? "left" : "center",
    padding: "10px 12px",
    color: "#666",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: `2px solid ${themeColor}40`,
    whiteSpace: "nowrap",
  });

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#aaa" }}>
        <div style={{ fontSize: 16 }}>Loading downline…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: "#264653", fontWeight: 700 }}>
            Downline{agentLogin ? ` — ${agentLogin}` : ""}
          </h2>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            {formatNumber(downline.length)} total agents
            {filtered.length !== downline.length && (
              <span style={{ color: themeColor }}> ({formatNumber(filtered.length)} filtered)</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as AgentTier | "all")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${themeColor}40`,
              fontSize: 12,
              color: "#666",
              background: "#fff",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Tiers</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search agents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${themeColor}40`,
              fontSize: 12,
              width: 180,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = themeColor;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = `${themeColor}40`;
            }}
          />

          {/* Export */}
          <button
            onClick={() =>
              exportToCSV(
                sorted,
                `downline-${agentLogin || "all"}-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${themeColor}40`,
              background: "#fff",
              color: themeColor,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeColor;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = themeColor;
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Players", value: formatNumber(totalStats.players), color: themeColor },
          { label: "Wagers", value: formatNumber(totalStats.wagers), color: themeColor },
          { label: "Net P&L", value: formatCurrency(totalStats.pnl), color: totalStats.pnl >= 0 ? "#2a9d8f" : "#e76f51" },
          { label: "Balance", value: formatCurrency(totalStats.balance), color: "#f4a261" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: `${s.color}08`,
              border: `1px solid ${s.color}20`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2, textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={headerStyle("displayName")} onClick={() => handleSort("displayName")}>
                Agent <SortIndicator active={sortField === "displayName"} dir={sortDir} />
              </th>
              <th style={headerStyle("login")} onClick={() => handleSort("login")}>
                Login <SortIndicator active={sortField === "login"} dir={sortDir} />
              </th>
              <th style={headerStyle("tier")} onClick={() => handleSort("tier")}>
                Tier <SortIndicator active={sortField === "tier"} dir={sortDir} />
              </th>
              <th style={headerStyle("level")} onClick={() => handleSort("level")}>
                Lvl <SortIndicator active={sortField === "level"} dir={sortDir} />
              </th>
              <th style={headerStyle("totalPlayers")} onClick={() => handleSort("totalPlayers")}>
                Players <SortIndicator active={sortField === "totalPlayers"} dir={sortDir} />
              </th>
              <th style={headerStyle("totalWagers")} onClick={() => handleSort("totalWagers")}>
                Wagers <SortIndicator active={sortField === "totalWagers"} dir={sortDir} />
              </th>
              <th style={headerStyle("totalPnl")} onClick={() => handleSort("totalPnl")}>
                P&L <SortIndicator active={sortField === "totalPnl"} dir={sortDir} />
              </th>
              <th style={headerStyle("balance")} onClick={() => handleSort("balance")}>
                Balance <SortIndicator active={sortField === "balance"} dir={sortDir} />
              </th>
              <th style={headerStyle("commissionRate")} onClick={() => handleSort("commissionRate")}>
                Comm% <SortIndicator active={sortField === "commissionRate"} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: "center",
                    padding: 32,
                    color: "#aaa",
                    fontSize: 13,
                  }}
                >
                  {search ? `No agents match "${search}"` : "No downline agents found"}
                </td>
              </tr>
            ) : (
              sorted.map((agent) => {
                const isExpanded = expandedRows.has(agent.login);
                const hasChildren = (agent.children?.length ?? 0) > 0;

                return (
                  <React.Fragment key={agent.login}>
                    <tr
                      className={`downline-row downline-tier-${agent.tier}`}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        transition: "background 0.1s",
                        cursor: hasChildren ? "pointer" : "default",
                      }}
                      onClick={() => hasChildren && toggleRow(agent.login)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${themeColor}08`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {hasChildren && (
                            <span
                              style={{
                                fontSize: 10,
                                color: themeColor,
                                fontWeight: 700,
                                width: 14,
                                textAlign: "center",
                                transition: "transform 0.15s",
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              }}
                            >
                              ▸
                            </span>
                          )}
                          {!hasChildren && <span style={{ width: 14 }} />}
                          {/* Indent by level */}
                          <div style={{ width: agent.level * 16 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: "#264653", fontSize: 13 }}>
                              {agent.displayName}
                            </div>
                            {agent.status !== "active" && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: agent.status === "suspended" ? "#721c24" : "#383d41",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                }}
                              >
                                {agent.status}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "#888",
                        }}
                      >
                        {agent.login}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <TierBadge tier={agent.tier} themeColor={themeColor} />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 700,
                          color: "#264653",
                        }}
                      >
                        {agent.level}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#264653",
                        }}
                      >
                        {formatNumber(agent.totalPlayers)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#264653",
                        }}
                      >
                        {formatNumber(agent.totalWagers)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 700,
                          color: agent.totalPnl >= 0 ? "#2a9d8f" : "#e76f51",
                        }}
                      >
                        {formatCurrency(agent.totalPnl)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 600,
                          color: agent.balance >= 0 ? "#2a9d8f" : "#e76f51",
                        }}
                      >
                        {formatCurrency(agent.balance)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#f4a261",
                        }}
                      >
                        {agent.commissionRate}%
                      </td>
                    </tr>

                    {/* Expanded children rows */}
                    {isExpanded &&
                      agent.children?.map((child) => (
                        <tr
                          key={child.login}
                          className={`downline-row downline-tier-${child.tier}`}
                          style={{
                            borderBottom: "1px solid #f5f5f5",
                            background: `${themeColor}04`,
                          }}
                        >
                          <td style={{ padding: "6px 12px 6px 48px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: child.level * 12 }} />
                              <div style={{ fontWeight: 500, color: "#555", fontSize: 12 }}>
                                {child.displayName}
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "6px 12px",
                              fontFamily: "monospace",
                              fontSize: 10,
                              color: "#aaa",
                            }}
                          >
                            {child.login}
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center" }}>
                            <TierBadge tier={child.tier} themeColor={themeColor} />
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center", color: "#888" }}>
                            {child.level}
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center", color: "#666" }}>
                            {formatNumber(child.totalPlayers)}
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center", color: "#666" }}>
                            {formatNumber(child.totalWagers)}
                          </td>
                          <td
                            style={{
                              padding: "6px 12px",
                              textAlign: "center",
                              fontWeight: 600,
                              color: child.totalPnl >= 0 ? "#2a9d8f" : "#e76f51",
                            }}
                          >
                            {formatCurrency(child.totalPnl)}
                          </td>
                          <td
                            style={{
                              padding: "6px 12px",
                              textAlign: "center",
                              color: child.balance >= 0 ? "#2a9d8f" : "#e76f51",
                            }}
                          >
                            {formatCurrency(child.balance)}
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center", color: "#f4a261" }}>
                            {child.commissionRate}%
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentDownline;
