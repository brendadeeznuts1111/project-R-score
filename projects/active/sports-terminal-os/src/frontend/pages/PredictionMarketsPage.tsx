/**
 * Prediction Markets Page
 *
 * Full page wrapper for the prediction markets component with:
 * - Arbitrage opportunities panel
 * - Market depth chart
 * - Refresh controls
 * - Provider settings
 *
 * Zone: 3 (Forest Canopy) — Theme: #2d4a2b
 */

import { useState, useEffect, useCallback } from "react";
import PredictionMarkets, {
  ArbitragePanel,
  MarketDepthChart,
} from "@components/PredictionMarkets";
import type { PredictionMarket, PredictionProvider, ProviderConfig } from "@utils/types";

const FOREST_ACCENT = "#2d4a2b";
const FOREST_LIGHT = "#4a7c47";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictionMarketsPage() {
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDepth, setShowDepth] = useState(false);
  const [providerStatus, setProviderStatus] = useState<
    Array<{
      provider: PredictionProvider;
      name: string;
      enabled: boolean;
      status: string;
      marketCount: number;
      lastFetchedAt?: number;
    }>
  >([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch provider status
  // ---------------------------------------------------------------------------

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/prediction-markets/providers");
      if (res.ok) {
        const data = await res.json();
        setProviderStatus(data.providers || []);
      }
    } catch (err) {
      console.error("Failed to fetch provider status:", err);
    }
  }, []);

  useEffect(() => {
    fetchProviderStatus();
    const interval = setInterval(fetchProviderStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchProviderStatus]);

  // ---------------------------------------------------------------------------
  // Handle refresh
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/prediction-markets/refresh", { method: "POST" });
      setLastRefresh(new Date());
      await fetchProviderStatus();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProviderStatus]);

  // ---------------------------------------------------------------------------
  // Handle market selection
  // ---------------------------------------------------------------------------

  const handleMarketSelect = useCallback((market: PredictionMarket) => {
    setSelectedMarket(market);
    setShowDepth(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Format relative time
  // ---------------------------------------------------------------------------

  function getRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="prediction-markets-page"
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "24px",
      }}
    >
      <style>{`
        .prediction-markets-page {
          --forest-accent: ${FOREST_ACCENT};
          --forest-light: ${FOREST_LIGHT};
        }
        .settings-panel {
          background: rgba(31, 41, 55, 0.9);
          border: 1px solid rgba(45, 74, 43, 0.3);
          border-radius: 12px;
          padding: 20px;
        }
        .provider-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(45, 74, 43, 0.15);
        }
        .provider-setting:last-child { border-bottom: none; }
        .toggle-switch {
          position: relative;
          width: 40px;
          height: 22px;
          background: #374151;
          border-radius: 11px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .toggle-switch.enabled { background: ${FOREST_ACCENT}; }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle-switch.enabled::after { transform: translateX(18px); }
        .depth-panel {
          background: rgba(31, 41, 55, 0.9);
          border: 1px solid rgba(45, 74, 43, 0.3);
          border-radius: 12px;
          padding: 20px;
        }
      `}</style>

      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              background: `linear-gradient(90deg, ${FOREST_LIGHT}, #6bbf6b)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Zone 3 — Prediction Markets
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Forest Canopy — Multi-provider arbitrage detection
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            Last refresh: {getRelativeTime(lastRefresh)}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(45, 74, 43, 0.5)",
              background: showSettings ? FOREST_ACCENT : "transparent",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
              transition: "all 0.2s",
            }}
          >
            Settings
          </button>
          <button
            onClick={() => setShowDepth(!showDepth)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(45, 74, 43, 0.5)",
              background: showDepth ? FOREST_ACCENT : "transparent",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
              transition: "all 0.2s",
            }}
          >
            Depth
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: FOREST_ACCENT,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              opacity: refreshing ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh All"}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel" style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: FOREST_LIGHT, fontSize: 16 }}>
            Provider Settings
          </h3>

          <div style={{ display: "grid", gap: 0 }}>
            {providerStatus.map((provider) => (
              <div key={provider.provider} className="provider-setting">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background:
                        provider.status === "active"
                          ? "#22c55e"
                          : provider.status === "degraded"
                            ? "#eab308"
                            : "#ef4444",
                      display: "inline-block",
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{provider.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {provider.marketCount} markets
                      {provider.lastFetchedAt
                        ? ` · fetched ${getRelativeTime(new Date(provider.lastFetchedAt))}`
                        : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background:
                        provider.status === "active"
                          ? "rgba(34, 197, 94, 0.15)"
                          : provider.status === "degraded"
                            ? "rgba(234, 179, 8, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                      color:
                        provider.status === "active"
                          ? "#22c55e"
                          : provider.status === "degraded"
                            ? "#eab308"
                            : "#ef4444",
                      textTransform: "capitalize",
                    }}
                  >
                    {provider.status}
                  </span>
                  <div
                    className={`toggle-switch ${provider.enabled ? "enabled" : ""}`}
                    onClick={() => {
                      // Toggle would go here — requires API call
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* API Keys section */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(45, 74, 43, 0.2)" }}>
            <h4 style={{ margin: "0 0 12px", color: "#9ca3af", fontSize: 13, textTransform: "uppercase", letterSpacing: "1px" }}>
              API Keys
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <ApiKeyInput label="Kalshi API Key" envVar="KALSHI_API_KEY" />
              <ApiKeyInput label="Betfair API Key" envVar="BETFAIR_API_KEY" />
              <ApiKeyInput label="Betfair Session" envVar="BETFAIR_SESSION_TOKEN" />
              <div style={{ fontSize: 12, color: "#6b7280", padding: "8px 0" }}>
                Polymarket & PredictIt use public APIs
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showDepth ? "1fr 320px 280px" : "1fr 280px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Markets Grid */}
        <div>
          <PredictionMarkets
            onMarketSelect={handleMarketSelect}
            showArbitrage={!showDepth}
          />
        </div>

        {/* Market Depth Panel */}
        {showDepth && selectedMarket && (
          <div className="depth-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: FOREST_LIGHT,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {selectedMarket.marketName.length > 30
                  ? selectedMarket.marketName.slice(0, 30) + "..."
                  : selectedMarket.marketName}
              </h3>
              <button
                onClick={() => {
                  setShowDepth(false);
                  setSelectedMarket(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
            <MarketDepthChart
              marketId={selectedMarket.marketId}
              provider={selectedMarket.provider}
            />
          </div>
        )}

        {/* Arbitrage Sidebar */}
        <div
          style={{
            background: "rgba(31, 41, 55, 0.6)",
            border: "1px solid rgba(45, 74, 43, 0.2)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <ArbitragePanel />

          {/* Quick Stats */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(45, 74, 43, 0.2)",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                color: "#9ca3af",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Provider Status
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {providerStatus.map((p) => (
                <div
                  key={p.provider}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#9ca3af" }}>{p.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          p.status === "active"
                            ? "#22c55e"
                            : p.status === "degraded"
                              ? "#eab308"
                              : "#ef4444",
                      }}
                    />
                    <span style={{ color: "#6b7280" }}>{p.marketCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Key Input Sub-Component
// ---------------------------------------------------------------------------

function ApiKeyInput({ label, envVar }: { label: string; envVar: string }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In production, this would call the vault API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
        {label}
        <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 4 }}>({envVar})</span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter API key..."
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid rgba(45, 74, 43, 0.3)",
            background: "rgba(17, 24, 39, 0.8)",
            color: "#e5e7eb",
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          onClick={handleSave}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(45, 74, 43, 0.5)",
            background: saved ? "rgba(34, 197, 94, 0.2)" : FOREST_ACCENT,
            color: saved ? "#22c55e" : "#fff",
            cursor: "pointer",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
