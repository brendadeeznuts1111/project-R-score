/**
 * Sportsbook Page — Zone 1 (Ocean Depths)
 *
 * Full sportsbook grid page featuring:
 *   - Best lines panel at top
 *   - Line movements sidebar
 *   - Book health status bar
 *   - Refresh button
 *   - Auto-refresh toggle
 *   - Uses SportsbookGrid component
 *   - Real-time updates via WebSocket
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import SportsbookGrid, { type GridFilters } from "../components/SportsbookGrid";

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

interface BestLine {
  eventId: string;
  sport: string;
  market: string;
  overUnder?: "over" | "under";
  bestBookId: string;
  bestOdds: number;
  bestLine?: number;
  vig: number;
  timestamp: number;
  allBooks: Array<{ bookId: string; odds: number; line?: number; isBest: boolean }>;
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

interface ApiOddsItem {
  id: string;
  bookId: string;
  sport: string;
  eventId: string;
  market: string;
  odds: number;
  line?: number;
  overUnder?: "over" | "under";
  isBestLine: boolean;
  vig?: number;
  timestamp: number;
  source: string;
}

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
// Movement Arrow
// ---------------------------------------------------------------------------

const MovementArrow: React.FC<{ direction: "up" | "down" | "steady"; movementPct?: number }> = ({
  direction,
  movementPct,
}) => {
  if (direction === "steady") return <span style={{ color: "#6a6a80" }}>−</span>;
  const isUp = direction === "up";
  const color = isUp ? "#4caf50" : "#f44336";
  const pctText = movementPct ? ` ${Math.abs(movementPct).toFixed(1)}%` : "";
  return (
    <span style={{ color, fontWeight: 600, fontSize: 11 }}>
      {isUp ? "▲" : "▼"}{pctText}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

const fmtOdds = (odds: number): string => (odds > 0 ? `+${odds}` : `${odds}`);

const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const fmtMarket = (m: string, ou?: string): string => {
  let label = m.toUpperCase();
  if (ou) label += ` ${ou.toUpperCase()}`;
  return label;
};

// ---------------------------------------------------------------------------
// Best Lines Panel
// ---------------------------------------------------------------------------

const BestLinesPanel: React.FC<{ lines: BestLine[]; loading: boolean }> = ({ lines, loading }) => {
  if (loading) {
    return (
      <div className="panel" style={panelStyle}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#4caf50", textTransform: "uppercase", letterSpacing: "0.5px" }}>Best Lines</h4>
        <div className="loading-pulse" style={{ color: "#6a6a80", fontSize: 13, textAlign: "center", padding: 16 }}>Loading best lines...</div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="panel" style={panelStyle}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#4caf50", textTransform: "uppercase", letterSpacing: "0.5px" }}>Best Lines</h4>
        <div style={{ color: "#6a6a80", fontSize: 13, textAlign: "center", padding: 16 }}>No best lines available.</div>
      </div>
    );
  }

  return (
    <div className="panel" style={panelStyle}>
      <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#4caf50", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Best Lines — {lines.length} markets
      </h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {lines.slice(0, 8).map((line) => (
          <div
            key={`${line.eventId}-${line.market}-${line.overUnder || "none"}`}
            className="best-line-card"
            style={{
              background: "rgba(76, 175, 80, 0.08)",
              border: "1px solid rgba(76, 175, 80, 0.25)",
              borderRadius: 6,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#a0a0b0", fontWeight: 500 }}>{line.sport}</span>
              <span className="metric" style={{ fontSize: 11, color: "#4caf50", fontWeight: 700, fontFamily: "monospace" }}>
                {fmtOdds(line.bestOdds)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fmtMarket(line.market, line.overUnder)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <span style={{ color: "#4a9eff", fontWeight: 500 }}>{line.bestBookId}</span>
              <span style={{ color: "#6a6a80" }}>{line.vig.toFixed(1)}% vig</span>
            </div>
            {line.bestLine !== undefined && (
              <div style={{ fontSize: 11, color: "#a0a0b0" }}>
                Line: {line.bestLine > 0 ? `+${line.bestLine}` : line.bestLine}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Line Movements Sidebar
// ---------------------------------------------------------------------------

const MovementsSidebar: React.FC<{ movements: LineMovement[] }> = ({ movements }) => (
  <div className="panel" style={panelStyle}>
    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#ff9800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      Line Movements
    </h4>
    {movements.length === 0 ? (
      <div style={{ color: "#6a6a80", fontSize: 13, textAlign: "center", padding: "16 0" }}>No recent movements.</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
        {movements.slice(0, 20).map((mv) => (
          <div
            key={mv.id}
            style={{
              padding: "8px 10px",
              background: "rgba(255, 152, 0, 0.05)",
              borderRadius: 4,
              borderLeft: `3px solid ${mv.direction === "up" ? "#4caf50" : mv.direction === "down" ? "#f44336" : "#6a6a80"}`,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#e0e0e0", fontWeight: 500 }}>{mv.bookId}</span>
              <span style={{ color: "#a0a0b0", fontSize: 11 }}>{mv.sport}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6a6a80" }}>
                {fmtOdds(mv.oldOdds)} → <strong style={{ color: "#e0e0e0" }}>{fmtOdds(mv.newOdds)}</strong>
              </span>
              <MovementArrow direction={mv.direction} movementPct={mv.movementPct} />
            </div>
            <div style={{ color: "#4a4a60", fontSize: 10, marginTop: 2 }}>
              {fmtMarket(mv.market)} · {fmtTime(mv.timestamp)}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Book Health Status Bar
// ---------------------------------------------------------------------------

const HealthStatusBar: React.FC<{ health: BookHealth[] }> = ({ health }) => {
  const summary = {
    total: health.length,
    healthy: health.filter((h) => h.status === "healthy").length,
    degraded: health.filter((h) => h.status === "degraded").length,
    down: health.filter((h) => h.status === "down").length,
  };

  return (
    <div className="panel" style={{ ...panelStyle, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, color: "#4a9eff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Book Health
        </h4>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <span style={{ color: "#4caf50" }}>● Healthy: {summary.healthy}</span>
          <span style={{ color: "#ff9800" }}>● Degraded: {summary.degraded}</span>
          <span style={{ color: "#f44336" }}>● Down: {summary.down}</span>
        </div>
      </div>
      {health.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {health.map((h) => (
            <div
              key={h.bookId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                background: "rgba(42, 58, 74, 0.5)",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <HealthDot status={h.status} />
              <span style={{ color: "#e0e0e0", fontWeight: 500 }}>{h.bookId}</span>
              <span style={{ color: "#6a6a80", fontFamily: "monospace", fontSize: 11 }}>
                {h.latencyMs}ms
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

const SportsbookPage: React.FC = () => {
  const [odds, setOdds] = useState<OddsRow[]>([]);
  const [bestLines, setBestLines] = useState<BestLine[]>([]);
  const [movements, setMovements] = useState<LineMovement[]>([]);
  const [health, setHealth] = useState<BookHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch odds
      const oddsRes = await fetch("/api/sportsbook/odds?limit=200");
      if (oddsRes.ok) {
        const oddsData = await oddsRes.json();
        const mappedOdds: OddsRow[] = (oddsData.odds || []).map((item: ApiOddsItem) => ({
          id: item.id,
          bookId: item.bookId,
          bookName: item.bookId,
          sport: item.sport,
          eventId: item.eventId,
          eventName: item.eventId,
          market: item.market,
          odds: item.odds,
          line: item.line,
          overUnder: item.overUnder,
          isBestLine: item.isBestLine,
          vig: item.vig,
          timestamp: item.timestamp,
          source: item.source,
        }));
        setOdds(mappedOdds);
        setLastUpdated(Date.now());
      }

      // Fetch best lines
      const bestRes = await fetch("/api/sportsbook/best-lines");
      if (bestRes.ok) {
        const bestData = await bestRes.json();
        setBestLines(bestData.bestLines || []);
      }

      // Fetch movements
      const mvRes = await fetch("/api/sportsbook/line-movements?limit=20");
      if (mvRes.ok) {
        const mvData = await mvRes.json();
        setMovements(mvData.movements || []);
      }

      // Fetch health
      const healthRes = await fetch("/api/sportsbook/health");
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData.books || []);
      }
    } catch (err) {
      console.error("[SportsbookPage] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // WebSocket for real-time updates
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to sportsbook channel
      ws.send(JSON.stringify({ type: "subscribe:sportsbook" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "sportsbook_odds_update") {
          const data = msg.data || {};

          if (data.kind === "odds_updated" && data.odds) {
            setOdds((prev) => {
              const existing = prev.findIndex((o) => o.id === data.odds.id);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = {
                  ...updated[existing],
                  odds: data.odds.odds,
                  isBestLine: data.odds.isBestLine,
                  vig: data.odds.vig,
                  timestamp: data.odds.timestamp || Date.now(),
                };
                return updated;
              }
              return prev;
            });
            setLastUpdated(Date.now());
          }

          if (data.kind === "line_movement") {
            setMovements((prev) => [
              {
                id: data.id || `ws_${Date.now()}`,
                bookId: data.bookId,
                sport: data.sport,
                eventId: data.eventId,
                market: data.market,
                oldOdds: data.oldOdds,
                newOdds: data.newOdds,
                direction: data.direction as "up" | "down" | "steady",
                movementPct: data.movementPct,
                timestamp: data.timestamp || Date.now(),
              },
              ...prev.slice(0, 49),
            ]);
          }

          if (data.kind === "health_update" && data.health) {
            setHealth(data.health as BookHealth[]);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-refresh
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchData();
      }, AUTO_REFRESH_INTERVAL);
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, fetchData]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    fetchData();
    // Also trigger server-side refresh
    fetch("/api/sportsbook/refresh", { method: "POST" }).catch(() => {});
  }, [fetchData]);

  const handleFilterChange = useCallback((_filters: GridFilters) => {
    // Grid handles its own filtering; could sync to URL here
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="sportsbook-page" style={{ maxWidth: 1400 }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e0e0e0" }}>
            Sportsbook Grid
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6a6a80", fontSize: 13 }}>
            Zone 1 — Live odds comparison across all books
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lastUpdated > 0 && (
            <span style={{ color: "#6a6a80", fontSize: 12 }}>
              Last updated: {fmtTime(lastUpdated)}
            </span>
          )}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#a0a0b0",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Auto-refresh (30s)
          </label>
          <button
            className="btn btn-primary"
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              borderRadius: 4,
              background: loading ? "#3a5a7a" : "#4a9eff",
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "⟳ Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Health Status Bar */}
      <HealthStatusBar health={health} />

      {/* Best Lines Panel */}
      <BestLinesPanel lines={bestLines} loading={loading} />

      {/* Main Content: Grid + Movements Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        {/* Odds Grid */}
        <SportsbookGrid
          odds={odds}
          movements={movements}
          health={health}
          onRefresh={handleRefresh}
          onFilterChange={handleFilterChange}
          loading={loading}
        />

        {/* Sidebar */}
        <div>
          <MovementsSidebar movements={movements} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "#1a2332", borderRadius: 6, border: "1px solid #2a3a4a", fontSize: 11, color: "#6a6a80", display: "flex", gap: 24, flexWrap: "wrap" }}>
        <span><strong style={{ color: "#4caf50" }}>Green ▲</strong> = Moved in bettor's favor</span>
        <span><strong style={{ color: "#f44336" }}>Red ▼</strong> = Moved against bettor</span>
        <span><strong style={{ color: "#4caf50" }}>BEST</strong> = Best price across books</span>
        <span>● = Book health (green=healthy, yellow=degraded, red=down)</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  backgroundColor: "#1a2332",
  border: "1px solid #2a3a4a",
  borderRadius: 8,
  padding: 16,
};

export default SportsbookPage;
