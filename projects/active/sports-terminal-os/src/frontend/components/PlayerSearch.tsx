/**
 * PlayerSearch Component — Desert Rose Theme (#d4a5a5)
 *
 * Features:
 * - Search input with debounce
 * - Filter sidebar: sport, risk tier, archetype, balance range
 * - Results grid using PlayerCard
 * - Sort by name, balance, win rate, wager count
 * - Pagination
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import PlayerCard from "./PlayerCard";
import type { PlayerCardData } from "./PlayerCard";
import type { RiskTier, CustomerArchetype } from "../../utils/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerSearchFilters {
  q: string;
  sport: string;
  riskTier: string;
  archetype: string;
  minBalance: string;
  maxBalance: string;
  sort: "name" | "balance" | "winRate" | "wagerCount";
  order: "asc" | "desc";
}

interface PlayerSearchProps {
  onSelectPlayer?: (playerId: string) => void;
  selectedPlayerId?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "SOCCER", "TENNIS", "GOLF", "ESPORTS"];

const RISK_TIERS: { value: string; label: string; color: string }[] = [
  { value: "", label: "All Tiers", color: "#888" },
  { value: "BLACK", label: "BLACK", color: "#1a1a1a" },
  { value: "RED", label: "RED", color: "#dc3545" },
  { value: "YELLOW", label: "YELLOW", color: "#ffc107" },
  { value: "GREEN", label: "GREEN", color: "#28a745" },
];

const ARCHETYPES: { value: string; label: string }[] = [
  { value: "", label: "All Archetypes" },
  { value: "sharp", label: "Sharp" },
  { value: "whale", label: "Whale" },
  { value: "chase_gambler", label: "Chase Gambler" },
  { value: "new", label: "New" },
  { value: "recreational", label: "Recreational" },
  { value: "suspicious", label: "Suspicious" },
];

const SORT_OPTIONS: { value: PlayerSearchFilters["sort"]; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "balance", label: "Balance" },
  { value: "winRate", label: "Win Rate" },
  { value: "wagerCount", label: "Wager Count" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PlayerSearch: React.FC<PlayerSearchProps> = ({ onSelectPlayer, selectedPlayerId }) => {
  const [filters, setFilters] = useState<PlayerSearchFilters>({
    q: "",
    sport: "",
    riskTier: "",
    archetype: "",
    minBalance: "",
    maxBalance: "",
    sort: "name",
    order: "asc",
  });

  const [players, setPlayers] = useState<PlayerCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const pageSize = 20;

  const debouncedQ = useDebounce(filters.q, 300);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      params.set("sort", filters.sort);
      params.set("order", filters.order);
      if (debouncedQ) params.set("q", debouncedQ);
      if (filters.sport) params.set("sport", filters.sport);
      if (filters.riskTier) params.set("risk_tier", filters.riskTier);
      if (filters.archetype) params.set("archetype", filters.archetype);
      if (filters.minBalance) params.set("min_balance", filters.minBalance);
      if (filters.maxBalance) params.set("max_balance", filters.maxBalance);

      const res = await fetch(`/api/players?${params.toString()}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlayers(
        (data.items ?? []).map((p: Record<string, unknown>) => ({
          id: String(p.id ?? p.customerId),
          customerId: String(p.customerId ?? p.customer_id ?? ""),
          displayName: String(p.displayName ?? p.display_name ?? "Unknown"),
          email: p.email ? String(p.email) : null,
          balance: Number(p.balance ?? 0),
          riskTier: String(p.riskTier ?? p.risk_tier ?? "GREEN") as RiskTier,
          archetype: (p.archetype as CustomerArchetype) ?? null,
          winRate: p.winRate != null ? Number(p.winRate) : p.win_rate != null ? Number(p.win_rate) : null,
          wagerCount: Number(p.wagerCount ?? p.wager_count ?? 0),
          netPnl: Number(p.lifetimePnl ?? p.lifetime_pnl ?? p.netPnl ?? 0),
          lastActiveAt: p.lastActiveAt ? Number(p.lastActiveAt) : p.last_wager_at ? Number(p.last_wager_at) : null,
          status: String(p.status ?? "active"),
        }))
      );
      setTotal(data.total ?? 0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("[PlayerSearch] fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters, page]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateFilter = (key: keyof PlayerSearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleSort = (field: PlayerSearchFilters["sort"]) => {
    setFilters((prev) => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  return (
    <div style={{ display: "flex", gap: "16px", height: "100%" }}>
      {/* Filter Sidebar */}
      {showFilters && (
        <div
          style={{
            width: "220px",
            flexShrink: 0,
            background: "#1a1a2e",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(212,165,165,0.15)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#d4a5a5",
              marginBottom: "16px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Filters
          </div>

          {/* Sport filter */}
          <FilterGroup label="Sport">
            <select
              value={filters.sport}
              onChange={(e) => updateFilter("sport", e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All Sports</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FilterGroup>

          {/* Risk tier filter */}
          <FilterGroup label="Risk Tier">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {RISK_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => updateFilter("riskTier", tier.value)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 700,
                    border: `1px solid ${tier.color}`,
                    background:
                      filters.riskTier === tier.value ? tier.color : "transparent",
                    color: filters.riskTier === tier.value ? "#fff" : tier.color,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textTransform: "uppercase",
                  }}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Archetype filter */}
          <FilterGroup label="Archetype">
            <select
              value={filters.archetype}
              onChange={(e) => updateFilter("archetype", e.target.value)}
              style={filterSelectStyle}
            >
              {ARCHETYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </FilterGroup>

          {/* Balance range */}
          <FilterGroup label="Balance Range ($)">
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="number"
                placeholder="Min"
                value={filters.minBalance}
                onChange={(e) => updateFilter("minBalance", e.target.value)}
                style={{ ...filterInputStyle, width: "50%" }}
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxBalance}
                onChange={(e) => updateFilter("maxBalance", e.target.value)}
                style={{ ...filterInputStyle, width: "50%" }}
              />
            </div>
          </FilterGroup>

          {/* Sort controls */}
          <FilterGroup label="Sort By">
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleSort(opt.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: "1px solid",
                    borderColor:
                      filters.sort === opt.value ? "#d4a5a5" : "rgba(212,165,165,0.15)",
                    background:
                      filters.sort === opt.value
                        ? "rgba(212,165,165,0.2)"
                        : "transparent",
                    color: filters.sort === opt.value ? "#d4a5a5" : "#888",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{opt.label}</span>
                  {filters.sort === opt.value && (
                    <span style={{ fontSize: "10px" }}>
                      {filters.order === "asc" ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </FilterGroup>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
        {/* Search bar */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            background: "#1a1a2e",
            borderRadius: "12px",
            padding: "10px 16px",
            border: "1px solid rgba(212,165,165,0.15)",
          }}
        >
          <button
            onClick={() => setShowFilters((s) => !s)}
            style={{
              background: "rgba(212,165,165,0.15)",
              border: "none",
              color: "#d4a5a5",
              padding: "6px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
            }}
            title="Toggle filters"
          >
            {showFilters ? "\u2630" : "\u2630"}
          </button>

          <input
            type="text"
            placeholder="Search players by name, email, phone..."
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#e0e0e0",
              fontSize: "14px",
              outline: "none",
            }}
          />

          {loading && (
            <span style={{ color: "#d4a5a5", fontSize: "12px" }}>Loading...</span>
          )}

          <span style={{ color: "#666", fontSize: "12px" }}>
            {total.toLocaleString()} results
          </span>
        </div>

        {/* Results grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "12px",
            paddingRight: "4px",
          }}
        >
          {players.map((player) => (
            <PlayerCard
              key={player.customerId}
              player={player}
              onClick={() => onSelectPlayer?.(player.customerId)}
              selected={selectedPlayerId === player.customerId}
            />
          ))}

          {players.length === 0 && !loading && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "60px 20px",
                color: "#666",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{"\u{1F50D}"}</div>
              <div style={{ fontSize: "16px" }}>No players found</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Try adjusting your filters or search query
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              padding: "8px 0",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={pageBtnStyle(page <= 1)}
            >
              &larr;
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pages: number[] = [];
              if (totalPages <= 5) {
                pages.push(...Array.from({ length: totalPages }, (_, j) => j + 1));
              } else if (page <= 3) {
                pages.push(1, 2, 3, 4, 5);
              } else if (page >= totalPages - 2) {
                pages.push(
                  totalPages - 4,
                  totalPages - 3,
                  totalPages - 2,
                  totalPages - 1,
                  totalPages
                );
              } else {
                pages.push(page - 2, page - 1, page, page + 1, page + 2);
              }
              return pages[i];
            })
              .filter(Boolean)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    ...pageBtnStyle(false),
                    background: page === p ? "rgba(212,165,165,0.3)" : "transparent",
                    borderColor: page === p ? "#d4a5a5" : "rgba(212,165,165,0.15)",
                    color: page === p ? "#d4a5a5" : "#888",
                    minWidth: "32px",
                  }}
                >
                  {p}
                </button>
              ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={pageBtnStyle(page >= totalPages)}
            >
              &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const FilterGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: "16px" }}>
    <label
      style={{
        display: "block",
        fontSize: "11px",
        fontWeight: 600,
        color: "#d4a5a5",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        marginBottom: "6px",
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const filterSelectStyle: React.CSSProperties = {
  width: "100%",
  background: "#252540",
  border: "1px solid rgba(212,165,165,0.15)",
  borderRadius: "6px",
  color: "#e0e0e0",
  padding: "6px 10px",
  fontSize: "12px",
  outline: "none",
};

const filterInputStyle: React.CSSProperties = {
  background: "#252540",
  border: "1px solid rgba(212,165,165,0.15)",
  borderRadius: "6px",
  color: "#e0e0e0",
  padding: "6px 10px",
  fontSize: "12px",
  outline: "none",
  width: "100%",
};

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid rgba(212,165,165,0.15)",
    color: disabled ? "#555" : "#d4a5a5",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px",
    transition: "all 0.15s",
    opacity: disabled ? 0.4 : 1,
  };
}

export default PlayerSearch;
