/**
 * SportsbookGrid Component — Zone 1 (Ocean Depths)
 *
 * Features:
 *   - Dark theme with Ocean Depths (#1a2332) accent
 *   - Sortable data table with book names, sports, markets, odds
 *   - Best line highlighting in green (.best-line class)
 *   - Line movement arrows (up/down indicators)
 *   - Health dots (8px colored circles)
 *   - Real-time updates via WebSocket
 *   - Filters by sport, book, market type
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OddsRow {
  id: string;
  bookId: string;
  bookName: string;
  sport: string;
  eventId: string;
  eventName: string;
  market: string;
  odds: number;
  line?: number;
  overUnder?: "over" | "under";
  isBestLine: boolean;
  vig?: number;
  timestamp: number;
  source: string;
}

interface LineMovement {
  id: string;
  bookId: string;
  sport: string;
  eventId: string;
  market: string;
  oldOdds: number;
  newOdds: number;
  oldLine?: number;
  newLine?: number;
  direction: "up" | "down" | "steady";
  movementPct?: number;
  timestamp: number;
}

interface BookHealth {
  bookId: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  errorRate: number;
  uptimePct: number;
  lastCheck: number;
}

interface SportsbookGridProps {
  odds: OddsRow[];
  movements: LineMovement[];
  health: BookHealth[];
  onRefresh: () => void;
  onFilterChange: (filters: GridFilters) => void;
  loading?: boolean;
}

export interface GridFilters {
  sport?: string;
  bookId?: string;
  market?: string;
}

type SortKey = "bookId" | "sport" | "eventName" | "market" | "odds" | "timestamp";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Health Dot Component
// ---------------------------------------------------------------------------

const HealthDot: React.FC<{ status: BookHealth["status"]; size?: number }> = ({ status, size = 8 }) => {
  const color = status === "healthy" ? "#4caf50" : status === "degraded" ? "#ff9800" : "#f44336";
  return (
    <span
      className="health-dot"
      title={status}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}`,
        flexShrink: 0,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Line Movement Arrow Component
// ---------------------------------------------------------------------------

const MovementArrow: React.FC<{ direction: LineMovement["direction"]; movementPct?: number }> = ({
  direction,
  movementPct,
}) => {
  if (direction === "steady") {
    return <span className="line-steady" style={{ color: "#6a6a80", fontSize: 13 }}>−</span>;
  }

  const isUp = direction === "up";
  const color = isUp ? "#4caf50" : "#f44336";
  const pctText = movementPct ? ` ${Math.abs(movementPct).toFixed(1)}%` : "";

  return (
    <span className={isUp ? "line-up" : "line-down"} style={{ color, fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 2 }}>
      {isUp ? "▲" : "▼"}{pctText}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Best Line Badge
// ---------------------------------------------------------------------------

const BestLineBadge: React.FC = () => (
  <span
    className="best-line"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 4,
      backgroundColor: "rgba(76, 175, 80, 0.15)",
      color: "#4caf50",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.3px",
      border: "1px solid rgba(76, 175, 80, 0.3)",
    }}
  >
    BEST
  </span>
);

// ---------------------------------------------------------------------------
// Odds Cell Component (shows odds + best line badge)
// ---------------------------------------------------------------------------

const OddsCell: React.FC<{ odds: number; isBestLine: boolean; vig?: number }> = ({ odds, isBestLine, vig }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span
      className={isBestLine ? "best-line" : ""}
      style={{
        color: isBestLine ? "#4caf50" : "#e0e0e0",
        fontWeight: isBestLine ? 700 : 500,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 14,
      }}
    >
      {odds > 0 ? `+${odds}` : odds}
    </span>
    {isBestLine && <BestLineBadge />}
    {vig !== undefined && (
      <span style={{ color: "#6a6a80", fontSize: 11 }}>({vig.toFixed(1)}% vig)</span>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Filter Bar Component
// ---------------------------------------------------------------------------

const FilterBar: React.FC<{
  filters: GridFilters;
  onChange: (filters: GridFilters) => void;
  sports: string[];
  books: string[];
  markets: string[];
}> = ({ filters, onChange, sports, books, markets }) => (
  <div className="filter-bar" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
    <select
      className="filter-select"
      value={filters.sport || ""}
      onChange={(e) => onChange({ ...filters, sport: e.target.value || undefined })}
    >
      <option value="">All Sports</option>
      {sports.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>

    <select
      className="filter-select"
      value={filters.bookId || ""}
      onChange={(e) => onChange({ ...filters, bookId: e.target.value || undefined })}
    >
      <option value="">All Books</option>
      {books.map((b) => (
        <option key={b} value={b}>{b}</option>
      ))}
    </select>

    <select
      className="filter-select"
      value={filters.market || ""}
      onChange={(e) => onChange({ ...filters, market: e.target.value || undefined })}
    >
      <option value="">All Markets</option>
      {markets.map((m) => (
        <option key={m} value={m}>{m.toUpperCase()}</option>
      ))}
    </select>

    {(filters.sport || filters.bookId || filters.market) && (
      <button
        className="btn btn-clear"
        onClick={() => onChange({})}
        style={{ padding: "6px 12px", fontSize: 12, background: "transparent", border: "1px solid #2a2a3e", color: "#a0a0b0", borderRadius: 4, cursor: "pointer" }}
      >
        Clear Filters
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Sortable Header
// ---------------------------------------------------------------------------

const SortHeader: React.FC<{
  label: string;
  sortKey: SortKey;
  currentSort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}> = ({ label, sortKey, currentSort, onSort }) => {
  const isActive = currentSort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      title={`Sort by ${label}`}
    >
      {label} {isActive && (currentSort.dir === "asc" ? "▲" : "▼")}
    </th>
  );
};

// ---------------------------------------------------------------------------
// Main Grid Component
// ---------------------------------------------------------------------------

const SportsbookGrid: React.FC<SportsbookGridProps> = ({
  odds,
  movements,
  health,
  onRefresh,
  onFilterChange,
  loading = false,
}) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "timestamp", dir: "desc" });
  const [filters, setFilters] = useState<GridFilters>({});

  // Apply local filters
  const handleFilterChange = useCallback((newFilters: GridFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [onFilterChange]);

  // Unique filter options
  const sports = useMemo(() => [...new Set(odds.map((o) => o.sport))].sort(), [odds]);
  const books = useMemo(() => [...new Set(odds.map((o) => o.bookId))].sort(), [odds]);
  const markets = useMemo(() => [...new Set(odds.map((o) => o.market))].sort(), [odds]);

  // Get movement for a given odds row
  const getMovementForRow = useCallback((row: OddsRow): LineMovement | undefined => {
    return movements.find(
      (m) => m.bookId === row.bookId && m.eventId === row.eventId && m.market === row.market
    );
  }, [movements]);

  // Get health for a book
  const getHealthForBook = useCallback((bookId: string): BookHealth | undefined => {
    return health.find((h) => h.bookId === bookId);
  }, [health]);

  // Sort handler
  const handleSort = useCallback((key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Filter + sort odds
  const filteredOdds = useMemo(() => {
    let rows = [...odds];

    if (filters.sport) rows = rows.filter((r) => r.sport === filters.sport);
    if (filters.bookId) rows = rows.filter((r) => r.bookId === filters.bookId);
    if (filters.market) rows = rows.filter((r) => r.market === filters.market);

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case "bookId": cmp = a.bookId.localeCompare(b.bookId); break;
        case "sport": cmp = a.sport.localeCompare(b.sport); break;
        case "eventName": cmp = (a.eventName || "").localeCompare(b.eventName || ""); break;
        case "market": cmp = a.market.localeCompare(b.market); break;
        case "odds": cmp = a.odds - b.odds; break;
        case "timestamp": cmp = a.timestamp - b.timestamp; break;
        default: cmp = 0;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [odds, filters, sort]);

  // Format timestamp
  const fmtTime = (ts: number): string => {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    const s = d.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Format market label
  const fmtMarket = (m: string, ou?: string): string => {
    let label = m.toUpperCase();
    if (ou) label += ` ${ou.toUpperCase()}`;
    return label;
  };

  if (loading) {
    return (
      <div className="panel" style={panelStyle}>
        <div className="loading-pulse" style={{ padding: 32, textAlign: "center", color: "#6a6a80" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Loading sportsbook data...
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={panelStyle}>
      {/* Header */}
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#e0e0e0" }}>
          Sportsbook Odds Grid
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#6a6a80", fontSize: 12 }}>
            {filteredOdds.length} rows
          </span>
          <button
            className="btn btn-primary"
            onClick={onRefresh}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 4, background: "#4a9eff", color: "#fff", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        sports={sports}
        books={books}
        markets={markets}
      />

      {/* Table */}
      {filteredOdds.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#6a6a80" }}>
          No odds data available. Try adjusting filters or refreshing.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <SortHeader label="Book" sortKey="bookId" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Sport" sortKey="sport" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Event" sortKey="eventName" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Market" sortKey="market" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Odds" sortKey="odds" currentSort={sort} onSort={handleSort} />
                <th>Line</th>
                <th>Movement</th>
                <SortHeader label="Updated" sortKey="timestamp" currentSort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredOdds.map((row) => {
                const movement = getMovementForRow(row);
                const bookHealth = getHealthForBook(row.bookId);

                return (
                  <tr key={row.id} className={row.isBestLine ? "best-line" : ""}>
                    <td>
                      {bookHealth && <HealthDot status={bookHealth.status} />}
                    </td>
                    <td style={{ fontWeight: 500, color: "#e0e0e0" }}>{row.bookId}</td>
                    <td>{row.sport}</td>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.eventName || row.eventId}
                    </td>
                    <td>{fmtMarket(row.market, row.overUnder)}</td>
                    <td>
                      <OddsCell odds={row.odds} isBestLine={row.isBestLine} vig={row.vig} />
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#a0a0b0" }}>
                      {row.line !== undefined ? (row.line > 0 ? `+${row.line}` : row.line) : "—"}
                    </td>
                    <td>
                      {movement ? (
                        <MovementArrow direction={movement.direction} movementPct={movement.movementPct} />
                      ) : (
                        <span style={{ color: "#4a4a60" }}>—</span>
                      )}
                    </td>
                    <td style={{ color: "#a0a0b0", fontSize: 12 }}>{fmtTime(row.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer */}
      {filteredOdds.length > 0 && (
        <div style={{ marginTop: 12, padding: "8px 0", borderTop: "1px solid #2a2a3e", display: "flex", gap: 24, fontSize: 12, color: "#6a6a80" }}>
          <span>
            Best Lines: <strong style={{ color: "#4caf50" }}>{filteredOdds.filter((r) => r.isBestLine).length}</strong>
          </span>
          <span>
            Books: <strong style={{ color: "#e0e0e0" }}>{new Set(filteredOdds.map((r) => r.bookId)).size}</strong>
          </span>
          <span>
            Events: <strong style={{ color: "#e0e0e0" }}>{new Set(filteredOdds.map((r) => r.eventId)).size}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  backgroundColor: "#1a2332", // Ocean Depths
  border: "1px solid #2a3a4a",
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
};

export default SportsbookGrid;
