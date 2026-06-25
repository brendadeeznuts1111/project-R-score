/**
 * RiskPositions Component
 *
 * Sortable, filterable, paginated table of open risk positions.
 * Color-coded by risk tier with filtering controls.
 *
 * Theme: Arctic Frost (#4a6fa5)
 */

import React, { useEffect, useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RiskPosition {
  id: number;
  positionId: string;
  agentLogin: string;
  playerId: string | null;
  sport: string;
  eventId: string;
  eventName: string | null;
  market: string;
  totalStake: number;
  totalExposure: number;
  maxPayout: number;
  playerCount: number;
  wagerCount: number;
  riskScore: number;
  riskTier: "BLACK" | "RED" | "YELLOW" | "GREEN";
  status: "open" | "warning" | "breached" | "closed" | "expired";
  expiresAt: number;
  createdAt: number;
}

interface PositionFilters {
  sport: string;
  book: string;
  riskTier: string;
  status: string;
  search: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME = {
  accent: "#4a6fa5",
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  green: "#3fb950",
  yellow: "#d29922",
  red: "#f85149",
  black: "#8b949e",
};

const TIER_CSS: Record<string, string> = {
  BLACK: "risk-tier-black",
  RED: "risk-tier-red",
  YELLOW: "risk-tier-yellow",
  GREEN: "risk-tier-green",
};

const TIER_BG: Record<string, string> = {
  BLACK: "rgba(139,148,158,0.15)",
  RED: "rgba(248,81,73,0.15)",
  YELLOW: "rgba(210,153,34,0.15)",
  GREEN: "rgba(63,185,80,0.15)",
};

const TIER_TEXT: Record<string, string> = {
  BLACK: THEME.black,
  RED: THEME.red,
  YELLOW: THEME.yellow,
  GREEN: THEME.green,
};

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RiskPositions(): React.JSX.Element {
  const [positions, setPositions] = useState<RiskPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<keyof RiskPosition>("riskScore");
  const [sortAsc, setSortAsc] = useState(false);

  const [filters, setFilters] = useState<PositionFilters>({
    sport: "",
    book: "",
    riskTier: "",
    status: "open",
    search: "",
  });

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (filters.sport) params.set("sport", filters.sport);
      if (filters.book) params.set("book", filters.book);
      if (filters.riskTier) params.set("riskTier", filters.riskTier);
      if (filters.status) params.set("status", filters.status);

      const res = await fetch(`/api/risk/positions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPositions(json.items || []);
        setTotal(json.total || 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [page, filters.sport, filters.book, filters.riskTier, filters.status]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/risk/positions/generate", { method: "POST" });
      if (res.ok) {
        setPage(0);
        await fetchPositions();
      }
    } catch {
      // silent fail
    } finally {
      setGenerating(false);
    }
  };

  const handleSort = (col: keyof RiskPosition) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const sortedPositions = useMemo(() => {
    const sorted = [...positions].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    // Client-side search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return sorted.filter((p) =>
        p.positionId.toLowerCase().includes(q) ||
        p.sport.toLowerCase().includes(q) ||
        p.agentLogin.toLowerCase().includes(q) ||
        (p.eventName || "").toLowerCase().includes(q)
      );
    }
    return sorted;
  }, [positions, sortCol, sortAsc, filters.search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Risk Positions</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ ...styles.btn, opacity: generating ? 0.6 : 1 }}
        >
          {generating ? "Generating..." : "Generate Positions"}
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <select
          style={styles.select}
          value={filters.sport}
          onChange={(e) => { setFilters({ ...filters, sport: e.target.value }); setPage(0); }}
        >
          <option value="">All Sports</option>
          <option value="NBA">NBA</option>
          <option value="NFL">NFL</option>
          <option value="MLB">MLB</option>
          <option value="NHL">NHL</option>
          <option value="SOCCER">Soccer</option>
          <option value="TENNIS">Tennis</option>
          <option value="ESPORTS">Esports</option>
        </select>

        <input
          style={styles.input}
          placeholder="Filter by book/agent..."
          value={filters.book}
          onChange={(e) => { setFilters({ ...filters, book: e.target.value }); setPage(0); }}
        />

        <select
          style={styles.select}
          value={filters.riskTier}
          onChange={(e) => { setFilters({ ...filters, riskTier: e.target.value }); setPage(0); }}
        >
          <option value="">All Tiers</option>
          <option value="GREEN">GREEN</option>
          <option value="YELLOW">YELLOW</option>
          <option value="RED">RED</option>
          <option value="BLACK">BLACK</option>
        </select>

        <select
          style={styles.select}
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(0); }}
        >
          <option value="open">Open</option>
          <option value="warning">Warning</option>
          <option value="breached">Breached</option>
          <option value="closed">Closed</option>
          <option value="expired">Expired</option>
          <option value="">All</option>
        </select>

        <input
          style={{ ...styles.input, minWidth: 200 }}
          placeholder="Search positions..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <span style={styles.count}>{total} positions</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <SortHeader label="Position ID" col="positionId" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Book" col="agentLogin" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Sport" col="sport" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Event" col="eventName" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Market" col="market" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Stake" col="totalStake" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Exposure" col="totalExposure" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Score" col="riskScore" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Tier" col="riskTier" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Status" col="status" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Wagers" col="wagerCount" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((pos) => (
                  <tr
                    key={pos.positionId}
                    className={`position-row ${TIER_CSS[pos.riskTier] || ""}`}
                    style={{
                      ...styles.tr,
                      background: TIER_BG[pos.riskTier] || "transparent",
                    }}
                  >
                    <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11 }}>
                      {pos.positionId.slice(0, 16)}...
                    </td>
                    <td style={styles.td}>{pos.agentLogin}</td>
                    <td style={styles.td}>{pos.sport}</td>
                    <td style={{ ...styles.td, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pos.eventName || pos.eventId.slice(0, 12)}
                    </td>
                    <td style={styles.td}>{pos.market}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      ${(pos.totalStake / 100).toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", color: pos.totalExposure > 500000 ? THEME.red : THEME.text }}>
                      ${(pos.totalExposure / 100).toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: scoreColor(pos.riskScore) }}>
                      {pos.riskScore}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.tierBadge, color: TIER_TEXT[pos.riskTier], borderColor: TIER_TEXT[pos.riskTier] }}>
                        {pos.riskTier}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, color: statusColor(pos.status) }}>
                        {pos.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>{pos.wagerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button style={styles.pageBtn} disabled={page <= 0} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <button style={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  col,
  sortCol,
  sortAsc,
  onSort,
}: {
  label: string;
  col: keyof RiskPosition;
  sortCol: keyof RiskPosition;
  sortAsc: boolean;
  onSort: (col: keyof RiskPosition) => void;
}): React.JSX.Element {
  const active = sortCol === col;
  return (
    <th
      style={{ ...styles.th, cursor: "pointer", userSelect: "none" }}
      onClick={() => onSort(col)}
    >
      {label} {active && (sortAsc ? "▲" : "▼")}
    </th>
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

function statusColor(status: string): string {
  switch (status) {
    case "open": return THEME.green;
    case "warning": return THEME.yellow;
    case "breached": return THEME.red;
    case "expired": return THEME.textMuted;
    default: return THEME.text;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    background: "#0d1117",
    color: "#c9d1d9",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid #30363d",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#4a6fa5",
  },
  btn: {
    padding: "8px 16px",
    background: "#4a6fa5",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  filterRow: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  select: {
    padding: "6px 10px",
    background: "#161b22",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    borderRadius: 6,
    fontSize: 12,
    minWidth: 120,
  },
  input: {
    padding: "6px 10px",
    background: "#161b22",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    borderRadius: 6,
    fontSize: 12,
    minWidth: 140,
    outline: "none",
  },
  count: {
    marginLeft: "auto",
    fontSize: 12,
    color: "#8b949e",
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
    position: "sticky",
    top: 0,
    background: "#161b22",
    zIndex: 1,
  },
  tr: {
    borderBottom: "1px solid #21262d",
    transition: "background 0.12s",
  },
  td: {
    padding: "8px",
    color: "#c9d1d9",
    fontVariantNumeric: "tabular-nums",
  },
  tierBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    border: "1px solid",
    letterSpacing: 0.5,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: "capitalize",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #30363d",
  },
  pageBtn: {
    padding: "6px 14px",
    background: "#21262d",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  pageInfo: {
    fontSize: 12,
    color: "#8b949e",
  },
  loading: {
    textAlign: "center",
    color: "#8b949e",
    padding: 40,
  },
};
