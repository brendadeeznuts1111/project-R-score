/**
 * Customers Page — Player Domain (Desert Rose: #d4a5a5)
 *
 * Combines PlayerSearch and PlayerProfile components.
 * Features:
 * - Player search with filters
 * - Player 360 profile view
 * - Player count summary by archetype and risk tier
 * - Export to CSV button
 * - Desert Rose theme
 */

import React, { useState, useEffect, useCallback } from "react";
import PlayerSearch from "../components/PlayerSearch";
import PlayerProfile from "../components/PlayerProfile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryData {
  byArchetype: Record<string, number>;
  byRiskTier: Record<string, number>;
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARCHETYPE_EMOJI: Record<string, string> = {
  sharp: "\u{1F3AF}",
  whale: "\u{1F40B}",
  chase_gambler: "\u{1F525}",
  new: "\u{1F31F}",
  recreational: "\u{26BD}",
  suspicious: "\u{1F6A8}",
  unknown: "\u{2753}",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  sharp: "Sharp",
  whale: "Whale",
  chase_gambler: "Chase Gambler",
  new: "New",
  recreational: "Recreational",
  suspicious: "Suspicious",
  unknown: "Unknown",
};

const TIER_COLORS: Record<string, string> = {
  BLACK: "#1a1a1a",
  RED: "#dc3545",
  YELLOW: "#ffc107",
  GREEN: "#28a745",
};

const THEME_COLOR = "#d4a5a5";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomersPage: React.FC = () => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const token = localStorage.getItem("token") ?? "";

  const fetchSummary = useCallback(async () => {
    try {
      // Use the player search endpoint with a large limit to get summary data
      // In production, a dedicated /api/players/stats/summary endpoint would be ideal
      const res = await fetch("/api/players?limit=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      // Derive summary from direct DB query via a simple endpoint
      // For now, we aggregate from local knowledge
      // A real implementation would call GET /api/players/summary
    } catch (err) {
      console.error("[CustomersPage] summary fetch error:", err);
    }
  }, [token]);

  // Fetch summary from the database via the API
  useEffect(() => {
    // Build summary from a small sample of players
    const buildSummary = async () => {
      try {
        const res = await fetch("/api/players?limit=500&status=active", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items ?? []) as Array<{
          archetype?: string | null;
          risk_tier?: string;
          riskTier?: string;
        }>;

        const byArchetype: Record<string, number> = {};
        const byRiskTier: Record<string, number> = {};

        for (const p of items) {
          const arch = p.archetype ?? "unknown";
          const tier = p.risk_tier ?? p.riskTier ?? "GREEN";
          byArchetype[arch] = (byArchetype[arch] ?? 0) + 1;
          byRiskTier[tier] = (byRiskTier[tier] ?? 0) + 1;
        }

        setSummary({
          byArchetype,
          byRiskTier,
          total: data.total ?? items.length,
        });
      } catch (err) {
        console.error("[CustomersPage] build summary error:", err);
      }
    };

    buildSummary();
    fetchSummary();
  }, [fetchSummary, token]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setShowProfile(true);
  };

  const handleBack = () => {
    setShowProfile(false);
    setSelectedPlayerId(null);
  };

  const handleExportCSV = () => {
    window.open("/api/players/export/csv", "_blank");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0f0f1a",
        color: "#e0e0e0",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ===== TOP HEADER BAR ===== */}
      <header
        style={{
          background: "#16162a",
          borderBottom: `2px solid ${THEME_COLOR}40`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${THEME_COLOR}, #c48e8e)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {"\u{1F464}"}
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: THEME_COLOR,
                letterSpacing: "0.5px",
              }}
            >
              Customers
            </h1>
            <div style={{ fontSize: "11px", color: "#888" }}>
              Player 360 &middot; Desert Rose
            </div>
          </div>
        </div>

        {/* Summary pills */}
        {summary && (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <SummaryPills title="Archetypes" data={summary.byArchetype} type="archetype" />
            <SummaryPills title="Risk Tiers" data={summary.byRiskTier} type="tier" />
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleExportCSV}
            style={{
              background: "rgba(212,165,165,0.1)",
              border: `1px solid ${THEME_COLOR}40`,
              color: THEME_COLOR,
              padding: "6px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(212,165,165,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(212,165,165,0.1)";
            }}
          >
            <span>{"\u{1F4E4}"}</span>
            Export CSV
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          padding: "16px",
          gap: "16px",
        }}
      >
        {/* Search panel - always visible */}
        <div
          style={{
            flex: showProfile ? "0 0 45%" : "1 1 auto",
            transition: "flex 0.3s ease",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <PlayerSearch
            onSelectPlayer={handleSelectPlayer}
            selectedPlayerId={selectedPlayerId}
          />
        </div>

        {/* Profile panel - conditionally visible */}
        {showProfile && (
          <div
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              overflow: "hidden",
              animation: "slideIn 0.3s ease",
            }}
          >
            <PlayerProfile playerId={selectedPlayerId} onBack={handleBack} />
          </div>
        )}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SummaryPills
// ---------------------------------------------------------------------------

const SummaryPills: React.FC<{
  title: string;
  data: Record<string, number>;
  type: "archetype" | "tier";
}> = ({ title, data, type }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {title}
    </span>
    <div style={{ display: "flex", gap: "4px" }}>
      {Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([key, count]) =>
          type === "tier" ? (
            <span
              key={key}
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                background: `${TIER_COLORS[key] ?? "#666"}20`,
                color: TIER_COLORS[key] ?? "#666",
                border: `1px solid ${TIER_COLORS[key] ?? "#666"}40`,
              }}
            >
              {key} {count}
            </span>
          ) : (
            <span
              key={key}
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(212,165,165,0.1)",
                color: "#d4a5a5",
                border: "1px solid rgba(212,165,165,0.2)",
              }}
              title={`${ARCHETYPE_LABELS[key] ?? key}: ${count} players`}
            >
              {ARCHETYPE_EMOJI[key] ?? ""} {count}
            </span>
          )
        )}
    </div>
  </div>
);

export default CustomersPage;
