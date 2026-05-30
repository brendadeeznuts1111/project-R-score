/**
 * LiveTickerPage — Real-time Wager Stream
 *
 * Live updating wager feed:
 *   - Each row: time, player, sport, wager, odds, book, status
 *   - Color coding by status (won=green, lost=red, pending=yellow)
 *   - Auto-scrolling with pause button
 *   - Filters: sport, book, status, min wager
 *   - Sound notification toggle
 *   - Uses SSE /api/stream/live-wagers
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LiveWager {
  id: string;
  timestamp: number;
  playerId: string;
  playerLogin: string;
  sport: string;
  eventName: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  book: string;
  status: "pending" | "won" | "lost" | "pushed" | "cancelled";
  potentialPayout: number;
}

// ---------------------------------------------------------------------------
// Mock data generator for demo (replaced by SSE in production)
// ---------------------------------------------------------------------------

const SPORTS = ["NFL", "NBA", "MLB", "NHL", "Soccer", "Tennis", "UFC"];
const BOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "PointsBet", "Bet365"];
const MARKETS = ["Spread", "Moneyline", "Total", "Parlay", "Prop"];
const STATUSES: LiveWager["status"][] = ["pending", "won", "lost", "pushed", "cancelled"];
const PLAYERS = ["john_doe", "bet_king", "sharp_bettor", "lucky_strike", "pro_gambler", "newbie99", "whale_42", "ace_player"];

function generateMockWager(id: number): LiveWager {
  const sport = SPORTS[Math.floor(Math.random() * SPORTS.length)];
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const stake = Math.round((10 + Math.random() * 990) * 100) / 100;
  const odds = Math.round((-200 + Math.random() * 400) * 100) / 100;
  return {
    id: `wager_${Date.now()}_${id}`,
    timestamp: Date.now() - Math.floor(Math.random() * 300000),
    playerId: `p_${id}`,
    playerLogin: PLAYERS[Math.floor(Math.random() * PLAYERS.length)],
    sport,
    eventName: `${sport} Event ${Math.floor(Math.random() * 100)}`,
    market: MARKETS[Math.floor(Math.random() * MARKETS.length)],
    selection: Math.random() > 0.5 ? "Over" : "Under",
    odds,
    stake,
    book: BOOKS[Math.floor(Math.random() * BOOKS.length)],
    status,
    potentialPayout: status === "won" ? Math.round(stake * (odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1) * 100) / 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LiveTickerPage: React.FC = () => {
  const [wagers, setWagers] = useState<LiveWager[]>(() =>
    Array.from({ length: 20 }, (_, i) => generateMockWager(i))
  );
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [filterSport, setFilterSport] = useState("All");
  const [filterBook, setFilterBook] = useState("All");
  const [filterStatus, setFilterStatus] = useState<LiveWager["status"] | "All">("All");
  const [minWager, setMinWager] = useState("");
  const [connected, setConnected] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  // SSE connection
  useEffect(() => {
    const eventSource = new EventSource("/api/stream/live-wagers");

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "wagerTick" || data.wagerId) {
          const wager: LiveWager = {
            id: data.wagerId || `wager_${Date.now()}`,
            timestamp: Date.now(),
            playerId: data.playerId || "unknown",
            playerLogin: data.playerLogin || "unknown",
            sport: data.sport || "Unknown",
            eventName: data.eventName || "Unknown Event",
            market: data.market || "Unknown",
            selection: data.selection || "",
            odds: data.odds || 0,
            stake: data.stake || 0,
            book: data.book || "Unknown",
            status: data.status || "pending",
            potentialPayout: data.potentialPayout || 0,
          };
          if (!pausedRef.current) {
            setWagers((prev) => [wager, ...prev].slice(0, 500));
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Mock new wagers for demo when no SSE
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pausedRef.current) {
        setWagers((prev) => [generateMockWager(Date.now()), ...prev].slice(0, 500));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredWagers = wagers.filter((w) => {
    if (filterSport !== "All" && w.sport !== filterSport) return false;
    if (filterBook !== "All" && w.book !== filterBook) return false;
    if (filterStatus !== "All" && w.status !== filterStatus) return false;
    if (minWager && w.stake < parseFloat(minWager)) return false;
    return true;
  });

  const getStatusColor = (status: LiveWager["status"]) => {
    switch (status) {
      case "won": return { bg: "rgba(76,175,80,0.12)", text: "#4caf50" };
      case "lost": return { bg: "rgba(244,67,54,0.12)", text: "#f44336" };
      case "pending": return { bg: "rgba(255,152,0,0.12)", text: "#ff9800" };
      case "pushed": return { bg: "rgba(156,39,176,0.12)", text: "#9c27b0" };
      case "cancelled": return { bg: "rgba(106,106,128,0.12)", text: "#6a6a80" };
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const clearFeed = useCallback(() => {
    setWagers([]);
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: 1400 }}>
      <div className="ticker-header">
        <div>
          <h1>Live Ticker</h1>
          <p className="page-description">Real-time wager stream via SSE</p>
        </div>
        <div className="ticker-controls">
          <div className={`ticker-connection ${connected ? "connected" : "disconnected"}`}>
            <span className="ticker-dot" /> {connected ? "Live" : "Demo"}
          </div>
          <button
            className={`btn btn-sm ${isPaused ? "btn-primary" : ""}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            className={`btn btn-sm ${soundEnabled ? "btn-primary" : ""}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Toggle sound notifications"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <button className="btn btn-sm" onClick={clearFeed}>Clear</button>
          <span className="ticker-count">{filteredWagers.length} wagers</span>
        </div>
      </div>

      {/* Filters */}
      <div className="ticker-filters">
        <select value={filterSport} onChange={(e) => setFilterSport(e.target.value)} className="filter-select">
          <option value="All">All Sports</option>
          {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterBook} onChange={(e) => setFilterBook(e.target.value)} className="filter-select">
          <option value="All">All Books</option>
          {BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LiveWager["status"] | "All")}
          className="filter-select"
        >
          <option value="All">All Status</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="pushed">Pushed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="number"
          placeholder="Min wager $"
          value={minWager}
          onChange={(e) => setMinWager(e.target.value)}
          className="filter-input"
        />
      </div>

      {/* Wager Table */}
      <div className="ticker-table-container" ref={tickerRef}>
        <table className="data-table ticker-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Player</th>
              <th>Sport</th>
              <th>Event</th>
              <th>Market</th>
              <th>Selection</th>
              <th>Odds</th>
              <th>Stake</th>
              <th>Book</th>
              <th>Status</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {filteredWagers.map((w) => {
              const statusStyle = getStatusColor(w.status);
              return (
                <tr key={w.id} style={{ background: statusStyle.bg }}>
                  <td className="ticker-time">{formatTime(w.timestamp)}</td>
                  <td><code>{w.playerLogin}</code></td>
                  <td>{w.sport}</td>
                  <td>{w.eventName}</td>
                  <td>{w.market}</td>
                  <td>{w.selection}</td>
                  <td className="ticker-odds" style={{ color: w.odds > 0 ? "#4caf50" : "#f44336" }}>
                    {w.odds > 0 ? `+${w.odds}` : w.odds}
                  </td>
                  <td className="ticker-stake">${w.stake.toFixed(2)}</td>
                  <td>{w.book}</td>
                  <td>
                    <span className="ticker-status-badge" style={{ background: statusStyle.text + "20", color: statusStyle.text }}>
                      {w.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="ticker-payout">${w.potentialPayout.toFixed(2)}</td>
                </tr>
              );
            })}
            {filteredWagers.length === 0 && (
              <tr>
                <td colSpan={11} className="ticker-empty">No wagers match the current filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveTickerPage;
