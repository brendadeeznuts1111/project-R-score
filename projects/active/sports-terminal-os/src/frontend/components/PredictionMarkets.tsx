/**
 * Prediction Markets Component
 *
 * Multi-provider prediction market display with:
 * - Provider tabs (Kalshi, Polymarket, PredictIt, Betfair)
 * - Market cards with yes/no prices
 * - Arbitrage banner
 * - Category filters
 * - Volume and liquidity indicators
 * - Real-time WebSocket updates
 *
 * Zone: 3 (Forest Canopy) — Theme: #2d4a2b
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  PredictionProvider,
  PredictionMarket,
  ArbitrageOpportunity,
  PredictionMarketCategory,
  MarketDepth,
} from "@utils/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictionMarketsProps {
  initialProvider?: PredictionProvider;
  onMarketSelect?: (market: PredictionMarket) => void;
  showArbitrage?: boolean;
  className?: string;
}

interface ProviderTab {
  id: PredictionProvider;
  label: string;
  status: "active" | "degraded" | "down";
}

const PROVIDER_TABS: ProviderTab[] = [
  { id: "kalshi", label: "Kalshi", status: "active" },
  { id: "polymarket", label: "Polymarket", status: "active" },
  { id: "predictit", label: "PredictIt", status: "active" },
  { id: "betfair", label: "Betfair", status: "active" },
];

const CATEGORIES: { id: PredictionMarketCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "politics", label: "Politics" },
  { id: "sports", label: "Sports" },
  { id: "crypto", label: "Crypto" },
  { id: "economics", label: "Economics" },
  { id: "entertainment", label: "Entertainment" },
  { id: "science", label: "Science" },
  { id: "other", label: "Other" },
];

const FOREST_ACCENT = "#2d4a2b";
const FOREST_LIGHT = "#4a7c47";
const FOREST_DARK = "#1a2f19";

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(0)}%`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatLiquidity(liq: number): string {
  return formatVolume(liq);
}

function getArbColor(profitPct: number): string {
  if (profitPct > 2) return "#22c55e"; // green-500
  if (profitPct > 0) return "#eab308"; // yellow-500
  return "#ef4444"; // red-500
}

function getArbBg(profitPct: number): string {
  if (profitPct > 2) return "rgba(34, 197, 94, 0.15)";
  if (profitPct > 0) return "rgba(234, 179, 8, 0.15)";
  return "rgba(239, 68, 68, 0.1)";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictionMarkets({
  initialProvider = "polymarket",
  onMarketSelect,
  showArbitrage = true,
  className = "",
}: PredictionMarketsProps) {
  const [activeProvider, setActiveProvider] = useState<PredictionProvider>(initialProvider);
  const [activeCategory, setActiveCategory] = useState<PredictionMarketCategory | "all">("all");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [arbitrage, setArbitrage] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch markets
  // ---------------------------------------------------------------------------

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("provider", activeProvider);
      if (activeCategory !== "all") params.set("category", activeCategory);
      params.set("limit", "50");

      const res = await fetch(`/api/prediction-markets?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch markets";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeProvider, activeCategory]);

  // ---------------------------------------------------------------------------
  // Fetch arbitrage
  // ---------------------------------------------------------------------------

  const fetchArbitrage = useCallback(async () => {
    if (!showArbitrage) return;
    try {
      const res = await fetch("/api/prediction-markets/arbitrage");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setArbitrage(data.opportunities || []);
    } catch (err: unknown) {
      console.error("Failed to fetch arbitrage:", err);
    }
  }, [showArbitrage]);

  // ---------------------------------------------------------------------------
  // Refresh all
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prediction-markets/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Refetch markets and arbitrage
      await fetchMarkets();
      await fetchArbitrage();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refresh failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchMarkets, fetchArbitrage]);

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Subscribe to prediction updates
      ws.send(JSON.stringify({ type: "subscribe:prediction", data: { provider: activeProvider } }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "prediction_update") {
          // Update market price in-place
          setMarkets((prev) =>
            prev.map((m) =>
              m.marketId === msg.data.marketId
                ? {
                    ...m,
                    outcomeYesPrice: msg.data.yesPrice,
                    outcomeNoPrice: msg.data.noPrice,
                    volume: msg.data.volume,
                    fetchedAt: Math.floor(Date.now() / 1000),
                  }
                : m
            )
          );
        } else if (msg.type === "arbitrage_alert") {
          // Add new arbitrage alert
          const newArb = msg.data as ArbitrageOpportunity;
          setArbitrage((prev) => {
            const filtered = prev.filter((a) => a.id !== newArb.id);
            return [newArb, ...filtered].slice(0, 20);
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe:prediction" }));
        ws.close();
      }
    };
  }, [activeProvider]);

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchMarkets();
    fetchArbitrage();
  }, [fetchMarkets, fetchArbitrage]);

  // ---------------------------------------------------------------------------
  // Auto-refresh every 60 seconds
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarkets();
      fetchArbitrage();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchMarkets, fetchArbitrage]);

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const bestArbitrage = arbitrage.length > 0
    ? arbitrage.reduce((best, a) => (a.profitPct > best.profitPct ? a : best), arbitrage[0])
    : null;

  const activeMarkets = markets.filter((m) => m.status === "open");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`prediction-markets ${className}`} style={{ color: "#e5e7eb" }}>
      {/* CSS Styles */}
      <style>{`
        .prediction-markets {
          --forest-accent: ${FOREST_ACCENT};
          --forest-light: ${FOREST_LIGHT};
          --forest-dark: ${FOREST_DARK};
        }
        .provider-tab {
          padding: 10px 20px;
          border: none;
          background: rgba(45, 74, 43, 0.3);
          color: #9ca3af;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }
        .provider-tab:hover {
          background: rgba(45, 74, 43, 0.5);
          color: #e5e7eb;
        }
        .provider-tab.active {
          background: rgba(45, 74, 43, 0.7);
          color: #fff;
          border-bottom-color: var(--forest-light);
        }
        .arbitrage-banner {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .market-card {
          background: rgba(31, 41, 55, 0.8);
          border: 1px solid rgba(45, 74, 43, 0.3);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .market-card:hover {
          border-color: var(--forest-light);
          box-shadow: 0 4px 12px rgba(45, 74, 43, 0.2);
        }
        .price-yes {
          color: #22c55e;
          font-weight: 600;
          font-size: 18px;
        }
        .price-no {
          color: #ef4444;
          font-weight: 600;
          font-size: 18px;
        }
        .depth-bar {
          height: 6px;
          border-radius: 3px;
          background: rgba(45, 74, 43, 0.4);
          overflow: hidden;
        }
        .depth-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .category-filter {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(45, 74, 43, 0.3);
          background: transparent;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .category-filter:hover {
          border-color: var(--forest-light);
          color: #e5e7eb;
        }
        .category-filter.active {
          background: var(--forest-accent);
          border-color: var(--forest-accent);
          color: #fff;
        }
        .ws-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .ws-connected { background: #22c55e; }
        .ws-disconnected { background: #ef4444; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: FOREST_LIGHT, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: FOREST_ACCENT, display: "inline-block" }} />
            Prediction Markets
          </h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
            Zone 3 — Forest Canopy
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            className={`ws-indicator ${wsConnected ? "ws-connected" : "ws-disconnected"}`}
            title={wsConnected ? "WebSocket connected" : "WebSocket disconnected"}
          />
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(45, 74, 43, 0.5)",
              background: FOREST_ACCENT,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Arbitrage Banner */}
      {bestArbitrage && showArbitrage && (
        <div
          className="arbitrage-banner"
          style={{
            background: getArbBg(bestArbitrage.profitPct),
            border: `1px solid ${getArbColor(bestArbitrage.profitPct)}40`,
          }}
        >
          <div style={{ fontSize: 20 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: getArbColor(bestArbitrage.profitPct) }}>
              Arbitrage Opportunity Detected
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              {bestArbitrage.marketName || bestArbitrage.marketId} — Buy{" "}
              <strong style={{ color: "#22c55e" }}>{bestArbitrage.sideA.toUpperCase()}</strong> on{" "}
              {bestArbitrage.providerA} ({formatPrice(bestArbitrage.priceA)}), Buy{" "}
              <strong style={{ color: "#ef4444" }}>{bestArbitrage.sideB.toUpperCase()}</strong> on{" "}
              {bestArbitrage.providerB} ({formatPrice(bestArbitrage.priceB)})
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: getArbColor(bestArbitrage.profitPct) }}>
              +{bestArbitrage.profitPct.toFixed(2)}%
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>guaranteed profit</div>
          </div>
        </div>
      )}

      {/* Provider Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid rgba(45, 74, 43, 0.2)" }}>
        {PROVIDER_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`provider-tab ${activeProvider === tab.id ? "active" : ""}`}
            onClick={() => setActiveProvider(tab.id)}
          >
            {tab.label}
            {tab.status !== "active" && (
              <span style={{ marginLeft: 6, fontSize: 10, color: "#f59e0b" }}>●</span>
            )}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`category-filter ${activeCategory === cat.id ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 16,
          padding: "10px 16px",
          background: "rgba(45, 74, 43, 0.1)",
          borderRadius: 8,
          fontSize: 13,
          color: "#9ca3af",
        }}
      >
        <span>
          <strong style={{ color: FOREST_LIGHT }}>{activeMarkets.length}</strong> active markets
        </span>
        <span>
          <strong style={{ color: FOREST_LIGHT }}>{arbitrage.length}</strong> arb opportunities
        </span>
        <span>
          Vol: <strong style={{ color: FOREST_LIGHT }}>{formatVolume(markets.reduce((s, m) => s + m.volume, 0))}</strong>
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            color: "#ef4444",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Markets Grid */}
      {loading && markets.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading markets...</div>
      ) : markets.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          No markets found for {activeProvider}
          {activeCategory !== "all" ? ` in ${activeCategory}` : ""}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onClick={() => onMarketSelect?.(market)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Card Sub-Component
// ---------------------------------------------------------------------------

function MarketCard({
  market,
  onClick,
}: {
  market: PredictionMarket;
  onClick?: () => void;
}) {
  const yesPct = market.outcomeYesPrice * 100;
  const noPct = market.outcomeNoPrice * 100;
  const liquidityWidth = Math.min((market.liquidity / (market.volume + 1)) * 100, 100);

  return (
    <div className="market-card" onClick={onClick}>
      {/* Category badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 10,
            background: `${FOREST_ACCENT}30`,
            color: FOREST_LIGHT,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
          }}
        >
          {market.category}
        </span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          {new Date(market.closeDate * 1000).toLocaleDateString()}
        </span>
      </div>

      {/* Market name */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 12,
          lineHeight: 1.3,
          minHeight: 36,
        }}
      >
        {market.marketName}
      </div>

      {/* Prices */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>YES</div>
          <div className="price-yes">{formatPrice(market.outcomeYesPrice)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>NO</div>
          <div className="price-no">{formatPrice(market.outcomeNoPrice)}</div>
        </div>
      </div>

      {/* Visual bar */}
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div
          style={{
            width: `${yesPct}%`,
            background: "linear-gradient(90deg, #16a34a, #22c55e)",
            transition: "width 0.5s",
          }}
        />
        <div
          style={{
            width: `${noPct}%`,
            background: "linear-gradient(90deg, #dc2626, #ef4444)",
            transition: "width 0.5s",
          }}
        />
      </div>

      {/* Volume & Liquidity */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
        <span>Vol: {formatVolume(market.volume)}</span>
        <span>Liq: {formatLiquidity(market.liquidity)}</span>
      </div>

      {/* Depth bar */}
      <div className="depth-bar" style={{ marginTop: 8 }}>
        <div
          className="depth-bar-fill"
          style={{
            width: `${liquidityWidth}%`,
            background: FOREST_ACCENT,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arbitrage Panel Component (exported separately)
// ---------------------------------------------------------------------------

export function ArbitragePanel({ className = "" }: { className?: string }) {
  const [arbitrage, setArbitrage] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArbitrage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prediction-markets/arbitrage");
      const data = await res.json();
      setArbitrage(data.opportunities || []);
    } catch (err) {
      console.error("Failed to fetch arbitrage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArbitrage();
    const interval = setInterval(fetchArbitrage, 30000);
    return () => clearInterval(interval);
  }, [fetchArbitrage]);

  return (
    <div className={`arbitrage-panel ${className}`} style={{ color: "#e5e7eb" }}>
      <style>{`
        .arb-row {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          background: rgba(31, 41, 55, 0.6);
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .arb-row:hover { background: rgba(31, 41, 55, 0.9); }
        .arb-profit { font-weight: 700; font-size: 16px; }
        .arb-green { color: #22c55e; }
        .arb-yellow { color: #eab308; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: FOREST_LIGHT, fontSize: 16 }}>Arbitrage Opportunities</h3>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {arbitrage.filter((a) => a.status === "active").length} active
        </span>
      </div>

      {loading && arbitrage.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>Scanning...</div>
      ) : arbitrage.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
          No arbitrage opportunities detected
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflow: "auto" }}>
          {arbitrage.map((arb) => (
            <div key={arb.id} className="arb-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {arb.marketName || arb.marketId}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  Buy {arb.sideA.toUpperCase()} @{arb.providerA} → Buy {arb.sideB.toUpperCase()} @
                  {arb.providerB}
                </div>
              </div>
              <div
                className={`arb-profit ${arb.profitPct > 2 ? "arb-green" : "arb-yellow"}`}
              >
                +{arb.profitPct.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Depth Chart Component (exported separately)
// ---------------------------------------------------------------------------

export function MarketDepthChart({
  marketId,
  provider,
  className = "",
}: {
  marketId: string;
  provider?: PredictionProvider;
  className?: string;
}) {
  const [depth, setDepth] = useState<MarketDepth | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!marketId) return;

    const fetchDepth = async () => {
      setLoading(true);
      try {
        const params = provider ? `?provider=${provider}` : "";
        const res = await fetch(`/api/prediction-markets/depth/${marketId}${params}`);
        const data = await res.json();
        setDepth(data.depth || null);
      } catch (err) {
        console.error("Failed to fetch depth:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepth();
  }, [marketId, provider]);

  if (loading) return <div style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>Loading depth...</div>;
  if (!depth) return <div style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>No depth data</div>;

  const maxSize = Math.max(
    ...depth.yesBids.map((b) => b.size),
    ...depth.yesAsks.map((b) => b.size),
    1
  );

  return (
    <div className={`market-depth ${className}`} style={{ color: "#e5e7eb" }}>
      <h4 style={{ margin: "0 0 12px", color: FOREST_LIGHT, fontSize: 14 }}>Order Book Depth</h4>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>YES Bids</div>
        {depth.yesBids.map((bid, i) => (
          <DepthRow key={`yb-${i}`} price={bid.price} size={bid.size} maxSize={maxSize} type="bid" />
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>YES Asks</div>
        {depth.yesAsks.map((ask, i) => (
          <DepthRow key={`ya-${i}`} price={ask.price} size={ask.size} maxSize={maxSize} type="ask" />
        ))}
      </div>

      <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#6b7280" }}>
        <span>
          YES Liq: <strong style={{ color: FOREST_LIGHT }}>{formatLiquidity(depth.totalLiquidityYes)}</strong>
        </span>
        <span>
          NO Liq: <strong style={{ color: FOREST_LIGHT }}>{formatLiquidity(depth.totalLiquidityNo)}</strong>
        </span>
      </div>
    </div>
  );
}

function DepthRow({
  price,
  size,
  maxSize,
  type,
}: {
  price: number;
  size: number;
  maxSize: number;
  type: "bid" | "ask";
}) {
  const width = (size / maxSize) * 100;
  const color = type === "bid" ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 4, fontSize: 12 }}>
      <span style={{ width: 50, color }}>{(price * 100).toFixed(0)}%</span>
      <span style={{ width: 70, textAlign: "right", color: "#9ca3af" }}>{formatVolume(size)}</span>
      <div
        style={{
          flex: 1,
          height: 14,
          marginLeft: 8,
          background: "rgba(31, 41, 55, 0.6)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(width, 2)}%`,
            height: "100%",
            background: `${color}40`,
            borderRadius: 2,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
